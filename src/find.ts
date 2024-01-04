import * as fs from 'fs'

import { decode } from 'geobuf'
import inside from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'
import Pbf from 'pbf'

import { getTimezoneAtSea, oceanZones } from './oceanUtils'

export type CacheOptions = {
  /**
   * If set to true, all features will be loaded into memory to shorten future lookup
   * times.
   */
  preload?: boolean
  /**
   * Must be a map-like object with a `get` and `set` function.
   */
  store?: Map<string, any>
}

/**
 * Set caching behavior and return feature cache.
 *
 * @param tzData The index data of the timezeone data product
 * @param {string} featureFilePath The path to the binary geo.dat file for the timezeone data product
 * @param {CacheOptions} options cachine options.
 */
export function setCacheLevel(
  tzData: any,
  featureFilePath: string,
  options?: CacheOptions,
): Map<string, any> {
  let featureCache
  if (
    options &&
    options.store &&
    typeof options.store.get === 'function' &&
    typeof options.store.set === 'function'
  ) {
    featureCache = options.store
  } else {
    featureCache = new Map()
  }
  if (options && options.preload) {
    const featureFileFd = fs.openSync(featureFilePath, 'r')

    if (featureFileFd < 0) {
      throw new Error('Failed to open geo.dat file')
    }

    _preCache(tzData, featureFilePath, featureFileFd, featureCache)

    fs.closeSync(featureFileFd)
  }
  return featureCache
}

/**
 * A function that will load all features into an unexpiring cache
 *
 * @param tzData
 * @param {string} featureFilePath
 * @param {number} featureFileFd
 * @param featureCache
 * @returns {void}
 */
function _preCache(
  tzData: any,
  featureFilePath: string,
  featureFileFd: number,
  featureCache: Map<string, any>,
) {
  // shoutout to github user @magwo for an initial version of this recursive function
  function preloadFeaturesRecursive(curTzData, quadPos: string) {
    if (curTzData.pos >= 0 && curTzData.len) {
      const geoJson = loadFeatures(
        featureFilePath,
        curTzData.pos,
        curTzData.len,
        featureFileFd,
      )
      featureCache.set(quadPos, geoJson)
    } else if (typeof curTzData === 'object') {
      Object.getOwnPropertyNames(curTzData).forEach((value) => {
        preloadFeaturesRecursive(curTzData[value], quadPos + value)
      })
    }
  }
  preloadFeaturesRecursive(tzData.lookup, '')
}

/**
 * Load features from geo.dat at offset pos with length len.
 * Optionally accept a file descriptor
 *
 * @param featureFilePath
 * @param pos
 * @param len
 * @param fd
 * @returns the GeoJSON features in within the given quad region as defined in the
 *  feature file data.
 */
function loadFeatures(
  featureFilePath: string,
  pos: number,
  len: number,
  fd: number = -1,
) {
  let featureFileFd = fd
  if (featureFileFd < 0) {
    featureFileFd = fs.openSync(featureFilePath, 'r')
    if (featureFileFd < 0) {
      throw new Error('Failed to open geo.dat file')
    }
  }

  // exact boundaries saved in file
  // parse geojson for exact boundaries
  const buf = Buffer.alloc(len)
  const bytesRead = fs.readSync(featureFileFd, buf, 0, len, pos)

  // close featureFileFd if we opened it
  if (fd < 0) {
    fs.closeSync(featureFileFd)
  }

  if (bytesRead < len) {
    throw new Error(
      `tried to read ${len} bytes from geo.dat but only got ${bytesRead} bytes`,
    )
  }

  const data = new Pbf(buf)
  return decode(data)
}

/**
 * Find the timezone ID(s) at the given GPS coordinates.
 *
 * @param tzData The indexed lookup dataset to use
 * @param featureCache The appropriate featureCache to use
 * @param featureFilePath The appropriate featureFilePath to use
 * @param lat latitude (must be >= -90 and <=90)
 * @param lon longitue (must be >= -180 and <=180)
 * @returns An array of string of TZIDs at the given coordinate.
 */
export function findUsingDataset(
  tzData: any,
  featureCache: any,
  featureFilePath: string,
  lat: number,
  lon: number,
): string[] {
  const originalLon = lon

  let err

  // validate latitude
  if (isNaN(lat) || lat > 90 || lat < -90) {
    err = new Error('Invalid latitude: ' + lat)
    throw err
  }

  // validate longitude
  if (isNaN(lon) || lon > 180 || lon < -180) {
    err = new Error('Invalid longitude: ' + lon)
    throw err
  }

  // North Pole should return all ocean zones
  if (lat === 90) {
    return oceanZones.map((zone) => zone.tzid)
  }

  // fix edges of the world
  if (lat >= 89.9999) {
    lat = 89.9999
  } else if (lat <= -89.9999) {
    lat = -89.9999
  }

  if (lon >= 179.9999) {
    lon = 179.9999
  } else if (lon <= -179.9999) {
    lon = -179.9999
  }

  const pt = point([lon, lat])
  const quadData = {
    top: 89.9999,
    bottom: -89.9999,
    left: -179.9999,
    right: 179.9999,
    midLat: 0,
    midLon: 0,
  }
  let quadPos = ''
  let curTzData = tzData.lookup

  while (true) {
    // calculate next quadtree position
    let nextQuad
    if (lat >= quadData.midLat && lon >= quadData.midLon) {
      nextQuad = 'a'
      quadData.bottom = quadData.midLat
      quadData.left = quadData.midLon
    } else if (lat >= quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'b'
      quadData.bottom = quadData.midLat
      quadData.right = quadData.midLon
    } else if (lat < quadData.midLat && lon < quadData.midLon) {
      nextQuad = 'c'
      quadData.top = quadData.midLat
      quadData.right = quadData.midLon
    } else {
      nextQuad = 'd'
      quadData.top = quadData.midLat
      quadData.left = quadData.midLon
    }

    // console.log(nextQuad)
    curTzData = curTzData[nextQuad]
    // console.log()
    quadPos += nextQuad

    // analyze result of current depth
    if (!curTzData) {
      // no timezone in this quad, therefore must be timezone at sea
      return getTimezoneAtSea(originalLon)
    } else if (curTzData.pos >= 0 && curTzData.len) {
      // get exact boundaries
      let geoJson = featureCache.get(quadPos)
      if (!geoJson) {
        geoJson = loadFeatures(featureFilePath, curTzData.pos, curTzData.len)
        featureCache.set(quadPos, geoJson)
      }

      const timezonesContainingPoint = []

      for (let i = 0; i < geoJson.features.length; i++) {
        if (inside(pt, geoJson.features[i])) {
          timezonesContainingPoint.push(geoJson.features[i].properties.tzid)
        }
      }

      // if at least one timezone contained the point, return those timezones,
      // otherwise must be timezone at sea
      return timezonesContainingPoint.length > 0
        ? timezonesContainingPoint
        : getTimezoneAtSea(originalLon)
    } else if (curTzData.length > 0) {
      // exact match found
      return curTzData.map((idx) => tzData.timezones[idx])
    } else if (typeof curTzData !== 'object') {
      // not another nested quad index, throw error
      err = new Error('Unexpected data type')
      throw err
    }

    // calculate next quadtree depth data
    quadData.midLat = (quadData.top + quadData.bottom) / 2
    quadData.midLon = (quadData.left + quadData.right) / 2
  }
}
