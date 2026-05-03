const express = require("express");
const limiter = require("./middleware/limiterMiddleware");
const routes = require("./routes/testRoutes");

const app = express();

if (
  process.env.TRUST_PROXY === "1" ||
  process.env.TRUST_PROXY === "true"
) {
  app.set("trust proxy", 1);
}

app.use(limiter);
app.use("/", routes);

const port = parseInt(process.env.PORT || "3000", 10);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
