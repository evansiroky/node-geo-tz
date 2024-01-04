/* globals afterEach, beforeEach, describe, it */

import * as fs from 'fs'
import * as path from 'path'

import { assert } from 'chai'
import nock from 'nock'

import { createDataDir, destroyDataDir } from './util'

import update from '../src/update'

const TEST_DIR = path.join(__dirname, '..', 'data-test-update')
const LOCAL_FOLDER = path.join(__dirname, '..', 'tests', 'fixtures')

describe('data update', function () {
  this.timeout(4000)
  this.slow(2000)

  beforeEach(function (done) {
    createDataDir(TEST_DIR, done)
  })

  afterEach(function (done) {
    destroyDataDir(TEST_DIR, done)
  })

  it('tz geojson should get updated after fetching valid shapefile', function (done) {
    const aWhileAgo = new Date().getTime() - 100000

    const latestRepoMock = {
      assets: [
        {
          browser_download_url:
            'https://github.com/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones.geojson.zip',
        },
        {
          browser_download_url:
            'https://github.com/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones-1970.geojson.zip',
        },
        {
          browser_download_url:
            'https://github.com/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones-now.geojson.zip',
        },
      ],
    }

    const githubApiScope = nock('https://api.github.com')
      .get('/repos/evansiroky/timezone-boundary-builder/releases/latest')
      .reply(200, JSON.stringify(latestRepoMock))

    const githubDlScope = nock('https://github.com')
      .get(
        '/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones.geojson.zip',
      )
      .replyWithFile(200, path.join(LOCAL_FOLDER, 'dist.zip'))

    const githubDl1970Scope = nock('https://github.com')
      .get(
        '/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones-1970.geojson.zip',
      )
      .replyWithFile(200, path.join(LOCAL_FOLDER, 'dist.zip'))

    const githubDlNowScope = nock('https://github.com')
      .get(
        '/evansiroky/timezone-boundary-builder/releases/download/2023d/timezones-now.geojson.zip',
      )
      .replyWithFile(200, path.join(LOCAL_FOLDER, 'dist.zip'))

    const doneHelper = function (err?: Error) {
      githubApiScope.done()
      githubDlScope.done()
      githubDl1970Scope.done()
      githubDlNowScope.done()
      done(err)
    }

    // update timezone data by downloading it and extracting to geojson
    update(
      {
        baseDir: TEST_DIR,
      },
      (err) => {
        try {
          assert.isNotOk(err)
        } catch (e) {
          return doneHelper(e)
        }

        // check for geojson file existence
        fs.stat(
          path.join(TEST_DIR, 'data', 'timezones.geojson.index.json'),
          (err, stats) => {
            try {
              assert.isNotOk(err)
              assert.isAbove(
                stats.ctime.getTime(),
                aWhileAgo,
                'file update time is before test!',
              )
            } catch (e) {
              return doneHelper(e)
            }

            doneHelper()
          },
        )
      },
    )
  })
})
