var fs = require('fs')

var Download = require('download'),
  downloadStatus = require('download-status'),
  shp = require('shpjs')

/**
 * Copied from http://stackoverflow.com/a/12101012/269834
 */
var toArrayBuffer = function(buffer) {
  var ab = new ArrayBuffer(buffer.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i]
  }
  return view
}

var extractToGeoJSON = function(callback) {

  if(typeof callback !== 'function') {
    callback = function() {}
  }
  return function() {

    console.log('extracting from shp')

    shp(toArrayBuffer(fs.readFileSync('./downloads/tz_world_mp.zip'))).then(function(geojson) {

      console.log('writing to geojson file')

      var writeStream = fs.createWriteStream('./data/tzgeo.json')
      writeStream.end(JSON.stringify(geojson), callback)
    }).catch(function(err) {
      callback(err)
    })

  }
}

module.exports = function(callback) {

  // download tz world shapefile
  var download = new Download()
    .get('http://efele.net/maps/tz/world/tz_world_mp.zip')
    .dest('downloads')
    .use(downloadStatus())
    .run(extractToGeoJSON(callback))

}