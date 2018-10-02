module.exports = {
  toto: 'qsd',
  redis: (...p) => require('./redis')(...p),
  findPost: require('./findPost'),
  findUser: require('./findUser'),
  ...require('./innerNode'),
}
