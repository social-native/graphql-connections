SNPKG-SNAPI-Connections

## About

This repo contains the code to handle 1-to-Many connections. Or in other words, when a node has many edges.

It can be used to create a cursor for the edges and handle movement through the edges using existing cursors.

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
        ICreatorInputArgs['cursor'],
        ICreatorInputArgs['filter']
    >(cursorArgs, filterArgs, attributeMap);

    ...

```
#### 3. Define Types specific to the resolver

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

#### 4. Pass in arguments to the constructor

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

#### 5. Add the connection query to the queryBuilder

```
nodeConnection.createQuery(queryBuilder);
```

#### 6. Wait for the query to execute

```
const result = await queryBuilder.select()
```

#### 7. Add relevant fields to Connection type

```
async creators(_, {cursor: cursorArgs, filter: filterArgs}: ICreatorInputArgs) {
    ...

    return {
            pageInfo: nodeConnection.createPageInfo(result),
            edges: nodeConnection.createEdges(result)
        };
}
```