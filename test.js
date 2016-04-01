'use strict'

const test = require('tap').test
const http = require('http')
const Client = require('./lib/myhttp')

const autocannon = require('.')

const server = http.createServer(handle)

server.listen(0)

function handle (req, res) {
  res.end('hello world')
}

server.unref()

test('client calls a server twice', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('autocannon', (t) => {
  autocannon({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')

    t.ok(result.requests, 'requests exists')
    t.ok(result.requests.average, 'requests.average exists')
    t.ok(result.requests.stddev, 'requests.stddev exists')
    t.ok(result.requests.min, 'requests.min exists')
    t.ok(result.requests.max, 'requests.max exists')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.ok(result.throughput.stddev, 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')

    t.equal(result.errors, 0, 'no errors')

    t.end()
  })
})
