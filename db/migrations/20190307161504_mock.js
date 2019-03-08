exports.up = function(knex, Promise) {
    return knex.schema.createTable('mock', (t) => {
        t.increments('id').unsigned().primary();
        t.timestamp('created_at').defaultTo(knex.fn.now())
        t.dateTime('updated_at').nullable();
        t.dateTime('deleted_at').nullable();

        t.string('username');
        t.string('firstname');
        t.string('lastname');
        t.text('bio');
        t.integer('age');
        t.string('haircolor');
    });
};

exports.down = function(knex, Promise) {
    return knex.schema
        .dropTable('mock');
};
