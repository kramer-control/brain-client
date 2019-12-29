import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import json from '@rollup/plugin-json';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';
import babel from "rollup-plugin-babel";

const umdPlugins = [
	resolve({
		browser: true,
		preferBuiltins: true,
	}),
	commonjs(),
	globals(),
	builtins(),
	json(),
	babel({
		babelrc: false,
		exclude: 'node_modules/**',
		runtimeHelpers: true,
		presets: [
			["@babel/env",
				{ useBuiltIns: 'entry', corejs: 3, "targets": { "ie": "10" } }
			]
		],
		plugins: ['@babel/plugin-transform-runtime']
	}),
	terser({
		include: [/^.+\.min\.js$/]
	}),
	progress({
		clearLine: true
	}),
	filesize(),
];
	
const configs = [
	// Browser
	{
		output: [
			{
				file: 'dist/es5/kramer-brain-client.min.js',
				format: 'iife',
				name: 'KramerBrainClient',
				sourcemap: true,
			}, 
			{
				file: 'dist/es5/kramer-brain-client.js',
				format: 'iife',
				name: 'KramerBrainClient',
				sourcemap: true,
			}
		],
		input: 'src/index-umd.js',
		plugins: umdPlugins
	},
	// Node - CJS
	{
		output: {
			dir: 'dist/cjs',
			format: 'cjs',
			name: 'BrainClient',
			exports: 'named',
			sourcemap: true,
		},
		input: 'src/index.js',
		external: [
			'react',
			'events',
			'isomorphic-fetch',
			'isomorphic-ws',
			'async-retry',
		],
		preserveModules: true,
		plugins: [
			progress({
				clearLine: true
			}),
			filesize()
		]
	},
	 
	// Node - ESM
	// Unecessary right now since we can just publish src/index.js as "modules" entrypoint
	// Can always reactivate this config if we need to do other transforms on the src
	// {
	// 	output: {
	// 		dir: 'dist/esm',
	// 		format: 'esm',
	// 		name: 'BrainClient',
	// 		// exports: 'named',
	// 		sourcemap: true,
	// 	},
	// 	input: 'src/index.js',
	// 	external: [
	// 		'react',
	// 		'events',
	// 		'isomorphic-fetch',
	// 		'isomorphic-ws',
	// 		'async-retry',
	// 	],
	// 	preserveModules: true,
	// 	plugins: [
	// 		// terser(),
	// 		progress({
	// 			clearLine: true
	// 		}),
	// 		filesize()
	// 	]
	// }
];


export default configs;