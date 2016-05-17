var fs = require('fs-extra')

var async = require('async'),
  rimraf = require('rimraf')

var util = {}

util.createDataDir = function(dir, callback) {
  async.auto({
    destroyDataDir: function(cb) {
      util.destroyDataDir(dir, cb)
    },
    createNewDataDir: ['destroyDataDir', function(results, cb) {
      fs.mkdir(dir, cb)
    }]
  }, callback)
}

util.destroyDataDir = function(dir, callback) {
  rimraf(dir, callback)
}

module.exports = util