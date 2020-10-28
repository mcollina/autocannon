'use strict'

const path = require('path')
var Spinner = require('cli-spinner').Spinner
const { Worker } = require('./worker_threads')

function initWorkers (opts, cb) {
  const workers = []
  const results = []
  const numWorkers = +opts.workers
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
      const { cmd, result } = msg

      if (cmd === 'RESULT') {
        results.push(result)

        if (results.length === workers.length) {
          hideSpinner()
          cb(null, results)
        }
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
