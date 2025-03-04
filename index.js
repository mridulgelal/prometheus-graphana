const express = require("express");
const client = require("prom-client");
const responseTime = require("response-time");
const { prettyHeavyRequest } = require("./utils");

const app = express();
const PORT = process.env.PORT;

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "This tells you req res latancy ",
  label: ["method", "route", "statuCode"],
});

app.use(
  responseTime((req, res, time) => {
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
  return res.json({ message: "hello from express server" });
});

app.get("/slow", async (req, res) => {
  try {
    const timeTaken = await prettyHeavyRequest();
    return res.json({
      status: "Success",
      message: `Heavy task completed in ${timeTaken}`,
    });
  } catch (error) {
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
