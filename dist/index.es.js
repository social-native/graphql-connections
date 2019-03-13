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
    constructor(cursorArgs, filterArgs, config = {}) {
        this.cursorArgs = cursorArgs;
        this.validateArgs();
        // private
        this.defaultLimit = config.defaultLimit || 1000;
        this.filterArgs = filterArgs;
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();
        // public
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
        const { first, last, before, after } = this.cursorArgs;
        const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
        // tslint:disable-line
        return !!((prevCursorObj.initialSort === 'asc' && (last || before)) ||
            (prevCursorObj.initialSort === 'desc' && (first || after)));
    }
    /**
     * Sets the limit for the desired query result
     */
    calcLimit() {
        const { first, last } = this.cursorArgs;
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
            orderBy = this.cursorArgs.orderBy || 'id';
            orderDirection = this.cursorArgs.last || this.cursorArgs.before ? 'desc' : 'asc';
        }
        return { orderBy, orderDirection: orderDirection };
    }
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    calcPreviousCursor() {
        const { before, after } = this.cursorArgs;
        return before || after;
    }
    calcFilters() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).filters;
        }
        if (!this.filterArgs) {
            return [];
        }
        return this.filterArgs.reduce((builtFilters, { field, value, operator }) => {
            builtFilters.push([field, operator, value]);
            return builtFilters;
        }, []);
    }
    /**
     * Gets the index position of the cursor in the total result set
     */
    calcIndexPosition() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).position;
        }
        return 0;
    }
    /**
     * Gets the offset the current query should start at in the current result set
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
     *   `first` and `after` together
     *    or
     *   `last` and `before` together
     */
    validateArgs() {
        const { first, last, before, after, orderBy } = this.cursorArgs;
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
        else if ((after || before) && this.filterArgs) {
            throw Error('Can not use filters with a cursor');
        }
        else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        }
        // tslint:enable
    }
}

class KnexQueryBuilder {
    constructor(queryContext, attributeMap, filterMap) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = filterMap;
    }
    applyQuery(queryBuilder) {
        this.applyLimit(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyOffset(queryBuilder);
        this.applyFilter(queryBuilder);
        return queryBuilder;
    }
    /**
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    applyLimit(queryBuilder) {
        queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
    }
    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
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
            queryBuilder.andWhere(this.attributeMap[filter[0]], // map attribute name to sql attribute name
            this.filterMap[filter[1]], // map operator to sql attribute
            filter[2]);
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
    constructor(cursorArgs, filterArgs, attributeMap, config = {}) {
        this.queryContext = new QueryContext(cursorArgs, filterArgs);
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        this.queryBuilder = new KnexQueryBuilder(this.queryContext, this.attributeMap, this.filterMap);
    }
    createQuery(queryBuilder) {
        return this.queryBuilder.applyQuery(queryBuilder);
    }
    createPageInfo(queryResult) {
        return {
            hasPreviousPage: this.hasPrevPage(),
            hasNextPage: this.hasNextPage(queryResult)
        };
    }
    createEdges(queryResult) {
        if (queryResult.length < 1) {
            return [];
        }
        const nodes = this.createNodes(queryResult);
        return this.createEdgesFromNodes(nodes);
    }
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    hasNextPage(result) {
        if (this.queryContext.isPagingBackwards) {
            // If you are paging backwards, you only have another page if the
            // offset (aka the limit) is less then the set size (the index position - 1)
            return this.queryContext.indexPosition - (this.queryContext.limit + 1) > 0;
        }
        return result.length > this.queryContext.limit;
    }
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    hasPrevPage() {
        // if there is no cursor, than this is the first page
        // which means there is no previous page
        if (!this.queryContext.previousCursor) {
            return false;
        }
        if (this.queryContext.isPagingBackwards) {
            // return this.queryContext.limit < result.length;
            // If you are paging backwards, you have to be paging from
            // somewhere. Thus you always have a previous page.
            return true;
        }
        else {
            return this.queryContext.indexPosition > 0;
        }
    }
    /**
     * It is very likely the results we get back from the data store
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    createNodes(result) {
        return result
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
    createEdgesFromNodes(nodes) {
        const initialSort = this.queryContext.orderDirection;
        const filters = this.queryContext.filters;
        const orderBy = this.queryContext.orderBy;
        const nodesLength = nodes.length;
        return nodes.map((node, index) => {
            let position;
            if (this.queryContext.isPagingBackwards) {
                const distFromEnd = nodesLength - index;
                position = this.queryContext.indexPosition - distFromEnd;
            }
            else {
                position = this.queryContext.indexPosition + index + 1;
            }
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
// export {ConnectionManager, INode, ICursorArgs, FilterArgs};

export { ConnectionManager, QueryContext, CursorEncoder, KnexQueryBuilder };
