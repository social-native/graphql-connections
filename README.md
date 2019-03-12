# SNPKG-SNAPI-Connections

## About

This repo contains the code to handle 1-to-Many connections. Or in other words, when a node has many edges.

It can be used to create a cursor for the edges and handle movement through the edges using existing cursors.

## Run locally

1. Run the migrations `NODE_ENV=development npm run migrate:latest`
2. Seed the database `NODE_ENV=development npm run seed:run`
3. Run the dev server `npm run dev`
4. Visit the GraphQL playground [http://localhost:4000/graphql](http://localhost:4000/graphql)
5. Run some queries!

```
query {
  users(cursor:{first:100, orderBy: "haircolor"}, filter: [{field:"id", value: "19990", operator:">"}]) {
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

```
query {
  users(cursor:{first:10, after: "eyJmaXJzdFJlc3VsdElkIjoxOTk5MiwibGFzdFJlc3VsdElkIjoxOTk5OSwiaW5pdGlhbFNvcnQiOiJhc2MiLCJmaWx0ZXJzIjpbWyJpZCIsIj4iLCIxOTk5MCJdXSwib3JkZXJCeSI6ImhhaXJjb2xvciIsImlkIjoxOTk5NX0"}) {
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

### 1. Import the lib

```
import {ConnectionManager, INode, ICursorArgs, FilterArgs} from 'snpkg-snapi-connections';
```

### 2. Within in a connection resolver, instantiate the `ConnectionManager`

```
interface ICreatorInputArgs {
    cursor: ICursorArgs;
    filter: ICreatorFilterArgs;
}

async creators(_, {cursor: cursorArgs, filter: filterArgs}: ICreatorInputArgs) {
    ...

    const nodeConnection = new ConnectionManager<
        ICreatorNode,
        ICursorArgs,
        ICreatorFilterArgs
    >(cursorArgs, filterArgs, attributeMap);

    ...

```

### 3. Define Types specific to the resolver

##### Define a `Node` type

The nodes used in a conection need a type. For example, in this case we create an `ICreatorNode`

```
interface ICreatorNode extends INode {
    id: number;
    createdAt: string;
}
```

##### Define a `Cursor` type

This will likely be `ICursorArgs` unless you are doing something special.

##### Define a `Filter` type

The filter type needs to know about attributes that can be filterd on:

```
type ICreatorFilterArgs = FilterArgs<'id' | 'createdAt'>;
```

### 4. Pass in arguments to the constructor

##### Cursor args

`cursorArgs` should be a graphql input type that matches:

```
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
```

##### Filter args

`filterArgs` should be a graphql input type that matches:

```
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

 ```
const attributeMap = {
    id: 'id',
    createdAt: 'created_at'
};
```

### 5. Add the connection query to the queryBuilder

```
const appliedQuery = nodeConnection.createQuery(queryBuilder.clone());
```

### 6. Wait for the query to execute

```
const result = await appliedQuery.select()
```

### 7. Use the connection object to return relevant `connection` type fields

```
async creators(_, {cursor: cursorArgs, filter: filterArgs}: ICreatorInputArgs) {
    ...

    return {
            pageInfo: nodeConnection.createPageInfo(result),
            edges: nodeConnection.createEdges(result)
        };
}
```
