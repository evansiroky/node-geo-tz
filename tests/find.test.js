var assert = require('chai').assert

var geoTz = require('../index.js')

describe('find tests', function() {
  
  it('should find the timezone geojson', function() {
    var tzData = geoTz.find.timezone(-122.350070, 47.650499)
    assert.isObject(tzData)
    assert.property(tzData, 'properties')
    assert.property(tzData.properties, 'TZID')
    assert.equal(tzData.properties.TZID, 'America/Los_Angeles')
  })

})