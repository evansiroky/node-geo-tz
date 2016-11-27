/* globals afterEach, beforeEach, describe, it */

var fs = require('fs-extra')

var assert = require('chai').assert
var nock = require('nock')

var util = require('./util.js')

var update = require('../lib/update.js')

var TEST_DATA_DIR = './data-test-update'
var resolvedDataDir = __dirname + '/../' + TEST_DATA_DIR
var LOCAL_FOLDER = __dirname + '/../tests/fixtures/'

describe('data update', function () {
  this.timeout(4000)
  this.slow(2000)

  beforeEach(function (done) {
    util.createDataDir(resolvedDataDir, done)
  })

  afterEach(function (done) {
    util.destroyDataDir(resolvedDataDir, done)
  })

  it('tz geojson should get updated after fetching valid shapefile', function (done) {
    var aWhileAgo = (new Date()).getTime() - 100000

    var latestRepoMock = {
      assets: [
        {
          browser_download_url: 'https://github.com/evansiroky/timezone-boundary-builder/releases/download/2016d/timezones.geojson.zip'
        }
      ]
    }

    var githubApiScope = nock('https://api.github.com')
      .get('/repos/evansiroky/timezone-boundary-builder/releases/latest')
      .reply(200, JSON.stringify(latestRepoMock))

    var githubDlScope = nock('https://github.com')
      .get('/evansiroky/timezone-boundary-builder/releases/download/2016d/timezones.geojson.zip')
      .replyWithFile(200, LOCAL_FOLDER + 'dist.zip')

    var doneHelper = function (err) {
      githubApiScope.done()
      githubDlScope.done()
      done(err)
    }

    // update timezone data by downloading it and extracting to geojson
    update({
      dataDir: TEST_DATA_DIR
    },
    function (err) {
      try {
        assert.isNotOk(err)
      } catch (e) {
        return doneHelper(e)
      }

      // check for geojson file existence
      fs.stat(resolvedDataDir + '/index.json', function (err, stats) {
        try {
          assert.isNotOk(err)
          assert.isAbove(stats.ctime.getTime(), aWhileAgo, 'file update time is before test!')
        } catch (e) {
          return doneHelper(e)
        }

        doneHelper()
      })
    })
  })
})
