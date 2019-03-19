# SNPKG-SNAPI-Connections :diamond_shape_with_a_dot_inside:


## About

`SNPKG-SNAPI-Connections` helps handle the traversal of edges between nodes. 

It can be used to:

1. Create a cursor for paging through a node's edges
2. Handle movement through a node's edges using an existing cursor.

## Run locally

1. Run the migrations `NODE_ENV=development npm run migrate:latest`
2. Seed the database `NODE_ENV=development npm run seed:run`
3. Run the dev server `npm run dev`
4. Visit the GraphQL playground [http://localhost:4000/graphql](http://localhost:4000/graphql)
5. Run some queries!

```graphql
query {
  users(
    input: {
      page: {first: 100},
      order: {orderBy: "haircolor"},
      filter: [
        {field: "id", operator: ">", value: "19990"},
        {field: "age", operator: "<", value: "90"},
      ]
    }
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
  users(
    input:{
      page: {first: 10},
      cursor: {after: "eyJmaXJzdFJlc3VsdElkIjoxOTk5MiwibGFzdFJlc3VsdE"}
   }) {
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

## How to use

### Overview

```typescript
// import the manager and relevant types
import {ConnectionManager, INode} from 'snpkg-snapi-connections';

resolver = async (obj, inputArgs) => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<
        IUserNode,
    >(inputArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    // run the query
    const result = await appliedQuery.select()

    // add the result to the nodeConnection
    nodeConnection.addResult(result);

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.pageInfo,
        edges: nodeConnection.edges
    };
}
```


To correctly initialize, you will need to supply a `Node` type, the `inputArgs` args, and an `attributeMap` map:

##### `Node`

The nodes that are part of a connection need a type. For example, in this case we create an `IUserNode`

```typescript
interface IUserNode extends INode {
    id: number;
    createdAt: string;
}
```

##### inputArgs

InputArgs supports `page`, `cursor`, `filter`, and `order`:

```typescript
interface IInputArgs {
    cursor?: {
        before?: string; // cursor
        after?: string; // cursor
    };
    page?: {
        first?: number;
        last?: number;
    };
    order?: {
        orderBy?: string; // node field
    };
    filter?: IFilter[];
}

interface IFilter {
    value: string;
    operator: string;
    field: string; // node field
}
```

Note: The default filter operators are the normal SQL comparison operators: `>`, `<`, `=`, `>=`, `<=`, and `<>`

##### attributeMap

`attributeMap` is a map of GraphQL field names to SQL column names

 ex:

 ```typescript
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```

### Options

If you are using the `Manager` you can supply options via the third parameter. Options are used to customize the `QueryContext`, the `QueryBuilder`, and the `QueryResult` classes.

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
number
```

The default limit (page size) if none is specified in the `page` input params

##### cursorEncoder

```typescript
interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
```

#### builderOptions

##### filterMap

```typescript
interface IFilterMap {
  [operator: string]: string
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

### Extensions

To extend the connection to a new datastore or to use an adapter besides `Knex`, you will need to create a new `QueryBuilder`. See `src/KnexQueryBuilder` for an example of what a query builder looks like. It should have the type signature:

```typescript
interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
```

### Architecture

Internally, the `ConnectionManager` manages the orchestration of the `QueryContext`, `QueryBuilder`, and `QueryResult`. 

The orchestration follows the steps:

1. The `QueryContext` extracts the connection attributes from the input connection arguments. 
2. The `QueryBuilder` (or `KnexQueryBuilder` in the default case) consumes the connection attributes and builds a query. The query is submitted to the database by the user and the result is sent to the `QueryResult`. 
3. The `QueryResult` uses the result to build the `edges` (which contain a `cursor` and `node`) and extract the `page info`.

This can be visualized as such:

![Image of Architecture](https://docs.google.com/drawings/d/e/2PACX-1vRwtC2UiFwLXFDbmBNoq_6bD1YTyACV49SWHxfj2ce_K5T_XEZYlgGP7ntbcskoMVWqXp5C2Uj-K7Jj/pub?w=1163&amp;h=719)

