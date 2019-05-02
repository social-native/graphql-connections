import { GraphQLScalarType } from 'graphql';
declare const typeDefs: import("graphql").DocumentNode;
declare const resolvers: {
    Filter: GraphQLScalarType;
    OrderBy: GraphQLScalarType;
    OrderDir: GraphQLScalarType;
    First: GraphQLScalarType;
    Last: GraphQLScalarType;
    Before: GraphQLScalarType;
    After: GraphQLScalarType;
};
declare const gqlTypes: {
    filter: GraphQLScalarType;
    orderBy: GraphQLScalarType;
    orderDir: GraphQLScalarType;
    first: GraphQLScalarType;
    last: GraphQLScalarType;
    before: GraphQLScalarType;
    after: GraphQLScalarType;
};
export { typeDefs, resolvers, gqlTypes };
