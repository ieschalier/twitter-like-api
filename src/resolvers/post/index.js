const uuid = require('uuid/v4')

const store = require('../../store')
const { constructInnerPostInfo, constructInnerUserInfo } = require('../helper')
const { loggedUser } = require('../user/helper')

const mutation = {
  newPost: async ({ title, description, depth = 10 }, context, info) => {
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

    const postsOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'newPost',
    )
    const innerPostInfo = constructInnerPostInfo(postsOperation.selectionSet)

    return context.resolvers.post(
      { id, depth: depth - 1 },
      context,
      innerPostInfo,
    )
  },

  likePost: async ({ postId }, context, info) => {
    const jwtUser = loggedUser(context)

    await store.redis.sadd(`post:${postId}:liked`, jwtUser.id)
    await store.redis.sadd(`user:${jwtUser.id}:like`, postId)

    const postsOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'likePost',
    )
    const innerPostInfo = constructInnerPostInfo(postsOperation.selectionSet)

    return query.post({ id: postId }, context, innerPostInfo)
  },

  unLikePost: async ({ postId }, context, info) => {
    const jwtUser = loggedUser(context)

    await store.redis.srem(`post:${postId}:liked`, jwtUser.id)
    await store.redis.srem(`user:${jwtUser.id}:like`, postId)

    const postsOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'unLikePost',
    )
    const innerPostInfo = constructInnerPostInfo(postsOperation.selectionSet)

    return query.post({ id: postId }, context, innerPostInfo)
  },
}

const query = {
  post: async ({ id, depth = 10 }, context, info) => {
    if (depth <= 0) return null

    const postOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'post',
    )
    const queryUser = postOperation.selectionSet.selections.find(
      s => s.name.value === 'user',
    )
    const queryLikes = postOperation.selectionSet.selections.find(
      s => s.name.value === 'likes',
    )

    const post = await store.redis.hgetall(`post:${id}`)

    const user =
      queryUser &&
      (await context.resolvers.user(
        { id: post.user, depth: depth - 1 },
        context,
        constructInnerUserInfo(queryUser.selectionSet),
      ))

    const likeUsersId = await store.redis.smembers(`post:${id}:liked`)
    const likes =
      queryLikes &&
      (await Promise.all(
        likeUsersId.map(id => {
          const likeUserInfo = constructInnerUserInfo(queryLikes.selectionSet)

          return context.resolvers.user(
            { id, depth: depth - 1 },
            context,
            likeUserInfo,
          )
        }),
      ))

    return {
      ...post,
      user,
      likes,
    }
  },

  posts: async (variables, context, info) => {
    const postsId = await store.redis.lrange('posts', 0, -1)
    const postsOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'posts',
    )
    const innerPostInfo = constructInnerPostInfo(postsOperation.selectionSet)

    return Promise.all(
      postsId.map(id => query.post({ id }, context, innerPostInfo)),
    )
  },
}

module.exports = {
  ...query,
  ...mutation,
}
