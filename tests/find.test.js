/* globals describe, it */

var assert = require('chai').assert

var geoTz = require('../index.js')
var issueCoords = require('./fixtures/issues.json')

process.chdir('/tmp')

describe('find tests', function () {

  describe('without options object', function() {
    it('should find the timezone name for a valid coordinate', function () {
      var tz = geoTz.tz(47.650499, -122.350070)
      assert.isString(tz)
      assert.equal(tz, 'America/Los_Angeles')
    })
  });

  describe('with options object', function() {
    var featureProviders = [
      { name: 'unspecified', provider: undefined },
      { name: 'preloaded', provider: geoTz.createPreloadedFeatureProvider() }
    ];

    featureProviders.forEach(function(featureProvider) {
      var options = { featureProvider: featureProvider.provider };

      describe('with ' + featureProvider.name + ' feature provider', function() {
        it('should find the timezone name for a valid coordinate', function () {
          var tz = geoTz.tz(47.650499, -122.350070, options)
          assert.isString(tz)
          assert.equal(tz, 'America/Los_Angeles')
        })

        it('should find the timezone name for a valid coordinate via subfile examination', function () {
          var tz = geoTz.tz(1.44, 104.04, options)
          assert.isString(tz)
          assert.equal(tz, 'Asia/Singapore')
        })

        it('should return null timezone name for coordinate in ocean', function () {
          var tz = geoTz.tz(0, 0, options)
          assert.isNull(tz)
        })

        it('should return a moment-timezone', function () {
          var tzMoment = geoTz.tzMoment(47.650499, -122.350070, options)
          assert.isObject(tzMoment)
          assert.deepPropertyVal(tzMoment, '_z.name', 'America/Los_Angeles')
        })

        it('should return null timezone moment for coordinate in ocean', function () {
          var tz = geoTz.tzMoment(0, 0, options)
          assert.isNull(tz)
        })

        it('should parse time correctly', function () {
          var tzMoment = geoTz.tzMoment(47.650499, -122.350070, '2016-03-30T01:23:45Z', options)
          assert.equal(tzMoment.format('LLLL'), 'Tuesday, March 29, 2016 6:23 PM')
        })

        describe('issue cases', function () {
          issueCoords.forEach(function (spot) {
            it('should find ' + spot.zid + ' (' + spot.description + ')', function () {
              var tz = geoTz.tz(spot.lat, spot.lon, options)
              assert.isString(tz)
              assert.equal(tz, spot.zid)
            })
          })
        })

        describe('performance aspects', function() {
          var europeTopLeft = [56.432158, -11.9263934]
          var europeBottomRight = [39.8602076, 34.9127951]
          var count = 2000

          it('should find timezone of ' + count + ' random european positions')
            var timingStr = 'find tz of ' + count + ' random european positions with ' + featureProvider.name
            console.time(timingStr)
            for(var i=0; i<count; i++) {
              geoTz.tz(
                europeTopLeft[0] + Math.random() * (europeBottomRight[0] - europeTopLeft[0]),
                europeTopLeft[1] + Math.random() * (europeBottomRight[1] - europeTopLeft[1]),
                options)
            }
            console.timeEnd(timingStr);
        })
      })
    })
  })
})
