const redis = require('../helpers/redis')
const {
  constructInnerPostNode,
  constructInnerUserNode,
} = require('../helpers/innerNode')
const { findPost } = require('../post/helper')

const findUser = async (id, node) => {
  // if (depth <= 0) return null

  const { password, ...user } = await redis.hgetall(`user:${id}`)

  const userOperation = node.operation.selectionSet.selections.find(
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
    const postsId = await redis.lrange(`user:${user.id}:posts`, 0, -1)

    const postNode = constructInnerPostNode(queryPosts.selectionSet)

    const posts = await Promise.all(
      postsId.map(postId => findPost(postId, postNode)),
    )

    return posts
  }

  const getUser = selectionSet => (userId) => {
    const followersNode = constructInnerUserNode(selectionSet)
    return findUser(userId, followersNode)
  }

  const getFollowers = async () => {
    const followersId = await redis.smembers(`user:${id}:followers`)

    return Promise.all(followersId.map(getUser(queryFollowers.selectionSet)))
  }

  const getFollowing = async () => {
    const followingId = await redis.smembers(`user:${id}:following`)

    return Promise.all(followingId.map(getUser(queryFollowing.selectionSet)))
  }

  return {
    ...user,
    posts: queryPosts ? await getPosts() : [],
    followers: queryFollowers ? await getFollowers() : [],
    following: queryFollowing ? await getFollowing() : [],
  }
}

module.exports = findUser
