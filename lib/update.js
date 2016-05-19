var fs = require('fs')

var async = require('async'),
  Download = require('download'),
  downloadStatus = require('download-status'),
  rimraf = require('rimraf'),
  shp = require('shpjs')

var indexGeoJSON = require('./createGeoIndex.js')

var MASTER_DL_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip',
  MASTER_DL_SHA_URL = 'http://efele.net/maps/tz/world/tz_world_mp.zip.sha1'

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
    .catch(function(e){ callback(e) })
}

var downloadFile = function(url, rename, callback) {
  var download = new Download()
    .get(url)
    .dest('downloads')
    .use(downloadStatus())
    .rename(rename)
    .run(callback)
}

var makeReadShaFileFn = function(filename) {
  return function(results, cb) {
    fs.readFile(filename, 'utf-8', cb ? cb : results)
  }
}

module.exports = function(cfg, callback) {

  var mainUrl, shaUrl, dataDir, masterLocalShaFile

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

  dataDir = cfg.dataDir || './data'
  masterLocalShaFile = dataDir + '/tz_world_mp.zip.sha1'

  async.auto({
    // download sha file to see if master file is updated
    downloadSha: function(cb) {
      downloadFile(shaUrl, 'file.sha1', cb)
    },
    // read local sha file
    readLocalSha: makeReadShaFileFn(masterLocalShaFile),
    // read downloaded sha file
    readDownloadedSha: ['downloadSha', makeReadShaFileFn('./downloads/file.sha1')],
    comparseShaFiles: ['readLocalSha', 'readDownloadedSha', function(results, cb) {
      if(results.readLocalSha === results.readDownloadedSha) {
        var message = 'remote file same as local, no need to download'
        console.log(message)
        return cb(message)
      } 
      cb()
    }],
    unlinkLocalShaFile: ['comparseShaFiles', function(results, cb) {
      fs.unlink(masterLocalShaFile, cb)
    }],
    updateShaFile: ['unlinkLocalShaFile', function(results, cb) {
      fs.rename('./downloads/file.sha1', masterLocalShaFile, cb)
    }],
    deleteIndexFoldersAndFiles: ['comparseShaFiles', function(results, cb) {
      async.each(['a', 'b', 'c', 'd', 'index.json'], function(fileOrFolder, eachCb) {
        rimraf(dataDir + '/' + fileOrFolder, eachCb)
      }, cb)
    }],
    downloadShapefile: ['comparseShaFiles', function(results, cb) {
      downloadFile(mainUrl, 'tz_shp.zip', cb)
    }],
    extractShapefileToGeoJSON: ['downloadShapefile', function(results, cb) {
      extractToGeoJson(cb)
    }],
    createIndex: ['deleteIndexFoldersAndFiles', 'extractShapefileToGeoJSON', function(results, cb) {
      indexGeoJSON(results.extractShapefileToGeoJSON, dataDir, 0.5, cb)
    }]

  }, function(err, results) {
    if(err && err !== 'remote file same as local, no need to download') {
      return callback(err)
    }
    callback()
  })

}