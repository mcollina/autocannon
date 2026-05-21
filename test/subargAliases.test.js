'use strict'

const test = require('tap').test
const generateSubArgAliases = require('../lib/subargAliases')

test('generateSubArgAliases Should generate warmup aliases', (t) => {
  t.plan(6)

  const args = {
    connections: 1,
    duration: 2,
    amount: 20,
    warmup: {
      a: 10,
      c: 3,
      d: 4
    }
  }

  const result = generateSubArgAliases(args)

  t.equal(result.connections, 1)
  t.equal(result.duration, 2)
  t.equal(result.amount, 20)
  t.equal(result.warmup.connections, 3)
  t.equal(result.warmup.duration, 4)
  t.equal(result.warmup.amount, 10)
})

test('generateSubArgAliases should map amount alias in warmup', (t) => {
  t.plan(3)

  const args = {
    amount: 20,
    warmup: {
      a: 10
    }
  }

  const result = generateSubArgAliases(args)

  t.equal(result.amount, 20)
  t.equal(result.warmup.amount, 10)
  t.equal(result.warmup.a, 10)
})

test('generateSubArgAliases should not process aliases that are not defined in subargAliases.js', (t) => {
  t.plan(5)

  const args = {
    connections: 1,
    warmup: {
      c: 3,
      T: 'A title'
    }
  }

  const result = generateSubArgAliases(args)

  t.equal(result.connections, 1)
  t.equal(result.warmup.connections, 3)
  t.equal(result.warmup.c, 3)
  t.equal(result.warmup.T, 'A title')
  t.equal(Object.keys(result.warmup).length, 3)
})
