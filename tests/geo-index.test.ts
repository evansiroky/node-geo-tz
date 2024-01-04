/* globals afterEach, beforeEach, describe, it */

import * as fs from 'fs'
import * as path from 'path'

import { assert } from 'chai'
import geobuf from 'geobuf'
import Pbf from 'pbf'

import { createDataDir, destroyDataDir } from './util'

import createGeoIndex from '../src/geo-index'

const TEST_DATA_DIR = path.join(__dirname, '..', 'data-test-geoindex')
const TEST_DATA_PRODUCT = 'timezones.geojson'
const TEST_GEO_DAT = `${TEST_DATA_DIR}/${TEST_DATA_PRODUCT}.geo.dat`
const TEST_INDEX_FILE = `${TEST_DATA_DIR}/${TEST_DATA_PRODUCT}.index.json`
const testTzData = require('./fixtures/largeTz.json')
const expectedIndexData = require('./fixtures/expectedIndexData.json')

/**
 * Synchronously extracts data from the given subzoneFile and verifies that it
 * matches the passed expectedData.
 *
 * @param {number} pos
 * @param {number} len
 * @param {object} expectedData
 * @returns {void}
 */
function assertSubzoneDataIsEqual(pos, len, expectedData) {
  const fd = fs.openSync(TEST_GEO_DAT, 'r')
  const buf = Buffer.alloc(len)
  fs.readSync(fd, buf, 0, len, pos)
  fs.closeSync(fd)
  const data = new Pbf(buf)
  assert.deepEqual(geobuf.decode(data), expectedData)
}

describe('geoindex', function () {
  beforeEach(function (done) {
    createDataDir(TEST_DATA_DIR, done)
  })

  afterEach(function (done) {
    destroyDataDir(TEST_DATA_DIR, done)
  })

  it('should create geoindex of simple geometry', function (done) {
    this.timeout(4000)
    this.slow(2000)

    createGeoIndex(
      testTzData,
      TEST_DATA_DIR,
      TEST_DATA_PRODUCT,
      0.99,
      function (err) {
        assert.isNotOk(err)

        const generatedIndex = require(TEST_INDEX_FILE)

        assert.deepEqual(generatedIndex, expectedIndexData)

        const zone1 = generatedIndex.lookup.b.b.d.c.d.d

        // also make sure certain subzone data is written
        assertSubzoneDataIsEqual(
          zone1.pos,
          zone1.len,
          require('./fixtures/expectedSubzone1.json'),
        )

        const zone2 = generatedIndex.lookup.b.c.a.a.a.d

        assertSubzoneDataIsEqual(
          zone2.pos,
          zone2.len,
          require('./fixtures/expectedSubzone2.json'),
        )

        done()
      },
    )
  })
})
