const path = require('path')
const os = require('os')
var Spinner = require('cli-spinner').Spinner
const { Worker } = require('./worker_threads')

const spinner = new Spinner('running... %s')
spinner.setSpinnerString('|/-\\')

const numWorkers = Math.max(Math.floor(os.cpus().length * 0.75), 1)

function initWorkers (opts, cb) {
  const workers = []
  const results = []

  function startAll () {
    logToStream(`Running ${opts.duration}s test @ ${opts.url}\n${opts.connections} connections\n`)
    spinner.start()

    workers.forEach(w => {
      w.postMessage({ cmd: 'START' })
    })
  }

  function stopAll () {
    spinner.stop(true)

    workers.forEach(w => {
      w.postMessage({ cmd: 'STOP' })
    })
  }

  function logToStream (msg) {
    process.stderr.write(msg + '\n')
  }

  const workerOpts = {
    ...opts,
    amount: Math.floor(opts.amount / numWorkers),
    connections: Math.floor(opts.connections / numWorkers)
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
          spinner.stop(true)
          cb(results)
        }
      }
    })

    worker.on('error', (err) => {
      console.log('Worker error:', err)
      stopAll()
      process.exit(1)
    })

    workers.push(worker)
  }

  startAll()

  return {
    stop: () => stopAll()
  }
}

module.exports = initWorkers
