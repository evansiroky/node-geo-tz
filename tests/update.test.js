var fs = require('fs-extra')

var assert = require('chai').assert,
  nock = require('nock'),
  rimraf = require('rimraf')

var util = require('./util.js')

var geoTz = require('../index.js')

var MASTER_DATA_DIR = './data',
  TEST_DATA_DIR = './data-test-update',
  BASE_URL = 'http://example.com/',
  NOCK_HOST = 'http://example.com',
  LOCAL_FOLDER = './tests/data/',
  TEST_SHA_FILE = TEST_DATA_DIR + '/tz_world_mp.zip.sha1'


describe('data update', function() {

  this.timeout(4000)
  this.slow(2000)

  beforeEach(function(done) {
    util.createDataDir(TEST_DATA_DIR, done)
  })

  afterEach(function(done) {
    util.destroyDataDir(TEST_DATA_DIR, done)
  })

  describe('cases with same sha1', function() {

    beforeEach(function(done) {
      fs.copy(LOCAL_FOLDER + 'two_small_indiana_tzs.zip.sha1', 
        TEST_SHA_FILE,
        done)
    })

    it('new zip file should not be downloaded if not needed', function(done) {

      var scope = nock(NOCK_HOST)
        .get('/two_small_indiana_tzs.zip.sha1')
        .replyWithFile(200, LOCAL_FOLDER + 'two_small_indiana_tzs.zip.sha1')

      var doneHelper = function(err) {
        scope.done()
        done(err)
      }

      geoTz.updateData({
          mainUrl: BASE_URL + 'two_small_indiana_tzs.zip', 
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1',
          dataDir: TEST_DATA_DIR
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return doneHelper(e)
          }

          fs.stat(TEST_DATA_DIR + '/index.json', function(err, stats) {

            try {
              assert.isOk(err)
              assert.property(err, 'code', 'ENOENT')
            } catch(e) {
              return doneHelper(e)
            } 

            doneHelper()

          })

        })
    })

  })

  describe('cases with different sha1', function() {

    beforeEach(function(done) {
      fs.copy(LOCAL_FOLDER + 'different.sha1', 
        TEST_SHA_FILE,
        done)
    })

    it('error should be caught when parsing invalid shapefile', function(done) {

      var scope = nock(NOCK_HOST)
        .get('/invalid_shape.zip.sha1')
        .replyWithFile(200, LOCAL_FOLDER + 'invalid_shape.zip.sha1')
        .get('/invalid_shape.zip')
        .replyWithFile(200, LOCAL_FOLDER + 'invalid_shape.zip')

      var doneHelper = function(err) {
        scope.done()
        done(err)
      }

      geoTz.updateData({
          mainUrl: BASE_URL + 'invalid_shape.zip', 
          shaUrl: BASE_URL + 'invalid_shape.zip.sha1',
          dataDir: TEST_DATA_DIR
        }, 
        function(err) {
          try {
            assert.isOk(err)
            assert.property(err, 'message', 'no layers founds')
          } catch(e) {
            return doneHelper(e)
          }

          doneHelper()
        })
    })
  
    it('tz geojson should get updated after fetching valid shapefile', function(done) {

      var aWhileAgo = (new Date()).getTime() - 100000

      var scope = nock(NOCK_HOST)
        .get('/two_small_indiana_tzs.zip.sha1')
        .replyWithFile(200, LOCAL_FOLDER + 'two_small_indiana_tzs.zip.sha1')
        .get('/two_small_indiana_tzs.zip')
        .replyWithFile(200, LOCAL_FOLDER + 'two_small_indiana_tzs.zip')

      var doneHelper = function(err) {
        scope.done()
        done(err)
      }

      // update timezone data by downloading it and extracting to geojson
      geoTz.updateData({
          mainUrl: BASE_URL + 'two_small_indiana_tzs.zip', 
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1',
          dataDir: TEST_DATA_DIR
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return doneHelper(e)
          }

          // check for geojson file existence
          fs.stat(TEST_DATA_DIR + '/index.json', function(err, stats) {

            try {
              assert.isNotOk(err)
              assert.isAbove(stats.ctime.getTime(), aWhileAgo, 'file update time is before test!')
            } catch(e) {
              return doneHelper(e)
            } 

            doneHelper()

          })
        })
    })
  })
})