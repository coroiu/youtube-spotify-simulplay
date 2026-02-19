#!/usr/bin/env node
const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  outfile: 'public/bundle.js',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
};

if (watch) {
  esbuild.context(config).then((ctx) => {
    ctx.watch();
    console.log('esbuild watching...');
  });
} else {
  esbuild.build(config).then(() => {
    console.log('esbuild build complete');
  });
}
