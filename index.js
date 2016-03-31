var find = require('./lib/find.js'),
  update = require('./lib/update.js')

module.exports = {
  updateData: function(callback) {
    update(callback)
  },
  tz: find.timezone,
  tzMoment: find.timezoneMoment
}