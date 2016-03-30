var Download = require('download'),
  downloadStatus = require('download-status')

var extractToGeoJSON = function(callback) {
  return function() {
    if(typeof callback === "function") {
      callback()
    }
  }
}

module.exports = function(callback) {

  // download tz world shapefile
  var download = new Download()
    .get('http://efele.net/maps/tz/world/tz_world_mp.zip')
    .dest('downloads')
    .use(downloadStatus())
    .run(extractToGeoJSON(callback))

}