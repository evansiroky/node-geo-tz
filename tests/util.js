var fs = require('fs-extra')
var path = require('path')

var async = require('async')
var rimraf = require('rimraf')
var glob = require("glob");
var Pbf = require("pbf");
var geobuf = require("geobuf");
var _ = require('lodash')

var util = {}

util.createDataDir = function (dir, callback) {
  async.auto({
    destroyDataDir: function (cb) {
      util.destroyDataDir(dir, cb)
    },
    createNewDataDir: ['destroyDataDir', function (results, cb) {
      fs.mkdir(dir, cb)
    }]
  }, callback)
}

util.destroyDataDir = function (dir, callback) {
  async.each([dir, dir + '.zip'], rimraf, callback)
}


util.getAllCoordinatesFromLineStringsAndGeometryCollections = function getAllCoordinates() {
  const files = glob.sync(path.join(__dirname, "../data/**/geo.buf"));

  let coordinates = new Set()

  for (const file of files) {
    const data = new Pbf(fs.readFileSync(file));
    const geoJson = geobuf.decode(data);
    const nonPolygons = geoJson.features.filter(
      f => !["Polygon", "MultiPolygon"].includes(f.geometry.type)
    )

    for (const polygon of nonPolygons) {
      for (const coordinate of extractCoordinates(polygon)) {
        if (Array.isArray(coordinate) === false || coordinate.length !== 2) {
          console.log(coordinate);
          console.log(polygon);
        }
        coordinates.add(coordinate)
      }
    }
  }

  return coordinates;
}

module.exports = util

function extractCoordinates (feature) {
  if (feature.geometry.type === 'Polygon') {
    return _.flatten(feature.geometry.coordinates)
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return _.flattenDepth(feature.geometry.coordinates, 2)
  }

  if (feature.geometry.type === 'LineString') {
    return feature.geometry.coordinates
  }

  if (feature.geometry.type === 'GeometryCollection') {
    return _.flatten(feature.geometry.geometries.map(geometry => extractCoordinates({
      geometry
    })))
  }
}
