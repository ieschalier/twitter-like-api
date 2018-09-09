const findSection = (selectionSet, value) =>
  selectionSet.selections.find(s => s.name.value === value)

const requestUserFor = (entity, request) => {
  const section = findSection(request.operation.selectionSet, entity)

  return !!findSection(section.selectionSet, 'user')
}

module.exports = {
  findSection,
  requestUserFor,
}
