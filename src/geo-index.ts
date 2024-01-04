import * as fs from 'fs'
import * as path from 'path'

import { featureCollection, polygon } from '@turf/helpers'
import geobuf from 'geobuf'
import * as jsts from 'jsts'
import _ from 'lodash'
import Pbf from 'pbf'

const geoJsonReader = new jsts.io.GeoJSONReader()
const geoJsonWriter = new jsts.io.GeoJSONWriter()

export default function (
  tzGeojson,
  dataDir,
  product,
  targetIndexPercent,
  callback,
) {
  console.log(`indexing data for ${product}`)

  const data = {
    timezones: [],
    lookup: {},
  }

  /**
   * iterate through geometry coordinates and change any coordinates along
   * longitude 0 to longitude 0.00001
   */
  function hackLongitude0Polygon(polygon) {
    polygon.forEach((linearRing) => {
      linearRing.forEach((ringCoords) => {
        if (ringCoords[0] === 0 && ringCoords[1] < -55) {
          ringCoords[0] = 0.00001
        }
      })
    })
  }

  const timezoneGeometries = tzGeojson.features.map((feature) => {
    // Perform a quick hack to make sure two Antarctic zones can be indexed
    // properly. Each of these zones shares a boundary at longitude 0. During
    // the quadtree analysis, the zones were being intersected right aloing
    // their boundaries which resulted in LineStrings being returned. This hack
    // changes their boundares along longitude 0 to longitude 0.00001 to avoid
    // LineStrings being intersected.
    if (
      feature.properties.tzid === 'Africa/Johannesburg' ||
      feature.properties.tzid === 'Antarctica/Troll'
    ) {
      if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(hackLongitude0Polygon)
      } else {
        hackLongitude0Polygon(feature.geometry.coordinates)
      }
    }

    // load zone into memory as jsts geometry
    return geoJsonReader.read(JSON.stringify(feature.geometry))
  })

  let debugWriteIdx = 1

  const writeDebugData = function (filename, geom) {
    fs.writeFileSync(
      'debug_' + debugWriteIdx + '_' + filename + '.json',
      JSON.stringify(geoJsonWriter.write(geom)),
    )
  }

  const getIntersectingGeojson = function (tzIdx, curBoundsGeometry) {
    // console.log('intersecting', tzGeojson.features[tzIdx].properties)
    const intersectedGeometry =
      timezoneGeometries[tzIdx].intersection(curBoundsGeometry)
    const intersectedGeoJson: any = geoJsonWriter.write(intersectedGeometry)

    if (
      intersectedGeoJson.type === 'GeometryCollection' &&
      intersectedGeoJson.geometries.length === 0
    ) {
      return undefined
    } else {
      const tzName = data.timezones[tzIdx]
      // If the geojson type is not a Polygon or a MultiPolygon, something weird
      // is happening and the build should be failed as this will cause issues
      // during the find method.
      // See https://github.com/evansiroky/node-geo-tz/issues/90.
      if (!intersectedGeoJson.type.match(/olyg/)) {
        console.log(tzName)
        console.log(intersectedGeoJson.type)
        writeDebugData('tz', timezoneGeometries[tzIdx])
        writeDebugData('curBounds', curBoundsGeometry)
        writeDebugData('intersection', intersectedGeometry)
        debugWriteIdx++
      }
      return {
        type: 'Feature',
        properties: {
          tzid: null,
        },
        geometry: intersectedGeoJson,
      }
    }
  }

  /**
   * Check if certain timezones fall within a specified bounds geometry.
   * Also, check if an exact match is found (ie, the bounds are fully contained
   * within a particular zone).
   *
   * @param  {Array<number>} timezonesToInspect An array of indexes referencing
   *   a particular timezone as noted in the tzGeojson.features array.
   * @param  {Geometry} curBoundsGeometry The geometry to check
   */
  const inspectZones = function (timezonesToInspect, curBoundsGeometry) {
    const intersectedZones = []
    let numberOfZonesThatContainBounds = 0

    for (let j = timezonesToInspect.length - 1; j >= 0; j--) {
      const curZoneIdx = timezonesToInspect[j]
      const curZoneGeometry = timezoneGeometries[curZoneIdx]

      if (curZoneGeometry.intersects(curBoundsGeometry)) {
        // bounds and timezone intersect, add to intersected zones
        intersectedZones.push(curZoneIdx)

        // check if tz fully contains bounds
        if (curZoneGeometry.contains(curBoundsGeometry)) {
          // bounds fully within tz
          numberOfZonesThatContainBounds += 1
        }
      }
    }

    return {
      intersectedZones,
      numberOfZonesThatContainBounds,
    }
  }

  let filePosition = 0

  // analyze each unindexable area in a queue, otherwise the program may run out
  // of memory
  function writeUnindexableData(unindexableData, geoDatFd) {
    const features = []
    // calculate intersected area for each intersected zone
    for (let j = unindexableData.intersectedZones.length - 1; j >= 0; j--) {
      const tzIdx = unindexableData.intersectedZones[j]
      const intersectedGeoJson = getIntersectingGeojson(
        tzIdx,
        unindexableData.curBoundsGeometry,
      )

      if (intersectedGeoJson) {
        intersectedGeoJson.properties.tzid = data.timezones[tzIdx]
        features.push(intersectedGeoJson)
      }
    }

    const areaGeoJson: any = featureCollection(features)

    const buf = Buffer.from(geobuf.encode(areaGeoJson, new Pbf()))
    fs.writeSync(geoDatFd, buf, 0, buf.length)

    const ret = {
      pos: filePosition,
      len: buf.length,
    }

    filePosition += buf.length

    return ret
  }

  // create array and index lookup of timezone names
  for (let i = 0; i < tzGeojson.features.length; i++) {
    data.timezones.push(tzGeojson.features[i].properties.tzid)
  }

  // recursively generate index until 99% of planet is indexed exactly
  let curPctIndexed = 0
  let curLevel = 1
  let expectedAtLevel = 4
  let curZones = [
    {
      id: 'a',
      bounds: [0, 0, 179.9999, 89.9999],
    },
    {
      id: 'b',
      bounds: [-179.9999, 0, 0, 89.9999],
    },
    {
      id: 'c',
      bounds: [-179.9999, -89.9999, 0, 0],
    },
    {
      id: 'd',
      bounds: [0, -89.9999, 179.9999, 0],
    },
  ]
  let printMod, curZone, curBounds, curBoundsGeometry

  while (curPctIndexed < targetIndexPercent) {
    const nextZones = []

    console.log('*********************************************')
    console.log('level', curLevel, ' pct Indexed: ', curPctIndexed)
    console.log('*********************************************')

    printMod = Math.round(curZones.length / 5)

    for (let i = curZones.length - 1; i >= 0; i--) {
      if (i % printMod === 0) {
        console.log(
          'inspecting index area ',
          curZones.length - i,
          ' of ',
          curZones.length,
        )
      }

      curZone = curZones[i]
      curBounds = curZone.bounds
      curBoundsGeometry = geoJsonReader.read(
        JSON.stringify(
          polygon([
            [
              [curBounds[0], curBounds[1]],
              [curBounds[0], curBounds[3]],
              [curBounds[2], curBounds[3]],
              [curBounds[2], curBounds[1]],
              [curBounds[0], curBounds[1]],
            ],
          ]).geometry,
        ),
      )

      // calculate intersection with timezone boundaries
      let timezonesToInspect = []

      if (curZone.tzs) {
        // only examine confirmed timezones found in last iteration
        timezonesToInspect = curZone.tzs
      } else {
        // first iteration, find all intersections in world
        for (let j = tzGeojson.features.length - 1; j >= 0; j--) {
          timezonesToInspect.push(j)
        }
      }

      const result = inspectZones(timezonesToInspect, curBoundsGeometry)
      const intersectedZones = result.intersectedZones
      const numberOfZonesThatContainBounds =
        result.numberOfZonesThatContainBounds
      let zoneResult: any = -1 // defaults to no zones found

      // check the results
      if (
        intersectedZones.length === numberOfZonesThatContainBounds &&
        numberOfZonesThatContainBounds > 0
      ) {
        // analysis zones can fit completely within current quad
        zoneResult = intersectedZones
      } else if (intersectedZones.length > 0) {
        // further analysis needed
        const topRight = {
          id: curZone.id + '.a',
          tzs: intersectedZones,
          bounds: [
            (curBounds[0] + curBounds[2]) / 2,
            (curBounds[1] + curBounds[3]) / 2,
            curBounds[2],
            curBounds[3],
          ],
        }

        const topLeft = {
          id: curZone.id + '.b',
          tzs: intersectedZones,
          bounds: [
            curBounds[0],
            (curBounds[1] + curBounds[3]) / 2,
            (curBounds[0] + curBounds[2]) / 2,
            curBounds[3],
          ],
        }

        const bottomLeft = {
          id: curZone.id + '.c',
          tzs: intersectedZones,
          bounds: [
            curBounds[0],
            curBounds[1],
            (curBounds[0] + curBounds[2]) / 2,
            (curBounds[1] + curBounds[3]) / 2,
          ],
        }

        const bottomRight = {
          id: curZone.id + '.d',
          tzs: intersectedZones,
          bounds: [
            (curBounds[0] + curBounds[2]) / 2,
            curBounds[1],
            curBounds[2],
            (curBounds[1] + curBounds[3]) / 2,
          ],
        }

        nextZones.push(topRight)
        nextZones.push(topLeft)
        nextZones.push(bottomLeft)
        nextZones.push(bottomRight)

        zoneResult = {
          a: intersectedZones,
          b: intersectedZones,
          c: intersectedZones,
          d: intersectedZones,
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
  console.log(`writing unindexable zone data for ${product}`)
  const geoDatFd = fs.openSync(path.join(dataDir, `${product}.geo.dat`), 'w')

  printMod = Math.round(curZones.length / 5)

  // process remaining zones and write out individual geojson for each small region
  for (let i = curZones.length - 1; i >= 0; i--) {
    if (i % printMod === 0) {
      console.log(
        'inspecting unindexable area ',
        curZones.length - i,
        ' of ',
        curZones.length,
      )
    }

    curZone = curZones[i]
    curBounds = curZone.bounds
    curBoundsGeometry = geoJsonReader.read(
      JSON.stringify(
        polygon([
          [
            [curBounds[0], curBounds[1]],
            [curBounds[0], curBounds[3]],
            [curBounds[2], curBounds[3]],
            [curBounds[2], curBounds[1]],
            [curBounds[0], curBounds[1]],
          ],
        ]).geometry,
      ),
    )

    // console.log('writing zone data `', curZone.id, '`', i ,'of', curZones.length)
    const result = inspectZones(curZone.tzs, curBoundsGeometry)
    const intersectedZones = result.intersectedZones
    const numberOfZonesThatContainBounds = result.numberOfZonesThatContainBounds

    // console.log('intersectedZones', intersectedZones.length, 'exact:', foundExactMatch)
    let zoneResult: any = -1 // defaults to no zones found

    // check the results
    if (
      intersectedZones.length === numberOfZonesThatContainBounds &&
      numberOfZonesThatContainBounds > 0
    ) {
      // analysis zones can fit completely within current quad
      zoneResult = intersectedZones
    } else if (intersectedZones.length > 0) {
      zoneResult = writeUnindexableData(
        {
          curBoundsGeometry,
          curZone,
          intersectedZones,
        },
        geoDatFd,
      )
    }

    if (zoneResult !== -1) {
      _.set(data.lookup, curZone.id, zoneResult)
    } else {
      _.unset(data.lookup, curZone.id)
    }
  }

  fs.closeSync(geoDatFd)

  console.log(`writing index file for product ${product}`)

  fs.writeFile(
    path.join(dataDir, `${product}.index.json`),
    JSON.stringify(data),
    callback,
  )
}
