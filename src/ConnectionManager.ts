import {QueryBuilder as Knex} from 'knex';
import CursorEncoder from './CursorEncoder';
import QueryContext from './QueryContext';
import KnexQueryBuilder from './KnexQueryBuilder';
import {
    IQueryBuilder,
    IQueryContext,
    ICursorEncoder,
    IQueryResult,
    ICursorArgs,
    FilterArgs,
    ICursorObj,
    IAttributeMap,
    IFilterMap,
    INode
} from './types';
import QueryResult from 'QueryResult';

/**
 * ConnectionManager
 *
 * A convenience class that helps orchestrate creation of the QueryContext, the building of the
 * connection query (QueryBuilder), and usage of the returned query to calculate the page info and
 * edges (QueryResult)
 *
 */

type KnexQueryResult = Array<{[attributeName: string]: any}>;

interface IConnectionManagerConfig<CursorObj> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap; // maps an input operator to a sql where operator
}

const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};

// tslint:disable:max-classes-per-file
export default class ConnectionManager<
    Node extends INode,
    SpecificFilterArgs extends FilterArgs<any>
> {
    private queryContext: QueryContext<SpecificFilterArgs>;
    private queryBuilder: IQueryBuilder<Knex>;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;
    private queryResult?: IQueryResult<Node>;

    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        cursorArgs: ICursorArgs,
        filterArgs: SpecificFilterArgs,
        attributeMap: IAttributeMap,
        config: IConnectionManagerConfig<ICursorObj<string>> = {}
    ) {
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.queryContext = new QueryContext<SpecificFilterArgs>(cursorArgs, filterArgs, {
            cursorEncoder: this.cursorEncoder
        });
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        this.queryBuilder = new KnexQueryBuilder<SpecificFilterArgs>(
            this.queryContext,
            this.attributeMap,
            this.filterMap
        );
    }

    public createQuery(queryBuilder: Knex) {
        return this.queryBuilder.applyQuery(queryBuilder);
    }

    public addResult(result: KnexQueryResult) {
        this.queryResult = new QueryResult<
            KnexQueryResult,
            IQueryContext<SpecificFilterArgs>,
            Node
        >(result, this.queryContext, this.attributeMap, {cursorEncoder: this.cursorEncoder});
    }

    public get pageInfo() {
        if (!this.queryResult) {
            throw Error('Result must be added before page info can be calculated');
        }
        return this.queryResult.pageInfo;
    }

    public get edges() {
        if (!this.queryResult) {
            throw Error('Result must be added before edges can be calculated');
        }
        return this.queryResult.edges;
    }
}
