/* globals afterEach, beforeEach, describe, it */

var fs = require('fs')

var assert = require('chai').assert
var geobuf = require('geobuf')
var Pbf = require('pbf')

var util = require('./util.js')

var createGeoIndex = require('../lib/geo-index')

var TEST_DATA_DIR = __dirname + '/../data-test-geoindex'
var TEST_GEO_DAT = `${TEST_DATA_DIR}/geo.dat`
var TEST_INDEX_FILE = `${TEST_DATA_DIR}/index.json`
var testTzData = require('./fixtures/largeTz.json')
var expectedIndexData = require('./fixtures/expectedIndexData.json')

/**
 * Synchronously extracts data from the given subzoneFile and verifies that it
 * matches the passed expectedData.
 *
 * @param {number} pos
 * @param {number} len
 * @param {object} expectedData
 * @returns {void}
 */
function assertSubzoneDataIsEqual (pos, len, expectedData) {
  const fd = fs.openSync(TEST_GEO_DAT, 'r')
  const buf = Buffer.alloc(len)
  fs.readSync(fd, buf, 0, len, pos)
  fs.closeSync(fd)
  const data = new Pbf(buf)
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

        var generatedIndex = require(TEST_INDEX_FILE)

        assert.deepEqual(generatedIndex, expectedIndexData)

        const zone1 = generatedIndex.lookup['b']['b']['d']['c']['d']['d']

        // also make sure certain subzone data is written
        assertSubzoneDataIsEqual(
          zone1.pos, zone1.len,
          require('./fixtures/expectedSubzone1.json')
        )

        const zone2 = generatedIndex.lookup['b']['c']['a']['a']['a']['d']

        assertSubzoneDataIsEqual(
          zone2.pos, zone2.len,
          require('./fixtures/expectedSubzone2.json')
        )

        done()
      }
    )
  })
})
