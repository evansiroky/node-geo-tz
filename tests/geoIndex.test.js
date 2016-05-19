var assert = require('chai').assert

var fs = require('fs-extra')

var util = require('./util.js')

var createGeoIndex = require('../lib/createGeoIndex.js')

var TEST_DATA_DIR = './data-test-geoindex',
  testTzData = require('./data/largeTz.json'),
  expectedIndexData = require('./data/expectedIndexData.json')

describe('geoindex', function() {

  beforeEach(function(done) {
    util.createDataDir(TEST_DATA_DIR, done)
  })

  afterEach(function(done) {
    util.destroyDataDir(TEST_DATA_DIR, done)
  })

  it('should create geoindex of simple geometry', function(done) {

    this.timeout(4000)
    this.slow(2000)

    createGeoIndex(testTzData, TEST_DATA_DIR, 0.99,
      function(err) {

        assert.isNotOk(err)

        var generatedIndex = require('.' + TEST_DATA_DIR + '/index.json')
        
        assert.deepEqual(generatedIndex, expectedIndexData)

        // also make sure certain subzone is written
        fs.stat(TEST_DATA_DIR + '/b/b/d/c/d/d/geo.json', function(err, stats) {

            assert.isNotOk(err)
            assert.deepEqual(require('.' + TEST_DATA_DIR + '/b/b/d/c/d/d/geo.json'), require('./data/expectedSubzone.json'))

            done()

        })
      }) 

  })

})