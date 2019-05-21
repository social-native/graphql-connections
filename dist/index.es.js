import { GraphQLScalarType, coerceValue, GraphQLError, isValidLiteralValue, valueFromAST, GraphQLInputObjectType, GraphQLList, GraphQLString, GraphQLInt } from 'graphql';

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

const ORDER_DIRECTION = {
    asc: 'asc',
    desc: 'desc'
};
// export enum MYSQL_FULL_TEXT_SEARCH_MODIFIER {
//     'IN NATURAL LANGUAGE MODE',
//     'IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION',
//     'IN BOOLEAN MODE',
//     'WITH QUERY EXPANSION'
// }

class QueryContext {
    constructor(inputArgs = {}, options = {}) {
        this.inputArgs = {
            filter: {},
            ...inputArgs
        };
        this.validateArgs();
        // private
        this.cursorEncoder = options.cursorEncoder || CursorEncoder;
        this.defaultLimit = options.defaultLimit || 1000;
        // public
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();
        this.limit = this.calcLimit();
        this.orderBy = this.calcOrderBy();
        this.orderDir = this.calcOrderDirection();
        this.filters = this.calcFilters();
        this.offset = this.calcOffset();
        this.search = this.calcSearch();
    }
    /**
     * Checks if there is a 'before or 'last' arg which is used to reverse paginate
     */
    get isPagingBackwards() {
        if (!this.previousCursor) {
            return false;
        }
        const { before, last } = this.inputArgs;
        return !!(last || before);
    }
    /**
     * Sets the limit for the desired query result
     */
    calcLimit() {
        const { first, last } = this.inputArgs;
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
     * Sets the orderBy for the desired query result
     */
    calcOrderBy() {
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            return prevCursorObj.orderBy;
        }
        else if (this.inputArgs.search && !this.inputArgs.orderBy) {
            return '_relevance';
        }
        else {
            return this.inputArgs.orderBy || 'id';
        }
    }
    /**
     * Sets the orderDirection for the desired query result
     */
    calcOrderDirection() {
        // tslint:disable-next-line
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            return prevCursorObj.orderDir;
        }
        else if (this.inputArgs.orderDir &&
            Object.keys(ORDER_DIRECTION).includes(this.inputArgs.orderDir)) {
            return this.inputArgs.orderDir;
        }
        else {
            const dir = this.inputArgs.last || this.inputArgs.before || this.inputArgs.search
                ? ORDER_DIRECTION.desc
                : ORDER_DIRECTION.asc;
            return dir;
        }
    }
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    calcPreviousCursor() {
        const { before, after } = this.inputArgs;
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
            return {};
        }
        return this.inputArgs.filter;
    }
    /**
     * Extracts the search string from the resolver cursorArgs
     */
    calcSearch() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).search;
        }
        const { search } = this.inputArgs;
        return search;
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
        const { first, last, before, after, orderBy, orderDir, search } = this.inputArgs;
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
        else if ((after || before) && orderDir) {
            throw Error('Can not use orderDir with a cursor');
        }
        else if ((after || before) &&
            (this.inputArgs.filter.and ||
                this.inputArgs.filter.or)) {
            throw Error('Can not use filters with a cursor');
        }
        else if (last && !before) {
            throw Error('Can not use `last` without a cursor. Use `first` to set page size on the initial query');
        }
        else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        }
        else if (search && orderDir && orderBy) {
            throw Error('Search order is implicitly descending. OrderDir should only be provided with an orderBy.');
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
const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};
const defaultFilterTransformer = (filter) => filter;
class KnexQueryBuilder {
    constructor(queryContext, attributeMap, options = {}) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = options.filterMap || defaultFilterMap;
        this.filterTransformer = options.filterTransformer || defaultFilterTransformer;
        this.addFilterRecursively = this.addFilterRecursively.bind(this);
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
        const orderBy = this.queryContext.orderBy;
        const direction = this.queryContext.orderDir;
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
        this.addFilterRecursively(this.queryContext.filters, queryBuilder);
    }
    computeFilterField(field) {
        const mappedField = this.attributeMap[field];
        if (mappedField) {
            return mappedField;
        }
        throw new Error(`Filter field '${field}' either does not exist or is not accessible. Check the attribute map`);
    }
    computeFilterOperator(operator) {
        const mappedField = this.filterMap[operator];
        if (mappedField) {
            return mappedField;
        }
        throw new Error(`Filter operator '${operator}' either does not exist or is not accessible. Check the filter map`);
    }
    filterArgs(filter) {
        const f = this.filterTransformer(filter);
        return [this.computeFilterField(f.field), this.computeFilterOperator(f.operator), f.value];
    }
    addFilterRecursively(filter, queryBuilder) {
        if (isFilter(filter)) {
            queryBuilder.where(...this.filterArgs(filter));
            return queryBuilder;
        }
        // tslint:disable-next-line
        if (filter.and && filter.and.length > 0) {
            filter.and.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhere(...this.filterArgs(f));
                }
                else {
                    queryBuilder.andWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }
        if (filter.or && filter.or.length > 0) {
            filter.or.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.orWhere(...this.filterArgs(f));
                }
                else {
                    queryBuilder.orWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }
        if (filter.not && filter.not.length > 0) {
            filter.not.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhereNot(...this.filterArgs(f));
                }
                else {
                    queryBuilder.andWhereNot(k => this.addFilterRecursively(f, k));
                }
            });
        }
        return queryBuilder;
    }
}
const isFilter = (filter) => {
    return (!!filter &&
        !!filter.field &&
        !!filter.operator &&
        !!filter.value);
};

/**
 * Knex does not provide a createRawFromQueryBuilder, so this fills in what Knex does in:
 * https://github.com/tgriesser/knex/blob/887fb5392910ab00f491601ad83383d04b167173/src/util/make-knex.js#L29
 */
function createRawFromQueryBuilder(builder, rawSqlQuery, bindings) {
    const { client } = builder;
    const args = [rawSqlQuery, bindings].filter(arg => arg);
    return client.raw.apply(client, args);
}

class KnexMySQLFullTextQueryBuilder extends KnexQueryBuilder {
    constructor(queryContext, attributeMap, options) {
        super(queryContext, attributeMap, options);
        this.hasSearchOptions = this.isKnexMySQLBuilderOptions(options);
        // calling type guard twice b/c of weird typescript thing...
        if (this.isKnexMySQLBuilderOptions(options)) {
            this.searchColumns = options.searchColumns;
            this.searchModifier = options.searchModifier;
        }
        else if (!this.hasSearchOptions && this.queryContext.search) {
            throw new Error('Using search but search is not configured via query builder options');
        }
        else {
            this.searchColumns = [];
        }
    }
    createQuery(queryBuilder) {
        if (!this.hasSearchOptions) {
            return super.createQuery(queryBuilder);
        }
        // apply filter first
        this.applyFilter(queryBuilder);
        this.applySearch(queryBuilder);
        this.applyRelevanceSelect(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyLimit(queryBuilder);
        this.applyOffset(queryBuilder);
        return queryBuilder;
    }
    applyRelevanceSelect(queryBuilder) {
        if (!this.queryContext.search) {
            return;
        }
        queryBuilder.select([
            ...Object.values(this.attributeMap),
            createRawFromQueryBuilder(queryBuilder, `(${this.createFullTextMatchClause()}) as _relevance`, {
                term: this.queryContext.search
            })
        ]);
        return;
    }
    applySearch(queryBuilder) {
        const { search } = this.queryContext;
        if (!search || this.searchColumns.length === 0) {
            return;
        }
        queryBuilder.whereRaw(this.createFullTextMatchClause(), { term: search });
        return;
    }
    createFullTextMatchClause() {
        // create comma separated list of columns to search over
        const columns = this.searchColumns.reduce((acc, columnName, index) => {
            return index === 0 ? acc + columnName : acc + ', ' + columnName;
        }, '');
        return `MATCH(${columns}) AGAINST (:term ${this.searchModifier || ''})`;
    }
    // type guard
    isKnexMySQLBuilderOptions(options) {
        // tslint:disable-next-line
        if (options == null) {
            return false;
        }
        return options.searchColumns !== undefined;
    }
}

class QueryResult {
    constructor(result, queryContext, options = {}) {
        this.result = result;
        this.queryContext = queryContext;
        this.cursorEncoder = options.cursorEncoder || CursorEncoder;
        this.nodeTansformer = options.nodeTransformer;
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
     * We trim down the result set to be within the limit size and we
     * apply an optional transform to the result data as we iterate through it
     * to make the Nodes.
     */
    createNodes() {
        let nodeTansformer;
        if (this.nodeTansformer) {
            nodeTansformer = this.nodeTansformer;
        }
        else {
            nodeTansformer = (node) => node;
        }
        return this.result.map(node => nodeTansformer({ ...node })).slice(0, this.queryContext.limit);
    }
    createEdgesFromNodes() {
        const orderDir = this.queryContext.orderDir;
        const filters = this.queryContext.filters;
        const orderBy = this.queryContext.orderBy;
        const search = this.queryContext.search;
        const nodesLength = this.nodes.length;
        return this.nodes.map((node, index) => {
            const position = this.queryContext.isPagingBackwards
                ? this.queryContext.indexPosition - nodesLength - index
                : this.queryContext.indexPosition + index + 1;
            return {
                cursor: this.cursorEncoder.encodeToCursor({
                    orderDir,
                    filters,
                    orderBy,
                    position,
                    search
                }),
                node: { ...node }
            };
        });
    }
}

// tslint:disable:max-classes-per-file
class ConnectionManager {
    constructor(inputArgs, inAttributeMap, options) {
        this.options = options || {};
        this.inAttributeMap = inAttributeMap;
        // 1. Create QueryContext
        this.queryContext = new QueryContext(inputArgs, this.options.contextOptions);
    }
    createQuery(queryBuilder) {
        // 2. Create QueryBuilder
        if (!this.queryBuilder) {
            this.initializeQueryBuilder(queryBuilder);
        }
        if (!this.queryBuilder) {
            throw Error('Query builder could not be correctly initialized');
        }
        return this.queryBuilder.createQuery(queryBuilder);
    }
    addResult(result) {
        // 3. Create QueryResult
        this.queryResult = new QueryResult(result, this.queryContext, this.options.resultOptions);
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
    initializeQueryBuilder(queryBuilder) {
        // 2. Create QueryBuilder
        const MYSQL_CLIENTS = ['mysql', 'mysql2'];
        const { client: clientName } = queryBuilder.client.config;
        let builder;
        if (MYSQL_CLIENTS.includes(clientName)) {
            builder = KnexMySQLFullTextQueryBuilder;
        }
        else {
            builder = KnexQueryBuilder;
        }
        this.queryBuilder = new builder(this.queryContext, this.inAttributeMap, this.options.builderOptions);
    }
}

const printInputType = (type) => {
    const fields = type.getFields();
    const fieldNames = Object.keys(fields);
    const typeSig = fieldNames.reduce((acc, name) => {
        acc[name] = fields[name].type.toString();
        return acc;
    }, {});
    return JSON.stringify(typeSig)
        .replace(/[\\"]/gi, '')
        .replace(/[:]/gi, ': ')
        .replace(/[,]/gi, ', ');
};
const generateInputTypeError = (typeName, inputTypes) => {
    const validTypes = inputTypes
        .map(t => `${t.name} \`${printInputType(t)}\``)
        .map((t, i) => `${i > 0 ? ' or ' : ''}${t}`);
    return new GraphQLError(`${typeName} should be composed of either: ${validTypes}`);
};
var InputUnionType = (typeName, inputTypes, description) => {
    return new GraphQLScalarType({
        name: typeName,
        description,
        serialize: (value) => value,
        parseValue: (value) => {
            const hasType = inputTypes.reduce((acc, t) => {
                const result = coerceValue(value, t);
                return result.errors && result.errors.length > 0 ? acc : true;
            }, false);
            if (hasType) {
                return value;
            }
            throw generateInputTypeError(typeName, inputTypes);
        },
        parseLiteral: ast => {
            const inputType = inputTypes.reduce((acc, type) => {
                const astClone = JSON.parse(JSON.stringify(ast));
                try {
                    return isValidLiteralValue(type, astClone).length === 0 ? type : acc;
                }
                catch (e) {
                    return acc;
                }
            }, undefined);
            if (inputType) {
                return valueFromAST(ast, inputType);
            }
            throw generateInputTypeError(typeName, inputTypes);
        }
    });
};

const compoundFilterScalar = new GraphQLInputObjectType({
    name: 'CompoundFilterScalar',
    fields() {
        return {
            and: {
                type: new GraphQLList(filter)
            },
            or: {
                type: new GraphQLList(filter)
            },
            not: {
                type: new GraphQLList(filter)
            }
        };
    }
});
const filterScalar = new GraphQLInputObjectType({
    name: 'FilterScalar',
    fields() {
        return {
            field: {
                type: GraphQLString
            },
            operator: {
                type: GraphQLString
            },
            value: {
                type: GraphQLString
            }
        };
    }
});
const filterDescription = `
    The filter input scalar is a
    union of the
    IFilter and ICompundFIlter.
    It allows for recursive
    nesting of filters using
    'and', 'or', and 'not' as
    composition operators

    It's typescript signature is:

    type IInputFilter =
        IFilter | ICompoundFilter;

    interface IFilter {
        value: string;
        operator: string;
        field: string;
    }

    interface ICompoundFilter {
        and?: IInputFilter[];
        or?: IInputFilter[];
        not?: IInputFilter[];
    }
`;
const filter = InputUnionType('Filter', [compoundFilterScalar, filterScalar], filterDescription);
const typeDefs = `
    scalar Filter
    scalar Search
    scalar OrderBy
    scalar OrderDir
    scalar First
    scalar Last
    scalar Before
    scalar After

    interface IConnection {
        pageInfo: PageInfo!
    }

    interface IEdge {
        cursor: String!
    }

    type PageInfo {
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
        startCursor: String!
        endCursor: String!
    }
`;
const createStringScalarType = (name, description) => new GraphQLScalarType({
    name,
    description: `String \n\n\ ${description}`,
    serialize: GraphQLString.serialize,
    parseLiteral: GraphQLString.parseLiteral,
    parseValue: GraphQLString.parseValue
});
const createIntScalarType = (name, description) => new GraphQLScalarType({
    name,
    description: `Int \n\n ${description}`,
    serialize: GraphQLInt.serialize,
    parseLiteral: GraphQLInt.parseLiteral,
    parseValue: GraphQLInt.parseValue
});
const orderBy = createStringScalarType('OrderBy', `
    Ordering of the results.
    Should be a field on the Nodes in the connection
    `);
const orderDir = createStringScalarType('OrderDir', `
    Direction order the results by.
    Should be 'asc' or 'desc'
    `);
const before = createStringScalarType('Before', `
    Previous cursor.
    Returns edges after this cursor
    `);
const after = createStringScalarType('After', `
    Following cursor.
    Returns edges before this cursor
    `);
const search = createStringScalarType('Search', `
    A search string.
    To be used with full text search index
    `);
const first = createIntScalarType('First', `
    Number of edges to return at most. For use with 'before'
    `);
const last = createIntScalarType('Last', `
    Number of edges to return at most. For use with 'after'
    `);
const resolvers = {
    Filter: filter,
    Search: search,
    OrderBy: orderBy,
    OrderDir: orderDir,
    First: first,
    Last: last,
    Before: before,
    After: after,
    IConnection: {
        __resolveType() {
            return null;
        }
    },
    IEdge: {
        __resolveType() {
            return null;
        }
    }
};
const gqlTypes = {
    filter,
    search,
    orderBy,
    orderDir,
    first,
    last,
    before,
    after
};

export { ConnectionManager, QueryContext, QueryResult, CursorEncoder, KnexQueryBuilder as Knex, KnexMySQLFullTextQueryBuilder as KnexMySQL, typeDefs, resolvers, gqlTypes };
