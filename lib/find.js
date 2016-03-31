var inside = require('turf-inside'),
  moment = require('moment-timezone'),
  point = require('turf-point')

var tzData = require('../data/tzgeo.json')

var getTimezone = function(lat, lng) {
  var pt = point([lng, lat])

  for (var i = 0; i < tzData.features.length; i++) {
    if(inside(pt, tzData.features[i])) {
      return tzData.features[i].properties.TZID
    }
  }
  
  return null
  
}

module.exports = {
  timezone: getTimezone,
  timezoneMoment: function(lat, lng, timeString) {
    var tzName = getTimezone(lat, lng)
    if(timeString) {
      return moment(timeString).tz(tzName)
    } else {
      return moment().tz(tzName)
    }
  }
}