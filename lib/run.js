'use strict'
// TODO:
// Parse StatusCode
// StatusCode numbers is not reliable
// Check the other values


const URL = require('url')
const reInterval = require('reinterval')
const EE = require('events').EventEmitter
const Client = require('./httpClient')
const { isMainThread } = require('./worker_threads')
const { ofURL } = require('./url')
const aggregateResult = require('./aggregateResult')
const { getHistograms, encodeHist } = require('./histUtil')

const defaults = {
  harRequests: new Map()
}

function run (opts, tracker, cb) {
  opts = Object.assign({}, defaults, opts)
  tracker = tracker || new EE()

  const requestHistograms = opts.requests.map((req) => {
    return {
      [req.title]: {
        title: req.title,
        ...getHistograms(opts.getHistograms),
        statusCodes: [
          0, // 1xx
          0, // 2xx
          0, // 3xx
          0, // 4xx
          0 // 5xx
        ],
        bytes: 0,
        counter: 0,
      },
    }
  }).reduce((prev, curr) => ({ ...prev, ...curr }), {})

  if (opts.overallRate && (opts.overallRate < opts.connections)) opts.connections = opts.overallRate

  let errors = 0
  let timeouts = 0
  let totalBytes = 0
  let totalRequests = 0
  let totalCompletedRequests = 0
  let mismatches = 0
  let resets = 0
  const amount = opts.amount
  let stop = false
  let restart = true
  let numRunning = opts.connections
  let startTime = Date.now()
  const includeErrorStats = !opts.excludeErrorStats

  opts.url = ofURL(opts.url).map((url) => {
    if (url.indexOf('http') !== 0) return 'http://' + url
    return url
  })

  const urls = ofURL(opts.url, true).map(url => {
    if (url.indexOf('http') !== 0) url = 'http://' + url
    url = URL.parse(url) // eslint-disable-line node/no-deprecated-api

    // copy over fields so that the client
    // performs the right HTTP requests
    url.pipelining = opts.pipelining
    url.method = opts.method
    url.body = opts.form ? opts.form.getBuffer() : opts.body
    url.headers = opts.form ? Object.assign({}, opts.headers, opts.form.getHeaders()) : opts.headers
    url.setupClient = opts.setupClient
    url.timeout = opts.timeout
    url.origin = `${url.protocol}//${url.host}`
    // only keep requests for that origin, or default to requests from options
    url.requests = opts.harRequests.get(url.origin) || opts.requests
    url.reconnectRate = opts.reconnectRate
    url.responseMax = amount || opts.maxConnectionRequests || opts.maxOverallRequests
    url.rate = opts.connectionRate || opts.overallRate
    url.idReplacement = opts.idReplacement
    url.socketPath = opts.socketPath
    url.servername = opts.servername
    url.expectBody = opts.expectBody

    return url
  })

  let stopTimer
  let clients = []
  initialiseClients(clients)

  if (!amount) {
    stopTimer = setTimeout(() => {
      stop = true
    }, opts.duration * 1000)
  }

  const interval = reInterval(tickInterval, 1000)

  // put the start emit in a setImmediate so trackers can be added, etc.
  setImmediate(() => { tracker.emit('start') })

  function tickInterval () {
    Object.values(requestHistograms).forEach((req, idx) => {
      totalBytes += req.bytes
      totalCompletedRequests += req.counter

      req.requests.recordValue(req.counter)
      req.throughput.recordValue(req.bytes)
      tracker.emit('tick', { requestIndex: idx, counter: req.counter, bytes: req.bytes })

      req.bytes = 0
      req.counter = 0
    })

    if (stop) {
      if (stopTimer) clearTimeout(stopTimer)
      interval.clear()
      clients.forEach((client) => client.destroy())
      const result = {
        requests: Object.values(requestHistograms).map((req) => {
          return {
            ...req,
            latencies: encodeHist(req.latencies),
            requests: encodeHist(req.requests),
            throughput: encodeHist(req.throughput),
          }
        }),
        totalCompletedRequests,
        totalRequests,
        totalBytes,
        errors: errors,
        timeouts: timeouts,
        mismatches: mismatches,
        non2xx: 0,
        resets: resets,
        duration: Math.round((Date.now() - startTime) / 10) / 100,
        start: new Date(startTime),
        finish: new Date()
      }

      Object.values(requestHistograms).forEach((req, reqIdx) => {
        result.requests[reqIdx].status = {}

        req.statusCodes.forEach((code, index) => {
          if (index !== 1 /* 2xx */) {
            result.non2xx += code
          }
          result[(index + 1) + 'xx'] = (result[(index + 1) + 'xx'] || 0) + code
          result.requests[reqIdx].status[(index + 1) + 'xx'] = code
        })

        delete result.requests[reqIdx].statusCodes
        delete result.requests[reqIdx].bytes
        delete result.requests[reqIdx].counter
      })

      const resultObj = isMainThread ? aggregateResult(result, opts, requestHistograms) : result

      if (opts.forever) {
        // we don't call callback when in forever mode, so this is the
        // only place we could notify user when each round finishes
        tracker.emit('done', resultObj)
      } else {
        Object.values(requestHistograms).forEach(r => {
          r.latencies.destroy()
          r.requests.destroy()
          r.throughput.destroy()
        })
        cb(null, resultObj)
      }

      const restartFn = () => {
        stop = false
        stopTimer = setTimeout(() => {
          stop = true
        }, opts.duration * 1000)
        errors = 0
        timeouts = 0
        mismatches = 0
        totalBytes = 0
        totalRequests = 0
        totalCompletedRequests = 0
        resets = 0
        statusCodes.fill(0)
        requests.reset()
        latencies.reset()
        throughput.reset()
        startTime = Date.now()

        // reinitialise clients
        if (opts.overallRate && (opts.overallRate < opts.connections)) opts.connections = opts.overallRate
        clients = []
        initialiseClients(clients)

        interval.reschedule(1000)
        tracker.emit('start')
      }

      // the restart function
      setImmediate(() => {
        if (opts.forever && restart && isMainThread) restartFn()
      })
    }
  }

  function initialiseClients (clients) {
    for (let i = 0; i < opts.connections; i++) {
      const url = urls[i % urls.length]
      if (!amount && !opts.maxConnectionRequests && opts.maxOverallRequests) {
        url.responseMax = distributeNums(opts.maxOverallRequests, i)
      }
      if (amount) {
        url.responseMax = distributeNums(amount, i)
        if (url.responseMax === 0) {
          throw Error('connections cannot be greater than amount')
        }
      }
      if (!opts.connectionRate && opts.overallRate) {
        url.rate = distributeNums(opts.overallRate, i)
      }
      if (opts.initialContext) {
        url.initialContext = opts.initialContext
      }

      if (opts.tlsOptions) {
        url.tlsOptions = opts.tlsOptions
      }

      const client = new Client(url)
      client.on('response', onResponse)
      client.on('connError', onError)
      client.on('mismatch', onExpectMismatch)
      client.on('reset', () => { resets++ })
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

    function onResponse (statusCode, resBytes, responseTime, rate) {
      tracker.emit('response', this, statusCode, resBytes, responseTime, this.requestIterator.currentRequest)
      const codeIndex = Math.floor(parseInt(statusCode) / 100) - 1
      requestHistograms[this.requestIterator.currentRequest.title].statusCodes[codeIndex] += 1
      // only recordValue 2xx latencies
      if (codeIndex === 1 || includeErrorStats) {
        if (rate && !opts.ignoreCoordinatedOmission) {
          requestHistograms[this.requestIterator.currentRequest.title].latencies.recordValueWithExpectedInterval(responseTime, Math.ceil(1 / rate))
        } else {
          requestHistograms[this.requestIterator.currentRequest.title].latencies.recordValue(responseTime)
        }
      }
      if (codeIndex === 1 || includeErrorStats) {
        requestHistograms[this.requestIterator.currentRequest.title].bytes += resBytes
      }
      requestHistograms[this.requestIterator.currentRequest.title].counter++
    }

    function onError (error) {
      for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError', error)
      errors++
      if (opts.debug) console.error(error)
      if (opts.bailout && errors >= opts.bailout) stop = true
    }

    function onExpectMismatch (bpdyStr) {
      for (let i = 0; i < opts.pipelining; i++) {
        tracker.emit('reqMismatch', bpdyStr)
      }

      mismatches++
      if (opts.bailout && mismatches >= opts.bailout) stop = true
    }

    // treat a timeout as a special type of error
    function onTimeout () {
      const error = new Error('request timed out')
      for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError', error)
      errors++
      timeouts++
      if (opts.bailout && errors >= opts.bailout) stop = true
    }

    function onDone () {
      if (!--numRunning) stop = true
    }
  }

  tracker.stop = () => {
    stop = true
    restart = false
  }

  return tracker
} // run

module.exports = run
