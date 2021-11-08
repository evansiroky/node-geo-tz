var fs = require('fs')
var path = require('path')

var geobuf = require('geobuf')
var inside = require('@turf/boolean-point-in-polygon').default
var Pbf = require('pbf')
var point = require('@turf/helpers').point

var tzData = require('../data/index.json')
const {getTimezoneAtSea, oceanZones} = require('./oceanUtils')

const FEATURE_FILE_PATH = `${__dirname}/../data/geo.dat`
let featureCache

/**
 * Set caching behavior.
 */
function cacheLevel (options) {
  if (
    options && options.store &&
      typeof options.store.get === 'function' &&
      typeof options.store.set === 'function'
  ) {
    featureCache = options.store
  } else {
    featureCache = new Map()
  }
  if (options && options.preload) {
    const featureFileFd = fs.openSync(FEATURE_FILE_PATH, 'r')

    if (featureFileFd < 0) {
      throw new Error('Failed to open geo.dat file')
    }

    preCache(featureFileFd)

    fs.closeSync(featureFileFd)
  }
}

cacheLevel()

/**
 * A function that will load all features into an unexpiring cache
 *
 * @param {number} featureFileFd
 * @returns {void}
 */
function preCache (featureFileFd) {
  // shoutout to github user @magwo for an initial version of this recursive function
  var preloadFeaturesRecursive = function (curTzData, quadPos) {
    if (curTzData.pos >= 0 && curTzData.len) {
      var geoJson = loadFeatures(quadPos, curTzData.pos, curTzData.len, featureFileFd)
      featureCache.set(quadPos, geoJson)
    } else if (typeof curTzData === 'object') {
      Object.getOwnPropertyNames(curTzData).forEach(function (value) {
        preloadFeaturesRecursive(curTzData[value], quadPos + value)
      })
    }
  }
  preloadFeaturesRecursive(tzData.lookup, '')
}

/**
 * Load features from geo.dat at offset pos with length len.
 * Optionally accept a file descriptor
 *
 * @param {number} pos
 * @param {number} len
 * @param {number} [fd=-1]
 * @returns {object}
 */
var loadFeatures = function (quadPos, pos, len, fd = -1) {
  var featureFileFd = fd
  if (featureFileFd < 0) {
    featureFileFd = fs.openSync(FEATURE_FILE_PATH, 'r')
    if (featureFileFd < 0) {
      throw new Error('Failed to open geo.dat file')
    }
  }

  // exact boundaries saved in file
  // parse geojson for exact boundaries
  const buf = Buffer.alloc(len)
  const bytesRead = fs.readSync(featureFileFd, buf, 0, len, pos);

  // close featureFileFd if we opened it
  if (fd < 0) {
    fs.closeSync(featureFileFd)
  }

  if (bytesRead < len) {
    throw new Error(`tried to read ${len} bytes from geo.dat but only got ${bytesRead} bytes`);
  }

  const data = new Pbf(buf)
  var geoJson = geobuf.decode(data)
  return geoJson
}

var getTimezone = function (originalLat, originalLon) {
  let lat = parseFloat(originalLat)
  let lon = parseFloat(originalLon)

  var err

  // validate latitude
  if (isNaN(lat) || lat > 90 || lat < -90) {
    err = new Error('Invalid latitude: ' + lat)
    throw err
  }

  // validate longitude
  if (isNaN(lon) || lon > 180 || lon < -180) {
    err = new Error('Invalid longitude: ' + lon)
    throw err
  }

  // North Pole should return all ocean zones
  if (lat === 90) {
    return oceanZones.map(zone => zone.tzid)
  }

  // fix edges of the world
  if (lat >= 89.9999) {
    lat = 89.9999
  } else if (lat <= -89.9999) {
    lat = -89.9999
  }

  if (lon >= 179.9999) {
    lon = 179.9999
  } else if (lon <= -179.9999) {
    lon = -179.9999
  }

  var pt = point([lon, lat])
  var quadData = {
    top: 89.9999,
    bottom: -89.9999,
    left: -179.9999,
    right: 179.9999,
    midLat: 0,
    midLon: 0
  }
  var quadPos = ''
  var curTzData = tzData.lookup

  while (true) {
    // calculate next quadtree position
    var nextQuad
    if (lat >= quadData.midLat && lon >= quadData.midLon) {
      nextQuad = 'a'
      quadData.bottom = quadData.midLat
      quadData.left = quadData.midLon
    } else if (lat >= quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'b'
      quadData.bottom = quadData.midLat
      quadData.right = quadData.midLon
    } else if (lat < quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'c'
      quadData.top = quadData.midLat
      quadData.right = quadData.midLon
    } else {
      nextQuad = 'd'
      quadData.top = quadData.midLat
      quadData.left = quadData.midLon
    }

    // console.log(nextQuad)
    curTzData = curTzData[nextQuad]
    // console.log()
    quadPos += nextQuad

    // analyze result of current depth
    if (!curTzData) {
      // no timezone in this quad, therefore must be timezone at sea
      return getTimezoneAtSea(originalLon)
    } else if (curTzData.pos >= 0 && curTzData.len) {
      // get exact boundaries
      var geoJson = featureCache.get(quadPos)
      if (!geoJson) {
        geoJson = loadFeatures(quadPos, curTzData.pos, curTzData.len)
        featureCache.set(quadPos, geoJson)
      }

      var timezonesContainingPoint = []

      for (var i = 0; i < geoJson.features.length; i++) {
        if (inside(pt, geoJson.features[i])) {
          timezonesContainingPoint.push(geoJson.features[i].properties.tzid)
        }
      }

      // if at least one timezone contained the point, return those timezones,
      // otherwise must be timezone at sea
      return timezonesContainingPoint.length > 0
        ? timezonesContainingPoint
        : getTimezoneAtSea(originalLon)
    } else if (curTzData.length > 0) {
      // exact match found
      return curTzData.map(idx => tzData.timezones[idx])
    } else if (typeof curTzData !== 'object') {
      // not another nested quad index, throw error
      err = new Error('Unexpected data type')
      throw err
    }

    // calculate next quadtree depth data
    quadData.midLat = (quadData.top + quadData.bottom) / 2
    quadData.midLon = (quadData.left + quadData.right) / 2
  }
}

module.exports = getTimezone
module.exports.setCache = cacheLevel

// for backwards compatibility
module.exports.preCache = function () {
  cacheLevel({ preload: true })
}
