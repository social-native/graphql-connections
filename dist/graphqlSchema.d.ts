import { GraphQLScalarType } from 'graphql';
declare const typeDefs = "\n    scalar Filter\n    scalar OrderBy\n    scalar OrderDir\n    scalar First\n    scalar Last\n    scalar Before\n    scalar After\n\n    interface IConnection {\n        pageInfo: PageInfo!\n    }\n\n    interface IEdge {\n        cursor: String!\n    }\n\n    type PageInfo {\n        hasPreviousPage: Boolean!\n        hasNextPage: Boolean!\n        startCursor: String!\n        endCursor: String!\n    }\n";
declare const resolvers: {
    Filter: GraphQLScalarType;
    OrderBy: GraphQLScalarType;
    OrderDir: GraphQLScalarType;
    First: GraphQLScalarType;
    Last: GraphQLScalarType;
    Before: GraphQLScalarType;
    After: GraphQLScalarType;
    IConnection: {
        __resolveType(): null;
    };
    IEdge: {
        __resolveType(): null;
    };
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
