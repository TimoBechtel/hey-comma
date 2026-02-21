import packageJson from './package.json';

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  target: 'node',
  outdir: './dist',
  format: 'esm',
  external: Object.keys(packageJson.dependencies),
  minify: true,
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}
