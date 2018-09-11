const redis = require('../helpers/redis')
const findUser = require('../helpers/findUser')
const { constructInnerUserNode } = require('../helpers/innerNode')

const findPost = async (id, node) => {
  // if (depth <= 0) return null

  const postOperation = node.operation.selectionSet.selections.find(
    s => s.name.value === 'post',
  )
  const queryUser = postOperation.selectionSet.selections.find(
    s => s.name.value === 'user',
  )
  const queryLikes = postOperation.selectionSet.selections.find(
    s => s.name.value === 'likes',
  )

  const post = await redis.hgetall(`post:${id}`)

  const resolveUser = () => findUser(post.user, constructInnerUserNode(queryUser.selectionSet))
  const user = queryUser && (await resolveUser())

  const likeUsersId = await redis.smembers(`post:${id}:liked`)
  const resolveLike = (userId) => {
    const likeUserInfo = constructInnerUserNode(queryLikes.selectionSet)

    return findUser(userId, likeUserInfo)
  }
  const likes = queryLikes && (await Promise.all(likeUsersId.map(resolveLike)))

  return {
    ...post,
    user,
    likes,
  }
}
module.exports = {
  findPost,
}
