'use strict'

const { isMainThread, parentPort, workerData } = require('worker_threads')
const track = require('./progressTracker')
const run = require('./run')

function runTracker (argv, ondone) {
  const tracker = run(argv)

  tracker.on('done', (result) => {
    if (ondone) ondone(result)
  })

  tracker.on('error', (err) => {
    if (err) {
      throw err
    }
  })

  // if not rendering json, or if std isn't a tty, track progress
  if (!argv.json || !process.stdout.isTTY) track(tracker, argv)

  process.once('SIGINT', () => {
    tracker.stop()
  })
}

if (!isMainThread) {
  const { opts } = workerData

  parentPort.on('message', (msg) => {
    const { cmd } = msg

    if (cmd === 'START') {
      runTracker(opts, (result) => {
        parentPort.postMessage({ cmd: 'RESULT', result })
        parentPort.close()
      })
    }
  })
}
