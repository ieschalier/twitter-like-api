const jwt = require('jsonwebtoken')

// 😱
const secret = '123456'

const loggedUser = context => {
  const { authorization } = context.headers
  const jwtUser = jwt.verify(authorization, secret)

  if (!jwtUser.id || !jwtUser.name) throw new Error('jwt data malformed')

  return jwtUser
}

const allowUser = user => {
  const token = jwt.sign(user, secret, { expiresIn: '1 year' })

  return token
}

module.exports = {
  loggedUser,
  allowUser,
}
