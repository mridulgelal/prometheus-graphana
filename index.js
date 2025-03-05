const express = require("express");
const client = require("prom-client");
const responseTime = require("response-time");
const { prettyHeavyRequest } = require("./utils");
const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");

const app = express();
const PORT = process.env.PORT;

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const options = {
  transports: [
    new LokiTransport({
      host: "http://127.0.0.1:3100",
    }),
  ],
};
const logger = createLogger(options);

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "This tells you req res latancy ",
  labelNames: ["method", "route", "status_code"],
  // data point, milliseconds
  buckets: [1, 50, 100, 200, 400, 500, 800, 1000, 2000],
});

const totalReqCounter = new client.Counter({
  name: "total_req",
  help: "Tells total req",
});

app.use(
  responseTime((req, res, time) => {
    totalReqCounter.inc();
    reqResTime
      .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      })
      .observe(time);
  })
);

app.get("/", (req, res) => {
  logger.info("Req came on / router");
  return res.json({ message: "hello from express server" });
});

app.get("/slow", async (req, res) => {
  logger.info("Req came on / slow");

  try {
    const timeTaken = await prettyHeavyRequest();
    return res.json({
      status: "Success",
      message: `Heavy task completed in ${timeTaken}`,
    });
  } catch (error) {
    logger.error(error.message);

    return res
      .status(500)
      .json({ status: "Error", error: "Internal server error" });
  }
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.listen(PORT, () => console.log(`server is connect @ port ${PORT}`));
