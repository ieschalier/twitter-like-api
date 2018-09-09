const uuid = require('uuid/v4')

const store = require('../../store')
const { requestUserFor } = require('./helper')
const { loggedUser } = require('../user/helper')

const mutation = {
  newPost: async ({ title, description, depth = 2 }, context, request) => {
    const jwtUser = loggedUser(context)

    const id = uuid()

    await store.redis.hmset(
      `post:${id}`,
      'id',
      id,
      'title',
      title,
      'description',
      description,
      'user',
      jwtUser.id,
    )

    await store.redis.lpush('posts', id)

    await store.redis.lpush(`user:${jwtUser.id}:posts`, id)

    const requestUser = requestUserFor('newPost', request)

    return context.resolvers.post({ id, depth: depth - 1 }, context)
  },

  likePost: async ({ postId }, context) => {
    const jwtUser = loggedUser(context)

    await store.redis.sadd(`post:${postId}:liked`, jwtUser.id)
    await store.redis.sadd(`user:${jwtUser.id}:like`, postId)

    return query.post({ id: postId }, context)
  },

  unLikePost: async ({ postId }, context) => {
    const jwtUser = loggedUser(context)

    await store.redis.srem(`post:${postId}:liked`, jwtUser.id)
    await store.redis.srem(`user:${jwtUser.id}:like`, postId)

    return query.post({ id: postId }, context)
  },
}

const query = {
  post: async ({ id, depth = 2 }, context) => {
    if (depth <= 0) return null

    const post = await store.redis.hgetall(`post:${id}`)
    const user = await store.redis.hgetall(`user:${post.user}`)

    const likeUsersId = await store.redis.smembers(`post:${id}:liked`)
    const likes = await Promise.all(
      likeUsersId.map(id =>
        context.resolvers.user({ id, depth: depth - 1 }, context),
      ),
    )

    return {
      ...post,
      user,
      likes,
    }
  },

  posts: async (variables, context) => {
    const postsId = await store.redis.lrange('posts', 0, -1)

    return Promise.all(postsId.map(id => query.post({ id }, context)))
  },
}

module.exports = {
  ...query,
  ...mutation,
}
