import * as fs from 'fs'
import * as path from 'path'

import async from 'async'
import { https } from 'follow-redirects'
import yauzl from 'yauzl'

import indexGeoJSON from './geo-index'

const TARGET_INDEX_PERCENT = 0.75
const dataProducts = [
  'timezones.geojson',
  'timezones-1970.geojson',
  'timezones-now.geojson',
]

function makeFileDownloadPath(product: string) {
  return path.join(__dirname, '..', 'downloads', `${product}.zip`)
}

function makeUnzipFilePath(product: string) {
  return path.join(__dirname, '..', 'downloads', `${product}.json`)
}

function recreateDirectory(dir: string, callback) {
  const dirPath = path.join(__dirname, '..', dir)
  // fs.rm requires node v14+, so this will cause CI failures on node v12
  fs.rm(dirPath, { force: true, recursive: true }, (err) => {
    if (err) return callback(err)
    fs.mkdir(dirPath, { recursive: true }, callback)
  })
}

function downloadReleaseMetadata(results, callback) {
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
          let parsed
          try {
            parsed = JSON.parse(data)
          } catch (error) {
            return callback(error)
          }
          if (!parsed.assets) {
            return callback(new Error('Unexpected format'))
          }
          return callback(null, parsed)
        })
      },
    )
    .on('error', callback)
}

function downloadProduct(releaseMetadata, product, callback) {
  const { assets } = releaseMetadata
  let productFound = false
  for (let i = 0; i < assets.length; i++) {
    if (assets[i].browser_download_url.indexOf(product) > -1) {
      productFound = true
      const downloadUrl = assets[i].browser_download_url
      console.log(`Downloading latest release data product ${product}`)
      https
        .get(
          {
            headers: { 'user-agent': 'node-geo-tz' },
            host: 'github.com',
            path: downloadUrl.replace('https://github.com', ''),
          },
          function (response) {
            const file = fs.createWriteStream(makeFileDownloadPath(product))
            response.pipe(file)
            file.on('finish', function () {
              file.close(callback)
            })
          },
        )
        .on('error', callback)
    }
  }
  if (!productFound) {
    callback(new Error('Data product not found in release metadata'))
  }
}

function unzipDownloadProduct(product, callback) {
  yauzl.open(
    makeFileDownloadPath(product),
    { lazyEntries: true },
    (err, zipfile) => {
      if (err) {
        return callback(err)
      }
      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // directory, keep reading
          zipfile.readEntry()
        } else {
          // assuming a json file
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              return callback(err)
            }
            readStream.pipe(fs.createWriteStream(makeUnzipFilePath(product)))
            readStream.on('end', function () {
              zipfile.readEntry()
            })
          })
        }
      })
      zipfile.on('end', callback)
    },
  )
}

function geoIndexProduct(resolvedDataDir, product, callback) {
  indexGeoJSON(
    require(makeUnzipFilePath(product)),
    resolvedDataDir,
    product,
    TARGET_INDEX_PERCENT,
    callback,
  )
}

function processDataProduct(
  resolvedDataDir,
  releaseMetadata,
  product,
  callback,
) {
  async.series(
    [
      // download data
      (cb) => downloadProduct(releaseMetadata, product, cb),
      // unzip data
      (cb) => unzipDownloadProduct(product, cb),
      // geoIndex data
      (cb) => geoIndexProduct(resolvedDataDir, product, cb),
    ],
    callback,
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
      recreateDownloadDir: (cb) => recreateDirectory('downloads', cb),
      recreateDataDir: (cb) => recreateDirectory('data', cb),
      downloadReleaseMetadata: ['recreateDownloadDir', downloadReleaseMetadata],
      calculateLookupData: [
        'recreateDataDir',
        'downloadReleaseMetadata',
        (results, cb) =>
          async.map(
            dataProducts,
            (dataProduct, mapCb) =>
              processDataProduct(
                resolvedDataDir,
                results.downloadReleaseMetadata,
                dataProduct,
                mapCb,
              ),
            cb,
          ),
      ],
    },
    callback,
  )
}
