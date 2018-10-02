const { GraphQLServer, PubSub } = require('graphql-yoga')
const fs = require('fs')
const path = require('path')

const { Query, Mutation, Subscription } = require('./resolvers')

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8')

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    ...Query,
  },
  Mutation: {
    ...Mutation,
  },
  Subscription: {
    ...Subscription,
  },
}

const pubSub = new PubSub()

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: ({ request }) => ({ headers: request && request.headers, pubSub }),
})

server.start(
  {
    port: 4000,
    endpoint: '/graphql',
    subscriptions: '/subscriptions',
    playground: '/playground',
  },
  ({ port }) => console.log(`Server started on port ${port}`),
)
