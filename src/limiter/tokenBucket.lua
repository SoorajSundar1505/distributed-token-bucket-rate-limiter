-- KEYS[1] = key prefix (use a Redis Cluster hash tag in the prefix, e.g. rate:{<client>})
-- ARGV[1] = capacity (tokens)
-- ARGV[2] = refill rate (tokens per millisecond)
-- ARGV[3] = TTL in ms for idle key cleanup (PX)

local ttl_ms = math.floor(tonumber(ARGV[3]) or 60000)

local time = redis.call("TIME")
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

local tokens_key = KEYS[1] .. ":tokens"
local last_key = KEYS[1] .. ":last"

local tokens = tonumber(redis.call("GET", tokens_key)) or tonumber(ARGV[1])
local last = tonumber(redis.call("GET", last_key)) or now

local elapsed_ms = now - last
if elapsed_ms < 0 then
  -- Clock moved backwards (Redis failover / time step): do not drain tokens via negative refill
  elapsed_ms = 0
end

local delta = elapsed_ms * tonumber(ARGV[2])
tokens = math.min(tonumber(ARGV[1]), tokens + delta)

if tokens < 1 then
  return {0, tokens}
end

tokens = tokens - 1

redis.call("SET", tokens_key, tokens, "PX", ttl_ms)
redis.call("SET", last_key, now, "PX", ttl_ms)

return {1, tokens}
