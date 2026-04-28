import jestPlugin from 'eslint-plugin-jest'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

const sharedGlobals = {
    AbortController: 'readonly',
    Buffer: 'readonly',
    CustomEvent: 'readonly',
    Element: 'readonly',
    Event: 'readonly',
    FormData: 'readonly',
    HTMLFormElement: 'readonly',
    HTMLInputElement: 'readonly',
    HTMLSelectElement: 'readonly',
    HTMLTextAreaElement: 'readonly',
    Headers: 'readonly',
    KeyboardEvent: 'readonly',
    MouseEvent: 'readonly',
    MutationObserver: 'readonly',
    Node: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    TextDecoder: 'readonly',
    TextEncoder: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    bootstrap: 'readonly',
    clearInterval: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    document: 'readonly',
    fetch: 'readonly',
    global: 'readonly',
    globalThis: 'readonly',
    location: 'readonly',
    module: 'readonly',
    navigator: 'readonly',
    process: 'readonly',
    require: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    window: 'readonly'
}

const jestGlobals = {
    afterAll: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    beforeEach: 'readonly',
    describe: 'readonly',
    expect: 'readonly',
    it: 'readonly',
    jest: 'readonly',
    test: 'readonly'
}

export default [
    {
        ignores: ['node_modules/**', 'dist/**', 'docs/**', 'coverage/**']
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: sharedGlobals
        },
        plugins: {
            jsdoc: jsdocPlugin
        },
        rules: {
            ...jsdocPlugin.configs['flat/recommended'].rules,
            'no-var': 'error',
            'prefer-const': ['error', { destructuring: 'all' }],
            'no-unused-vars': [
                'error',
                {
                    args: 'after-used',
                    ignoreRestSiblings: true,
                    caughtErrors: 'none',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            'no-shadow': 'error',
            'no-use-before-define': ['error', { functions: false }],
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            curly: ['error', 'multi-line'],
            'dot-notation': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-return-assign': ['error', 'always'],
            'no-param-reassign': ['error', { props: false }],
            'no-alert': 'warn',
            indent: ['error', 4, { SwitchCase: 1 }],
            'no-console': 'warn',
            'no-debugger': 'error',
            'no-continue': 'error',
            'no-else-return': ['error', { allowElseIf: false }],
            'no-lonely-if': 'error',
            quotes: ['error', 'single', { avoidEscape: true }],
            'no-mixed-operators': 'error',
            'no-underscore-dangle': ['error', { allowAfterThis: true }],
            semi: ['error', 'never'],
            'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
            'prefer-arrow-callback': 'off',
            'no-duplicate-imports': 'error',
            'prefer-template': 'error',
            'object-shorthand': ['error', 'always'],
            'prefer-destructuring': ['error', { array: false, object: true }],
            'func-style': 'off',
            'no-loop-func': 'error',
            'consistent-return': 'error',
            'no-restricted-syntax': [
                'error',
                'ForInStatement',
                'LabeledStatement',
                'WithStatement'
            ],
            'no-throw-literal': 'error',
            'no-multi-assign': 'error',
            'no-multi-spaces': 'error',
            'no-bitwise': 'error',
            'no-nested-ternary': 'error',
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: false,
                    checkConstructors: false,
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false
                    }
                }
            ],
            'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
            'jsdoc/check-param-names': ['off', { useDefaultObjectProperties: false }],
            'jsdoc/no-undefined-types': 'off',
            'jsdoc/no-defaults': 'off'
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: jestGlobals
        },
        plugins: {
            jest: jestPlugin
        },
        rules: {
            ...jestPlugin.configs['flat/recommended'].rules,
            'jsdoc/check-tag-names': 'off',
            'jest/no-disabled-tests': 'warn',
            'jest/expect-expect': 'off',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/no-conditional-expect': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': 'error'
        }
    },
    {
        files: ['scripts/**/*.js'],
        rules: {
            'no-console': 'off'
        }
    },
    {
        files: ['**/*.unit.test.js'],
        rules: {
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: false,
                    checkConstructors: false,
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: false,
                        ClassDeclaration: false,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false
                    }
                }
            ]
        }
    },
    eslintPluginPrettierRecommended
]
