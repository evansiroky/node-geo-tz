import * as path from 'path'

import type { CacheOptions } from './find'
import { findUsingDataset, setCacheLevel } from './find'

const TZ_DATA = require('../data/timezones-now.geojson.index.json')
const FEATURE_FILE_PATH = path.join(
  __dirname,
  '..',
  'data',
  'timezones-now.geojson.geo.dat',
)
let featureCache

/**
 * Find the timezone ID(s) at the given GPS coordinates.
 *
 * This find method utilizes an abbreviated list of timezones provided in the timezone database.
 * Only those timezones that have distinct timekeeping methods since the latest release of the
 * timezone-boundary-builder project are included. Therefore, the use of this lookup method may
 * find an incorrect timekeeping method that does not properly account for variations in timekeeping
 * methods in the past.
 *
 * @param lat latitude (must be >= -90 and <=90)
 * @param lon longitue (must be >= -180 and <=180)
 * @returns An array of strings of TZIDs at the given coordinate.
 */
export function find(lat: number, lon: number): string[] {
  return findUsingDataset(TZ_DATA, featureCache, FEATURE_FILE_PATH, lat, lon)
}

/**
 * Set caching behavior.
 *
 * @param {CacheOptions} options cachine options.
 */
function cacheLevel(options?: CacheOptions) {
  featureCache = setCacheLevel(TZ_DATA, FEATURE_FILE_PATH, options)
}

cacheLevel()

export { cacheLevel as setCache }

/**
 * Load all features into memory to speed up future lookups.
 */
export function preCache() {
  cacheLevel({ preload: true })
}
