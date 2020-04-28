var async = require('async')
var fs = require('fs-extra')

var util = {}

util.createDataDir = function (dir, callback) {
  async.auto({
    destroyDataDir: function (cb) {
      util.destroyDataDir(dir, cb)
    },
    createNewDataDir: ['destroyDataDir', function (results, cb) {
      fs.ensureDir(dir, cb)
    }]
  }, callback)
}

util.destroyDataDir = function (dir, callback) {
  async.each([dir, dir + '.zip'], fs.remove, callback)
}

module.exports = util
