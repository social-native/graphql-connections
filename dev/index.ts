import Koa from 'koa';
import {ApolloServer, gql, IResolvers} from 'apollo-server-koa';
import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../src';
import inputUnionType from '../src/InputUnionType';

import {development as developmentConfig} from '../knexfile';
import {GraphQLInputObjectType, GraphQLString, GraphQLList} from 'graphql';
const knexClient = knex(developmentConfig);

const compoundFilterScalar = new GraphQLInputObjectType({
    name: 'CompoundFilterScalar',
    fields() {
        return {
            and: {
                type: new GraphQLList(filterInputScalar)
            },
            or: {
                type: new GraphQLList(filterInputScalar)
            },
            not: {
                type: new GraphQLList(filterInputScalar)
            }
        };
    }
});

const filterScalar = new GraphQLInputObjectType({
    name: 'FilterScalar',
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

const filterInputScalar = inputUnionType('FilterInputScalar', [compoundFilterScalar, filterScalar]);

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    scalar FilterInputScalar

    type User {
        id: ID
        username: String
        firstname: String
        lastname: String
        bio: String
        age: Int
        haircolor: String
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
        """
        Number of edges to return at most
        """
        first: Int
        """
        Number of edges to return at most
        """
        last: Int
        """
        Ordering of the results.
        Should be a field on the Nodes in the connection
        """
        orderBy: String
        """
        Direction order the results by.
        Should be 'asc' or 'desc'
        """
        orderDir: String
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
        filter: FilterInputScalar
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

            const query = nodeConnection.createQuery(queryBuilder.clone()).select();
            const result = (await query) as KnexQueryResult;

            nodeConnection.addResult(result);

            return {
                pageInfo: nodeConnection.pageInfo,
                edges: nodeConnection.edges
            };
        }
    },
    FilterInputScalar: filterInputScalar
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
