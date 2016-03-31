#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const http = require('http')
const https = require('https')
const Histogram = require('native-hdr-histogram')
const eos = require('end-of-stream')
const URL = require('url')
const once = require('once')

function run (opts, cb) {
  const latencies = new Histogram(1, 10000, 3)
  const requests = new Histogram(1, 1000000, 3)
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: opts.connections + 1
  })
  const url = URL.parse(opts.url)
  let counter = 0
  const interval = setInterval(() => {
    requests.record(counter)
    counter = 0
  }, 1000)

  let stop = false
  let onStop = once(() => {
    cb(null, {
      requestsPerSecond: {
        average: requests.mean(),
        stdDev: requests.stddev(),
      },
      latencies: {
        average: latencies.mean(),
        stdDev: requests.stddev()
      }
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
    res.on('end', record)
    res.resume()
    res.startTime = req.startTime
  }

  function record () {
    let end = process.hrtime(this.startTime)
    let responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
    launch()
  }

  function onError (err) {
    launch()
  }

  function launch () {
    if (!stop) {
      counter++
      let req = http.request(url)
        .on('response', next)

      req.end()
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

module.exports = run

function start () {
  const argv = minimist(process.argv.slice(2), {
    alias: {
      connections: 'c',
      duration: 'd',
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
