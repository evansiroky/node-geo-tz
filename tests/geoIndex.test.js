var assert = require('chai').assert

var fs = require('fs-extra'),
  rimraf = require('rimraf')

var createGeoIndex = require('../lib/createGeoIndex.js')

var testTzData = require('./data/largeTz.json'),
  expectedIndexData = require('./data/expectedIndexData.json')

describe('geoindex', function() {

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

  it('should create geoindex of simple geometry', function(done) {

    createGeoIndex(testTzData,
      function(err) {

        assert.isNotOk(err)

        var generatedIndex = require('../data/index.json')

        assert.deepEqual(generatedIndex, expectedIndexData)

        done()
      }) 

  })

})