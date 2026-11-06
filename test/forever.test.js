'use strict'

const { test } = require('node:test')
const initJob = require('../lib/init')
const helper = require('./helper')
const server = helper.startServer()

test('running with forever set to true and passing in a callback should cause an error to be returned in the callback', (t, done) => {
  t.plan(2)

  initJob({
    url: `http://localhost:${server.address().port}`,
    forever: true
  }, (err, res) => {
    t.assert.ok(err, 'should be error when callback passed to run')
    t.assert.ok(!res, 'should not exist')
    done()
  })
})

test('run forever should run until .stop() is called', (t, done) => {
  t.plan(3)
  let numRuns = 0

  const instance = initJob({
    url: `http://localhost:${server.address().port}`,
    duration: 0.5,
    forever: true
  })

  instance.on('done', (results) => {
    t.assert.ok(results, 'should have gotten results')
    if (++numRuns === 2) {
      instance.stop()
      setTimeout(() => {
        t.assert.ok(true, 'should have reached here without the callback being called again')
        done()
      }, 1000)
    }
  })
})
