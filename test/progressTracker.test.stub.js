'use strict'

const helper = require('./helper')
const { test } = require('node:test')
const progressTracker = require('../lib/progressTracker')
const autocannon = require('../autocannon')

test('progress tracker should throw if no instance is provided', t => {
  t.plan(1, { wait: true })
  try {
    progressTracker(null, {})
  } catch (error) {
    t.assert.deepStrictEqual(error.message, 'instance required for tracking')
  }
})

test('should work', (t, done) => {
  const server = helper.startServer({ statusCode: 404 })
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 2
  }, console.log)

  setTimeout(() => {
    instance.stop()
    done()
  }, 2000)

  autocannon.track(instance, {
    renderProgressBar: true,
    renderLatencyTable: true
  })
})

test('should work with amount', (t, done) => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 1,
    amount: 10
  }, process.stdout)

  setTimeout(() => {
    instance.stop()
    done()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.assert.ok(true)
})

test('should log mismatches', (t, done) => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 1,
    amount: 10,
    expectBody: 'modified'
  }, console.log)

  setTimeout(() => {
    instance.stop()
    done()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.assert.ok(true)
})

test('should log resets', (t, done) => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    amount: 10,
    requests: [
      { method: 'GET' },
      {
        method: 'GET',
        // falsey result will reset
        setupRequest: () => {}
      },
      { method: 'GET' }
    ]
  }, console.log)

  setTimeout(() => {
    instance.stop()
    done()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.assert.ok(true)
})
