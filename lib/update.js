var https = require('follow-redirects').https
var path = require('path')

var async = require('async')
var fs = require('fs-extra')
var yazl = require('yazl')
var yauzl = require('yauzl')

var indexGeoJSON = require('./geo-index')

var TARGET_INDEX_PERCENT = 0.75
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
              if (data.assets[i].browser_download_url.indexOf('timezones.geojson') > -1) {
                return cb(null, data.assets[i].browser_download_url)
              }
            }
            cb('geojson not found')
          })
        }
      ).on('error', cb)
    },
    rm: function (cb) {
      fs.remove(dlFile, cb)
    },
    mkdir: ['rm', function (results, cb) {
      fs.ensureDir(__dirname + '/../downloads', cb)
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

var zipDir = function (zipFile, filePath, zipPath, nextDir, callback) {
  var curPath = path.join(filePath, nextDir)
  fs.readdir(curPath, function (err, files) {
    if (err) return callback(err)
    async.each(files, function (file, cb) {
      var curFile = path.join(curPath, file)
      var curZipFile = path.join(zipPath, file)
      fs.stat(curFile, function (err, stats) {
        if (err) return cb(err)
        if (stats.isDirectory()) {
          zipDir(zipFile, curPath, curZipFile, file, cb)
        } else {
          zipFile.addFile(curFile, curZipFile)
          cb()
        }
      })
    }, callback)
  })
}

module.exports = function (cfg, callback) {
  if (!callback) {
    if (typeof cfg === 'function') {
      callback = cfg
      cfg = {}
    } else {
      callback = function () {}
    }
  }

  var dataDir = cfg.dataDir || 'data'
  var resolvedDataDir = cfg.dataDir ? __dirname + '/../' + cfg.dataDir : __dirname + '/../data'

  async.auto({
    // download latest geojson data
    downloadData: function (cb) {
      downloadLatest(cb)
    },
    deleteIndexFoldersAndFiles: ['downloadData', function (results, cb) {
      async.each(['a', 'b', 'c', 'd', 'index.json'], function (fileOrFolder, eachCb) {
        fs.remove(resolvedDataDir + '/' + fileOrFolder, eachCb)
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
      indexGeoJSON(require(tzFile), resolvedDataDir, TARGET_INDEX_PERCENT, cb)
    }],
    zipData: ['createIndex', function (results, cb) {
      var zipfile = new yazl.ZipFile()
      // recursively add all files in data directory to zip file
      zipDir(zipfile, path.resolve(__dirname + '/../'), dataDir, dataDir, function (err) {
        if (err) return cb(err)
        zipfile.outputStream.pipe(fs.createWriteStream(resolvedDataDir + '.zip')).on('close', cb)
        zipfile.end()
      })
    }]
  }, callback)
}
