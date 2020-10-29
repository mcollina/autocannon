'use strict'

const path = require('path')
const aggregateResult = require('./aggregateResult')
const { getHistograms } = require('./histUtil')
var Spinner = require('cli-spinner').Spinner
const { Worker } = require('./worker_threads')

function initWorkers (opts, cb) {
  const workers = []
  const results = []
  const numWorkers = +opts.workers
  const histograms = getHistograms()
  const histData = {
    requests: [],
    throughput: []
  }
  let spinner

  function showSpinner () {
    spinner = new Spinner('running... %s')
    spinner.setSpinnerString('|/-\\')
    spinner.start()
  }

  function hideSpinner () {
    if (spinner) {
      spinner.stop(true)
      spinner = null
    }
  }

  function startAll () {
    logToStream(`Running ${opts.duration}s test @ ${opts.url}\n${opts.connections} connections\n${numWorkers} workers\n`)
    if (process.stderr.isTTY) showSpinner()

    for (const w of workers) {
      w.postMessage({ cmd: 'START' })
    }
  }

  function handleFinish () {
    hideSpinner()
    const result = aggregateResult(results, opts, histograms)
    cb(null, result)
  }

  function stopAll () {
    hideSpinner()

    for (const w of workers) {
      w.postMessage({ cmd: 'STOP' })
    }
  }

  function logToStream (msg) {
    process.stderr.write(msg + '\n')
  }

  const workerOpts = {
    ...opts,
    amount: Math.max(Math.floor(opts.amount / numWorkers), 1),
    connections: Math.max(Math.floor(opts.connections / numWorkers), 1)
  }
  workerOpts.a = workerOpts.amount
  workerOpts.c = workerOpts.connections

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker(path.resolve(__dirname, './worker.js'), { workerData: { opts: workerOpts } })

    worker.on('message', (msg) => {
      const { cmd, data } = msg

      if (cmd === 'RESULT') {
        results.push(data)

        if (results.length === workers.length) {
          handleFinish()
        }
      } else if (cmd === 'UPDATE_HIST') {
        const { name, value } = data
        histData[name].push(value)

        if (histData[name].length === workers.length) {
          const total = histData[name].reduce((acc, v) => acc + v, 0)
          histData[name].length = 0
          histograms[name].recordValue(total)
        }
      } else if (cmd === 'RESET_HIST') {
        const { name } = data
        histograms[name].reset()
      }
    })

    worker.on('error', (err) => {
      console.log('Worker error:', err)
      stopAll()
      cb(err)
    })

    workers.push(worker)
  }

  startAll()

  return {
    stop: () => stopAll()
  }
}

module.exports = initWorkers
