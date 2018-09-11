const express = require('express')
const graphqlHTTP = require('express-graphql')
const { buildSchema } = require('graphql')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const resolvers = require('./resolvers')

const schema = buildSchema(
  fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8'),
)

const app = express()

const extensions = ({
  // document,
  // variables,
  // operationName,
  // result,
  context,
}) => ({
  runTime: Date.now() - context ? context.startTime : 0,
})

app.options('/graphql', cors())

app.use('/hello', (req, res) => {
  res.statusCode = 200
  res.end('hello')
})

app.use(
  '/graphql',
  graphqlHTTP((request, response) => {
    response.header('Access-Control-Allow-Origin', '*')
    return {
      schema,
      rootValue: resolvers,
      context: { startTime: Date.now(), headers: request.headers, resolvers },
      graphiql: true,
      extensions,
      formatError: error => ({
        message: error.message,
        locations: error.locations,
        stack: error.stack ? error.stack.split('\n') : [],
        path: error.path,
      }),
    }
  }),
)

app.listen(process.env.PORT || 4000)
console.log(`server start on port ${process.env.PORT || 4000}`)
