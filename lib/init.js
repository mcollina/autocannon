const EE = require('events').EventEmitter
const { isMainThread } = require('./worker_threads')

const initWorkers = require('./manager')
const validateOpts = require('./validate')
const noop = require('./noop')
const runTracker = require('./runTracker')
const track = require('./progressTracker')

function init (opts, cb) {
  return _init(opts, cb)
}

function _init (opts, cb, tracker) {
  const cbPassedIn = (typeof cb === 'function')
  cb = cb || noop

  tracker = tracker || new EE()

  if (!cbPassedIn && !opts.forever) {
    const promise = new Promise((resolve, reject) => {
      _init(opts, (err, results) => {
        if (err) return reject(err)
        resolve(results)
      }, tracker)
    })
    tracker.then = promise.then.bind(promise)
    tracker.catch = promise.catch.bind(promise)
    return tracker
  }

  opts = validateOpts(opts, cbPassedIn)

  function _cb (err, result) {
    if (err) {
      return cbPassedIn ? cb(err) : setImmediate(() => tracker.emit('error', err))
    }

    setImmediate(() => tracker.emit('done', result))
    cb(null, result)

    if (!err && opts.json) {
      console.log(JSON.stringify(result))
    }
  }

  if (opts instanceof Error) {
    _cb(opts)
    return tracker
  }

  tracker.opts = opts

  if (opts.workers && isMainThread) {
    initWorkers(opts, (err, result) => {
      if (err) {
        console.log(err)
        process.exit(1)
      }

      _cb(err, result)
    }, tracker)
  } else {
    runTracker(opts, _cb, tracker)
  }

  // if not running via command-line and
  // not rendering json, or if std isn't a tty, track progress
  if (opts[Symbol.for('internal')] && (!opts.json || !process.stdout.isTTY)) track(tracker, opts)

  return tracker
}

module.exports = init
