const uuid = require('uuid/v4')
const store = require('../../store')
const { allowUser, loggedUser } = require('./helper')

const mutation = {
  login: async ({ name, password }, context) => {
    const userId = await store.redis.hget('user:name:id', name)
    const redisUser = await store.redis.hgetall(`user:${userId}`)

    if (!redisUser) throw new Error('user not found')

    if (redisUser.password !== password) throw new Error('wrong password')

    const { resolvers } = context
    const user = await resolvers.user({ id: userId, depth: 2 }, context)

    return {
      user,
      token: allowUser(user),
    }
  },

  register: async ({ name, password }) => {
    const id = uuid()

    const userId = await store.redis.hget('user:name:id', name)

    if (userId) throw new Error('name already exist')

    await store.redis.hmset(
      `user:${id}`,
      'id',
      id,
      'name',
      name,
      'password',
      password,
    )

    await store.redis.sadd('users', id)

    await store.redis.hset('user:name:id', name, id)

    return {
      id,
      name,
    }
  },

  follow: async ({ userId }, context) => {
    const jwtUser = loggedUser(context)

    if (userId === jwtUser.id) throw new Error("Can't auto follow")

    await store.redis.sadd(`user:${userId}:followers`, jwtUser.id)
    await store.redis.sadd(`user:${jwtUser.id}:following`, userId)

    return query.user({ id: userId }, context)
  },

  unFollow: async ({ userId }, context) => {
    const jwtUser = loggedUser(context)

    await store.redis.srem(`user:${userId}:followers`, jwtUser.id)
    await store.redis.srem(`user:${jwtUser.id}:following`, userId)

    return query.user({ id: userId }, context)
  },
}

const query = {
  user: async ({ id, depth = 2 }, context) => {
    if (depth <= 0) return null

    const { resolvers } = context

    const { password, ...user } = await store.redis.hgetall(`user:${id}`)

    const postsId = await store.redis.lrange(`user:${user.id}:posts`, 0, -1)
    const posts = await Promise.all(
      postsId.map(id => resolvers.post({ id, depth: depth - 1 }, context)),
    )

    const followersId = await store.redis.smembers(`user:${id}:followers`)
    const followingId = await store.redis.smembers(`user:${id}:following`)
    const getUser = id => resolvers.user({ id, depth: depth - 1 }, context)

    return {
      ...user,
      posts,
      followers: await Promise.all(followersId.map(getUser)),
      following: await Promise.all(followingId.map(getUser)),
    }
  },

  users: async ({ depth = 2 }, context) => {
    const usersId = await store.redis.smembers('users')

    return Promise.all(
      usersId.map(id =>
        context.resolvers.user({ id, depth: depth - 1 }, context),
      ),
    )
  },
}

module.exports = {
  ...query,
  ...mutation,
}
