const fs = require("fs");
const path = require("path");
const redis = require("../config/redis");

const script = fs.readFileSync(
  path.join(__dirname, "tokenBucket.lua"),
  "utf8"
);

async function rateLimit(key, capacity = 10, refillRate = 10 / 60) {
  const refillPerMs = refillRate / 1000;

  const result = await redis.eval(
    script,
    1,
    key,
    capacity,
    refillPerMs,
    Date.now()
  );

  return {
    allowed: result[0] === 1,
    remaining: Math.floor(result[1])
  };
}

module.exports = rateLimit;