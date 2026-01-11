const esbuild = require("esbuild");
const path = require("path");

const entry = path.join(__dirname, '../src/index.js');

// ESM Build
esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/bundle.esm.js',
  target: ['esnext'],
  sourcemap: false,
  platform: 'browser',
  legalComments: 'none'
}).then(() => {
  console.log('completed build');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'synth',
  outfile: 'dist/bundle.cjs.js',
  target: ['esnext'],
  sourcemap: false,
  platform: 'browser',
  legalComments: 'none' 
}).then(() => {
  console.log('completed build cjs');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
