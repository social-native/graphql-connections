import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'test') {
    dotenv.config({path: '.env.testing'});
} else {
    dotenv.config({path: '.env.dev'});
}

const {
    MYSQL_DB_HOST,
    MYSQL_DB_DATABASE,
    MYSQL_DB_USER,
    MYSQL_DB_PASSWORD,
    MYSQL_DB_POOL_MAX
} = process.env;

const common = {
    client: 'mysql2',
    connection: {
        host: MYSQL_DB_HOST,
        database: MYSQL_DB_DATABASE,
        user: MYSQL_DB_USER,
        password: MYSQL_DB_PASSWORD
    },
    pool: {
        min: 0,
        max: MYSQL_DB_POOL_MAX ? parseInt(MYSQL_DB_POOL_MAX, 10) : 15
    },
    migrations: {directory: __dirname + '/db/mysql/migrations'},
    seeds: {directory: __dirname + '/db/seeds'}
};

export const development = {
    ...common
};
export const test = {
    ...common
};
