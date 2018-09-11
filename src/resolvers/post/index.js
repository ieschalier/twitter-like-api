const uuid = require('uuid/v4')

const redis = require('../helpers/redis')
const { loggedUser } = require('../user/helper')
const { constructInnerPostNode } = require('../helpers/innerNode')
const { findPost } = require('./helper')

module.exports = {
  Query: {
    posts: async (_, params, info, node) => {
      const postsId = await redis.lrange('posts', 0, -1)

      const postsOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'posts',
      )
      const PostNode = constructInnerPostNode(postsOperation.selectionSet)

      return Promise.all(postsId.map(id => findPost(id, PostNode)))
    },
  },
  Mutation: {
    newPost: async (_, { title, description }, info, node) => {
      const jwtUser = loggedUser(info)

      const id = uuid()

      await redis.hmset(
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

      await redis.lpush('posts', id)

      await redis.lpush(`user:${jwtUser.id}:posts`, id)

      const postsOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'newPost',
      )
      const postNode = constructInnerPostNode(postsOperation.selectionSet)

      return findPost(id, postNode)
    },

    likePost: async (_, { postId }, info, node) => {
      const jwtUser = loggedUser(info)

      await redis.sadd(`post:${postId}:liked`, jwtUser.id)
      await redis.sadd(`user:${jwtUser.id}:like`, postId)

      const postsOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'likePost',
      )
      const postNode = constructInnerPostNode(postsOperation.selectionSet)

      return findPost(postId, postNode)
    },

    unLikePost: async (_, { postId }, info, node) => {
      const jwtUser = loggedUser(info)

      await redis.srem(`post:${postId}:liked`, jwtUser.id)
      await redis.srem(`user:${jwtUser.id}:like`, postId)

      const postsOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'unLikePost',
      )
      const postNode = constructInnerPostNode(postsOperation.selectionSet)

      return findPost(postId, postNode)
    },
  },
}
