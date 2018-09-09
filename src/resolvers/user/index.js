const uuid = require('uuid/v4')
const store = require('../../store')
const { allowUser, loggedUser } = require('./helper')
const { constructInnerUserInfo, constructInnerPostInfo } = require('../helper')

const mutation = {
  login: async ({ name, password }, context, info) => {
    const userId = await store.redis.hget('user:name:id', name)
    const redisUser = await store.redis.hgetall(`user:${userId}`)

    if (!redisUser) throw new Error('user not found')

    if (redisUser.password !== password) throw new Error('wrong password')

    const { resolvers } = context
    const usersOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'login',
    )
    const innerUserInfo = constructInnerUserInfo(usersOperation.selectionSet)
    const user = await resolvers.user(
      { id: userId, depth: 2 },
      context,
      innerUserInfo,
    )

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

  follow: async ({ userId }, context, info) => {
    const jwtUser = loggedUser(context)

    if (userId === jwtUser.id) throw new Error("Can't auto follow")

    await store.redis.sadd(`user:${userId}:followers`, jwtUser.id)
    await store.redis.sadd(`user:${jwtUser.id}:following`, userId)

    const usersOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'follow',
    )
    const innerUserInfo = constructInnerUserInfo(usersOperation.selectionSet)

    return query.user({ id: userId }, context, innerUserInfo)
  },

  unFollow: async ({ userId }, context, info) => {
    const jwtUser = loggedUser(context)

    await store.redis.srem(`user:${userId}:followers`, jwtUser.id)
    await store.redis.srem(`user:${jwtUser.id}:following`, userId)

    const usersOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'unFollow',
    )
    const innerUserInfo = constructInnerUserInfo(usersOperation.selectionSet)

    return query.user({ id: userId }, context, innerUserInfo)
  },
}

const query = {
  user: async ({ id, depth = 10 }, context, info) => {
    if (depth <= 0) return null

    const { resolvers } = context

    const { password, ...user } = await store.redis.hgetall(`user:${id}`)

    const userOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'user',
    )
    const queryPosts = userOperation.selectionSet.selections.find(
      s => s.name.value === 'posts',
    )
    const queryFollowers = userOperation.selectionSet.selections.find(
      s => s.name.value === 'followers',
    )
    const queryFollowing = userOperation.selectionSet.selections.find(
      s => s.name.value === 'following',
    )

    const getPosts = async () => {
      const postsId = await store.redis.lrange(`user:${user.id}:posts`, 0, -1)

      const postInfo = constructInnerPostInfo(queryPosts.selectionSet)

      const posts = await Promise.all(
        postsId.map(postId =>
          resolvers.post({ id: postId, depth: depth - 1 }, context, postInfo),
        ),
      )

      return posts
    }

    const getUser = selectionSet => id => {
      const followersInfo = constructInnerUserInfo(selectionSet)
      return resolvers.user({ id, depth: depth - 1 }, context, followersInfo)
    }

    const getFollowers = async () => {
      const followersId = await store.redis.smembers(`user:${id}:followers`)

      return Promise.all(followersId.map(getUser(queryFollowers.selectionSet)))
    }

    const getFollowing = async () => {
      const followingId = await store.redis.smembers(`user:${id}:following`)

      return Promise.all(followingId.map(getUser(queryFollowing.selectionSet)))
    }

    const followingId = await store.redis.smembers(`user:${id}:following`)

    return {
      ...user,
      posts: queryPosts ? await getPosts() : [],
      followers: queryFollowers ? await getFollowers() : [],
      following: queryFollowing ? await getFollowing() : [],
    }
  },

  users: async ({ depth = 10 }, context, info) => {
    const usersId = await store.redis.smembers('users')

    const usersOperation = info.operation.selectionSet.selections.find(
      s => s.name.value === 'users',
    )
    const innerUserInfo = constructInnerUserInfo(usersOperation.selectionSet)

    return Promise.all(
      usersId.map(id =>
        context.resolvers.user(
          { id, depth: depth - 1 },
          context,
          innerUserInfo,
        ),
      ),
    )
  },
}

module.exports = {
  ...query,
  ...mutation,
}
