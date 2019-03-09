import Koa from 'koa';
import {ApolloServer, gql} from 'apollo-server-koa';
import knex from 'knex';
import {ConnectionManager, INode, ICursorArgs, FilterArgs} from '../src';

const knexClient = knex({
    client: 'sqlite3',
    connection: {
        filename: './db/dev.sqlite3'
    }
});

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

    input InputCursorParams {
        """
        Number of edges to return at most
        """
        first: Int
        """
        Number of edges to return at most
        """
        last: Int
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
        """
        Ordering of the results.
        Should be an attribute on the Nodes in the connection
        """
        orderBy: String
    }

    input Filter {
        field: String!
        operator: String!
        value: String!
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
        users(cursor: InputCursorParams, filter: [Filter]): QueryUserConnection
        user: User
    }
`;

interface IUserNode extends INode {
    id: number;
}

type ICreatorFilterArgs = FilterArgs<
    'id' | 'username' | 'firstname' | 'age' | 'haircolor' | 'lastname'
>;

interface IUserInputArgs {
    cursor: ICursorArgs;
    filter: ICreatorFilterArgs;
}

type KnexQueryResult = Array<{[attributeName: string]: any}>;

// Provide resolver functions for your schema fields
const resolvers = {
    Query: {
        async users(_: any, {cursor: cursorArgs, filter: filterArgs}: IUserInputArgs) {
            const queryBuilder = knexClient.from('mock');

            // maps node types to sql column names
            const attributeMap = {
                id: 'id',
                username: 'username',
                firstname: 'firstname',
                age: 'age',
                haircolor: 'haircolor',
                lastname: 'lastname'
            };

            const nodeConnection = new ConnectionManager<
                IUserNode,
                IUserInputArgs['cursor'],
                IUserInputArgs['filter']
            >(cursorArgs, filterArgs, attributeMap);

            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;

            return {
                pageInfo: nodeConnection.createPageInfo(result),
                edges: nodeConnection.createEdges(result)
            };
        }
    }
};

const server = new ApolloServer({typeDefs, resolvers});

const app = new Koa();
server.applyMiddleware({app});

app.listen({port: 4000}, () =>
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
