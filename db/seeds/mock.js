
exports.seed = function(knex, Promise) {
  return knex('mock').del()
    .then(function () {
      return knex('mock').insert([
        {id: 1, colName: 'rowValue1'},
        {id: 2, colName: 'rowValue2'},
        {id: 3, colName: 'rowValue3'}
      ]);
    });
};
