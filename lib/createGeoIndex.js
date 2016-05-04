var tzData = require('../data/tzgeo.json')


module.exports = function() {
  // create array and index lookup of timezone names

  // recursively generate index until 99% of planet is indexed exactly
  var curPctIndexed = 0,
    curLevel = 1,
    expectedAtLevel = 4,
    curZones = ['a', 'b', 'c', 'd']

  while(curPctIndexed < 99) {
    var nextZones = [], i

    for(i = 0; i < curZones.length; i++) {
      // determine geographic extent of zone

      // determine if zone can fit completely within a single timezone or completely outside of any timezone

      // if zone can fit completely within a single timezone or completely outside of any timezone, make a note

      // if zone can't fit completely within a single timezone or multiple timezones overlap, make a note and add corresponding zones to next round

    }
    
    // recalculate pct indexed after this round
    expectedAtLevel = Math.pow(4, curLevel + 1)
    curPctIndexed = (expectedAtLevel - nextZones.length) / expectedAtLevel
    curZones = nextZones
  }
}