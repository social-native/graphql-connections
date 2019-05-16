const common = {
    client: 'sqlite3',
    useNullAsDefault: true,
    migrations: {directory: __dirname + '/db/sqlite/migrations'},
    seeds: {directory: __dirname + '/db/seeds'}
};

export const development = {
    connection: {
        filename: './db/dev.sqlite3'
    },
    ...common
};

export const test = {
    connection: {
        filename: './db/test.sqlite3'
    },
    ...common
};
