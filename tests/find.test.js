/* globals describe, it */

var assert = require('chai').assert

var geoTz = require('../index.js')
var issueCoords = require('./fixtures/issues.json')

process.chdir('/tmp')

/**
 * Assert that a lookup includes certain timezones
 *
 * @param  {number} lat
 * @param  {number} lon
 * @param  {string | array} tzs can be a string or array of timezone names
 */
function assertTzResultContainsTzs (lat, lon, tzs) {
  if (typeof tzs === 'string') {
    tzs = [tzs]
  }
  const result = geoTz(lat, lon)
  assert.isArray(result)
  assert.sameMembers(result, tzs)
}

describe('find tests', function () {
  it('should find the timezone name for a valid coordinate', function () {
    assertTzResultContainsTzs(47.650499, -122.350070, 'America/Los_Angeles')
  })

  it('should find the timezone name for a valid coordinate via subfile examination', function () {
    assertTzResultContainsTzs(1.44, 104.04, 'Asia/Singapore')
  })

  it('should return null timezone name for coordinate in ocean', function () {
    assertTzResultContainsTzs(0, 0, 'Etc/GMT')
  })

  describe('issue cases', function () {
    issueCoords.forEach(function (spot) {
      const spotDescription = spot.zids
        ? spot.zids.join(' and ')
        : spot.zid
      it('should find ' + spotDescription + ' (' + spot.description + ')', function () {
        assertTzResultContainsTzs(spot.lat, spot.lon, spot.zid || spot.zids)
      })
    })
  })

  describe('performance aspects', function () {
    this.timeout(20000)

    var europeTopLeft = [56.432158, -11.9263934]
    var europeBottomRight = [39.8602076, 34.9127951]
    var count = 2000

    var findRandomPositions = function () {
      var timingStr = 'find tz of ' + count + ' random european positions'
      console.time(timingStr)
      for (var i = 0; i < count; i++) {
        geoTz(
          europeTopLeft[0] + Math.random() * (europeBottomRight[0] - europeTopLeft[0]),
          europeTopLeft[1] + Math.random() * (europeBottomRight[1] - europeTopLeft[1])
        )
      }
      console.timeEnd(timingStr)
    }

    it(
      'should find timezone of ' + count + ' random european positions with on-demand caching',
      findRandomPositions
    )

    it(
      'should find timezone of ' + count + ' random european positions with precache',
      function () {
        geoTz.preCache()
        findRandomPositions()
      }
    )
  })
})
