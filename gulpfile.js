var gulp = require("gulp"),
  express = require("express"),
  replace = require('gulp-replace');

gulp.task("serve", function () {
  if (process.env.endpoint) {
    gulp.src('main.js', {
        base: './'
      })
      .pipe(replace('http://localhost:3030', process.env.endpoint))
      .pipe(gulp.dest('./'));
  }

  var app = express();
  app.use(express.static(__dirname));
  var port = 4000;
  app.listen(port, "0.0.0.0", function () {
    console.log("App running and listening on port", port);
  });
})