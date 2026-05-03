const fs = require("fs");
const path = require("path");
const redis = require("../config/redis");

const script = fs.readFileSync(
  path.join(__dirname, "tokenBucket.lua"),
  "utf8"
);

let scriptSha = null;

function isNoScriptError(err) {
  const msg = err && err.message ? err.message : "";
  return msg.includes("NOSCRIPT");
}

async function ensureScriptLoaded() {
  if (!scriptSha) {
    scriptSha = await redis.script("LOAD", script);
  }
}

function getCapacity() {
  return parseInt(process.env.RATE_LIMIT_CAPACITY || "10", 10);
}

function getRefillTokensPerSecond() {
  const perMinute = parseFloat(
    process.env.RATE_LIMIT_REFILL_PER_MINUTE || "10"
  );
  return perMinute / 60;
}

function getKeyTtlMs() {
  return parseInt(process.env.RATE_LIMIT_KEY_TTL_MS || "60000", 10);
}

function retryAfterSeconds(tokensAfterRefill, tokensPerSecond) {
  if (tokensPerSecond <= 0) {
    return 60;
  }
  const need = Math.max(0, 1 - tokensAfterRefill);
  const seconds = need / tokensPerSecond;
  return Math.max(1, Math.ceil(seconds));
}

async function evalRateLimit(keyPrefix) {
  const capacity = getCapacity();
  const refillPerSecond = getRefillTokensPerSecond();
  const refillPerMs = refillPerSecond / 1000;
  const ttlMs = getKeyTtlMs();

  await ensureScriptLoaded();

  try {
    return await redis.evalsha(
      scriptSha,
      1,
      keyPrefix,
      capacity,
      refillPerMs,
      ttlMs
    );
  } catch (err) {
    if (isNoScriptError(err)) {
      scriptSha = null;
      await ensureScriptLoaded();
      return redis.evalsha(
        scriptSha,
        1,
        keyPrefix,
        capacity,
        refillPerMs,
        ttlMs
      );
    }
    throw err;
  }
}

async function rateLimit(keyPrefix) {
  const capacity = getCapacity();
  const refillPerSecond = getRefillTokensPerSecond();
  const result = await evalRateLimit(keyPrefix);
  const allowed = result[0] === 1;
  const tokensRemaining = Number(result[1]);

  return {
    allowed,
    remaining: Math.floor(tokensRemaining),
    capacity,
    retryAfterSec: allowed
      ? 0
      : retryAfterSeconds(tokensRemaining, refillPerSecond)
  };
}

module.exports = rateLimit;
