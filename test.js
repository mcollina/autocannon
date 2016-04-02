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

test('myhttp client automatically reconnects', (t) => {
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

  server.once('request', function (req, res) {
    setImmediate(() => {
      req.socket.destroy()
    })
  })
})

test('autocannon', (t) => {
  autocannon({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)

    t.equal(result.duration, 2, 'duration is the same')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

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
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')

    t.ok(result.throughput, 'throughput exists')
    t.ok(result.throughput.average, 'throughput.average exists')
    t.ok(result.throughput.stddev, 'throughput.stddev exists')
    t.ok(result.throughput.min, 'throughput.min exists')
    t.ok(result.throughput.max, 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })
})
