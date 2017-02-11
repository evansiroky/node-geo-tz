# node-geo-tz
[![npm version](https://badge.fury.io/js/geo-tz.svg)](http://badge.fury.io/js/geo-tz) [![Build Status](https://travis-ci.org/evansiroky/node-geo-tz.svg?branch=master)](https://travis-ci.org/evansiroky/node-geo-tz) [![Dependency Status](https://david-dm.org/evansiroky/node-geo-tz.svg)](https://david-dm.org/evansiroky/node-geo-tz) [![Test Coverage](https://codeclimate.com/github/evansiroky/node-geo-tz/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/node-geo-tz/coverage)

The most up-to-date and accurate node.js geographical timezone lookup package.  It's fast too!

## Install

`npm install geo-tz`

## Usage

    var geoTz = require('geo-tz')

    var name         = geoTz.tz(47.650499, -122.350070)                                // 'America/Los_Angeles'
    var now          = geoTz.tzMoment(47.650499, -122.350070)                          // moment-timezone obj
    var specificTime = geoTz.tzMoment(47.650499, -122.350070, '2016-03-30T01:23:45Z')  // moment-timezone obj

## API Docs:

### .tz(lat, lon)

Returns timezone name found at `lat`, `lon`.  Returns null if timezone could not be found at coordinate.

### .tzMoment(lat, lon, [dateTime])

Returns a moment-timezone object found at `lat`, `lon`.  Returns null if timezone could not be found at coordinate.  If `dateTime` is omitted, the moment-timezone will have the current time set.  If `dateTime` is provided, moment-timezone will be set to the time provided according to the timezone found.  `dateTime` can be any single-argument parameter that will get passed to the [`moment()` parser](http://momentjs.com/docs/#/parsing/).

## Advanced usage:

### .createPreloadedFeatureProvider()

By default, to keep memory usage low, the library loads geographic feature files on-demand when determining timezone. This behavior has performance implications and can be changed by specifying a different feature provider in an options object. `geoTz.createPreloadedFeatureProvider()` creates a feature provider that loads all geographic features into memory. This tends to make the `tz()` and `tzMoment()` calls 20-30 times faster, but also consumes about 900 MB of [memory](https://futurestud.io/tutorials/node-js-increase-the-memory-limit-for-your-process). Make sure to not create such a provider on every timezone lookup. The preloaded feature provider should be created on application startup and reused. Usage example:

    var featureProvider = geoTz.createPreloadedFeatureProvider()
    var options         = { featureProvider: featureProvider }
    var name            = geoTz.tz(47.650499, -122.350070, options)
    var specificTime    = geoTz.tzMoment(47.650499, -122.350070, '2016-03-30T01:23:45Z', options)  // moment-timezone obj


## An Important Note About Maintenance

Due to the ever-changing nature of timezone data, it is critical that you always use the latest version of this package.  Any releases to this project's dependency of moment-timezone will also cause a new release in this package.  If you use old versions, there will be a few edge cases where the calculated time is wrong.  If you use greenkeeper, please be sure to specify an exact target version so you will always get PR's for even patch-level releases.
