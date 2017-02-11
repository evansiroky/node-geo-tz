var fs = require('fs')

var helpers = require('@turf/helpers')
var async = require('async')
var geobuf = require('geobuf')
var jsts = require('jsts')
var _ = require('lodash')
var mkdirp = require('mkdirp')
var Pbf = require('pbf')

var featureCollection = helpers.featureCollection
var polygon = helpers.polygon
var geoJsonReader = new jsts.io.GeoJSONReader()
var geoJsonWriter = new jsts.io.GeoJSONWriter()

var within = function (outer, inner) {
  var a = geoJsonReader.read(JSON.stringify(outer))
  var b = geoJsonReader.read(JSON.stringify(inner))

  return a.contains(b)
}

var intersects = function (a, b) {
  var _a = geoJsonReader.read(JSON.stringify(a))
  var _b = geoJsonReader.read(JSON.stringify(b))

  return _a.intersects(_b)
}

// copied and modified from turf-intersect
var intersection = function (a, b) {
  var _a = geoJsonReader.read(JSON.stringify(a))
  var _b = geoJsonReader.read(JSON.stringify(b))

  var result = _a.intersection(_b)
  result = geoJsonWriter.write(result)

  if (result.type === 'GeometryCollection' && result.geometries.length === 0) {
    return undefined
  } else {
    return {
      type: 'Feature',
      properties: {},
      geometry: result
    }
  }
}

module.exports = function (tzGeojson, dataDir, targetIndexPercent, callback) {
  console.log('indexing')

  var data = {
    timezones: [],
    lookup: {}
  }

  var inspectZones = function (timezonesToInspect, curBoundsGeoJson) {
    var intersectedZones = []
    var foundExactMatch = false

    for (var j = timezonesToInspect.length - 1; j >= 0; j--) {
      var curZoneIdx = timezonesToInspect[j]
      var curZoneGeoJson = tzGeojson.features[curZoneIdx].geometry

      if (intersects(curZoneGeoJson, curBoundsGeoJson)) {
        // bounds and timezone intersect
        // check if tz fully contains bounds
        if (within(curZoneGeoJson, curBoundsGeoJson)) {
          // bounds fully within tz, note in index
          intersectedZones = [curZoneIdx]
          foundExactMatch = true
          break
        } else {
          // bounds not fully within tz, add to intersected zones
          intersectedZones.push(curZoneIdx)
        }
      }
    }

    // console.log('found', intersectedZones.length, 'intersecting zones')
    return {
      foundExactMatch: foundExactMatch,
      intersectedZones: intersectedZones
    }
  }

  var i, j
  var fileWritingQueue = async.queue(
    function (data, cb) {
      // console.log(data.folder)
      mkdirp(data.folder, function (err) {
        if (err) { return cb(err) }

        var filePath = data.folder + '/' + data.filename
        var writeStream = fs.createWriteStream(filePath)
        var output

        if (filePath.split('.').pop() === 'buf') {
          output = Buffer.from(geobuf.encode(data.data, new Pbf()))
        } else {
          output = JSON.stringify(data.data)
        }

        writeStream.end(output, function (err) {
          if (err) { return cb(err) }
          cb()
        })
      })
    }, 10)

  // create array and index lookup of timezone names
  for (i = 0; i < tzGeojson.features.length; i++) {
    data.timezones.push(tzGeojson.features[i].properties.tzid)
  }

  // recursively generate index until 99% of planet is indexed exactly
  var curPctIndexed = 0
  var curLevel = 1
  var expectedAtLevel = 4
  var curZones = [
    {
      id: 'a',
      bounds: [0, 0, 179.9999, 89.9999]
    }, {
      id: 'b',
      bounds: [-179.9999, 0, 0, 89.9999]
    }, {
      id: 'c',
      bounds: [-179.9999, -89.9999, 0, 0]
    }, {
      id: 'd',
      bounds: [0, -89.9999, 179.9999, 0]
    }
  ]
  var printMod, curZone, curBounds, curBoundsGeoJson

  while (curPctIndexed < targetIndexPercent) {
    var nextZones = []

    console.log('*********************************************')
    console.log('level', curLevel, ' pct Indexed: ', curPctIndexed)
    console.log('*********************************************')

    printMod = Math.round(curZones.length / 5)

    for (i = curZones.length - 1; i >= 0; i--) {
      if (i % printMod === 0) {
        console.log('inspecting index area ', curZones.length - i, ' of ', curZones.length)
      }

      curZone = curZones[i]
      curBounds = curZone.bounds
      curBoundsGeoJson = polygon(
        [
          [
            [curBounds[0], curBounds[1]],
            [curBounds[0], curBounds[3]],
            [curBounds[2], curBounds[3]],
            [curBounds[2], curBounds[1]],
            [curBounds[0], curBounds[1]]
          ]
        ]
      ).geometry

      // calculate intersection with timezone boundaries
      var timezonesToInspect = []

      if (curZone.tzs) {
        // only examine confirmed timezones found in last iteration
        timezonesToInspect = curZone.tzs
      } else {
        // first iteration, find all intersections in world
        for (j = tzGeojson.features.length - 1; j >= 0; j--) {
          timezonesToInspect.push(j)
        }
      }

      var result = inspectZones(timezonesToInspect, curBoundsGeoJson)
      var intersectedZones = result.intersectedZones
      var foundExactMatch = result.foundExactMatch
      var zoneResult = -1  // defaults to no zones found

      // check the results
      if (intersectedZones.length === 1 && foundExactMatch) {
        // analysis zone can fit completely within timezone
        zoneResult = intersectedZones[0]
      } else if (intersectedZones.length > 0) {
        // further analysis needed
        var topRight = {
          id: curZone.id + '.a',
          tzs: intersectedZones,
          bounds: [
            (curBounds[0] + curBounds[2]) / 2,
            (curBounds[1] + curBounds[3]) / 2,
            curBounds[2],
            curBounds[3]
          ]
        }

        var topLeft = {
          id: curZone.id + '.b',
          tzs: intersectedZones,
          bounds: [
            curBounds[0],
            (curBounds[1] + curBounds[3]) / 2,
            (curBounds[0] + curBounds[2]) / 2,
            curBounds[3]
          ]
        }

        var bottomLeft = {
          id: curZone.id + '.c',
          tzs: intersectedZones,
          bounds: [
            curBounds[0],
            curBounds[1],
            (curBounds[0] + curBounds[2]) / 2,
            (curBounds[1] + curBounds[3]) / 2
          ]
        }

        var bottomRight = {
          id: curZone.id + '.d',
          tzs: intersectedZones,
          bounds: [
            (curBounds[0] + curBounds[2]) / 2,
            curBounds[1],
            curBounds[2],
            (curBounds[1] + curBounds[3]) / 2
          ]
        }

        nextZones.push(topRight)
        nextZones.push(topLeft)
        nextZones.push(bottomLeft)
        nextZones.push(bottomRight)

        zoneResult = {
          a: intersectedZones,
          b: intersectedZones,
          c: intersectedZones,
          d: intersectedZones
        }
      }

      if (zoneResult !== -1) {
        _.set(data.lookup, curZone.id, zoneResult)
      } else {
        _.unset(data.lookup, curZone.id)
      }
    }

    // recalculate pct indexed after this round
    expectedAtLevel = Math.pow(4, curLevel + 1)
    curPctIndexed = (expectedAtLevel - nextZones.length) / expectedAtLevel
    curZones = nextZones
    curLevel++
  }

  console.log('*********************************************')
  console.log('reached target index: ', curPctIndexed)
  console.log('writing unindexable zone data')

  printMod = Math.round(curZones.length / 5)

  // process remaining zones and write out individual geojson for each small region
  for (i = curZones.length - 1; i >= 0; i--) {
    if (i % printMod === 0) {
      console.log('inspecting unindexable area ', curZones.length - i, ' of ', curZones.length)
    }

    curZone = curZones[i]
    curBounds = curZone.bounds
    curBoundsGeoJson = polygon(
      [
        [
          [curBounds[0], curBounds[1]],
          [curBounds[0], curBounds[3]],
          [curBounds[2], curBounds[3]],
          [curBounds[2], curBounds[1]],
          [curBounds[0], curBounds[1]]
        ]
      ]
    ).geometry

    // console.log('writing zone data `', curZone.id, '`', i ,'of', curZones.length)
    result = inspectZones(curZone.tzs, curBoundsGeoJson)
    intersectedZones = result.intersectedZones
    foundExactMatch = result.foundExactMatch

    // console.log('intersectedZones', intersectedZones.length, 'exact:', foundExactMatch)
    zoneResult = -1  // defaults to no zones found

    // check the results
    if (intersectedZones.length === 1 && foundExactMatch) {
      // analysis zone can fit completely within timezone
      zoneResult = intersectedZones[0]
    } else if (intersectedZones.length > 0) {
      var features = []
      // calculate intersected area for each intersected zone
      for (j = intersectedZones.length - 1; j >= 0; j--) {
        var tzIdx = intersectedZones[j]

        // console.log('intersecting', tzGeojson.features[tzIdx].properties)
        var intersectedArea = intersection(tzGeojson.features[tzIdx].geometry, curBoundsGeoJson)

        if (intersectedArea) {
          intersectedArea.properties.tzid = data.timezones[tzIdx]
          features.push(intersectedArea)
        }
      }

      var areaGeoJson = featureCollection(features)
      var path = dataDir + '/' + curZone.id.replace(/\./g, '/')

      fileWritingQueue.push({ folder: path, filename: 'geo.buf', data: areaGeoJson })

      zoneResult = 'f'
    }

    if (zoneResult !== -1) {
      _.set(data.lookup, curZone.id, zoneResult)
    } else {
      _.unset(data.lookup, curZone.id)
    }
  }

  console.log('writing index file')

  fileWritingQueue.drain = function (err) {
    console.log('done indexing')
    callback(err)
  }

  // write index data to file
  fileWritingQueue.push({ folder: dataDir, filename: 'index.json', data: data })
}
