#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const Histogram = require('native-hdr-histogram')
const URL = require('url')
const Client = require('./lib/myhttp')

function run (opts, cb) {
  const latencies = new Histogram(1, 10000, 3)
  const requests = new Histogram(1, 1000000, 3)
  const throughput = new Histogram(1, 1000000000, 1)
  const statusCodes = [
    0, // 1xx
    0, // 2xx
    0, // 3xx
    0, // 4xx
    0  // 5xx
  ]

  const url = URL.parse(opts.url)

  opts.pipelining = opts.pipelining || 1

  let counter = 0
  let bytes = 0
  let errors = 0
  let totalBytes = 0
  let totalRequests = 0
  let stop = false

  const interval = setInterval(() => {
    totalBytes += bytes
    totalRequests += counter
    requests.record(counter)
    throughput.record(bytes)
    counter = 0
    bytes = 0

    if (stop) {
      clearInterval(interval)
      clients.forEach((client) => client.destroy())
      cb(null, {
        requests: histAsObj(requests, totalRequests),
        latency: histAsObj(latencies),
        throughput: histAsObj(throughput, totalBytes),
        errors: errors,
        duration: opts.duration,
        connections: opts.connections,
        pipelining: opts.pipelining,
        '2xx': statusCodes[1],
        'non2xx': statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4]
      })
    }
  }, 1000)

  if (!opts.connections) {
    cb(new Error('connections > 0'))
    return
  }

  url.pipelining = opts.pipelining

  let clients = []
  for (let i = 0; i < opts.connections; i++) {
    let client = new Client(url)
    client.on('response', record)
    client.on('error', onError)
    clients.push(client)
  }

  function record (statusCode, resBytes, responseTime) {
    statusCodes[(parseInt(statusCode) / 100) - 1] += 1
    latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    errors++
  }

  setTimeout(() => {
    stop = true
  }, opts.duration * 1000)
}

function histAsObj (hist, total) {
  const result = {
    average: Math.ceil(hist.mean() * 100) / 100,
    stddev: Math.ceil(hist.stddev() * 100) / 100,
    min: hist.min(),
    max: hist.max()
  }

  if (total) {
    result.total = total
  }

  return result
}

module.exports = run

function start () {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      connections: 'c',
      pipelining: 'p',
      duration: 'd'
    },
    default: {
      connections: 10,
      pipelining: 1,
      duration: 10
    }
  })

  argv.url = argv._[0]

  if (!argv.url) {
    console.error('Usage: autocannon [opts] url')
    return
  }

  run(argv, (err, result) => {
    if (err) {
      throw err
    }

    console.log(result)
  })
}

if (require.main === module) {
  start()
}
