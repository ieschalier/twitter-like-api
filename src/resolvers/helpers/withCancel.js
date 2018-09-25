module.exports = (asyncIterator, onCancel) => ({
  ...asyncIterator,
  return() {
    onCancel()
    return asyncIterator.return
      ? asyncIterator.return()
      : Promise.resolve({ value: undefined, done: true })
  },
})
