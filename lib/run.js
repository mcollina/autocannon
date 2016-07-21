'use strict'

const EE = require('events').EventEmitter
const URL = require('url')
const Histogram = require('native-hdr-histogram')
const timestring = require('timestring')
const Client = require('./httpClient')
const xtend = require('xtend')
const histUtil = require('hdr-histogram-percentiles-obj')
const histAsObj = histUtil.histAsObj
const addPercentiles = histUtil.addPercentiles

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
  connectionRate: 0,
  overallRate: 0,
  amount: 0,
  requests: [{}]
}

function run (opts, cb) {
  cb = cb || noop

  const tracker = new EE()

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

  // do error checking, if error, return
  if (checkOptsForErrors()) return

  // set tracker.opts here, so throwing over invalid opts and setting defaults etc.
  // is done
  tracker.opts = opts

  if (opts.url.indexOf('http') !== 0) opts.url = 'http://' + opts.url
  const url = URL.parse(opts.url)

  let counter = 0
  let bytes = 0
  let errors = 0
  let timeouts = 0
  let totalBytes = 0
  let totalRequests = 0
  let totalCompletedRequests = 0
  let amount = opts.amount
  let stop = false
  let numRunning = opts.connections
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
  url.responseMax = amount || opts.maxConnectionRequests || opts.maxOverallRequests
  url.rate = opts.connectionRate || opts.overallRate

  let clients = []
  for (let i = 0; i < opts.connections; i++) {
    if (!amount && !opts.maxConnectionRequests && opts.maxOverallRequests) {
      url.responseMax = distributeNums(opts.maxOverallRequests, i)
    }
    if (amount) {
      url.responseMax = distributeNums(amount, i)
    }
    if (!opts.connectionRate && opts.overallRate) {
      url.rate = distributeNums(opts.overallRate, i)
    }

    let client = new Client(url)
    client.on('response', onResponse)
    client.on('connError', onError)
    client.on('timeout', onTimeout)
    client.on('request', () => { totalRequests++ })
    client.on('done', onDone)
    clients.push(client)

    // we will miss the initial request emits because the client emits request on construction
    totalRequests += url.pipelining < url.rate ? url.rate : url.pipelining
  }

  function distributeNums (x, i) {
    return (Math.floor(x / opts.connections) + (((i + 1) <= (x % opts.connections)) ? 1 : 0))
  }

  function onResponse (statusCode, resBytes, responseTime) {
    tracker.emit('response', this, statusCode, resBytes, responseTime)
    const codeIndex = Math.floor(parseInt(statusCode) / 100) - 1
    statusCodes[codeIndex] += 1
    // only record 2xx latencies
    if (codeIndex === 1) latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError')
    errors++
    if (opts.bailout && errors >= opts.bailout) tracker.stop()
  }

  // treat a timeout as a special type of error
  function onTimeout () {
    for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError')
    errors++
    timeouts++
    if (opts.bailout && errors >= opts.bailout) tracker.stop()
  }

  function onDone () {
    if (!--numRunning) {
      tracker.stop()
    }
  }

  if (!amount) {
    var stopTimer = setTimeout(() => {
      stop = true
    }, opts.duration * 1000)
  }

  tracker.stop = () => {
    if (stopTimer) clearTimeout(stopTimer)
    stop = true
  }

  const interval = setInterval(() => {
    totalBytes += bytes
    totalCompletedRequests += counter
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
        url: opts.url,
        requests: histAsObj(requests, totalCompletedRequests),
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
      result.requests.sent = totalRequests
      statusCodes.forEach((code, index) => { result[(index + 1) + 'xx'] = code })
      tracker.emit('done', result)

      cb(null, result)
    }
  }, 1000)

  // will return true if error with opts entered
  function checkOptsForErrors () {
    if (!opts.url) {
      cb(new Error('url option required'))
      return true
    }

    if (typeof opts.duration !== 'number') {
      if (/[a-zA-Z]/.exec(opts.duration)) opts.duration = timestring(opts.duration)
      else opts.duration = Number(opts.duration.trim())
    }

    if (typeof opts.duration === 'number') {
      if (lessThanZeroError(opts.duration, 'duration')) return true
    } else {
      cb(new Error('duration entered was in an invalid format'))
      return true
    }

    if (lessThanOneError(opts.connections, 'connections')) return true
    if (lessThanOneError(opts.pipelining, 'pipelining factor')) return true
    if (greaterThanZeroError(opts.timeout, 'timeout')) return true
    if (opts.bailout && lessThanOneError(opts.bailout, 'bailout threshold')) return true
    if (opts.connectionRate && lessThanOneError(opts.connectionRate, 'connectionRate')) return true
    if (opts.overallRate && lessThanOneError(opts.overallRate, 'bailout overallRate')) return true
    if (opts.amount && lessThanOneError(opts.amount, 'amount')) return true
    if (opts.maxConnectionRequests && lessThanOneError(opts.maxConnectionRequests, 'maxConnectionRequests')) return true
    if (opts.maxOverallRequests && lessThanOneError(opts.maxOverallRequests, 'maxOverallRequests')) return true

    function lessThanZeroError (x, label) {
      if (x < 0) {
        cb(new Error(`${label} can not be less than 0`))
        return true
      }
      return false
    }

    function lessThanOneError (x, label) {
      if (x < 1) {
        cb(new Error(`${label} can not be less than 1`))
        return true
      }
      return false
    }

    function greaterThanZeroError (x, label) {
      if (x <= 0) {
        cb(new Error(`${label} must be greater than 0`))
        return true
      }
      return false
    }

    return false
  } // checkOptsForErrors

  return tracker
} // run

function noop () {}

module.exports = run
