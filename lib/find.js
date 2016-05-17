var fs = require('fs')

var inside = require('turf-inside'),
  moment = require('moment-timezone'),
  point = require('turf-point')

var tzData = require('../data/index.json')

var getTimezone = function(lat, lon) {

  lat = parseFloat(lat)
  lon = parseFloat(lon)

  // validate latitude
  if(isNaN(lat) || lat > 90 || lat < -90) {
    var err = new Error('Invalid latitude: ' + lat)
    throw err
  }

  // validate longitude
  if(isNaN(lon) || lon > 180 || lon < -180) {
    var err = new Error('Invalid longitude: ' + lon)
    throw err
  }

  // fix edges of the world
  if(lat === 90) {
    lat = 89.9999
  } else if(lat === -90) {
    lat = -89.9999
  }

  if(lon === 180) {
    lon = 179.9999
  } else if(lon === -180) {
    lon = -179.9999
  }

  var pt = point([lon, lat]),
    quadData = {
      top: 90,
      bottom: -90,
      left: -180,
      right: 180,
      midLat: 0,
      midLon: 0
    },
    quadPos = '',
    curTzData = tzData.lookup

  while(true) {

    // calculate next quadtree position 
    var nextQuad
    if(lat >= quadData.midLat && lon >= quadData.midLon) {
      nextQuad = 'a'
      quadData.bottom = quadData.midLat
      quadData.left = quadData.midLon
    } else if(lat >= quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'b'
      quadData.bottom = quadData.midLat
      quadData.right = quadData.midLon
    } else if(lat < quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'c'
      quadData.top = quadData.midLat
      quadData.right = quadData.midLon
    } else {
      nextQuad = 'd'
      quadData.top = quadData.midLat
      quadData.left = quadData.midLon
    }

    //console.log(nextQuad)
    curTzData = curTzData[nextQuad]
    //console.log()
    quadPos += nextQuad

    // analyze result of current depth
    if(curTzData === 'f') {
      console.log('looking up tz from file', quadPos)
      // exact boundaries saved in file
      // parse geojson for exact boundaries
      var filepath = quadPos.split('').join('/'),
        geoJson = require('../data/' + filepath + '/geo.json')

      for (var i = 0; i < geoJson.features.length; i++) {
        if(inside(pt, geoJson.features[i])) {
          return geoJson.features[i].properties.TZID
        }
      }

      // not within subarea, therefore no valid timezone
      return null
    } else if(curTzData === -1) {
      console.log('no timezone at index')
      // no timezone at this gps location
      return null
    } else if(typeof curTzData === 'number') {
      // exact match found
      console.log('exact match at index')
      return tzData.timezones[curTzData[nextQuad]]
    } else if(typeof curTzData !== 'object') {
      // not another nested quad index, throw error
      var err = new Error('Unexpected data type')
      throw err
    }

    // calculate next quadtree depth data
    quadData.midLat = (quadData.top + quadData.bottom) / 2
    quadData.midLon = (quadData.left + quadData.right) / 2
  }
  
}

module.exports = {
  timezone: getTimezone,
  timezoneMoment: function(lat, lon, timeString) {
    var tzName = getTimezone(lat, lon)
    if(!tzName) {
      return tzName
    }
    if(timeString) {
      return moment(timeString).tz(tzName)
    } else {
      return moment().tz(tzName)
    }
  }
}