var find = require('./lib/find.js'),
  update = require('./lib/update.js')

module.exports = {
  updateData: update,
  tz: find.timezone,
  tzMoment: find.timezoneMoment
}