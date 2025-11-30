module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json']
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'simple-import-sort'
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
};
