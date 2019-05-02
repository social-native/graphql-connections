import { GraphQLScalarType } from 'graphql';
declare const typeDefs: import("graphql").DocumentNode;
declare const resolvers: {
    FilterInputScalar: GraphQLScalarType;
    OrderBy: GraphQLScalarType;
    OrderDir: GraphQLScalarType;
    First: GraphQLScalarType;
    Last: GraphQLScalarType;
    Before: GraphQLScalarType;
    After: GraphQLScalarType;
};
export { typeDefs, resolvers };
