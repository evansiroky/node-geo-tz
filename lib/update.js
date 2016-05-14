var fs = require('fs')

var async = require('async'),
  Download = require('download'),
  downloadStatus = require('download-status'),
  shp = require('shpjs')

var indexGeoJSON = require('./createGeoIndex.js')

var MASTER_DL_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip',
  MASTER_DL_SHA_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip.sha1',
  MASTER_LOCAL_SHA_FILE = './data/tz_world_mp.zip.sha1',
  OUTPUT_FILE = './data/tzgeo.json'

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

var extractToGeoJson = function(callback) {
  shp(toArrayBuffer(fs.readFileSync('./downloads/tz_shp.zip')))
    .then(function(geojson) { callback(null, geojson) })
    .catch(function(e){ throw e })
}

var downloadFile = function(url, rename, callback) {
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
    } else {
      callback = function() {}
    }

    mainUrl = MASTER_DL_URL
    shaUrl = MASTER_DL_SHA_URL

  } else {
    mainUrl = cfg.mainUrl || MASTER_DL_URL
    shaUrl = cfg.shaUrl || MASTER_DL_SHA_URL
  }

  indexGeoJSON(require('../data/tzgeo.json'), callback)

  // download sha file to see if master file is updated
  /*downloadFile(shaUrl, 'file.sha1', function(err) {

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
                downloadFile(mainUrl, 'tz_shp.zip', extractToGeoJson(function(err, geojson) {
                  if(err) { return parallelCallback(err) }
                    if(cfg.indexGeoJSON) {
                      indexGeoJSON(geojson, parallelCallback)
                    } else {
                      var writeStream = fs.createWriteStream(OUTPUT_FILE)
                      writeStream.end(JSON.stringify(geojson), function(err) {
                        if(err) {
                          return parallelCallback(err)
                        }
                        parallelCallback()
                      })
                    }
                  }
                ))
              },
              // also update master sha file
              updateShaFile
            ], 
            callback)
        }
      })
  })*/
}