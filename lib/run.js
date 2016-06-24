'use strict'

const EE = require('events').EventEmitter
const URL = require('url')
const Histogram = require('native-hdr-histogram')
const Client = require('./myhttp')
const percentiles = require('./percentiles')

function run (opts, cb) {
  cb = cb || noop

  const tracker = new EE()
  tracker.opts = opts

  const latencies = new Histogram(1, 10000, 5)
  const requests = new Histogram(1, 1000000, 3)
  const throughput = new Histogram(1, 1000000000, 1)
  const statusCodes = [
    0, // 1xx
    0, // 2xx
    0, // 3xx
    0, // 4xx
    0  // 5xx
  ]

  opts.duration = opts.duration || 10
  opts.connections = opts.connections || 10
  opts.pipelining = opts.pipelining || 1

  if (!opts.url) {
    cb(new Error('url option required'))
    return
  }

  if (opts.duration <= 0) {
    cb(new Error('duration must be greater than 0'))
    return
  }

  if (opts.connections < 1) {
    cb(new Error('connections factor can not be < 1'))
    return
  }

  if (opts.pipelining < 1) {
    cb(new Error('pipelining factor can not be < 1'))
    return
  }

  const url = URL.parse(opts.url)

  let counter = 0
  let bytes = 0
  let errors = 0
  let totalBytes = 0
  let totalRequests = 0
  let stop = false
  let startTime = Date.now()

  // copy over fields so that the client
  // performs the right HTTP requests
  url.pipelining = opts.pipelining
  url.method = opts.method
  url.body = opts.body
  url.headers = opts.headers

  let clients = []
  for (let i = 0; i < opts.connections; i++) {
    let client = new Client(url)
    client.on('response', record)
    client.on('connError', onError)
    clients.push(client)
  }

  function record (statusCode, resBytes, responseTime) {
    tracker.emit('response', this, statusCode, resBytes, responseTime)
    statusCodes[(parseInt(statusCode) / 100) - 1] += 1
    latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    errors++
  }

  const stopTimer = setTimeout(() => {
    stop = true
  }, opts.duration * 1000)

  tracker.stop = () => {
    clearTimeout(stopTimer)
    stop = true
  }

  const interval = setInterval(() => {
    totalBytes += bytes
    totalRequests += counter
    requests.record(counter)
    throughput.record(bytes)
    counter = 0
    bytes = 0
    tracker.emit('tick')

    if (stop) {
      clearInterval(interval)
      clients.forEach((client) => client.destroy())
      let result = {
        requests: histAsObj(requests, totalRequests),
        latency: addPercentiles(latencies, histAsObj(latencies)),
        throughput: histAsObj(throughput, totalBytes),
        errors: errors,
        duration: Math.round((Date.now() - startTime) / 1000),
        connections: opts.connections,
        pipelining: opts.pipelining,
        '2xx': statusCodes[1],
        'non2xx': statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4]
      }
      tracker.emit('done', result)
      cb(null, result)
    }
  }, 1000)

  return tracker
}

function histAsObj (hist, total) {
  const result = {
    average: Math.ceil(hist.mean() * 100) / 100,
    stddev: Math.ceil(hist.stddev() * 100) / 100,
    min: hist.min(),
    max: hist.max()
  }

  if (typeof total === 'number') {
    result.total = total
  }

  return result
}

function addPercentiles (hist, result) {
  percentiles.forEach((perc) => {
    const key = ('p' + perc).replace('.', '')
    result[key] = hist.percentile(perc)
  })

  return result
}

function noop () {}

module.exports = run
