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

/**
 * Synchronously extracts data from the given subzoneFile and verifies that it
 * matches the passed expectedData.
 */
function assertSubzoneDataIsEqual (subzoneFile, expectedData) {
  const data = new Pbf(fs.readFileSync(subzoneFile))
  assert.deepEqual(geobuf.decode(data), expectedData)
}

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

        // also make sure certain subzone data is written
        assertSubzoneDataIsEqual(
          TEST_DATA_DIR + '/b/b/d/c/d/d/geo.buf',
          require('./fixtures/expectedSubzone1.json')
        )
        assertSubzoneDataIsEqual(
          TEST_DATA_DIR + '/b/c/a/a/a/d/geo.buf',
          require('./fixtures/expectedSubzone2.json')
        )

        done()
      }
    )
  })
})
