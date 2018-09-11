const Redis = require('ioredis')

module.exports = new Redis(process.env.REDIS_URL || '176.31.245.194:6379')
