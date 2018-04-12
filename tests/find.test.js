/* globals describe, it */

var assert = require('chai').assert

var geoTz = require('../index.js')
var issueCoords = require('./fixtures/issues.json')

process.chdir('/tmp')

describe('find tests', function () {

  it('should find the timezone name for a valid coordinate', function () {
    var tz = geoTz(47.650499, -122.350070)
    assert.isString(tz)
    assert.equal(tz, 'America/Los_Angeles')
  })

  it('should find the timezone name for a valid coordinate via subfile examination', function () {
    var tz = geoTz(1.44, 104.04)
    assert.isString(tz)
    assert.equal(tz, 'Asia/Singapore')
  })

  it('should return null timezone name for coordinate in ocean', function () {
    var tz = geoTz(0, 0)
    assert.equal(tz, 'Etc/GMT')
  })

  describe('issue cases', function () {
    issueCoords.forEach(function (spot) {
      it('should find ' + spot.zid + ' (' + spot.description + ')', function () {
        var tz = geoTz(spot.lat, spot.lon)
        assert.isString(tz)
        assert.equal(tz, spot.zid)
      })
    })
  })

  describe('performance aspects', function() {
    this.timeout(20000)

    var europeTopLeft = [56.432158, -11.9263934]
    var europeBottomRight = [39.8602076, 34.9127951]
    var count = 2000

    it('should find timezone of ' + count + ' random european positions', function () {
      var timingStr = 'find tz of ' + count + ' random european positions'
      console.time(timingStr)
      for(var i=0; i<count; i++) {
        geoTz(
          europeTopLeft[0] + Math.random() * (europeBottomRight[0] - europeTopLeft[0]),
          europeTopLeft[1] + Math.random() * (europeBottomRight[1] - europeTopLeft[1])
        )
      }
      console.timeEnd(timingStr);
    })
  })
})
