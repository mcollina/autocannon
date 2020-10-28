'use strict'

const EE = require('events').EventEmitter
const URL = require('url')
const hdr = require('hdr-histogram-js')
const timestring = require('timestring')
const reInterval = require('reinterval')
const Client = require('./httpClient')
const DefaultOptions = require('./defaultOptions')
const multipart = require('./multipart')
const { isMainThread } = require('./worker_threads')
const { ofURL, checkURL } = require('./url')
const { parseHAR } = require('./parseHAR')
const initWorkers = require('./manager')
const aggregateResult = require('./aggregateResult')
const printResult = require('./printResult')

function handleFinish (result, opts, cb) {
  if (cb) cb(null, result)
  if (opts.json) {
    console.log(JSON.stringify(result))
  }

  // the code below this `if` just renders the results table...
  // if the user doesn't want to render the table, we can just return early
  if (!isMainThread || opts.renderResultsTable === false) return

  printResult(result, opts)
}

function validateOpts (opts, cb) {
  if (opts.numWorkers) {
    if (opts.setupClient) {
      cb(new Error('Can not use setupClient option while using workers'))
      return
    }

    if (opts.requests && opts.requests.some(r => r.setupRequest || r.onResponse)) {
      cb(new Error('Can not use setupRequest/onResponse options while using workers'))
    }
  }

  return true
}

function run (opts, cb) {
  return _run(opts, cb)
}

function _run (opts, cb, tracker) {
  const cbPassedIn = (typeof cb === 'function')

  cb = cb || noop

  tracker = tracker || new EE()

  if (!cbPassedIn && !opts.forever) {
    const promise = new Promise((resolve, reject) => {
      _run(opts, function (err, results) {
        if (err) return reject(err)
        resolve(results)
      }, tracker)
    })
    tracker.then = promise.then.bind(promise)
    tracker.catch = promise.catch.bind(promise)
    return tracker
  }

  if (opts.numWorkers && isMainThread) {
    if (!validateOpts(opts, cb)) return

    return initWorkers(opts, (err, results) => {
      if (err) {
        console.log(err)
        process.exit(1)
      }

      const result = aggregateResult(results, opts)
      handleFinish(result, opts, cb)
    })
  }

  hdr.initWebAssemblySync()

  const latencies = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 10000,
    numberOfSignificantValueDigits: 5
  })

  const requests = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 1000000,
    numberOfSignificantValueDigits: 3
  })

  const throughput = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 100000000000,
    numberOfSignificantValueDigits: 3
  })

  const statusCodes = [
    0, // 1xx
    0, // 2xx
    0, // 3xx
    0, // 4xx
    0 // 5xx
  ]

  if (opts && opts.form) {
    opts.method = opts.method || 'POST'
  }
  opts = Object.assign({}, DefaultOptions, opts)

  // do error checking, if error, return
  if (checkOptsForErrors()) return tracker

  // set tracker.opts here, so throwing over invalid opts and setting defaults etc.
  // is done
  tracker.opts = opts

  if (opts.overallRate && (opts.overallRate < opts.connections)) opts.connections = opts.overallRate

  let counter = 0
  let bytes = 0
  let errors = 0
  let timeouts = 0
  let mismatches = 0
  let totalBytes = 0
  let totalRequests = 0
  let totalCompletedRequests = 0
  let resets = 0
  const amount = opts.amount
  let stop = false
  let restart = true
  let numRunning = opts.connections
  let startTime = Date.now()
  const includeErrorStats = !opts.excludeErrorStats
  let form

  if (opts.form) {
    try {
      form = multipart(opts.form)
    } catch (error) {
      errorCb(error)
      return tracker
    }
  }

  opts.url = ofURL(opts.url).map((url) => {
    if (url.indexOf('http') !== 0) return 'http://' + url
    return url
  })

  let harRequests = new Map()
  if (opts.har) {
    try {
      harRequests = parseHAR(opts.har)
    } catch (error) {
      errorCb(error)
      return tracker
    }
  }

  const urls = ofURL(opts.url, true).map(url => {
    if (url.indexOf('http') !== 0) url = 'http://' + url
    url = URL.parse(url) // eslint-disable-line node/no-deprecated-api

    // copy over fields so that the client
    // performs the right HTTP requests
    url.pipelining = opts.pipelining
    url.method = opts.method
    url.body = form ? form.getBuffer() : opts.body
    url.headers = form ? Object.assign({}, opts.headers, form.getHeaders()) : opts.headers
    url.setupClient = opts.setupClient
    url.timeout = opts.timeout
    url.origin = `${url.protocol}//${url.host}`
    // only keep requests for that origin, or default to requests from options
    url.requests = harRequests.get(url.origin) || opts.requests
    url.reconnectRate = opts.reconnectRate
    url.responseMax = amount || opts.maxConnectionRequests || opts.maxOverallRequests
    url.rate = opts.connectionRate || opts.overallRate
    url.idReplacement = opts.idReplacement
    url.socketPath = opts.socketPath
    url.servername = opts.servername
    url.expectBody = opts.expectBody

    return url
  })

  let clients = []
  initialiseClients(clients)

  if (!amount) {
    var stopTimer = setTimeout(() => {
      stop = true
    }, opts.duration * 1000)
  }

  tracker.stop = () => {
    stop = true
    restart = false
  }

  const interval = reInterval(tickInterval, 1000)

  // put the start emit in a setImmediate so trackers can be added, etc.
  setImmediate(() => { tracker.emit('start') })

  function tickInterval () {
    totalBytes += bytes
    totalCompletedRequests += counter
    requests.recordValue(counter)
    throughput.recordValue(bytes)
    tracker.emit('tick', { counter, bytes })
    counter = 0
    bytes = 0

    if (stop) {
      if (stopTimer) clearTimeout(stopTimer)
      interval.clear()
      clients.forEach((client) => client.destroy())
      const result = {
        latencies: hdr.encodeIntoCompressedBase64(latencies),
        requests: hdr.encodeIntoCompressedBase64(requests),
        throughput: hdr.encodeIntoCompressedBase64(throughput),
        totalCompletedRequests,
        totalRequests,
        totalBytes,
        errors: errors,
        timeouts: timeouts,
        mismatches: mismatches,
        non2xx: statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4],
        resets: resets,
        duration: Math.round((Date.now() - startTime) / 10) / 100,
        start: new Date(startTime),
        finish: new Date()
      }

      statusCodes.forEach((code, index) => { result[(index + 1) + 'xx'] = code })

      const resultObj = isMainThread ? aggregateResult(result, opts) : result

      tracker.emit('done', resultObj)

      if (!opts.forever) {
        latencies.destroy()
        requests.destroy()
        throughput.destroy()
        cb(null, resultObj)
      }

      // the restart function
      setImmediate(() => {
        if (opts.forever && restart) {
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
      tracker.emit('response', this, statusCode, resBytes, responseTime)
      const codeIndex = Math.floor(parseInt(statusCode) / 100) - 1
      statusCodes[codeIndex] += 1
      // only recordValue 2xx latencies
      if (codeIndex === 1 || includeErrorStats) {
        if (rate && !opts.ignoreCoordinatedOmission) {
          latencies.recordValueWithExpectedInterval(responseTime, Math.ceil(1 / rate))
        } else {
          latencies.recordValue(responseTime)
        }
      }
      if (codeIndex === 1 || includeErrorStats) bytes += resBytes
      counter++
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

  function errorCb (error) {
    if (cbPassedIn) {
      cb(error)
    } else {
      // wrapped in setImmediate so any error event handlers that are added to
      // the tracker can be added before being emitted
      setImmediate(() => { tracker.emit('error', error) })
    }
  }

  // will return true if error with opts entered
  function checkOptsForErrors () {
    if (!checkURL(opts.url) && !opts.socketPath) {
      errorCb(new Error('url or socketPath option required'))
      return true
    }

    if (typeof opts.duration === 'string') {
      if (/[a-zA-Z]/.exec(opts.duration)) opts.duration = timestring(opts.duration)
      else opts.duration = Number(opts.duration.trim())
    }

    if (typeof opts.duration === 'number') {
      if (lessThanZeroError(opts.duration, 'duration')) return true
    } else {
      errorCb(new Error('duration entered was in an invalid format'))
      return true
    }

    if (opts.expectBody && opts.requests !== DefaultOptions.requests) {
      errorCb(new Error('expectBody cannot be used in conjunction with requests'))
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

    if (opts.ignoreCoordinatedOmission && !opts.connectionRate && !opts.overallRate) {
      errorCb(new Error('ignoreCoordinatedOmission makes no sense without connectionRate or overallRate'))
      return true
    }

    if (opts.forever && cbPassedIn) {
      errorCb(new Error('should not use the callback parameter when the `forever` option is set to true. Use the `done` event on this event emitter'))
      return true
    }

    function lessThanZeroError (x, label) {
      if (x < 0) {
        errorCb(new Error(`${label} can not be less than 0`))
        return true
      }
      return false
    }

    function lessThanOneError (x, label) {
      if (x < 1) {
        errorCb(new Error(`${label} can not be less than 1`))
        return true
      }
      return false
    }

    function greaterThanZeroError (x, label) {
      if (x <= 0) {
        errorCb(new Error(`${label} must be greater than 0`))
        return true
      }
      return false
    }

    return false
  } // checkOptsForErrors

  return tracker
} // run

/* istanbul ignore next */
function noop () {}

module.exports = run
