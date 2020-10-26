const path = require('path')
const os = require('os')
const { Worker } = require('worker_threads')

const numWorkers = Math.max(Math.floor(os.cpus().length * 0.75), 1)

function initWorkers (opts, cb) {
  const workers = []
  const results = []

  function startAll () {
    workers.forEach(w => {
      w.postMessage({ cmd: 'START' })
    })
  }

  function stopAll () {
    workers.forEach(w => {
      w.postMessage({ cmd: 'STOP' })
    })
  }

  const workerOpts = {
    ...opts,
    amount: Math.floor(opts.amount / numWorkers),
    connections: Math.floor(opts.connections / numWorkers)
  }
  workerOpts.a = workerOpts.amount
  workerOpts.c = workerOpts.connections

  for (let i = 0; i < numWorkers; i++) {
    const w = new Worker(path.resolve(__dirname, './worker.js'), { workerData: { opts: workerOpts } })

    w.on('message', (msg) => {
      const { cmd, result } = msg

      if (cmd === 'RESULT') {
        results.push(result)

        if (results.length === workers.length) {
          cb(results)
        }
      }
    })

    w.on('error', () => {
      stopAll()
      process.exit(1)
    })

    workers.push(w)
  }

  startAll()
}

module.exports = initWorkers
