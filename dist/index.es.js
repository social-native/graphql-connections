class CursorEncoder {
    static encodeToCursor(cursorObj) {
        const buff = Buffer.from(JSON.stringify(cursorObj));
        return buff.toString('base64');
    }
    static decodeFromCursor(cursor) {
        const buff = Buffer.from(cursor, 'base64');
        const json = buff.toString('ascii');
        return JSON.parse(json);
    }
}

class QueryContext {
    constructor(inputArgs = {}, config = {}) {
        this.inputArgs = { page: {}, cursor: {}, filter: [], order: {}, ...inputArgs };
        this.validateArgs();
        // private
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.defaultLimit = config.defaultLimit || 1000;
        // public
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();
        this.limit = this.calcLimit();
        const { orderBy, orderDirection } = this.calcOrder();
        this.orderBy = orderBy;
        this.orderDirection = orderDirection;
        this.filters = this.calcFilters();
        this.offset = this.calcOffset();
    }
    /**
     * Compares the current paging direction (as indicated `first` and `last` args)
     * and compares to what the original sort direction was (as found in the cursor)
     */
    get isPagingBackwards() {
        if (!this.previousCursor) {
            return false;
        }
        const { first, last } = this.inputArgs.page;
        const { before, after } = this.inputArgs.cursor;
        const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
        // tslint:disable-line
        return !!((prevCursorObj.initialSort === 'asc' && (last || before)) ||
            (prevCursorObj.initialSort === 'desc' && (first || after)));
    }
    /**
     * Sets the limit for the desired query result
     */
    calcLimit() {
        const { first, last } = this.inputArgs.page;
        const limit = first || last || this.defaultLimit;
        // If you are paging backwards, you need to make sure that the limit
        // isn't greater or equal to the index position.
        // This is because the limit is used to calculate the offset.
        // You don't want to offset larger than the set size.
        if (this.isPagingBackwards) {
            return limit < this.indexPosition ? limit : this.indexPosition - 1;
        }
        return limit;
    }
    /**
     * Sets the orderDirection and orderBy for the desired query result
     */
    calcOrder() {
        let orderDirection;
        let orderBy;
        // tslint:disable-line
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            orderBy = prevCursorObj.orderBy;
            orderDirection = prevCursorObj.initialSort;
        }
        else {
            orderBy = this.inputArgs.order.orderBy || 'id';
            orderDirection =
                this.inputArgs.page.last || this.inputArgs.cursor.before ? 'desc' : 'asc';
        }
        return {
            orderBy,
            orderDirection: orderDirection
        };
    }
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    calcPreviousCursor() {
        const { before, after } = this.inputArgs.cursor;
        return before || after;
    }
    /**
     * Extracts the filters from the resolver filterArgs
     */
    calcFilters() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).filters;
        }
        if (!this.inputArgs.filter) {
            return [];
        }
        return this.inputArgs.filter.reduce((builtFilters, { field, value, operator }) => {
            builtFilters.push([field, operator, value]);
            return builtFilters;
        }, []);
    }
    /**
     * Gets the index position of the cursor in the total possible result set
     */
    calcIndexPosition() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).position;
        }
        return 0;
    }
    /**
     * Gets the offset that the current query should start at in the total possible result set
     */
    calcOffset() {
        if (this.isPagingBackwards) {
            const offset = this.indexPosition - (this.limit + 1);
            return offset < 0 ? 0 : offset;
        }
        return this.indexPosition;
    }
    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and/or `after` together
     *    or
     *   `last` and/or `before` together
     */
    validateArgs() {
        if (!this.inputArgs) {
            throw Error('Input args are required');
        }
        const { first, last } = this.inputArgs.page;
        const { before, after } = this.inputArgs.cursor;
        const { orderBy } = this.inputArgs.order;
        // tslint:disable
        if (first && last) {
            throw Error('Can not mix `first` and `last`');
        }
        else if (before && after) {
            throw Error('Can not mix `before` and `after`');
        }
        else if (before && first) {
            throw Error('Can not mix `before` and `first`');
        }
        else if (after && last) {
            throw Error('Can not mix `after` and `last`');
        }
        else if ((after || before) && orderBy) {
            throw Error('Can not use orderBy with a cursor');
        }
        else if ((after || before) && this.inputArgs.filter.length > 0) {
            throw Error('Can not use filters with a cursor');
        }
        else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        }
        // tslint:enable
    }
}

/**
 * KnexQueryBuilder
 *
 * A QueryBuilder that creates a query from the QueryContext using Knex
 *
 */
class KnexQueryBuilder {
    constructor(queryContext, attributeMap, filterMap) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = filterMap;
    }
    createQuery(queryBuilder) {
        this.applyLimit(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyOffset(queryBuilder);
        this.applyFilter(queryBuilder);
        return queryBuilder;
    }
    /**
     * Adds the limit to the sql query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    applyLimit(queryBuilder) {
        queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
    }
    /**
     * Adds the order to the sql query builder.
     */
    applyOrder(queryBuilder) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.queryContext.orderBy] || 'id';
        const direction = this.queryContext.orderDirection;
        queryBuilder.orderBy(orderBy, direction);
    }
    applyOffset(queryBuilder) {
        const offset = this.queryContext.offset;
        queryBuilder.offset(offset);
    }
    /**
     * Adds filters to the sql query builder
     */
    applyFilter(queryBuilder) {
        this.queryContext.filters.forEach(filter => {
            queryBuilder.andWhere(this.attributeMap[filter[0]], // map node field name to sql attribute name
            this.filterMap[filter[1]], // map operator to sql comparison operator
            filter[2]);
        });
    }
}

class QueryResult {
    constructor(result, queryContext, attributeMap, config = {}) {
        this.result = result;
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        if (this.result.length < 1) {
            this.nodes = [];
            this.edges = [];
        }
        else {
            this.nodes = this.createNodes();
            this.edges = this.createEdgesFromNodes();
        }
    }
    get pageInfo() {
        return {
            hasPreviousPage: this.hasPrevPage,
            hasNextPage: this.hasNextPage,
            startCursor: this.startCursor,
            endCursor: this.endCursor
        };
    }
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    get hasNextPage() {
        // If you are paging backwards, you only have another page if the
        // offset (aka the limit) is less then the result set size (aka: index position - 1)
        if (this.queryContext.isPagingBackwards) {
            return this.queryContext.indexPosition - (this.queryContext.limit + 1) > 0;
        }
        // Otherwise, if you aren't paging backwards, you will have another page
        // if more results were fetched than what was asked for.
        // This is possible b/c we over extend the limit size by 1
        // in the QueryBuilder
        return this.result.length > this.queryContext.limit;
    }
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    get hasPrevPage() {
        // If there is no cursor, then this is the first page
        // Which means there is no previous page
        if (!this.queryContext.previousCursor) {
            return false;
        }
        // If you are paging backwards, you have to be paging from
        // somewhere. Thus you always have a previous page.
        if (this.queryContext.isPagingBackwards) {
            return true;
        }
        // If you have a previous cursor and you are not paging backwards you have to be
        // on a page besides the first one. This means you have a previous page.
        return true;
    }
    /**
     * The first cursor in the nodes list
     */
    get startCursor() {
        const firstEdge = this.edges[0];
        return firstEdge ? firstEdge.cursor : '';
    }
    /**
     * The last cursor in the nodes list
     */
    get endCursor() {
        const endCursor = this.edges.slice(-1)[0];
        return endCursor ? endCursor.cursor : '';
    }
    /**
     * It is very likely the results we get back from the data store
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    createNodes() {
        return this.result
            .map(node => {
            const attributes = Object.keys(node);
            attributes.forEach(attr => {
                if (!Object.keys(this.attributeMap).includes(attr)) {
                    delete node[attr];
                }
            });
            return { ...node };
        })
            .slice(0, this.queryContext.limit);
    }
    createEdgesFromNodes() {
        const initialSort = this.queryContext.orderDirection;
        const filters = this.queryContext.filters;
        const orderBy = this.queryContext.orderBy;
        const nodesLength = this.nodes.length;
        return this.nodes.map((node, index) => {
            const position = this.queryContext.isPagingBackwards
                ? this.queryContext.indexPosition - nodesLength - index
                : this.queryContext.indexPosition + index + 1;
            return {
                cursor: this.cursorEncoder.encodeToCursor({
                    initialSort,
                    filters,
                    orderBy,
                    position
                }),
                node: { ...node }
            };
        });
    }
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
class ConnectionManager {
    constructor(inputArgs, attributeMap, config = {}) {
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        // 1. Create QueryContext
        this.queryContext = new QueryContext(inputArgs, {
            cursorEncoder: this.cursorEncoder
        });
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        // 2. Create QueryBuilder
        this.queryBuilder = new KnexQueryBuilder(this.queryContext, this.attributeMap, this.filterMap);
    }
    createQuery(queryBuilder) {
        return this.queryBuilder.createQuery(queryBuilder);
    }
    addResult(result) {
        // 3. Create QueryResult
        this.queryResult = new QueryResult(result, this.queryContext, this.attributeMap, { cursorEncoder: this.cursorEncoder });
    }
    get pageInfo() {
        if (!this.queryResult) {
            throw Error('Result must be added before page info can be calculated');
        }
        return this.queryResult.pageInfo;
    }
    get edges() {
        if (!this.queryResult) {
            throw Error('Result must be added before edges can be calculated');
        }
        return this.queryResult.edges;
    }
}

export { ConnectionManager, QueryContext, QueryResult, CursorEncoder, KnexQueryBuilder };
