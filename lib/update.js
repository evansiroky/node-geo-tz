var fs = require('fs')
var https = require('follow-redirects').https

var async = require('async')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var yauzl = require('yauzl')

var indexGeoJSON = require('./createGeoIndex.js')

var TARGET_INDEX_PERCENT = 0.5
var dlFile = __dirname + '/../downloads/timezones.zip'
var tzFile = __dirname + '/../downloads/timezones.json'

var downloadLatest = function (callback) {
  console.log('Downloading geojson')
  async.auto({
    getLatestUrl: function (cb) {
      https.get(
        {
          headers: { 'user-agent': 'node-geo-tz' },
          host: 'api.github.com',
          path: '/repos/evansiroky/timezone-boundary-builder/releases/latest'
        },
        function (res) {
          var data = ''
          res.on('data', function (chunk) {
            data += chunk
          })
          res.on('end', function () {
            data = JSON.parse(data)
            for (var i = 0; i < data.assets.length; i++) {
              data.assets[i].browser_download_url.indexOf('geojson') > -1
              return cb(null, data.assets[i].browser_download_url)
            }
            cb('geojson not found')
          })
        }
      ).on('error', cb)
    },
    rm: function (cb) {
      rimraf(dlFile, cb)
    },
    mkdir: ['rm', function (results, cb) {
      mkdirp(__dirname + '/../downloads', cb)
    }],
    dl: ['mkdir', 'getLatestUrl', function (results, cb) {
      https.get({
        headers: { 'user-agent': 'node-geo-tz' },
        host: 'github.com',
        path: results.getLatestUrl.replace('https://github.com', '')
      }, function (response) {
        var file = fs.createWriteStream(dlFile)
        response.pipe(file)
        file.on('finish', function () {
          file.close(cb)
        })
      }).on('error', cb)
    }]
  }, callback)
}

module.exports = function (cfg, callback) {
  if (!callback) {
    if (typeof cfg === 'function') {
      callback = cfg
    } else {
      callback = function () {}
    }
  }

  var dataDir = cfg.dataDir || __dirname + '/../data'

  async.auto({
    // download latest geojson data
    downloadData: function (cb) {
      downloadLatest(cb)
    },
    deleteIndexFoldersAndFiles: ['downloadData', function (results, cb) {
      async.each(['a', 'b', 'c', 'd', 'index.json'], function (fileOrFolder, eachCb) {
        rimraf(dataDir + '/' + fileOrFolder, eachCb)
      }, cb)
    }],
    unzipGeoJson: ['downloadData', function (results, cb) {
      yauzl.open(dlFile, { lazyEntries: true }, function (err, zipfile) {
        if (err) { return cb(err) }
        zipfile.readEntry()
        zipfile.on('entry', function (entry) {
          if (/\/$/.test(entry.fileName)) {
            // directory, keep reading
            zipfile.readEntry()
          } else {
            // assuming a json file
            zipfile.openReadStream(entry,
              function (err, readStream) {
                if (err) { return cb(err) }
                readStream.pipe(fs.createWriteStream(tzFile))
                readStream.on('end', function () {
                  zipfile.readEntry()
                })
              }
            )
          }
        })
        zipfile.on('end', function (err) {
          cb(err)
        })
      })
    }],
    createIndex: ['deleteIndexFoldersAndFiles', 'unzipGeoJson', function (results, cb) {
      indexGeoJSON(require(tzFile), dataDir, TARGET_INDEX_PERCENT, cb)
    }]
  }, callback)
}
