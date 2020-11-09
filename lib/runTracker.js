'use strict'

const EE = require('events').EventEmitter
const run = require('./run')
const noop = require('./noop')

function runTracker (opts, cb, tracker) {
  cb = cb || noop
  tracker = tracker || new EE()

  run(opts, cb, tracker)

  process.once('SIGINT', () => {
    tracker.stop()
  })

  return tracker
}

module.exports = runTracker
