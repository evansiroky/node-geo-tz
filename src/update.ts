import * as fs from 'fs'
import * as path from 'path'

import async from 'async'
import { https } from 'follow-redirects'
import yauzl from 'yauzl'

import indexGeoJSON from './geo-index'

const TARGET_INDEX_PERCENT = 0.75
const dlFile = path.join(__dirname, '..', 'downloads', 'timezones.zip')
const tzFile = path.join(__dirname, '..', 'downloads', 'timezones.json')

const downloadLatest = function (callback) {
  console.log('Downloading geojson')
  async.auto(
    {
      getLatestUrl: function (cb) {
        console.log('Downloading latest release metadata')
        https
          .get(
            {
              headers: { 'user-agent': 'node-geo-tz' },
              host: 'api.github.com',
              path: '/repos/evansiroky/timezone-boundary-builder/releases/latest',
            },
            function (res) {
              let data = ''
              res.on('data', function (chunk) {
                data += chunk
              })
              res.on('end', function () {
                const parsed = JSON.parse(data)
                for (let i = 0; i < parsed.assets.length; i++) {
                  if (
                    parsed.assets[i].browser_download_url.indexOf(
                      'timezones.geojson'
                    ) > -1
                  ) {
                    return cb(null, parsed.assets[i].browser_download_url)
                  }
                }
                cb(new Error('geojson not found'))
              })
            }
          )
          .on('error', cb)
      },
      rm: function (cb) {
        // fs.rm requires node v14+, so this will cause CI failures on node v12
        fs.rm(dlFile, { force: true, recursive: true }, cb)
      },
      mkdir: [
        'rm',
        function (results, cb) {
          fs.mkdir(
            path.join(__dirname, '..', 'downloads'),
            { recursive: true },
            cb
          )
        },
      ],
      dl: [
        'mkdir',
        'getLatestUrl',
        function (results, cb) {
          console.log('Downloading latest release data')
          https
            .get(
              {
                headers: { 'user-agent': 'node-geo-tz' },
                host: 'github.com',
                path: results.getLatestUrl.replace('https://github.com', ''),
              },
              function (response) {
                const file = fs.createWriteStream(dlFile)
                response.pipe(file)
                file.on('finish', function () {
                  file.close(cb)
                })
              }
            )
            .on('error', cb)
        },
      ],
    },
    callback
  )
}

export default function (cfg, callback) {
  if (!callback) {
    if (typeof cfg === 'function') {
      callback = cfg
      cfg = {}
    } else {
      callback = function () {}
    }
  }

  const resolvedDataDir = cfg.dataDir
    ? path.join(__dirname, '..', cfg.dataDir)
    : path.join(__dirname, '..', 'data')

  async.auto(
    {
      // download latest geojson data
      downloadData: function (cb) {
        downloadLatest(cb)
      },
      deleteIndexFoldersAndFiles: [
        'downloadData',
        function (results, cb) {
          async.each(
            ['geo.dat', 'index.json'],
            function (fileOrFolder, eachCb) {
              // fs.rm requires node v14+, so this will cause CI failures on node v12
              fs.rm(
                resolvedDataDir + '/' + fileOrFolder,
                { force: true, recursive: true },
                eachCb
              )
            },
            cb
          )
        },
      ],
      unzipGeoJson: [
        'downloadData',
        function (results, cb) {
          yauzl.open(dlFile, { lazyEntries: true }, function (err, zipfile) {
            if (err) {
              return cb(err)
            }
            zipfile.readEntry()
            zipfile.on('entry', function (entry) {
              if (/\/$/.test(entry.fileName)) {
                // directory, keep reading
                zipfile.readEntry()
              } else {
                // assuming a json file
                zipfile.openReadStream(entry, function (err, readStream) {
                  if (err) {
                    return cb(err)
                  }
                  readStream.pipe(fs.createWriteStream(tzFile))
                  readStream.on('end', function () {
                    zipfile.readEntry()
                  })
                })
              }
            })
            zipfile.on('end', function (err) {
              cb(err)
            })
          })
        },
      ],
      createIndex: [
        'deleteIndexFoldersAndFiles',
        'unzipGeoJson',
        function (results, cb) {
          indexGeoJSON(
            require(tzFile),
            resolvedDataDir,
            TARGET_INDEX_PERCENT,
            cb
          )
        },
      ],
    },
    callback
  )
}
