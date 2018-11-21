import babel from 'rollup-plugin-babel';
import sass from 'rollup-plugin-sass'

import pkg from './package.json';

const production = !process.env.ROLLUP_WATCH;

let config = [
    {
        input: 'docs/index.js',
        output: {
            file: 'docs/dist/docs.js',
            format: 'iife'
        },
        plugins: [
            babel({
                exclude: ['node_modules/**']
            })
        ]
    },
    {
        input: 'src/index.js',
        output: [
            {
                file: 'docs/' + pkg.browser,
                format: 'umd',
                name: 'BigGrid'
            }
        ],
        plugins: [
            babel({
                exclude: ['node_modules/**']
            }),
            sass({
                output: 'docs/' + pkg.style,
            })
        ]
    }
]

if (production) {
    config = config.concat(
        [
            {
                input: 'src/index.js',
                output: [
                    {
                        file: pkg.main,
                        format: 'cjs'
                    },
                    {
                        file: pkg.module,
                        format: 'es'
                    },
                    {
                        file: pkg.browser,
                        format: 'umd',
                        name: 'BigGrid'
                    }
                ],
                plugins: [
                    babel({
                        exclude: ['node_modules/**']
                    }),
                    sass({
                        output: pkg.style,
                    })
                ]
            }
        ])
}

export default config;
