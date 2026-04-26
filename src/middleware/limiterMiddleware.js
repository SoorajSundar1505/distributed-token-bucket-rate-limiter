const rateLimit = require("../limiter/rateLimiter");

async function limiter(req, res, next) {
  const key = `rate:${req.ip}`;

  try {
    const { allowed, remaining } = await rateLimit(key);

    res.set("X-RateLimit-Remaining", remaining);

    if (!allowed) {
      return res.status(429).json({
        message: "Too many requests"
      });
    }

    next();
  } catch (err) {
    console.error("Limiter error:", err);
    next(); // fail-open
  }
}

module.exports = limiter;