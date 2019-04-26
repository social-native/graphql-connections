import Koa from 'koa';
import {ApolloServer, gql, IResolvers} from 'apollo-server-koa';
import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../src';

import {development as developmentConfig} from '../knexfile';
import {
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLScalarType,
    valueFromAST,
    GraphQLError,
    isValidLiteralValue
} from 'graphql';
const knexClient = knex(developmentConfig);

const operationFilterScalarType = new GraphQLInputObjectType({
    name: 'OperationFilter',
    fields() {
        return {
            and: {
                type: nestedOperationFilter
            },
            or: {
                type: nestedOperationFilter
            }
        };
    }
});

const filterScalarType = new GraphQLInputObjectType({
    name: 'Filter',
    fields() {
        return {
            field: {
                type: GraphQLString
            },
            operator: {
                type: GraphQLString
            },
            value: {
                type: GraphQLString
            }
        };
    }
});

const printInputType = (type: GraphQLInputObjectType) => {
    const fields = type.getFields();
    const fieldNames = Object.keys(fields);
    const typeSig = fieldNames.reduce(
        (acc, name) => {
            acc[name] = fields[name].type.toString();
            return acc;
        },
        {} as {
            [field: string]: string;
        }
    );
    return JSON.stringify(typeSig)
        .replace(/[\\"]/gi, '')
        .replace(/[:]/gi, ': ')
        .replace(/[,]/gi, ', ');
};

const nestedOperationFilter = new GraphQLScalarType({
    name: 'NestedOperationFilter',
    serialize: (value: any) => value,
    parseValue: () => {
        return 2;
    },
    parseLiteral: ast => {
        const potentialTypes = [operationFilterScalarType, filterScalarType];
        const inputType = potentialTypes.reduce((acc: any, type) => {
            const astClone = JSON.parse(JSON.stringify(ast));
            try {
                return isValidLiteralValue(type, astClone).length === 0 ? type : acc;
            } catch (e) {
                return acc;
            }
        }, undefined);
        if (inputType) {
            return valueFromAST(ast, inputType);
        } else {
            const validTypes = potentialTypes.map(t => `${t.name}: ${printInputType(t)}`);
            throw new GraphQLError(`expected one of ${validTypes}`);
        }
    }
}) as GraphQLScalarType;

// Construct a schema, using GraphQL schema language
// scalar OperationFilter
const typeDefs = gql`
    scalar Filter
    scalar NestedOperationFilter

    type User {
        id: ID
        username: String
        firstname: String
        lastname: String
        bio: String
        age: Int
        haircolor: String
    }

    input InputPageParams {
        """
        Number of edges to return at most
        """
        first: Int
        """
        Number of edges to return at most
        """
        last: Int
    }

    input InputCursorParams {
        """
        Previous cursor.
        Returns edges after this cursor
        """
        after: String
        """
        Following cursor.
        Returns edges before this cursor
        """
        before: String
    }

    input InputOrderParams {
        """
        Ordering of the results.
        Should be an attribute on the Nodes in the connection
        """
        orderBy: String
    }

    interface IConnection {
        pageInfo: PageInfo!
    }

    interface IEdge {
        cursor: String!
    }

    type PageInfo {
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        startCursor: String!
        endCursor: String!
    }

    type QueryUserConnection implements IConnection {
        pageInfo: PageInfo!
        edges: [QueryUserEdge]
    }

    type QueryUserEdge implements IEdge {
        cursor: String!
        node: User
    }

    input UserInputParams {
        page: InputPageParams
        order: InputOrderParams
        cursor: InputCursorParams
        filter: NestedOperationFilter
    }

    type Query {
        users(input: UserInputParams): QueryUserConnection
    }
`;

interface IUserNode {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    age: number;
    haircolor: string;
    bio: string;
}

type KnexQueryResult = Array<{[attributeName: string]: any}>;

// Provide resolver functions for your schema fields
const resolvers = {
    Query: {
        async users(_: any, {input: inputArgs}: {input: IInputArgs}) {
            const queryBuilder = knexClient.from('mock');
            // maps node types to sql column names
            const attributeMap = {
                id: 'id',
                username: 'username',
                firstname: 'firstname',
                age: 'age',
                haircolor: 'haircolor',
                lastname: 'lastname',
                bio: 'bio'
            };

            const nodeConnection = new ConnectionManager<IUserNode>(inputArgs, attributeMap);

            const result = (await nodeConnection
                .createQuery(queryBuilder.clone())
                .select()) as KnexQueryResult;

            nodeConnection.addResult(result);

            return {
                pageInfo: nodeConnection.pageInfo,
                edges: nodeConnection.edges
            };
        }
    },
    // OperationFilter: operationFilterScalarType,
    NestedOperationFilter: nestedOperationFilter,
    Filter: filterScalarType
} as IResolvers;

const server = new ApolloServer({typeDefs, resolvers});
const app = new Koa();
server.applyMiddleware({app});

app.listen({port: 4000}, () =>
    // tslint:disable-next-line
    console.log(
        `🚀 Server ready at http://localhost:4000${server.graphqlPath} (PID: ${process.pid})`
    )
);
