'use strict'

const ProgressBar = require('progress')
const Table = require('cli-table3')
const Chalk = require('chalk')
const testColorSupport = require('color-support')
const prettyBytes = require('pretty-bytes')
const format = require('./format')
const percentiles = require('hdr-histogram-percentiles-obj').percentiles
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

  const chalk = new Chalk.constructor({ enabled: testColorSupport({ stream: opts.outputStream }) })
  // this default needs to be set after chalk is setup, because chalk is now local to this func
  opts.progressBarString = opts.progressBarString || `${chalk.green('running')} [:bar] :percent`

  const iOpts = instance.opts
  let durationProgressBar
  let amountProgressBar
  let addedListeners = false

  instance.on('start', () => {
    if (opts.renderProgressBar) {
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

  instance.on('done', (result) => {
    // the code below this `if` just renders the results table...
    // if the user doesn't want to render the table, we can just return early
    if (!opts.renderResultsTable) return

    const shortLatency = new Table({
      head: asColor(chalk.cyan, ['Stat', '2.5%', '50%', '97.5%', '99%', 'Avg', 'Stdev', 'Max'])
    })
    shortLatency.push(asLowRow(chalk.bold('Latency'), asMs(result.latency)))
    logToStream(shortLatency.toString())

    const requests = new Table({
      head: asColor(chalk.cyan, ['Stat', '1%', '2.5%', '50%', '97.5%', 'Avg', 'Stdev', 'Min'])
    })

    requests.push(asHighRow(chalk.bold('Req/Sec'), result.requests))
    requests.push(asHighRow(chalk.bold('Bytes/Sec'), asBytes(result.throughput)))
    logToStream(requests.toString())
    logToStream('')
    logToStream('Req/Bytes counts sampled once per second.\n')

    if (opts.renderLatencyTable) {
      const latencies = new Table({
        head: asColor(chalk.cyan, ['Percentile', 'Latency (ms)'])
      })
      percentiles.map((perc) => {
        const key = `p${perc}`.replace('.', '_')
        return [
          chalk.bold('' + perc),
          result.latency[key]
        ]
      }).forEach(row => {
        latencies.push(row)
      })
      logToStream(latencies.toString())
      logToStream('')
    }

    if (result.non2xx) {
      logToStream(`${result['2xx']} 2xx responses, ${result.non2xx} non 2xx responses`)
    }
    logToStream(`${format(result.requests.total)} requests in ${result.duration}s, ${prettyBytes(result.throughput.total)} read`)
    if (result.errors) {
      logToStream(`${format(result.errors)} errors (${format(result.timeouts)} timeouts)`)
    }
  })

  function logToStream (msg) {
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

// create a table row for stats where low values is better
function asLowRow (name, stat) {
  return [
    name,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.p99,
    stat.average,
    stat.stddev,
    typeof stat.max === 'string' ? stat.max : Math.floor(stat.max * 100) / 100
  ]
}

// create a table row for stats where high values is better
function asHighRow (name, stat) {
  return [
    name,
    stat.p1,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.average,
    stat.stddev,
    typeof stat.min === 'string' ? stat.min : Math.floor(stat.min * 100) / 100
  ]
}

function asColor (colorise, row) {
  return row.map((entry) => colorise(entry))
}

function asMs (stat) {
  const result = Object.create(null)
  Object.keys(stat).forEach((k) => {
    result[k] = `${stat[k]} ms`
  })
  result.max = typeof stat.max === 'string' ? stat.max : `${Math.floor(stat.max * 100) / 100} ms`

  return result
}

function asBytes (stat) {
  const result = Object.create(stat)

  percentiles.forEach((p) => {
    const key = `p${p}`.replace('.', '_')
    result[key] = prettyBytes(stat[key])
  })

  result.average = prettyBytes(stat.average)
  result.stddev = prettyBytes(stat.stddev)
  result.max = prettyBytes(stat.max)
  result.min = prettyBytes(stat.min)
  return result
}

module.exports = track
