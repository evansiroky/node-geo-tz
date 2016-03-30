var inside = require('turf-inside'),
  point = require('turf-point'),
  polygon = require('turf-polygon')

var tzData = require('../data/tzgeo.json')

module.exports = {
  timezone: function(lat, lng) {
    var pt = point([lat, lng])

    for (var i = 0; i < tzData.features.length; i++) {
      if(inside(pt, tzData.features[i])) {
        return tzData.features[i]
      }
    }
    
    return null
    
  }
}