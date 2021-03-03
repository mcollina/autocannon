'use strict'

const test = require('tap').test
const PipelinedRequestsQueue = require('../lib/pipelinedRequestsQueue')

test('PipelinedRequestsQueue measures time precisely', (t) => {
  t.plan(2)

  const delay = 42
  const queue = new PipelinedRequestsQueue()

  const start = Date.now()
  queue.insertRequest()
  setTimeout(() => {
    const data = queue.terminateRequest()
    // Measure the duration with the imprecise Date.now()  as opposed to hrtime
    // An extra millisecond is added just in case there is soem rounding error between hrtime and Date.now()
    const measuredDuration = Date.now() - start + 1
    t.ok(data.duration > delay, `Calculated duration ${data.duration} should not be less than the induced delay ${delay}`)
    console.log(delay, data.duration, measuredDuration)
    t.ok(data.duration <= measuredDuration, `Calculated duration ${data.duration} should be less than the measured time ${measuredDuration}`)
  }, delay)
})

test('PipelinedRequestsQueue is a queue/FIFO', (t) => {
  const COUNT = 3
  t.plan(COUNT)

  const queue = new PipelinedRequestsQueue()

  let count = COUNT
  while (count > 0) {
    queue.insertRequest(count--)
  }

  count = COUNT
  while (count > 0) {
    t.equal(queue.terminateRequest().req, count--)
  }
})

test('PipelinedRequestsQueue.clear() empties the queue', (t) => {
  t.plan(5)

  const queue = new PipelinedRequestsQueue()
  t.equal(queue.size(), 0)
  t.equal(queue.toArray().length, 0)
  queue.insertRequest()
  queue.insertRequest()
  queue.insertRequest()
  t.equal(queue.size(), 3)
  t.equal(queue.toArray().length, 3)
  queue.clear()
  t.equal(queue.terminateRequest(), undefined)
})

test('PipelinedRequestsQueue methods set values to the request in first-in-last-out order', (t) => {
  t.plan(6)

  const queue = new PipelinedRequestsQueue()
  queue.insertRequest(1)
  queue.insertRequest(2)

  queue.addBody('1')
  queue.addByteCount(1)
  queue.setHeaders({ val: '1' })

  const req1 = queue.terminateRequest()
  t.equal(req1.req, 1)
  t.equal(req1.body, '1')
  t.deepEqual(req1.headers, { val: '1' })

  queue.addBody('2')
  queue.addByteCount(2)
  queue.setHeaders({ val: '2' })

  const req2 = queue.terminateRequest()
  t.equal(req2.req, 2)
  t.equal(req2.body, '2')
  t.deepEqual(req2.headers, { val: '2' })
})
