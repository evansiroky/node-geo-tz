/* globals describe, it */

import { assert } from 'chai'

import geoTz, { preCache } from '../src/find'
import { oceanZones } from '../src/oceanUtils'

const issueCoords = require('./fixtures/issues.json')

process.chdir('/tmp')

/**
 * Assert that a lookup includes certain timezones
 *
 * @param  {number} lat
 * @param  {number} lon
 * @param  {string | array} tzs can be a string or array of timezone names
 */
function assertTzResultContainsTzs(lat, lon, tzs) {
  if (typeof tzs === 'string') {
    tzs = [tzs]
  }
  const result = geoTz(lat, lon)
  assert.isArray(result)
  assert.sameMembers(result, tzs)
}

describe('find tests', function () {
  it('should find the timezone name for a valid coordinate', function () {
    assertTzResultContainsTzs(47.650499, -122.35007, 'America/Los_Angeles')
  })

  it('should find the timezone name for a valid coordinate via subfile examination', function () {
    assertTzResultContainsTzs(1.44, 104.04, 'Asia/Singapore')
  })

  it('should return Etc/GMT timezone for coordinate in ocean', function () {
    assertTzResultContainsTzs(0, 0, 'Etc/GMT')
  })

  it('should return both timezones on an ocean coordinate at -180 longitude', function () {
    assertTzResultContainsTzs(40, -180, ['Etc/GMT-12', 'Etc/GMT+12'])
  })

  it('should return both timezones on an ocean coordinate at +180 longitude', function () {
    assertTzResultContainsTzs(40, 180, ['Etc/GMT-12', 'Etc/GMT+12'])
  })

  it('should return only one timezone on an ocean coordinate at +179.9999 longitude', function () {
    assertTzResultContainsTzs(40, 179.9999, 'Etc/GMT-12')
  })

  it('should return only one timezones on an ocean coordinate at -179.9999 longitude', function () {
    assertTzResultContainsTzs(40, -179.9999, 'Etc/GMT+12')
  })

  it('should return both timezone for coordinate in ocean on middle of boundary', function () {
    assertTzResultContainsTzs(40, -157.5, ['Etc/GMT+10', 'Etc/GMT+11'])
  })

  it('should return all ocean timezones for coordinate at the North Pole', function () {
    assertTzResultContainsTzs(
      90,
      0,
      oceanZones.map((zone) => zone.tzid)
    )
  })

  describe('issue cases', function () {
    issueCoords.forEach(function (spot) {
      const spotDescription = spot.zids ? spot.zids.join(' and ') : spot.zid
      it(
        'should find ' + spotDescription + ' (' + spot.description + ')',
        function () {
          assertTzResultContainsTzs(spot.lat, spot.lon, spot.zid || spot.zids)
        }
      )
    })
  })

  describe('performance aspects', function () {
    this.timeout(20000)

    const europeTopLeft = [56.432158, -11.9263934]
    const europeBottomRight = [39.8602076, 34.9127951]
    const count = 2000

    const findRandomPositions = function () {
      const timingStr = 'find tz of ' + count + ' random european positions'
      console.time(timingStr)
      for (let i = 0; i < count; i++) {
        geoTz(
          europeTopLeft[0] +
            Math.random() * (europeBottomRight[0] - europeTopLeft[0]),
          europeTopLeft[1] +
            Math.random() * (europeBottomRight[1] - europeTopLeft[1])
        )
      }
      console.timeEnd(timingStr)
    }

    it(
      'should find timezone of ' +
        count +
        ' random european positions with on-demand caching',
      findRandomPositions
    )

    it(
      'should find timezone of ' +
        count +
        ' random european positions with precache',
      function () {
        preCache()
        findRandomPositions()
      }
    )
  })
})
