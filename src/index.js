const { GraphQLServer } = require('graphql-yoga')
const fs = require('fs')
const path = require('path')

const { Query, Mutation } = require('./resolvers')

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8')

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    ...Query,
  },
  Mutation: {
    ...Mutation,
  },
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: ({ request }) => ({ headers: request.headers }),
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
