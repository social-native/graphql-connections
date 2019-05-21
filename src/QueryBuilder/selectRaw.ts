import {QueryBuilder, RawBuilder} from 'knex';

/**
 * Knex does not provide a selectRaw, so this fills in what Knex does in:
 * https://github.com/tgriesser/knex/blob/887fb5392910ab00f491601ad83383d04b167173/src/util/make-knex.js#L29
 */
export default function selectRaw(builder: QueryBuilder, rawSqlQuery: string, bindings?: any) {
    const {
        client
    }: {
        client: StolenClient;
    } = builder as any;

    const args = [rawSqlQuery, bindings].filter(arg => arg);

    return client.raw.apply(client, args as any);
}

type StolenClient = {
    raw: RawBuilder;
};