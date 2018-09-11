const post = require('./post')
const user = require('./user')

module.exports = {
  Query: {
    ...post.Query,
    ...user.Query,
  },
  Mutation: {
    ...post.Mutation,
    ...user.Mutation,
  },
}
