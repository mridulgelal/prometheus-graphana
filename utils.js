const prettyHeavyRequest = (n = 40) => {
  if (n <= 1) return n;
  return prettyHeavyRequest(n - 1) + prettyHeavyRequest(n - 2);
};

module.exports = { prettyHeavyRequest };
