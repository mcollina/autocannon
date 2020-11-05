'use strict'

let workerThreads = {}

try {
  workerThreads = require('worker_threads')
} catch (err) {
  // we don't need the error but can't have catch block
  // without err as node 8 doesn't support that
  if (err) console.log(err)

  workerThreads = {
    isMainThread: true
  }
}

module.exports = workerThreads
