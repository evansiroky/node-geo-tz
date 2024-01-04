import * as fs from 'fs'
import * as path from 'path'

import async from 'async'
import { https } from 'follow-redirects'
import yauzl from 'yauzl'

import indexGeoJSON from './geo-index'

const TARGET_INDEX_PERCENT = 0.8
const dataProducts = [
  'timezones.geojson',
  'timezones-1970.geojson',
  'timezones-now.geojson',
]
let resolvedBaseDir, downloadsDir, dataDir

function makeFileDownloadPath(product: string) {
  return path.join(downloadsDir, `${product}.zip`)
}

function makeUnzipFilePath(product: string) {
  return path.join(downloadsDir, `${product}.json`)
}

function recreateDirectory(dir: string, callback) {
  console.log(`recreating directory: ${dir}`)
  // fs.rm requires node v14+, so this will cause CI failures on node v12
  fs.rm(dir, { force: true, recursive: true }, (err) => {
    if (err) return callback(err)
    fs.mkdir(dir, { recursive: true }, callback)
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
  console.log(`unzipping data for ${product}`)
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

function processDataProduct(product, callback) {
  async.series(
    [
      // unzip data
      (cb) => unzipDownloadProduct(product, cb),
      // geoIndex data
      (cb) =>
        indexGeoJSON(
          require(makeUnzipFilePath(product)),
          dataDir,
          product,
          TARGET_INDEX_PERCENT,
          cb,
        ),
    ],
    callback,
  )
}

export default function (cfg: { baseDir?: string } | Function, callback?) {
  if (typeof cfg === 'function') {
    callback = cfg
    resolvedBaseDir = path.join(__dirname, '..')
  } else {
    resolvedBaseDir = cfg.baseDir
    callback = callback || function () {}
  }

  downloadsDir = path.join(resolvedBaseDir, 'downloads')
  dataDir = path.join(resolvedBaseDir, 'data')

  async.auto(
    {
      recreateDownloadDir: (cb) => recreateDirectory(downloadsDir, cb),
      recreateDataDir: (cb) => recreateDirectory(dataDir, cb),
      downloadReleaseMetadata: ['recreateDownloadDir', downloadReleaseMetadata],
      downloadData: [
        'downloadReleaseMetadata',
        (results, cb) =>
          async.map(
            dataProducts,
            (dataProduct, mapCb) =>
              downloadProduct(
                results.downloadReleaseMetadata,
                dataProduct,
                mapCb,
              ),
            cb,
          ),
      ],
      calculateLookupData: [
        'recreateDataDir',
        'downloadData',
        (results, cb) =>
          async.map(
            dataProducts,
            (dataProduct, mapCb) => processDataProduct(dataProduct, mapCb),
            cb,
          ),
      ],
    },
    callback,
  )
}
