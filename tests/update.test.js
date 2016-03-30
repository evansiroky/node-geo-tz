var fs = require('fs')

var assert = require('chai').assert

var geoTz = require('../index.js')

describe('data update', function() {
  
  it('tz geojson should get updated after fetching latest tz_world shapefile', function(done) {

    this.timeout(180000)

    var beginTime = (new Date()).getTime()

    // update timezone data by downloading it and extracting to geojson
    geoTz.updateData(function(err) {

      assert.isNotOk(err)

      // check for geojson file existence
      fs.stat('./data/tzgeo.json', function(err, stats) {

        assert.isNotOk(err)
        assert.isAbove(stats.ctime.getTime(), beginTime, 'file update time is before test!')

        done()

      })
    })
  })
})