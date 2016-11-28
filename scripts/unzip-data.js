var unzipper = require('../lib/unzip-data')

console.log('unzipping data')
unzipper(null, function (err) {
  if (err) {
    console.log('unzip unsuccessful.  Error: ', err)
  } else {
    console.log('unzip successfully completed')
  }
})
