/* globals afterEach, beforeEach, describe, it */

var assert = require('chai').assert
var fs = require('fs-extra')
var geobuf = require('geobuf')
var Pbf = require('pbf')

var util = require('./util.js')

var createGeoIndex = require('../lib/geo-index')

var TEST_DATA_DIR = __dirname + '/../data-test-geoindex'
var testTzData = require('./fixtures/largeTz.json')
var expectedIndexData = require('./fixtures/expectedIndexData.json')

describe('geoindex', function () {
  beforeEach(function (done) {
    util.createDataDir(TEST_DATA_DIR, done)
  })

  afterEach(function (done) {
    util.destroyDataDir(TEST_DATA_DIR, done)
  })

  it('should create geoindex of simple geometry', function (done) {
    this.timeout(4000)
    this.slow(2000)

    createGeoIndex(testTzData, TEST_DATA_DIR, 0.99,
      function (err) {
        assert.isNotOk(err)

        var generatedIndex = require(TEST_DATA_DIR + '/index.json')

        assert.deepEqual(generatedIndex, expectedIndexData)

        // also make sure certain subzone is written
        fs.stat(TEST_DATA_DIR + '/b/b/d/c/d/d/geo.buf',
          function (err, stats) {
            assert.isNotOk(err)
            var data = new Pbf(fs.readFileSync(TEST_DATA_DIR + '/b/b/d/c/d/d/geo.buf'))

            assert.deepEqual(geobuf.decode(data), require('./fixtures/expectedSubzone.json'))
            done()
          }
        )
      }
    )
  })
})
