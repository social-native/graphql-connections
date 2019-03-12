# SNPKG-SNAPI-Connections

## About

This repo contains the code to handle 1-to-Many connections. Or in other words, when a node has many edges.

It can be used to:

1. Create a cursor for paging through a node's edges
2. Handle movement through a node's edges using an existing cursors.

## Run locally

1. Run the migrations `NODE_ENV=development npm run migrate:latest`
2. Seed the database `NODE_ENV=development npm run seed:run`
3. Run the dev server `npm run dev`
4. Visit the GraphQL playground [http://localhost:4000/graphql](http://localhost:4000/graphql)
5. Run some queries!

```graphql
query {
  users(
    cursor:{first: 100, orderBy: "haircolor"}, 
    filter: [
      {field: "id", operator: ">", value: "19990"},
      {field: "age", operator: "<", value: "90"},
    ]
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
    cursor:{
      first: 10, 
      after: "eyJmaXJzdFJlc3VsdElkIjoxOTk5MiwibGFzdFJlc3VsdE"
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

### Overview:

```typescript
// import the manager and relevant types
import {ConnectionManager, INode, ICursorArgs, FilterArgs} from 'snpkg-snapi-connections';

resolver = () => {
    // create a new node connection instance
    const nodeConnection = new ConnectionManager<
        ICreatorNode,
        ICursorArgs,
        ICreatorFilterArgs
    >(cursorArgs, filterArgs, attributeMap);

    // apply the connection to the queryBuilder
    const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());

    // run the query
    const result = await appliedQuery.select()

    // return the relevant connection information from the resolver
    return {
        pageInfo: nodeConnection.createPageInfo(result),
        edges: nodeConnection.createEdges(result)
    };
}
```


### Types

##### `Node`

The nodes used in a conection need a type. For example, in this case we create an `ICreatorNode`

```typescript
interface ICreatorNode extends INode {
    id: number;
    createdAt: string;
}
```

##### `Cursor`

This will likely be `ICursorArgs` unless you are doing something special.

##### `Filter`

The filter type needs to know about attributes that can be filterd on:

```typescript
type ICreatorFilterArgs = FilterArgs<'id' | 'createdAt'>;
```

### Arguments

##### Cursor args

`cursorArgs` should be a graphql input type that matches:

```graphql
input InputCursorParams {
    first: Int
    last: Int
    after: String
    before: String
    orderBy: String
}
```

##### Filter args

`filterArgs` should be a graphql input type that matches:

```graphql
input Filter {
    field: String!
    operator: String!
    value: String!
}

type InputFilterParams = [Filter]
```

##### Attribute Map

`attributeMap` is a map of GraphQL field names to SQL column names

 ex:

 ```typescript
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```
