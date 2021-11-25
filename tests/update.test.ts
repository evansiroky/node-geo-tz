/* globals afterEach, beforeEach, describe, it */

import * as fs from 'fs'
import * as path from 'path'

import { assert } from 'chai'
import nock from 'nock'

import { createDataDir, destroyDataDir } from './util'

import update from '../src/update'

const TEST_DATA_DIR = './data-test-update'
const resolvedDataDir = path.join(__dirname, '..', TEST_DATA_DIR)
const LOCAL_FOLDER = path.join(__dirname, '..', 'tests', 'fixtures')

describe('data update', function () {
  this.timeout(4000)
  this.slow(2000)

  beforeEach(function (done) {
    createDataDir(resolvedDataDir, done)
  })

  afterEach(function (done) {
    destroyDataDir(resolvedDataDir, done)
  })

  it('tz geojson should get updated after fetching valid shapefile', function (done) {
    const aWhileAgo = new Date().getTime() - 100000

    const latestRepoMock = {
      assets: [
        {
          browser_download_url:
            'https://github.com/evansiroky/timezone-boundary-builder/releases/download/2016d/timezones.geojson.zip',
        },
      ],
    }

    const githubApiScope = nock('https://api.github.com')
      .get('/repos/evansiroky/timezone-boundary-builder/releases/latest')
      .reply(200, JSON.stringify(latestRepoMock))

    const githubDlScope = nock('https://github.com')
      .get(
        '/evansiroky/timezone-boundary-builder/releases/download/2016d/timezones.geojson.zip'
      )
      .replyWithFile(200, path.join(LOCAL_FOLDER, 'dist.zip'))

    const doneHelper = function (err?: Error) {
      githubApiScope.done()
      githubDlScope.done()
      done(err)
    }

    // update timezone data by downloading it and extracting to geojson
    update(
      {
        dataDir: TEST_DATA_DIR,
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
            assert.isAbove(
              stats.ctime.getTime(),
              aWhileAgo,
              'file update time is before test!'
            )
          } catch (e) {
            return doneHelper(e)
          }

          doneHelper()
        })
      }
    )
  })
})
