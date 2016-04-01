#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const http = require('http')
const Histogram = require('native-hdr-histogram')
const URL = require('url')
const once = require('once')

function run (opts, cb) {
  const latencies = new Histogram(1, 10000, 3)
  const requests = new Histogram(1, 1000000, 3)
  const throughput = new Histogram(1, 1000000, 3)
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: opts.connections
  })
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

  let stop = false
  let onStop = once(() => {
    cb(null, {
      requestsPerSecond: histAsObj(requests),
      latencies: histAsObj(latencies),
      throughput: histAsObj(throughput),
      errors: errors
    })
  })

  url.headers = {
    'Connection': 'keep-alive'
  }
  url.agent = agent

  if (!opts.connections) {
    cb(new Error('connections > 0'))
    return
  }

  for (let i = 0; i < opts.connections; i++) {
    launch()
  }

  function next (res) {
    let req = this
    res.on('data', countThroughput)
    res.on('end', record)
    res.on('error', onError)
    res.startTime = req.startTime
  }

  function countThroughput (buf) {
    bytes += buf.length
  }

  function record () {
    let end = process.hrtime(this.startTime)
    let responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
    counter++
    setImmediate(launch)
  }

  function onError () {
    errors++
    setImmediate(launch)
  }

  function launch () {
    if (!stop) {
      let req = http.request(url, next)

      req.end()
      req.on('error', onError)
      req.startTime = process.hrtime()
    } else {
      onStop()
    }
  }

  setTimeout(() => {
    stop = true
    clearInterval(interval)
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
      duration: 'd'
    },
    default: {
      connections: 10,
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
