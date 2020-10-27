/**
 * Prints out the test result details. It doesn't have not much business logic.
 * We skip test coverage for this file
 */
/* istanbul ignore file */
'use strict'

const ProgressBar = require('progress')
const Chalk = require('chalk')
const testColorSupport = require('color-support')
const { isMainThread } = require('./worker_threads')
const defaults = {
  // use stderr as its progressBar's default
  outputStream: process.stderr,
  renderProgressBar: true,
  renderResultsTable: true,
  renderLatencyTable: false
}

function track (instance, opts) {
  if (!instance) {
    throw new Error('instance required for tracking')
  }

  opts = Object.assign({}, defaults, opts)

  const chalk = new Chalk.Instance(testColorSupport({ stream: opts.outputStream, alwaysReturn: true }))
  // this default needs to be set after chalk is setup, because chalk is now local to this func
  opts.progressBarString = opts.progressBarString || `${chalk.green('running')} [:bar] :percent`

  const iOpts = instance.opts
  let durationProgressBar
  let amountProgressBar
  let addedListeners = false

  instance.on('start', () => {
    if (opts.renderProgressBar && isMainThread) {
      const socketPath = iOpts.socketPath ? ` (${iOpts.socketPath})` : ''
      let msg = `${iOpts.connections} connections`

      if (iOpts.pipelining > 1) {
        msg += ` with ${iOpts.pipelining} pipelining factor`
      }

      if (!iOpts.amount) {
        logToStream(`Running ${iOpts.duration}s test @ ${iOpts.url}${socketPath}\n${msg}\n`)

        durationProgressBar = trackDuration(instance, opts, iOpts)
      } else {
        logToStream(`Running ${iOpts.amount} requests test @ ${iOpts.url}${socketPath}\n${msg}\n`)

        amountProgressBar = trackAmount(instance, opts, iOpts)
      }

      addListener()
    }
  })

  function addListener () {
    // add listeners for progress bar to instance here so they aren't
    // added on restarting, causing listener leaks
    if (addedListeners) {
      return
    }

    addedListeners = true
    // note: Attempted to curry the functions below, but that breaks the functionality
    // as they use the scope/closure of the progress bar variables to allow them to be reset
    if (opts.outputStream.isTTY) {
      if (!iOpts.amount) { // duration progress bar
        instance.on('tick', () => { durationProgressBar.tick() })
        instance.on('done', () => { durationProgressBar.tick(iOpts.duration - 1) })
        process.once('SIGINT', () => { durationProgressBar.tick(iOpts.duration - 1) })
      } else { // amount progress bar
        instance.on('response', () => { amountProgressBar.tick() })
        instance.on('reqError', () => { amountProgressBar.tick() })
        instance.on('done', () => { amountProgressBar.tick(iOpts.amount - 1) })
        process.once('SIGINT', () => { amountProgressBar.tick(iOpts.amount - 1) })
      }
    }
  }

  function logToStream (msg) {
    if (!isMainThread) return

    opts.outputStream.write(msg + '\n')
  }
}

function trackDuration (instance, opts, iOpts) {
  // if switch needed needed to avoid
  // https://github.com/mcollina/autocannon/issues/60
  if (!opts.outputStream.isTTY) return

  const progressBar = new ProgressBar(opts.progressBarString, {
    width: 20,
    incomplete: ' ',
    total: iOpts.duration,
    clear: true,
    stream: opts.outputStream
  })

  progressBar.tick(0)
  return progressBar
}

function trackAmount (instance, opts, iOpts) {
  // if switch needed needed to avoid
  // https://github.com/mcollina/autocannon/issues/60
  if (!opts.outputStream.isTTY) return

  const progressBar = new ProgressBar(opts.progressBarString, {
    width: 20,
    incomplete: ' ',
    total: iOpts.amount,
    clear: true,
    stream: opts.outputStream
  })

  progressBar.tick(0)
  return progressBar
}

module.exports = track
