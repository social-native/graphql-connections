exports.up = function(knex, Promise) {
    return knex.schema.raw(
        'ALTER TABLE `mock` ADD FULLTEXT INDEX `idx` (`username`, `firstname`, `lastname`, `bio`, `haircolor`);'
    );
};

exports.down = function(knex, Promise) {
    return knex.schema.raw(
        'ALTER TABLE `mock` DROP INDEX `idx`;'
    );
};
