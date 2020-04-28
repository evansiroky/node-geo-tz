# node-geo-tz
[![npm version](https://badge.fury.io/js/geo-tz.svg)](http://badge.fury.io/js/geo-tz) [![Build Status](https://travis-ci.org/evansiroky/node-geo-tz.svg?branch=master)](https://travis-ci.org/evansiroky/node-geo-tz) [![Dependency Status](https://david-dm.org/evansiroky/node-geo-tz.svg)](https://david-dm.org/evansiroky/node-geo-tz) [![Test Coverage](https://img.shields.io/codecov/c/github/evansiroky/node-geo-tz.svg)](https://codecov.io/github/evansiroky/node-geo-tz)

The most up-to-date and accurate node.js geographical timezone lookup package.  It's fast too!

## Install

`npm install geo-tz`

## Usage

```js
    const geoTz = require('geo-tz')

    geoTz(47.650499, -122.350070)  // ['America/Los_Angeles']
    geoTz(43.839319, 87.526148)  // ['Asia/Shanghai', 'Asia/Urumqi']
```

## API Docs:

As of Version 5, the API now returns a list of possible timezones. There are certain coordinates where the timekeeping method will depend on the person you ask. Also, another case where 2 or more timezones could be returned is when a request is made with a coordinate that happens to be exactly on the border between two or more timezones.

### geoTz(lat, lon)

Returns the timezone names found at `lat`, `lon`.  The timezone names will be the timezone identifiers as defined in the [timezone database](https://www.iana.org/time-zones).  The underlying geographic data is obtained from the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project.

This library does an exact geographic lookup which has tradeoffs.  It is perhaps a little bit slower that other libraries, has a larger installation size on disk and cannot be used in the browser.  However, the results are more accurate than other libraries that compromise by approximating the lookup of the data.

The data is indexed for fast analysis by caching subregions of geographic data when a precise lookup is needed.

### geoTz.setCache(options)

By default, geoTz lazy-loads exact lookup data into an unexpiring cache. The `setCache` method can be used to change the caching behavior using the following options:

* `preload` - if set to true will attempt to cache all files (slow startup time and requires lots of memory)
* `store` - offload the cache to a custom storage solution (must be compatible with the Map api)

Examples:

```js
geoTz.setCache({ preload: true }) // preloads all files

let map = new Map();
geoTz.setCache({ store: map }) // pass a Map-like storage object
```

## Limitations

This library is not intended to be used in the browser due to the large amount of files that are included to perform exact geographic lookups.

## An Important Note About Maintenance

Due to the ever-changing nature of timezone data, it is critical that you always use the latest version of this package.  If you use old versions, there will be a few edge cases where the calculated time is wrong.  If you use greenkeeper, please be sure to specify an exact target version so you will always get PR's for even patch-level releases.
