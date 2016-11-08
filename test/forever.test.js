'use strict'

const test = require('tap').test
const run = require('../lib/run')
const helper = require('./helper')
const server = helper.startServer()

test('run forever should run until .stop() is called', (t) => {
  t.plan(5)
  let numRuns = 0

  let instance = run({
    url: `http://localhost:${server.address().port}`,
    duration: 0.5,
    forever: true
  }, (err, res) => {
    t.error(err)
    t.equal(res.duration, 1, 'should have take 1 seconds to run')
    numRuns++
    if (numRuns === 2) {
      instance.stop()
      setTimeout(() => {
        t.ok(true, 'should have reached here without the callback being called again')
        t.end()
      }, 1000)
    }
  })
})
