var fs = require('fs-extra')

var assert = require('chai').assert,
  rimraf = require('rimraf')

var geoTz = require('../index.js')

var BASE_URL = 'https://github.com/evansiroky/node-geo-tz/raw/master/tests/data/'
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
    rimraf('./data', done)
  })

  this.timeout(60000)

  describe('cases with same sha1', function() {

    beforeEach(function(done) {
      fs.copy(LOCAL_FOLDER + 'two_small_indiana_tzs.zip.sha1', 
        MASTER_LOCAL_SHA_FILE,
        done)
    })

    it('new zip file should not be downloaded if not needed', function(done) {

      geoTz.updateData({
          mainUrl: BASE_URL + 'two_small_indiana_tzs.zip', 
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1'
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return done(e)
          }

          fs.stat('./data/tzgeo.json', function(err, stats) {

            try {
              assert.property(err, 'code')
              assert.equal(err.code, 'ENOENT')
            } catch(e) {
              return done(e)
            } 

            done()

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
            return done(e)
          }

          done()
        })
    })
  
    it('tz geojson should get updated after fetching valid shapefile', function(done) {

      var aWhileAgo = (new Date()).getTime() - 100000

      // update timezone data by downloading it and extracting to geojson
      geoTz.updateData({
          mainUrl: BASE_URL + 'two_small_indiana_tzs.zip', 
          shaUrl: BASE_URL + 'two_small_indiana_tzs.zip.sha1'
        }, 
        function(err) {

          try {
            assert.isNotOk(err)
          } catch(e) {
            return done(e)
          }

          // check for geojson file existence
          fs.stat('./data/tzgeo.json', function(err, stats) {

            try {
              assert.isNotOk(err)
              assert.isAbove(stats.ctime.getTime(), aWhileAgo, 'file update time is before test!')
            } catch(e) {
              return done(e)
            } 

            done()

          })
        })
    })
  })
})