const crypto = require("crypto");
const rateLimit = require("../limiter/rateLimiter");

const FAIL_OPEN =
  process.env.RATE_LIMIT_FAIL_OPEN !== "false" &&
  process.env.RATE_LIMIT_FAIL_OPEN !== "0";

function clientKey(req) {
  const id = req.ip || "unknown";
  return `rate:{${id}}`;
}

async function limiter(req, res, next) {
  const key = clientKey(req);
  const started = Date.now();

  try {
    const { allowed, remaining, capacity, retryAfterSec } = await rateLimit(
      key
    );

    res.set("X-RateLimit-Limit", String(capacity));
    res.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));

    const resetAt = Math.ceil(Date.now() / 1000) + retryAfterSec;
    if (!allowed) {
      res.set("Retry-After", String(retryAfterSec));
      res.set(
        "RateLimit",
        `limit=${capacity}, remaining=${remaining}, reset=${resetAt}`
      );
      return res.status(429).json({
        message: "Too many requests"
      });
    }

    res.set("RateLimit", `limit=${capacity}, remaining=${remaining}`);
    next();
  } catch (err) {
    const latencyMs = Date.now() - started;
    const payload = {
      msg: "rate_limiter_redis_error",
      err: err.message,
      code: err.code,
      latencyMs,
      keyHash: crypto.createHash("sha256").update(key).digest("hex").slice(0, 16)
    };
    console.error(JSON.stringify(payload));

    if (FAIL_OPEN) {
      next();
    } else {
      res
        .status(503)
        .json({ message: "Rate limiter unavailable" });
    }
  }
}

module.exports = limiter;
