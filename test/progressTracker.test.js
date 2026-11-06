'use strict'

const helper = require('./helper')
const { test } = require('node:test')
const { defaultMaxListeners } = require('events')
const { Writable } = require('stream')
const autocannon = require('../autocannon')
const { hasWorkerSupport } = require('../lib/util')

test(`should not emit warnings when using >= ${defaultMaxListeners} workers`, { skip: !hasWorkerSupport }, (t, done) => {
  const server = helper.startServer()

  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    workers: defaultMaxListeners,
    duration: 1
  })

  setTimeout(() => {
    instance.stop()
    t.assert.strictEqual(emitWarningSpy.mock.callCount(), 0)
    done()
  }, 2000)

  const emitWarningSpy = t.mock.method(process, 'emitWarning')

  autocannon.track(instance, {
    outputStream: new Writable({
      write () {}
    })
  })
})
