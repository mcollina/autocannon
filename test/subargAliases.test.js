'use strict'

const { test } = require('node:test')
const generateSubArgAliases = require('../lib/subargAliases')

test('generateSubArgAliases Should generate warmup aliases', (t) => {
  t.plan(4, { wait: true })

  const args = {
    connections: 1,
    duration: 2,
    warmup: {
      c: 3,
      d: 4
    }
  }

  const result = generateSubArgAliases(args)

  t.assert.strictEqual(result.connections, 1)
  t.assert.strictEqual(result.duration, 2)
  t.assert.strictEqual(result.warmup.connections, 3)
  t.assert.strictEqual(result.warmup.duration, 4)
})

test('generateSubArgAliases should not process aliases that are not defined in subargAliases.js', (t) => {
  t.plan(5, { wait: true })

  const args = {
    connections: 1,
    warmup: {
      c: 3,
      T: 'A title'
    }
  }

  const result = generateSubArgAliases(args)

  t.assert.strictEqual(result.connections, 1)
  t.assert.strictEqual(result.warmup.connections, 3)
  t.assert.strictEqual(result.warmup.c, 3)
  t.assert.strictEqual(result.warmup.T, 'A title')
  t.assert.strictEqual(Object.keys(result.warmup).length, 3)
})
