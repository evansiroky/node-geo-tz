var fs = require('fs')

var async = require('async'),
  Download = require('download'),
  downloadStatus = require('download-status'),
  shp = require('shpjs')

var MASTER_DL_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip',
  MASTER_DL_SHA_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip.sha1',
  MASTER_LOCAL_SHA_FILE = './data/tz_world_mp.zip.sha1'

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
  return function() {

    console.log('extracting from shp')

    shp(toArrayBuffer(fs.readFileSync('./downloads/tz_shp.zip'))).then(function(geojson) {

      console.log('writing to geojson file')

      var writeStream = fs.createWriteStream('./data/tzgeo.json')
      writeStream.end(JSON.stringify(geojson), callback)
    }).catch(function(err) {
      callback(err)
    })

  }
}

var dl_file = function(url, rename, callback) {
  var download = new Download()
    .get(url)
    .dest('downloads')
    .use(downloadStatus())
    .rename(rename)
    .run(callback)
}

var updateShaFile = function(callback) {
  fs.unlink(MASTER_LOCAL_SHA_FILE, function(err) {
    if(err) {
      return callback(err)
    }
    fs.rename('./downloads/file.sha1', MASTER_LOCAL_SHA_FILE, callback)
  })
}

module.exports = function(cfg, callback) {

  var mainUrl, shaUrl

  if(!callback) {
    if(typeof cfg === 'function') {
      callback = cfg
    } else if(!cfg) {
      callback = function() {}
    }

    mainUrl = MASTER_DL_URL
    shaUrl = MASTER_DL_SHA_URL

  } else {
    mainUrl = cfg.mainUrl || MASTER_DL_URL
    shaUrl = cfg.shaUrl || MASTER_DL_SHA_URL
  }

  // download sha file to see if master file is updated
  dl_file(shaUrl, 'file.sha1', function(err) {
    
    if(err) {
      return callback(err)
    }

    async.map([MASTER_LOCAL_SHA_FILE, './downloads/file.sha1'],
      function(file, mapCallback) {
        fs.readFile(file, 'utf-8', mapCallback)
      },
      function(err, results) {
        if(err) {
          return callback(err)
        }
        if(results[0] === results[1]) {
          console.log('remote file same as local, no need to download')
          callback()
        } else {
          // remote tz world shapefile is new
          async.parallel([
              // download tz world shapefile
              function(parallelCallback) {
                dl_file(mainUrl, 'tz_shp.zip', extractToGeoJSON(parallelCallback))
              },
              // also update master sha file
              updateShaFile
            ], 
            callback)
        }
      })
  })  

}