import * as path from 'path'

import type { CacheOptions } from './find'
import { findUsingDataset, setCacheLevel } from './find'

const TZ_DATA = require('../data/timezones-1970.geojson.index.json')
const FEATURE_FILE_PATH = path.join(
  __dirname,
  '..',
  'data',
  'timezones-1970.geojson.geo.dat',
)
let featureCache

/**
 * Find the timezone ID(s) at the given GPS coordinates.
 *
 * This find method utilizes the official list of timezones provided in the timezone database.
 * This does not include some "deprecated" zones that have different timekeeping methods prior to
 * 1970 than similar zones that otherwise share the same timekeeping method since 1970.
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
