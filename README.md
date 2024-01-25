# node-geo-tz
[![npm version](https://badge.fury.io/js/geo-tz.svg)](http://badge.fury.io/js/geo-tz) [![Test Coverage](https://img.shields.io/codecov/c/github/evansiroky/node-geo-tz.svg)](https://codecov.io/github/evansiroky/node-geo-tz)

The most up-to-date and accurate node.js geographical timezone lookup package.  It's fast too!

## Install

`npm install geo-tz`

## Usage

```js
const { find } = require('geo-tz')

find(47.650499, -122.350070)  // ['America/Los_Angeles']
find(43.839319, 87.526148)  // ['Asia/Shanghai', 'Asia/Urumqi']
```

## Data Source and Architecture

This library aims to do one thing and do it well: find the timezone(s) in use at a GPS coordinate. The output consists of timezone identifiers as defined in the [timezone database](https://www.iana.org/time-zones). The underlying geographic data is obtained from the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project. The data is indexed for fast analysis by caching subregions of geographic data when a precise lookup is needed.

This library does an exact geographic lookup which has tradeoffs. The results are more accurate than other libraries that compromise by approximating the lookup of the data. However, it is perhaps a little bit slower that other libraries, has a larger installation size on disk and may encounter difficulties when bundling.

## Entry Points

As of version 8, node-geo-tz offers the ability to choose from the three different timezone boundary products that the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project produces. If using TypeScript, it may be necessary to use the `dist` entry points (see [issue #165](https://github.com/evansiroky/node-geo-tz/issues/165)).

### Alike Since 1970 (default)

The default data product used by this library are unioned timezones that are alike since 1970. This is a breaking change from versions below version 8 that used timezone identifiers that generally had a minimum of one timezone per country. In a number of places, the timezone identifier returned will be that which has the highest population among all timezone identifiers with similar timekeeping methods since 1970.

```js
const { find } = require('geo-tz')
// const { find } = require('geo-tz/dist/find-1970') // TypeScript-compatible import

find(12.826174, 45.036933)  // ['Asia/Riyadh']
```

When using this product, it is possible that the timezone identifier returned will not be appropriate for calculating the observed time at the GPS coordinate prior to the year 1970.

### Comprehensive

A comprehensive dataset is available to query for all timezone identifiers available. This has the same behavior of this library prior to version 8. This version has the largest file size to accomodate all the needed boundaries. In this dataset, with a few rare exceptions, there is at least one unique timezone identifier per country.

```js
const { find } = require('geo-tz/all')
// const { find } = require('geo-tz/dist/find-all') // TypeScript-compatible import

find(12.826174, 45.036933)  // ['Asia/Aden']
```

When using this product, the timezone identifier returned will be appropriate for calculating the observed time at the GPS coordinate including years prior to 1970.

### Same since now

A dataset containing a unioned set of timezones that share the same timekeeping method into the future is the final data product available. This version has the smallest file size as it does not include as many timezones and boundaries. In a number of places, the timezone identifier returned will be that which has the highest population among all timezone identifiers with similar timekeeping methods since the current time.

```js
const { find } = require('geo-tz/now')
// const { find } = require('geo-tz/dist/find-now') // TypeScript-compatible import

find(12.826174, 45.036933)  // ['Europe/Moscow']
```

When using this product, the timezone identifier returned will only be appropriate for calculating the observed time at the GPS coordinate for the current and future time.

## API Docs

The API available is the same for each data product.

### find(lat, lon)

Returns the timezone identifiers found at `lat`, `lon`. There are certain coordinates where the timekeeping method will depend on the person you ask. Also, another case where 2 or more timezones could be returned is when a request is made with a coordinate that happens to be exactly on the border between two or more timezones. If the GPS coordinate does not fall inside any timezone boundary on land, then a timezone at sea will be returned.

```js
const { find } = require('geo-tz')

find(47.650499, -122.350070)  // ['America/Los_Angeles']
find(43.839319, 87.526148)  // ['Asia/Shanghai', 'Asia/Urumqi']
```

### setCache(options)

By default, geoTz lazy-loads exact lookup data into an unexpiring cache. The `setCache` method can be used to change the caching behavior using the following options:

* `preload` - if set to true will attempt to cache all files (slow startup time and requires lots of memory)
* `store` - offload the cache to a custom storage solution (must be compatible with the Map api)

Examples:

```js
setCache({ preload: true }) // preloads all files

let map = new Map();
setCache({ store: map }) // pass a Map-like storage object
```

## Limitations

### Performance

This library relies on reading a large data file from disk to perform exact geographic lookups. Therefore, it is not intended to be used in the browser and may have issues with bundlers if they don't include the necessary file.

### Accuracy of Output

The underlying data is obtained from the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project. The data from that project is mostly sourced from OpenStreetMap which is editable by anyone. In most cases, the timezone boundaries follow officially observed boundaries, but often times some communities near timezone boundaries may follow whichever timekeeping method works best for them.

The boundaries in the ocean come from the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project which only includes territorial waters and not exclusive economic zones. Additionally, special cases where the GPS coordinate falls with an area of [Terra nullius](https://en.wikipedia.org/wiki/Terra_nullius) will also have an ocean zone(s) returned.

The resulting timezone identifiers will represent the timekeeping method as is cataloged to the best of the knowledge of the maintainers of the timezone database. This could be wrong in the past (especially prior to 1970) and could change in the future should an area change the way they keep track of time.

Any concerns about the correctness of results are encouraged to be submitted as issues using the [Incorrect Result Issue Template](https://github.com/evansiroky/node-geo-tz/issues/new?assignees=&labels=&projects=&template=incorrect-result.md&title=Incorrect%20Result%3A+). 

## An Important Note About Maintenance

Due to the ever-changing nature of timezone data, it is critical that the latest version of this package is used.  If older versions are used, there will be a few edge cases where the calculated time is wrong.
