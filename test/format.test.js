'use strict'

const { test } = require('node:test')
const format = require('../lib/format')

const pairs = {
  2: 2,
  '2k': 2000,
  '4k': 4042,
  '2300k': 2300000
}

Object.keys(pairs).forEach((expected) => {
  const original = pairs[expected]
  test(`format ${original} into ${expected}`, (t) => {
    t.assert.strictEqual(expected, format(original))
  })
})
