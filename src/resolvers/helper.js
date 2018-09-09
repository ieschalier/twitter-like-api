const constructInnerPostInfo = selectionSet => ({
  fieldName: 'post',
  returnType: 'Post',
  parentType: 'Query',
  operation: {
    kind: 'OperationDefinition',
    operation: 'query',
    selectionSet: {
      kind: 'SelectionSet',
      selections: [
        {
          kind: 'Field',
          name: {
            kind: 'Name',
            value: 'post',
          },
          selectionSet,
        },
      ],
    },
  },
})

const constructInnerUserInfo = selectionSet => ({
  fieldName: 'user',
  returnType: 'User',
  parentType: 'Query',
  operation: {
    kind: 'OperationDefinition',
    operation: 'query',
    selectionSet: {
      kind: 'SelectionSet',
      selections: [
        {
          kind: 'Field',
          name: {
            kind: 'Name',
            value: 'user',
          },
          selectionSet,
        },
      ],
    },
  },
})

module.exports = {
  constructInnerPostInfo,
  constructInnerUserInfo,
}
