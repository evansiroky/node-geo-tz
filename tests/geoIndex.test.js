var assert = require('chai').assert

var createGeoIndex = require('./lib/createGeoIndex.js')

var testTzData = require('./tests/data/largeTz.json'),
  expectedIndexData = require('./tests/data/expectedIndexData.json')

describe('geoindex', function() {

  it('should create geoindex of simple geometry', function(done) {

    createGeoIndex(testTzData,
      function(err) {

        assert.isNotOk(err)

        done()
      }) 

  })

})