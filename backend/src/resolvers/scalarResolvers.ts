import { GraphQLScalarType, Kind } from 'graphql'
import { GraphQLError } from 'graphql'

const DateTimeResolver = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString()
    }
    throw new GraphQLError(`Value is not an instance of Date: ${value}`)
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      return new Date(value)
    }
    throw new GraphQLError(`Value is not a valid DateTime string: ${value}`)
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value)
    }
    throw new GraphQLError(`Can only parse string values to DateTime but got a: ${ast.kind}`)
  },
})

const JSONResolver: GraphQLScalarType = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value
  },
  parseValue(value: any) {
    return value
  },
  parseLiteral(ast): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value)
      case Kind.OBJECT: {
        const value = Object.create(null)
        ast.fields.forEach((field: any) => {
          value[field.name.value] = JSONResolver.parseLiteral(field.value)
        })
        return value
      }
      case Kind.LIST:
        return ast.values.map((v: any) => JSONResolver.parseLiteral(v))
      default:
        return null
    }
  },
})

export const scalarResolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
}