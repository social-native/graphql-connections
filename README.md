# SNPKG-SNAPI-Connections

## About

This repo contains the code to handle 1-to-Many connections. Or in other words, when a node has many edges.

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

resolver = (obj, inputArgs) => {
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


To correctly initialize, you will need to supply a `Node` type, the `inputArgs` args, and a `attributeMap` map:

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
        before?: string;
        after?: string;
    };
    page?: {
        first?: number;
        last?: number;
    };
    order?: {
        orderBy?: string;
    };
    filter?: Array<IFilter<string>>;
}

interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}
```

##### attributeMap

`attributeMap` is a map of GraphQL field names to SQL column names

 ex:

 ```typescript
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```

### Extensions

To extend the connection to a new datastore or to use an adapter besides `Knex`, you will need to create a new `QueryBuilder`. See `src/KnexQueryBuilder` for an example of what a query builder looks like. It should have the type signature:

```typescript
interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
```
