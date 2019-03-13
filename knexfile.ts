export const development = {
    client: 'sqlite3',
    connection: {
        filename: './db/dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {directory: __dirname + '/db/migrations'},
    seeds: {directory: __dirname + '/db/seeds'}
};

export const test = {
    client: 'sqlite3',
    connection: {
        filename: './db/test.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {directory: __dirname + '/db/migrations'},
    seeds: {directory: __dirname + '/db/seeds'}
};