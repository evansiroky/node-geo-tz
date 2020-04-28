var path = require('path')

var fs = require('fs-extra')
var yauzl = require('yauzl')

module.exports = function (folder, callback) {
  var folderPath = folder || __dirname + '/../data.zip'
  var baseDir = __dirname + '/../'
  console.log('unzip', folderPath)
  yauzl.open(folderPath, {lazyEntries: true}, function (err, zipfile) {
    if (err) throw err
    zipfile.readEntry()
    zipfile.on('entry', function (entry) {
      var resolvedFilename = path.join(baseDir, entry.fileName)
      if (/\/$/.test(entry.fileName)) {
        // directory file names end with '/'
        fs.ensureDir(resolvedFilename, function (err) {
          if (err) throw err
          zipfile.readEntry()
        })
      } else {
        // file entry
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throw err
          // ensure parent directory exists
          fs.ensureDir(path.dirname(resolvedFilename), function (err) {
            if (err) throw err
            readStream.pipe(fs.createWriteStream(resolvedFilename))
            readStream.on('end', function () {
              zipfile.readEntry()
            })
          })
        })
      }
    })
    zipfile.on('end', callback)
  })
}
