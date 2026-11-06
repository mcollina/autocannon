const { test } = require('node:test')
const { startServer } = require('./helper')
const autocannon = require('../autocannon')
const aggregateResult = autocannon.aggregateResult
const server = startServer()
const url = 'http://localhost:' + server.address().port

test('exec separate autocannon instances with skipAggregateResult, then aggregateResult afterwards', async (t) => {
  t.plan(2, { wait: true })

  const opts = {
    url,
    connections: 1,
    maxOverallRequests: 10,
    skipAggregateResult: true
  }

  const results = await Promise.all([
    autocannon(opts),
    autocannon(opts)
  ])

  const aggregateResults = aggregateResult(results, opts)

  t.assert.strictEqual(aggregateResults['2xx'], 20)
  t.assert.strictEqual(aggregateResults.requests.total, 20)
})

test('aggregateResult must be passed opts with at least a URL or socketPath property', async (t) => {
  t.plan(2, { wait: true })
  t.assert.throws(() => aggregateResult([]), { message: 'url or socketPath option required' })
  t.assert.throws(() => aggregateResult([], {}), { message: 'url or socketPath option required' })
})
