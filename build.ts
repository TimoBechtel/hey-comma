import packageJson from './package.json';

const result = await Bun.build({
	entrypoints: ['./src/index.ts'],
	target: 'node',
	outdir: './dist',
	format: 'esm',
	external: Object.keys(packageJson.dependencies),
	define: {
		'process.env.VERSION': JSON.stringify(packageJson.version),
		'process.env.DESCRIPTION': packageJson.description,
	},
});

if (!result.success) {
	console.log(result.logs);
	process.exit(1);
}
