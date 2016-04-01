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
  const url = URL.parse(opts.url)
  let counter = 0
  let bytes = 0
  let errors = 0
  const interval = setInterval(() => {
    requests.record(counter)
    throughput.record(bytes)
    counter = 0
    bytes = 0
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
    latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    errors++
  }

  setTimeout(() => {
    clearInterval(interval)
    clients.forEach((client) => client.destroy())
    cb(null, {
      requestsPerSecond: histAsObj(requests),
      latencies: histAsObj(latencies),
      throughput: histAsObj(throughput),
      errors: errors
    })
  }, opts.duration * 1000)
}

function histAsObj (hist) {
  return {
    average: hist.mean(),
    stddev: hist.stddev(),
    min: hist.min(),
    max: hist.max()
  }
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
