import * as fs from 'fs'

import async from 'async'

export function createDataDir(dir, callback) {
  async.auto(
    {
      destroyDataDir: (cb) => {
        destroyDataDir(dir, cb)
      },
      createNewDataDir: [
        'destroyDataDir',
        function (results, cb) {
          fs.mkdir(dir, { recursive: true }, cb)
        },
      ],
    },
    callback,
  )
}

export function destroyDataDir(dir, callback) {
  async.each(
    [dir, dir + '.zip'],
    // fs.rm requires node v14+, so this will cause CI failures on node v12
    (dir, cb) => fs.rm(dir, { force: true, recursive: true }, cb),
    callback,
  )
}
