'use strict';

const Gulp = require('gulp');
const BS = require('browser-sync');

const bsync = BS.create();

Gulp.task('browser-sync', () => {
    return bsync.init({
        server: {
            baseDir: './'
        },
        port: 8080
    });
});

Gulp.task('watch', ['browser-sync'], () => {
    Gulp.watch('**/**/*.html').on('change', bsync.reload);
    Gulp.watch('assets/**/**/*.js').on('change', bsync.reload);
    Gulp.watch('assets/**/**/*.css').on('change', bsync.reload);
});

Gulp.task('default', ['watch']);

