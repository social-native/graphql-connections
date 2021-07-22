import Koa from 'koa';
import {ApolloServer, gql} from 'apollo-server-koa';
import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../src';
import {test as testConfig} from '../knexfile.sqlite';
const knexClient = knex(testConfig);
import {
    typeDefs as connectionTypeDefs,
    resolvers as connectionResolvers
} from '../src/graphql_schema';

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
        isPetOwner: Boolean!
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
    isPetOwner: boolean;
}

type KnexQueryResult = Array<{[attributeName: string]: any}>;

// Provide resolver functions for your schema fields
const resolvers = {
    ...connectionResolvers,
    Query: {
        async users(_: any, input: IInputArgs) {
            const queryBuilder = knexClient.from('mock');
            // maps node types to sql column names
            const attributeMap = {
                id: 'id',
                username: 'username',
                firstname: 'firstname',
                age: 'age',
                haircolor: 'haircolor',
                lastname: 'lastname',
                bio: 'bio',
                isPetOwner: 'is_pet_owner'
            };

            const nodeConnection = new ConnectionManager<IUserNode>(input, attributeMap, {
                resultOptions: {
                    nodeTransformer: node => {
                        return {
                            ...node,
                            isPetOwner: node.is_pet_owner
                        };
                    }
                }
            });

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
};

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
    server.start().then(() => {
        server.applyMiddleware({app});
    });

    return app;
};

export default appProvider;
