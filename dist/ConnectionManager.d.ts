import { QueryBuilder as Knex } from 'knex';
import { ICursorEncoder, ICursorObj, IAttributeMap, IFilterMap, INode, IInputArgs, NodeTransformer } from './types';
/**
 * ConnectionManager
 *
 * A convenience class that helps orchestrate creation of the QueryContext, the building of the
 * connection query (QueryBuilder), and usage of the returned query to calculate the page info and
 * edges (QueryResult)
 *
 */
declare type KnexQueryResult = Array<{
    [attributeName: string]: any;
}>;
interface IConnectionManagerConfig<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap;
    nodeTransformer?: NodeTransformer<Node>;
}
export default class ConnectionManager<Node extends INode> {
    private queryContext;
    private queryBuilder;
    private cursorEncoder;
    private queryResult?;
    private attributeMap;
    private filterMap;
    private nodeTransformer?;
    constructor(inputArgs: IInputArgs, attributeMap: IAttributeMap, config?: IConnectionManagerConfig<ICursorObj<string>, Node>);
    createQuery(queryBuilder: Knex): Knex;
    addResult(result: KnexQueryResult): void;
    readonly pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
    };
    readonly edges: {
        cursor: string;
        node: Node;
    }[];
}
export {};
