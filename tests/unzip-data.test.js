/* globals afterEach, beforeEach, describe, it */

var assert = require('chai').assert
var fs = require('fs-extra')

var util = require('./util.js')

var unzipper = require('../lib/unzip-data')

var EXPECTED_DATA_DIR = __dirname + '/../data-test-unzip'

describe('unzip-data', function () {
  beforeEach(function (done) {
    util.destroyDataDir(EXPECTED_DATA_DIR, function (err) {
      if (err) return done(err)
      fs.copy(__dirname + '/fixtures/data-test-unzip.zip', EXPECTED_DATA_DIR + '.zip', done)
    })
  })

  afterEach(function (done) {
    util.destroyDataDir(EXPECTED_DATA_DIR, done)
  })

  it('should unzip data directory', function (done) {
    unzipper(EXPECTED_DATA_DIR + '.zip', function (err) {
      assert.isNotOk(err)
      console.log('unzipped')
      // assert that index.json exists by passing done callback to fs.stat
      fs.stat(EXPECTED_DATA_DIR + '/index.json', done)
    })
  })
})
