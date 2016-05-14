var fs = require('fs-extra')

var assert = require('chai').assert,
  nock = require('nock'),
  rimraf = require('rimraf')

var geoTz = require('../index.js')

var BASE_URL = 'http://example.com/',
  NOCK_HOST = 'http://example.com',
  LOCAL_FOLDER = './tests/data/',
  MASTER_LOCAL_SHA_FILE = './data/tz_world_mp.zip.sha1'


describe('data update', function() {

  before(function(done) {
    fs.rename('./data', './data-master', done)
  })

  after(function(done) {
    fs.rename('./data-master', './data', done)
  })

  beforeEach(function(done) {
    fs.mkdir('./data', done)
  })

  afterEach(function(done) {
    rimraf('./data-test', function(err) {
      if(err) { return done(err) }
      fs.rename('./data', './data-test', done)    
    })
  })

  describe('cases with same sha1', function() {

    beforeEach(function(done) {
      fs.copy(LOCAL_FOLDER + 'two_small_indiana_tzs.zip.sha1', 
        MASTER_LOCAL_SHA_FILE,
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
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1'
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return doneHelper(e)
          }

          fs.stat('./data/tzgeo.json', function(err, stats) {

            try {
              assert.property(err, 'code')
              assert.equal(err.code, 'ENOENT')
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
        MASTER_LOCAL_SHA_FILE,
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
          shaUrl: BASE_URL + 'invalid_shape.zip.sha1'
        }, 
        function(err) {
          try {
            assert.isOk(err)
            assert.property(err, 'message')
            assert.equal(err.message, 'no layers founds')
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
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1'
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return doneHelper(e)
          }

          // check for geojson file existence
          fs.stat('./data/tzgeo.json', function(err, stats) {

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