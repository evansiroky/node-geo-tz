var update = require('../lib/update.js')

update({ indexGeoJSON: true }, function(err) {
  if(err) {
    console.log('update unsuccessful.  Error: ', err)
  } else {
    console.log('update successfully completed')
  }
})