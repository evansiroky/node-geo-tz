# node-geo-tz
[![npm version](https://badge.fury.io/js/geo-tz.svg)](http://badge.fury.io/js/geo-tz) [![Build Status](https://travis-ci.org/evansiroky/node-geo-tz.svg?branch=master)](https://travis-ci.org/evansiroky/node-geo-tz) [![Dependency Status](https://david-dm.org/evansiroky/node-geo-tz.svg)](https://david-dm.org/evansiroky/node-geo-tz) [![Test Coverage](https://codeclimate.com/github/evansiroky/node-geo-tz/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/node-geo-tz/coverage)

A node.js module to find the timezone based on gps coordinates

## Install

`npm install geo-tz`

## Finding Timezone:

### .tz(lat, lon)

Returns timezone name found at lat, lon.  Returns null if timezone could not be found at coordinate.

### .tzMoment(lat, lon, [dateTime])

Returns a moment-timezone object found at lat, lon.  Returns null if timezone could not be found at coordinate.  If dateTime is omitted, the moment-timezone will have the current time set.  If dateTime is provided, moment-timezone will be set to the time provided according to the timezone found.
