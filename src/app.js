const express = require("express");
const limiter = require("./middleware/limiterMiddleware");
const routes = require("./routes/testRoutes");

const app = express();

app.use(limiter);
app.use("/", routes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});