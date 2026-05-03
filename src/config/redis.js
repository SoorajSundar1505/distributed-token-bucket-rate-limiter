const Redis = require("ioredis");

function buildOptions() {
  const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || "3", 10);
  return {
    maxRetriesPerRequest: maxRetries,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || "10000", 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || "5000", 10),
    retryStrategy(times) {
      const cap = 2000;
      return Math.min(times * 50, cap);
    }
  };
}

function createClient() {
  const url = process.env.REDIS_URL;
  const base = buildOptions();

  if (url) {
    return new Redis(url, base);
  }

  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
    ...base
  });
}

const redis = createClient();

redis.on("error", (err) => {
  console.error(
    JSON.stringify({
      msg: "redis_client_error",
      err: err.message,
      code: err.code
    })
  );
});

module.exports = redis;
