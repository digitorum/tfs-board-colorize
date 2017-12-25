var gulp = require('gulp');
var gulpZip = require('gulp-zip');

gulp.task('default', function () {
    gulp.src(['TfsBoardColorizeExtension.js', 'manifest.xml']).pipe(gulpZip('TfsBoardColorizeExtension.zip')).pipe(gulp.dest('dist'));
});