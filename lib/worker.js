'use strict'

const { isMainThread, parentPort, workerData } = require('worker_threads')
const track = require('./progressTracker')
const run = require('./run')

function runTracker (argv, ondone) {
  const tracker = run(argv)

  tracker.on('done', (result) => {
    if (ondone) ondone(result)
  })

  tracker.on('tick', (data) => {
    parentPort.postMessage({ cmd: 'TICK', data })
  })

  tracker.on('error', (err) => {
    if (err) {
      throw err
    }
  })

  return tracker
}

if (!isMainThread) {
  const { opts } = workerData
  let tracker

  parentPort.on('message', (msg) => {
    const { cmd } = msg

    if (cmd === 'START') {
      tracker = runTracker(opts, (result) => {
        parentPort.postMessage({ cmd: 'RESULT', result })
        parentPort.close()
      })
    } else if (cmd === 'STOP') {
      tracker.stop()
      parentPort.close()
    }
  })
}
