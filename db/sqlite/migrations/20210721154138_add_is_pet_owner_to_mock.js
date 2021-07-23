exports.up = function(knex, Promise) {
    return knex.schema.alterTable('mock', function(t) {
        t.boolean('is_pet_owner')
            .notNullable()
            .defaultTo(false);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.alterTable('mock', function(t) {
        t.dropColumn('is_pet_owner');
    });
};
