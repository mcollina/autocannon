'use strict'

const { test } = require('node:test')
const validate = require('../lib/validate')
const parseArguments = require('../autocannon').parseArguments
const initJob = require('../lib/init')
const printResult = require('../lib/printResult')

test('validate should return an error', (t) => {
  t.plan(2, { wait: true })

  const args = {
    sampleInt: 'hello',
    url: 'https://github.com/mcollina/autocannon'
  }

  const result = validate(args)

  t.assert.ok(result instanceof Error)
  t.assert.strictEqual(result.message, 'sample interval entered was in an invalid format')
})

test('validate should return an error', (t) => {
  t.plan(2, { wait: true })

  const args = {
    sampleInt: -1,
    url: 'https://github.com/mcollina/autocannon'
  }

  const result = validate(args)

  t.assert.ok(result instanceof Error)
  t.assert.strictEqual(result.message, 'sample interval can not be less than 0')
})

test('validate should not return an error', (t) => {
  t.plan(2, { wait: true })

  const args = {
    sampleInt: 2,
    url: 'https://github.com/mcollina/autocannon'
  }

  const result = validate(args)

  t.assert.ok(!(result instanceof Error))
  t.assert.strictEqual(result.sampleInt, 2)
})

test('parseArguments should accept value in ms (2000)', (t) => {
  t.plan(1, { wait: true })

  const args = [
    '-L', 2000,
    'https://github.com/mcollina/autocannon'
  ]

  const result = parseArguments(args)

  t.assert.strictEqual(result.sampleInt, 2000)
})

test('run should return sampleInt == 2000 & samples == 3', (t) => {
  t.plan(2, { wait: true })

  initJob({
    duration: 6,
    sampleInt: 2000,
    url: 'https://github.com/mcollina/autocannon'
  }, (err, res) => {
    if (err) {
      console.err(err)
    }
    t.assert.strictEqual(res.sampleInt, 2000)
    t.assert.strictEqual(res.samples, 3)
  })
})

test('printResult should print the sample interval (2) & the total samples (3)', (t) => {
  t.plan(2, { wait: true })

  const result = {
    duration: 6,
    sampleInt: 2000,
    samples: 3,
    url: 'https://github.com/mcollina/autocannon',
    latency: {},
    requests: {},
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }

  const output = printResult(result, {})

  t.assert.ok(output.includes('Req/Bytes counts sampled every 2 seconds.'))
  t.assert.ok(output.includes('# of samples: 3'))
})
