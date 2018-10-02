const uuid = require('uuid/v4')
const redis = require('../helpers/redis')
const { constructInnerUserNode } = require('../helpers/innerNode')
const { allowUser, loggedUser } = require('./helper')
const findUser = require('../helpers/findUser')

module.exports = {
  Mutation: {
    login: async (_, { name, password }, info, node) => {
      const userId = await redis.hget('user:name:id', name)
      const redisUser = await redis.hgetall(`user:${userId}`)

      if (!redisUser) throw new Error('user not found')

      if (redisUser.password !== password) throw new Error('wrong password')

      const usersOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'login',
      )
      const userNode = constructInnerUserNode(usersOperation.selectionSet)

      const user = await findUser(userId, userNode)

      return {
        user,
        token: allowUser(user),
      }
    },

    register: async (_, { name, password }) => {
      const id = uuid()

      const userId = await redis.hget('user:name:id', name)

      if (userId) throw new Error('name already exist')

      await redis.hmset(
        `user:${id}`,
        'id',
        id,
        'name',
        name,
        'password',
        password,
      )

      await redis.sadd('users', id)

      await redis.hset('user:name:id', name, id)

      return {
        id,
        name,
      }
    },

    follow: async (_, { userId }, info, node) => {
      const jwtUser = loggedUser(info)

      if (userId === jwtUser.id) throw new Error('Can\'t auto follow')

      await redis.sadd(`user:${userId}:followers`, jwtUser.id)
      await redis.sadd(`user:${jwtUser.id}:following`, userId)

      const usersOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'follow',
      )
      const userNode = constructInnerUserNode(usersOperation.selectionSet)

      return findUser(userId, userNode)
    },

    unFollow: async (_, { userId }, info, node) => {
      const jwtUser = loggedUser(info)

      await redis.srem(`user:${userId}:followers`, jwtUser.id)
      await redis.srem(`user:${jwtUser.id}:following`, userId)

      const usersOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'unFollow',
      )
      const userNode = constructInnerUserNode(usersOperation.selectionSet)

      return findUser(userId, userNode)
    },
  },

  Query: {
    users: async (_, params, info, node) => {
      const usersId = await redis.smembers('users')

      const usersOperation = node.operation.selectionSet.selections.find(
        s => s.name.value === 'users',
      )
      const userNode = constructInnerUserNode(usersOperation.selectionSet)

      return Promise.all(usersId.map(id => findUser(id, userNode)))
    },
  },

  findUser,
}
