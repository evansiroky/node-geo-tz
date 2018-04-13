# node-geo-tz
[![npm version](https://badge.fury.io/js/geo-tz.svg)](http://badge.fury.io/js/geo-tz) [![Build Status](https://travis-ci.org/evansiroky/node-geo-tz.svg?branch=master)](https://travis-ci.org/evansiroky/node-geo-tz) [![Dependency Status](https://david-dm.org/evansiroky/node-geo-tz.svg)](https://david-dm.org/evansiroky/node-geo-tz) [![Test Coverage](https://codeclimate.com/github/evansiroky/node-geo-tz/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/node-geo-tz/coverage)

The most up-to-date and accurate node.js geographical timezone lookup package.  It's fast too!

## Install

`npm install geo-tz`

## Usage

    var geoTz = require('geo-tz')

    geoTz.tz(47.650499, -122.350070)  // 'America/Los_Angeles'

## API Docs:

As of Version 4, there is now only one API call and no dependency on moment-timezone.

### geoTz(lat, lon)

Returns the timezone name found at `lat`, `lon`.  The timezone name will be a timezone identifier as defined in the [timezone database](https://www.iana.org/time-zones).  The underlying geographic data is obtained from the [timezone-boudary-builder](https://github.com/evansiroky/timezone-boundary-builder) project.

This library does an exact geographic lookup which has tradeoffs.  It is perhaps a little bit slower that other libraries, has a large installation size on disk and cannot be used in the browser.  However, the results are more accurate than other libraries that compromise by approximating the lookup of the data.

The data is indexed for fast analysis with automatic caching (with time expiration) of subregions of geographic data for when a precise lookup is needed.

## An Important Note About Maintenance

Due to the ever-changing nature of timezone data, it is critical that you always use the latest version of this package.  If you use old versions, there will be a few edge cases where the calculated time is wrong.  If you use greenkeeper, please be sure to specify an exact target version so you will always get PR's for even patch-level releases.
