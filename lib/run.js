'use strict'

const EE = require('events').EventEmitter
const URL = require('url')
const Histogram = require('native-hdr-histogram')
const Client = require('./httpClient')
const percentiles = require('./percentiles')
const xtend = require('xtend')

const defaultOptions = {
  headers: {},
  body: new Buffer(0),
  method: 'GET',
  duration: 10,
  connections: 10,
  pipelining: 1,
  timeout: 10,
  maxConnectionRequests: 0,
  maxOverallRequests: 0,
  requests: [{}]
}

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

  opts = xtend(defaultOptions, opts)

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

  if (opts.timeout <= 0) {
    cb(new Error('timeout must be greater than 0'))
    return
  }

  if (opts.bailout && opts.bailout < 1) {
    cb(new Error('bailout threshold can not be < 1'))
    return
  }

  if (opts.maxConnectionRequests && opts.maxConnectionRequests < 1) {
    cb(new Error('maxConnectionRequests can not be < 1'))
    return
  }

  if (opts.maxOverallRequests) {
    if (opts.maxOverallRequests < 1) {
      cb(new Error('maxOverallRequests can not be < 1'))
      return
    }
    if (opts.maxOverallRequests < opts.connections) {
      cb(new Error('maxOverallRequests can not be < opts.connections'))
      return
    }
    if ((opts.maxOverallRequests % opts.connections) > 0) {
      cb(new Error('maxOverallRequest must be multiple of the number of connections'))
      return
    }
  }

  const url = URL.parse(opts.url)

  let counter = 0
  let bytes = 0
  let errors = 0
  let timeouts = 0
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
  url.setupClient = opts.setupClient
  url.timeout = opts.timeout
  url.requests = opts.requests

  url.responseMax = opts.maxConnectionRequests

  // If responseMax is set with the MaxConnectionReqs this will be jumped over,
  // as MaxConnectionReqs takes precedence. If it is not set, we check if the
  // maxOverallReqs is a number to avoid a NAN division error.
  // original code was:
  // url.responseMax = opts.maxConnectionRequests
  //                    || typeof opts.maxOverallRequests === 'number'
  //                        ? (opts.maxOverallRequests / opts.connections)
  //                        : false
  // but resMax was being set to 0 unexpectedly when maxConnReqs was set
  if (!url.responseMax) {
    url.responseMax = typeof opts.maxOverallRequests === 'number'
                      ? (opts.maxOverallRequests / opts.connections) : 0
  }

  let clients = []
  for (let i = 0; i < opts.connections; i++) {
    let client = new Client(url)
    client.on('response', onResponse)
    client.on('connError', onError)
    client.on('timeout', onTimeout)
    clients.push(client)
  }

  function onResponse (statusCode, resBytes, responseTime) {
    tracker.emit('response', this, statusCode, resBytes, responseTime)
    const codeIndex = (parseInt(statusCode) / 100) - 1
    statusCodes[codeIndex] += 1
    // only record 2xx latencies
    if (codeIndex === 1) latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    errors++
    if (opts.bailout && errors >= opts.bailout) tracker.stop()
  }

  // treat a timeout as a special type of error
  function onTimeout () {
    errors++
    timeouts++
    if (opts.bailout && errors >= opts.bailout) tracker.stop()
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
        title: opts.title,
        requests: histAsObj(requests, totalRequests),
        latency: addPercentiles(latencies, histAsObj(latencies)),
        throughput: histAsObj(throughput, totalBytes),
        errors: errors,
        timeouts: timeouts,
        duration: Math.round((Date.now() - startTime) / 1000),
        start: new Date(startTime),
        finish: new Date(),
        connections: opts.connections,
        pipelining: opts.pipelining,
        'non2xx': statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4]
      }
      statusCodes.forEach((code, index) => { result[(index + 1) + 'xx'] = code })
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
