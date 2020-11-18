'use strict'

const EE = require('events').EventEmitter
const run = require('./run')
const noop = require('./noop')

function runTracker (opts, tracker, cb) {
  cb = cb || noop
  tracker = tracker || new EE()

  run(opts, tracker, cb)

  process.once('SIGINT', () => {
    tracker.stop()
  })

  return tracker
}

module.exports = runTracker
