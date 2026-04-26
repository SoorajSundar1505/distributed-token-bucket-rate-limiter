-- KEYS[1] = key
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens/ms)
-- ARGV[3] = now (ms)

local tokens = tonumber(redis.call("GET", KEYS[1]..":tokens")) or ARGV[1]
local last = tonumber(redis.call("GET", KEYS[1]..":last")) or ARGV[3]

local delta = (ARGV[3] - last) * ARGV[2]
tokens = math.min(ARGV[1], tokens + delta)

if tokens < 1 then
  return {0, tokens}
end

tokens = tokens - 1

redis.call("SET", KEYS[1]..":tokens", tokens, "PX", 60000)
redis.call("SET", KEYS[1]..":last", ARGV[3], "PX", 60000)

return {1, tokens}