var fs = require('fs')

var _ = require('lodash'),
  async = require('async'),
  featurecollection = require('turf-featurecollection'),
  jsts = require('jsts'),
  mkdirp = require('mkdirp'),
  polygon = require('turf-polygon')

var DATA_DIR = './data'

var geoJsonReader = new jsts.io.GeoJSONReader(),
  geoJsonWriter = new jsts.io.GeoJSONWriter()

var within = function(outer, inner) {
  var a = geoJsonReader.read(JSON.stringify(outer)),
    b = geoJsonReader.read(JSON.stringify(inner))

  return a.contains(b)
}

var intersects = function(a, b) {
  
  var _a = geoJsonReader.read(JSON.stringify(a)),
    _b = geoJsonReader.read(JSON.stringify(b))

  return _a.intersects(_b)
}

// copied and modified from turf-intersect
var intersection = function(a, b) {
  var _a = geoJsonReader.read(JSON.stringify(a)),
    _b = geoJsonReader.read(JSON.stringify(b))

  var result = _a.intersection(_b)

  try {
    result = geoJsonWriter.write(result);
  } catch(e) {
    console.log('error interseting')
    async.parallel([
      function(cb) {
        var filePath = DATA_DIR + '/err-a.json',
          writeStream = fs.createWriteStream(filePath)

        writeStream.end(JSON.stringify(a, null, 2), function(err) {
          if(err) { throw err }
            cb()
        })
      }, function(cb) {
        var filePath = DATA_DIR + '/err-b.json',
          writeStream = fs.createWriteStream(filePath)

        writeStream.end(JSON.stringify(b, null, 2), function(err) {
          if(err) { throw err }
            cb()
        })
      }], function() {
        throw e
      })

    return 'error'
    
    
  }
  if(result.type === 'GeometryCollection' && result.geometries.length === 0) {
    return undefined
  } else {
    return {
      type: 'Feature',
      properties: {},
      geometry: result
    }
  }
}

module.exports = function(tzGeojson, callback) {

  console.log('indexing')

  var data = {
    timezones: [],
    lookup: {}
  }

  var inspectZones = function(timezonesToInspect, curBoundsGeoJson) {
    var intersectedZones = [],
      foundExactMatch = false

    for (var j = timezonesToInspect.length - 1; j >= 0; j--) {

      var curZoneIdx = timezonesToInspect[j],
        curZoneGeoJson = tzGeojson.features[curZoneIdx].geometry

      if(intersects(curZoneGeoJson, curBoundsGeoJson)) {
        // bounds and timezone intersect
        // check if tz fully contains bounds
        if(within(curZoneGeoJson, curBoundsGeoJson)) {
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

    //console.log('found', intersectedZones.length, 'intersecting zones')

    return {
      foundExactMatch: foundExactMatch,
      intersectedZones: intersectedZones
    }
  }

  var i, j,
    fileWritingQueue = async.queue(function(data, cb) {
      //console.log(data.folder)
      mkdirp(data.folder, function (err) {
        if (err) { return cb(err) }
        
        var filePath = data.folder + '/' + data.filename,
          writeStream = fs.createWriteStream(filePath)

        writeStream.end(JSON.stringify(data.data), function(err) {
          if(err) { return cb(err) }
          cb()
        })
      })
    }, 2)

  // create array and index lookup of timezone names
  for(i = 0; i < tzGeojson.features.length; i++) {
    data.timezones.push(tzGeojson.features[i].properties.TZID)
  }

  // recursively generate index until 99% of planet is indexed exactly
  var curPctIndexed = 0,
    curLevel = 1,
    expectedAtLevel = 4,
    curZones = [{ 
        id: 'a',
        bounds: [0, 0, 180, 90]
      }, {
        id: 'b',
        bounds: [-180, 0, 0, 90],
      }, {
        id: 'c',
        bounds: [-180, -90, 0, 0],
      }, {
        id: 'd',
        bounds: [0, -90, 180, 0]
      }]

  while(curPctIndexed < 0.90 && curZones.length < 40) {
    var nextZones = []
    
    console.log('*********************************************')
    console.log('level', curLevel, ' pct Indexed: ', curPctIndexed)
    console.log('*********************************************')

    for(i = 0; i < curZones.length; i++) {

      if(i % 1000 == 0) {
        console.log('inspecting index area ', i + 1, ' of ', curZones.length)
      }

      var curZone = curZones[i],
        curBounds = curZone.bounds,
        curBoundsGeoJson = polygon([[
            [curBounds[0], curBounds[1]],
            [curBounds[0], curBounds[3]],
            [curBounds[2], curBounds[3]],
            [curBounds[2], curBounds[1]],
            [curBounds[0], curBounds[1]]
          ]]).geometry

      var subZones = [],
        debug = polygon([[
            [curBounds[0], curBounds[1]],
            [curBounds[0], curBounds[3]],
            [curBounds[2], curBounds[3]],
            [curBounds[2], curBounds[1]],
            [curBounds[0], curBounds[1]]
          ]])

      subZones.push(debug)

      // calculate intersection with timezone boundaries
      var timezonesToInspect = []

      if(curZone.tzs) {
        // only examine confirmed timezones found in last iteration
        timezonesToInspect = curZone.tzs
      } else {
        // first iteration, find all intersections in world
        for (j = 0; j < tzGeojson.features.length; j++) {
          timezonesToInspect.push(j)
        }
      }

      var result = inspectZones(timezonesToInspect, curBoundsGeoJson),
        intersectedZones = result.intersectedZones,
        foundExactMatch = result.foundExactMatch

      /*for (j = 0; j < timezonesToInspect.length; j++) {
        var zIntersect = intersection(tzGeojson.features[timezonesToInspect[j]].geometry, curBoundsGeoJson)
        if(zIntersect) {
          subZones.push(zIntersect)
        }
      }*/

      var zoneResult = -1  // defaults to no zones found

      // check the results
      if(intersectedZones.length == 1 && foundExactMatch) {
        // analysis zone can fit completely within timezone
        zoneResult = intersectedZones[0]
      } else if(intersectedZones.length > 0) {
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

      _.set(data.lookup, curZone.id, zoneResult)

      /*fileWritingQueue.push({ 
        folder: DATA_DIR, 
        filename: 'level' + curLevel + '-sz-' + i + '.json', 
        data: featurecollection(subZones),
      })*/

    }
    
    // recalculate pct indexed after this round
    expectedAtLevel = Math.pow(4, curLevel + 1)
    curPctIndexed = (expectedAtLevel - nextZones.length) / expectedAtLevel
    curZones = nextZones
    curLevel++
  }

  console.log('reached target index: ', curPctIndexed)

  var allSubZones = []

  // process remaining zones and write out individual geojson for each small region
  for(i = 0; i < curZones.length; i++) {

    console.log('writing zone data ', i ,'of', curZones.length)

    var curZone = curZones[i],
      curBounds = curZone.bounds,
      curBoundsGeoJson = polygon([[
          [curBounds[0], curBounds[1]],
          [curBounds[0], curBounds[3]],
          [curBounds[2], curBounds[3]],
          [curBounds[2], curBounds[1]],
          [curBounds[0], curBounds[1]]
        ]]).geometry
      errFound = false

    console.log(curZone.id)

    var result = inspectZones(curZone.tzs, curBoundsGeoJson),
      intersectedZones = result.intersectedZones,
      foundExactMatch = result.foundExactMatch

    console.log('intersectedZones', intersectedZones.length, 'exact:', foundExactMatch)

    var zoneResult = -1  // defaults to no zones found

    // check the results
    if(intersectedZones.length == 1 && foundExactMatch) {
      // analysis zone can fit completely within timezone
      zoneResult = intersectedZones[0]
    } else if(intersectedZones.length > 0) {
      var features = []
      // calculate intersected area for each intersected zone
      for (j = intersectedZones.length - 1; j >= 0; j--) {
        var tzIdx = intersectedZones[j]

        console.log('intersecting', tzGeojson.features[tzIdx].properties)
        
        var intersectedArea = intersection(tzGeojson.features[tzIdx].geometry, curBoundsGeoJson)

        if(intersectedArea === 'error') {
          errFound = true
          break
        }

        intersectedArea.properties.TZID = data.timezones[tzIdx]
        features.push(intersectedArea)
        allSubZones.push(intersectedArea)
      }

      if(errFound) {
        break
      }

      var areaGeoJson = featurecollection(features),
        path = './data/' + curZone.id.replace(/\./g, '/')


      fileWritingQueue.push({ folder: path, filename: 'geo.json', data: areaGeoJson })

      zoneResult = 'f'
    
    }

    _.set(data.lookup, curZone.id, zoneResult)

  }

  console.log('writing index file')

  fileWritingQueue.drain = function(err) {
    console.log('drained')
    callback(err)
  }

  // write index data to file
  fileWritingQueue.push({ folder: DATA_DIR, filename: 'index.json', data: data })
  fileWritingQueue.push({ folder: DATA_DIR, filename: 'finalSubzones.json', data: featurecollection(allSubZones) })

}