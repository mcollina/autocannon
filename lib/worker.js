'use strict'

const { isMainThread, parentPort, workerData } = require('worker_threads')
const run = require('./run')

const createHist = (name) => ({
  __custom: true,
  recordValue: v => updateHist(name, v),
  destroy: () => {},
  reset: () => resetHist(name)
})

const updateHist = (name, value) => {
  parentPort.postMessage({
    cmd: 'UPDATE_HIST',
    data: { name, value }
  })
}

const resetHist = (name) => {
  parentPort.postMessage({
    cmd: 'RESET_HIST',
    data: { name }
  })
}

function runTracker (argv, ondone) {
  const tracker = run({
    ...argv,
    histograms: {
      requests: createHist('requests'),
      throughput: createHist('throughput')
    }
  })

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
      tracker = runTracker(opts, (data) => {
        parentPort.postMessage({ cmd: 'RESULT', data })
        parentPort.close()
      })
    } else if (cmd === 'STOP') {
      tracker.stop()
      parentPort.close()
    }
  })
}
