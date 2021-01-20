# GraphQL-Connections :diamond_shape_with_a_dot_inside:

- [GraphQL-Connections :diamond_shape_with_a_dot_inside:](#graphql-connections-diamond_shape_with_a_dot_inside)
  - [Install](#install)
  - [About](#about)
  - [Run locally](#run-locally)
  - [How to use - Schema](#how-to-use---schema)
    - [1. Add input scalars to schema](#1-add-input-scalars-to-schema)
    - [2. Add typeDefs to your schema](#2-add-typedefs-to-your-schema)
      - [Manually](#manually)
      - [String interpolation](#string-interpolation)
      - [During configuration](#during-configuration)
    - [3. Add resolvers](#3-add-resolvers)
      - [In the resolver object](#in-the-resolver-object)
      - [During configuration](#during-configuration-1)
  - [How to use - Resolvers](#how-to-use---resolvers)
    - [Short Tutorial](#short-tutorial)
    - [Detailed Tutorial](#detailed-tutorial)
      - [1. Initialize the `nodeConnection`](#1-initialize-the-nodeconnection)
        - [A. set the `Node` type](#a-set-the-node-type)
        - [B. add inputArgs](#b-add-inputargs)
        - [C. specify an attributeMap](#c-specify-an-attributemap)
      - [2. build the query](#2-build-the-query)
      - [3. execute the query and build the `connection`](#3-execute-the-query-and-build-the-connection)
    - [Options](#options)
      - [contextOptions](#contextoptions)
        - [defaultLimit](#defaultlimit)
        - [cursorEncoder](#cursorencoder)
      - [builderOptions - common](#builderoptions---common)
        - [filterTransformer](#filtertransformer)
        - [filterMap](#filtermap)
      - [builderOptions - MySQL specific](#builderoptions---mysql-specific)
        - [searchColumns](#searchcolumns)
        - [searchModifier](#searchmodifier)
      - [resultOptions](#resultoptions)
        - [nodeTransformer](#nodetransformer)
        - [cursorEncoder](#cursorencoder-1)
  - [Extensions](#extensions)
  - [Architecture](#architecture)
  - [Search](#search)
  - [Filtering on computed columns](#filtering-on-computed-columns)

## Install

Install by referencing the github location and the release number:

```
npm install --save graphql-connections#v2.2.0
```

## About

`GraphQL-Connections` helps handle the traversal of edges between nodes.

In a graph, nodes connect to other nodes via edges. In the relay graphql spec, multiple edges can be represented as a single `Connection` type, which has the signature:

```typescript
type Connection {
  pageInfo: {
    hasNextPage: string
    hasPreviousPage: string
    startCursor: string
    endCursor: string
  },
  edges:  Array<{cursor: string; node: Node}>
}
```

A connection object is returned to a user when a `query request` asks for multiple child nodes connected to a parent node.
For example, a music artist has multiple songs. In order to get all the `songs` for an `artist` you would write the graphql query request:

```graphql
query {
    artist(id: 1) {
        songs {
            songName
            songLength
        }
    }
}
```

However, sometimes you may only want a portion of the songs returned to you. To allow for this scenario, a `connection` is used to represent the response type of a `song`.

```graphql
query {
    artist(id: 1) {
        songs {
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
            edges {
                cursor
                node {
                    songName
                    songLength
                }
            }
        }
    }
}
```

You can use the `cursors` (`startCursor`, `endCursor`, or `cursor`) to get the next set of edges.

```graphql
query {
  artist(id: 1) {
    songs(next: 10, after: <endCursor>) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          songName
          songLength
        }
      }
    }
  }
}

```

The above logic is controlled by the `connectionManager`. It can be added to a resolver to:

1. Create a cursor for paging through a node's edges
2. Handle movement through a node's edges using an existing cursor.
3. Support multiple input types that can sort, group, limit, and filter the edges in a connection

## Run locally

1. Run the migrations
    - `NODE_ENV=development npm run migrate:sqlite:latest`
    - `NODE_ENV=development npm run migrate:mysql:latest`
2. Seed the database
    - `NODE_ENV=development npm run seed:sqlite:run`
    - `NODE_ENV=development npm run seed:mysql:run`
3. Run the dev server
    - `npm run dev:sqlite` (search is not supported)
    - `npm run dev:mysql` (search IS supported :))
4. Visit the GraphQL playground [http://localhost:4000/graphql](http://localhost:4000/graphql)
5. Run some queries!

```graphql
query {
    users(
        first: 100
        orderBy: "haircolor"
        filter: {
            and: [
                {field: "id", operator: ">", value: "19990"}
                {field: "age", operator: "<", value: "90"}
            ]
        }
        search: "random search term"
    ) {
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
        edges {
            cursor
            node {
                username
                lastname
                id
                haircolor
                bio
            }
        }
    }
}
```

```graphql
query {
    users(first: 10, after: "eyJmaXJzdFJlc3VsdElkIjoxOTk5MiwibGFzdFJlc3VsdE") {
        pageInfo {
            hasNextPage
            hasPreviousPage
        }
        edges {
            cursor
            node {
                username
                lastname
                id
                haircolor
                bio
            }
        }
    }
}
```

## How to use - Schema

### 1. Add input scalars to schema

Add the input scalars (`First`, `Last`, `OrderBy`, `OrderDir`, `Before`, `After`, `Filter`, `Search`) to your GQL schema.

At the very least you should add `Before`, `After` and `First`, `Last` because they allow you to move along the connection with a cursor.

```graphql
type Query {
    users(
        first: First
        last: Last
        orderBy: OrderBy
        orderDir: OrderDir
        before: Before
        after: After
        filter: Filter
        search: Search
    ): QueryUsersConnection
}
```

### 2. Add typeDefs to your schema

#### Manually

```graphql

scalar: First
scalar: Last
scalar: OrderBy
scalar: OrderDir
scalar: Before
scalar: After
scalar: Filter
scalar: Search

type Query {
  users(
      first: First
      last: Last
      orderBy: OrderBy
      orderDir: OrderDir
      before: Before
      after: After
      filter: Filter
      search: Search
  ): QueryUsersConnection
}
```

#### String interpolation

```typescript
import {typeDefs} from 'graphql-connections'

const schema = `
  ${...typeDefs}
  type Query {
    users(
        first: First
        last: Last
        orderBy: OrderBy
        orderDir: OrderDir
        before: Before
        after: After
        filter: Filter
        search: Search
    ): QueryUsersConnection
  }
`
```

#### During configuration

```typescript
import {typeDefs as connectionTypeDefs} from 'graphql-connections'

    const schema = makeExecutableSchema({
        ...
        typeDefs: `${typeDefs} ${connectionTypeDefs}`
    });
```

### 3. Add resolvers

#### In the resolver object

```typescript
import {resolvers as connectionResolvers} from 'graphql-connections'

const resolvers = {
  ...connectionResolvers,

  Query: {
    users: {
      ....
    }
  }
}

```

#### During configuration

```typescript
import {resolvers as connectionResolvers} from 'graphql-connections'

    const schema = makeExecutableSchema({
        ...
        resolvers: {...resolvers, ...connectionResolvers}
    });
```

## How to use - Resolvers

### Short Tutorial

In short, this is what a resolver using the `connectionManager` will look like:

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'graphql-connections';

const resolver = async (obj, inputArgs) => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<INode>(inputArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    // run the query
    const result = await appliedQuery.select();

    // add the result to the nodeConnection
    nodeConnection.addResult(result);

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
};
```

types:

```typescript
// the type of each returned node
interface INode {
  [nodeField: string]: any
}

// input types to control the edges returned
interface IInputArgs {
  before?: string;
  after?: string;
  first?: number;
  last?: number;
  orderBy?: string;
  orderDir?: keyof typeof ORDER_DIRECTION;
  filter?: IInputFilter;
}

// map of node field to sql column name
interface IInAttributeMap {
  [nodeField: string]: string;
}

// the nodeConnection class type
interface INodeConnection {
  createQuery: (KnexQueryBuilder) => KnexQueryBuilder
  addResult: (KnexQueryResult) => void
  pageInfo?: IPageInfo
  edges?: IEdge[]

interface IPageInfo: {
  hasNextPage: string
  hasPreviousPage: string
  startCursor: string
  endCursor: string
}

interface IEdge {
  cursor: string;
  node: INode
}
```

All types can be found in [src/types.ts](./src/types.ts)

### Detailed Tutorial

A `nodeConnection` is used to handle connections.

To use a `nodeConnection` you will have to:

1.  initialize the nodeConnection
2.  build the connection query
3.  build the connection from the executed query

#### 1. Initialize the `nodeConnection`

To correctly initialize, you will need to supply a `Node` type, the `inputArgs` args, and an `attributeMap` map:

##### A. set the `Node` type

The nodes that are part of a connection need a type. The returned edges will contain nodes of this type.

For example, in this case we create an `IUserNode`

```typescript
interface IUserNode extends INode {
    id: number;
    createdAt: string;
}
```

##### B. add inputArgs

InputArgs supports `before`, `after`, `first`, `last`, `orderBy`, `orderDir`, and `filter`:

```typescript
interface IInputArgs {
    before?: string; // cursor
    after?: string; // cursor
    first?: number; // page size
    last?: number; // page size
    orderBy?: string; // order by a node field
    orderDir: 'asc' | 'desc';
    filter?: IOperationFilter;
}

interface IFilter {
    value: string;
    operator: string;
    field: string; // node field
}

interface IOperationFilter {
    and?: Array<IOperationFilter & IFilter>;
    or?: Array<IOperationFilter & IFilter>;
    not?: Array<IOperationFilter & IFilter>;
}
```

Note: The default filter operators are the normal SQL comparison operators: `>`, `<`, `=`, `>=`, `<=`, and `<>`

An example query with a filter could look like:

```graphql
query {
    users(
        filter: {
            or: [
                {field: "age", operator: "=", value: "40"}
                {field: "age", operator: "<", value: "30"}
                {
                    and: [
                        {field: "haircolor", operator: "=", value: "blue"}
                        {field: "age", operator: "=", value: "70"}
                        {
                            or: [
                                {field: "username", operator: "=", value: "Ellie86"}
                                {field: "username", operator: "=", value: "Euna_Oberbrunner"}
                            ]
                        }
                    ]
                }
            ]
        }
    ) {
        pageInfo {
            hasNextPage
            hasPreviousPage
        }
        edges {
            cursor
            node {
                id
                age
                haircolor
                lastname
                username
            }
        }
    }
}
```

This would yield a sql query equivalent to:

```sql
  SELECT *
    FROM `mock`
   WHERE `age` = '40' OR `age` < '30' OR (`haircolor` = 'blue' AND `age` = '70' AND (`username` = 'Ellie86' OR `username` = 'Euna_Oberbrunner'))
ORDER BY `id`
     ASC
   LIMIT 1001
```

##### C. specify an attributeMap

`attributeMap` is a map of GraphQL field names to SQL column names

Only fields defined in the attribute map can be `orderBy` or `filtered` on. An error will be thrown if you try to filter on fields that don't exist in the map.

ex:

```typescript
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```

#### 2. build the query

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'graphql-connections';

const resolver = async (obj, inputArgs) => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<
        IUserNode,
    >(inputArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    ....
}
```

#### 3. execute the query and build the `connection`

A connection type has the signature:

```typescript
type Connection {
  pageInfo: {
    hasNextPage: string
    hasPreviousPage: string
    startCursor: string
    endCursor: string
  },
  edges:  Array<{cursor: string; node: Node}>
}
```

This type is constructed by taking the `result` of executing the query and adding it to the `connectionManager` instance via the `addResult` method.

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'graphql-connections';

const resolver = async (obj, inputArgs) => {
    ...

    // run the query
    const result = await appliedQuery

    // add the result to the nodeConnection
    nodeConnection.addResult(result);

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
```

### Options

You can supply options to the `ConnectionManager` via the third parameter. Options are used to customize the `QueryContext`, the `QueryBuilder`, and the `QueryResult` classes.

```typescript
    const options = {
      contextOptions: { ... }
      resultOptions: { ... }
      builderOptions: { ... }
    }
    const nodeConnection = new ConnectionManager(inputArgs, attributeMap, options);
```

Currently, the options are:

#### contextOptions

##### defaultLimit

```typescript
number;
```

The default limit (page size) if none is specified in the `page` input params

##### cursorEncoder

```typescript
interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
```

#### builderOptions - common

##### filterTransformer

```typescript
type filterTransformer = (filter: IFilter) => IFilter;
```

The filter transformer will will be called on every filter `{ field: string, operator: string, value: string}`

It can be used to transform a filter before being applied to the query. This is useful if you want to transform say UnixTimestamps to DateTime format, etc...

##### filterMap

```typescript
interface IFilterMap {
    [operator: string]: string;
}
```

The filter operators that can be specified in the `filter` input params.

If no map is specified, the default one is used:

```typescript
const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};
```

#### builderOptions - MySQL specific

##### searchColumns

Used with full text `Search` input. It is an array of column names that will be used in the full text search sql expression `MATCH (col1,col2,...) AGAINST (expr [search_modifier])`

```typescript
searchColumns: string[]
```

##### searchModifier

Used with full text `Search` input. It is an array of column names that will be used in the full text search sql expression `MATCH (col1,col2,...) AGAINST (expr [search_modifier])`

```typescript
searchColumns: string;
```

The values will likely be one of:

```typescript
      'IN NATURAL LANGUAGE MODE',
    | 'IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION',
    | 'IN BOOLEAN MODE',
    | 'WITH QUERY EXPANSION'
```

#### resultOptions

##### nodeTransformer

```typescript
type NodeTransformer<Node> = (node: any) => Node;
```

A function that is will be called during the creation of each node. This can be used to map the query result to a `Node` type that matches the graphql Node for the resolver.

##### cursorEncoder

```typescript
interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
```

## Extensions

To extend the connection to a new datastore or to use an adapter besides `Knex`, you will need to create a new `QueryBuilder`. See `src/KnexQueryBuilder` for an example of what a query builder looks like. It should have the type signature:

```typescript
interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
```

## Architecture

Internally, the `ConnectionManager` manages the orchestration of the `QueryContext`, `QueryBuilder`, and `QueryResult`.

The orchestration follows the steps:

1. The `QueryContext` extracts the connection attributes from the input connection arguments.
2. The `QueryBuilder` (or `KnexQueryBuilder` in the default case) consumes the connection attributes and builds a query. The query is submitted to the database by the user and the result is sent to the `QueryResult`.
3. The `QueryResult` uses the result to build the `edges` (which contain a `cursor` and `node`) and extract the `page info`.

This can be visualized as such:

![Image of Architecture](https://docs.google.com/drawings/d/e/2PACX-1vRwtC2UiFwLXFDbmBNoq_6bD1YTyACV49SWHxfj2ce_K5T_XEZYlgGP7ntbcskoMVWqXp5C2Uj-K7Jj/pub?w=1163&h=719)

## Search

Search inputs are provided for executing full text search query strings against a datastore. At the moment only MySQL support exists.
Using filters may slow down the query.

An example resolver might look like:

```typescript
const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio'
};

const builderOptions = {
    searchColumns: ['username', 'firstname', 'lastname', 'bio', 'haircolor'],
    searchModifier: 'IN NATURAL LANGUAGE MODE'
};
const nodeConnection = new ConnectionManager<IUserNode>(inputArgs, attributeMap, {
    builderOptions
});

const query = nodeConnection.createQuery(queryBuilder.clone()).select();
const result = (await query) as KnexQueryResult;

nodeConnection.addResult(result);

return {
    pageInfo: nodeConnection.pageInfo,
    edges: nodeConnection.edges
};
```

## Filtering on computed columns

Sometimes you may compute a field that depends on some other table than the one being paged over. In this case, you can use a derived table as your `from` and alias it to the primary table. In the following example we create a derived alias of "segment", the table we are paging over, to allow filtering and sorting on "popularity", a field computed on the aggregation of values from another table.

```ts
import {Resolver} from 'types/resolver';
import {ISegmentNode} from 'types/graphql';
import {segment as segmentTransformer} from 'transformers/sql_to_graphql';
import {IQueryResult, IInputArgs, ConnectionManager} from 'graphql-connections';

const attributeMap = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    name: 'name',
    explorer: 'explorer_id',
    popularity: 'popularity'
};

const segments: Resolver<Promise<IQueryResult<ISegmentNode>>, undefined, IInputArgs> = async (
    _,
    input: IInputArgs,
    ctx
) => {
    const {connection} = ctx.clients.sqlClient;

    const queryBuilder = connection.queryBuilder().from(
        connection.raw(
            `(
            select
                segment.*,
                coalesce(sum(user_segment.usage_count), 0) as popularity
            from segment
                     left join user_segment on user_segment.segment_id = segment.id
            group by
                segment.id
        ) as segment`
        )
    );

    const nodeConnection = new ConnectionManager<ISegmentNode>(input, attributeMap, {
        builderOptions: {
            filterTransformer(filter) {
                if (filter.field === 'popularity') {
                    return {
                        field: 'popularity',
                        operator: filter.operator,
                        value: Number(filter.value) as any
                    };
                }

                return filter;
            }
        },
        resultOptions: {
            nodeTransformer: segmentTransformer
        }
    });

    const query = nodeConnection.createQuery(queryBuilder).select('*');

    nodeConnection.addResult(await query);

    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
};

export default segments;
```
