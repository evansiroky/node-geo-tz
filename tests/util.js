var fs = require('fs')

var async = require('async')

var util = {}

util.createDataDir = function (dir, callback) {
  async.auto({
    destroyDataDir: function (cb) {
      util.destroyDataDir(dir, cb)
    },
    createNewDataDir: ['destroyDataDir', function (results, cb) {
      fs.mkdir(dir, { recursive: true }, cb)
    }]
  }, callback)
}

util.destroyDataDir = function (dir, callback) {
  async.each(
    [dir, dir + '.zip'], 
    (dir, cb) => fs.rm(dir, { force: true, recursive: true }, cb), 
    callback
  )
}

module.exports = util
