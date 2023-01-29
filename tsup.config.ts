import { defineConfig } from 'tsup';
import packageJson from './package.json';

export default defineConfig({
	format: 'esm',
	entry: ['src/index.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	dts: false,
	minify: false,
	env: {
		VERSION: packageJson.version,
		DESCRIPTION: packageJson.description,
	},
});
