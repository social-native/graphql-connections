import Koa from 'koa';
import {ApolloServer, gql, IResolvers} from 'apollo-server-koa';
import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../src';
import {test as testConfig} from '../knexfile.sqlite';
const knexClient = knex(testConfig);
import {
    typeDefs as connectionTypeDefs,
    resolvers as connectionResolvers
} from '../src/graphqlSchema';

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    type User {
        id: ID
        username: String
        firstname: String
        lastname: String
        bio: String
        age: Int
        haircolor: String
    }

    type QueryUserConnection implements IConnection {
        pageInfo: PageInfo!
        edges: [QueryUserEdge]
    }

    type QueryUserEdge implements IEdge {
        cursor: String!
        node: User
    }

    type Query {
        users(
            first: First
            last: Last
            orderBy: OrderBy
            orderDir: OrderDir
            before: Before
            after: After
            filter: Filter
        ): QueryUserConnection
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
    ...connectionResolvers,
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
    IConnection: {
        __resolveType() {
            return null;
        }
    },
    IEdge: {
        __resolveType() {
            return null;
        }
    }
} as IResolvers;

const appProvider = () => {
    const allTypeDefs = gql`
        ${typeDefs}
        ${connectionTypeDefs}
    `;
    const server = new ApolloServer({
        typeDefs: allTypeDefs,
        resolvers
    });
    const app = new Koa();
    server.applyMiddleware({app});
    return app;
};

export default appProvider;
