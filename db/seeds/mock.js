
exports.seed = function(knex, Promise) {
  return knex('mock').del()
    .then(function () {
      return knex('mock').insert([
        {id: 1, username: 'rowValue1', firstname: 'bob'},
        {id: 2, username: 'rowValue2', firstname: 'jones'},
        {id: 3, username: 'rowValue3', firstname: 'phil'}
      ]);
    });
};
