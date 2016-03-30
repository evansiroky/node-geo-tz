var update = require('./lib/update.js')

module.exports = {
  updateData: function(callback) {
    update(callback)
  },
  find: require('./lib/find.js')
}