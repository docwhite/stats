var gulp = require('gulp');

var babelify = require('babelify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var concat = require('gulp-concat');
var del = require('del');
var es6ify = require('es6ify');
var gulpif = require('gulp-if')
var reactify = require('reactify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var stylus = require('gulp-stylus');
var zip = require('gulp-zip');

var exec = require('child_process').exec;
var yargs = require('yargs').argv;

const vendors = ['react', 'axios'];

// Compile stylus into css.
gulp.task('styles', function() {
  return gulp.src('./frontend/*.styl')
    .pipe(sourcemaps.init())
    .pipe(stylus())
    .pipe(concat('styles.css'))
    .pipe(gulpif(yargs.makeMaps, sourcemaps.write('./maps')))
    .pipe(gulp.dest('public/css'));
});

// Build just vendor code so we don't have to rebuild all on app changes.
gulp.task('vendor', function() {
  const build = browserify({
    debug: yargs.makeMaps
  });

  vendors.forEach(lib => build.require(lib));

  build.bundle()
    .pipe(source('vendor.js'))
    .pipe(buffer())
    .pipe(gulpif(yargs.makeMaps, sourcemaps.init({loadMaps: true})))
    .pipe(gulpif(yargs.makeMaps, sourcemaps.write('./maps')))
    .pipe(gulp.dest('public/js'));
});

// Build the application scripts code.
gulp.task('scripts', function() {
  const build = browserify({
    entries: ['frontend/App.jsx'],
    extensions: ['jsx'],
    debug: yargs.makeMaps
  });

  build.external(vendors);
  build.transform('babelify', {presets: ['es2015', 'react']});

  build.bundle()
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(gulpif(yargs.makeMaps, sourcemaps.init({loadMaps: true})))
  .pipe(gulpif(yargs.makeMaps, sourcemaps.write('./maps')))
  .pipe(gulp.dest('public/js'));
});

// Build application into public.
gulp.task('build', ['styles', 'vendor', 'scripts']);

// Prepares all contents before zipping ready to ship.
gulp.task('dist', ['pyDeps'], function() {
  gulp.src(['backend/**/*.py', 'backend/**/*.html'])
    .pipe(gulp.dest('dist'));
  gulp.src('public/css/*.css')
    .pipe(gulp.dest('dist/css'));
  gulp.src('public/js/*.js')
    .pipe(gulp.dest('dist/js'));
});

// Package up for offline use. Run dist before this one.
gulp.task('zip', function() {
  gulp.src(['dist/app.py', 'dist/installDependencies', 'dist/*/**'])
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest(''));
});

// Package up python dependencies
gulp.task('pyDeps', function() {
  exec('./pyDeps', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });
});

// Extract the dependencies. pyDeps must run first.
gulp.task('extractPyDeps', function() {
  exec('./installDependencies', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });
});

// Cleanup.
gulp.task('clean', function() {
  return del(['public/js/', 'public/css/', 'dist/', 'dist.zip']);
});

// Entry point for development.
gulp.task('default', ['build'], function() {
  gulp.watch('frontend/*.jsx', ['scripts']);
  gulp.watch('frontend/*.styl', ['styles'])
});
