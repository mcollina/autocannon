const { test } = require('node:test')
const initJob = require('../lib/init')
const helper = require('./helper')

const server1 = helper.startServer({ body: 'from server1' })
const server2 = helper.startServer({ body: 'from server2' })
const server3 = helper.startServer({ body: 'from server3' })

test('should receive the message from different server', (t) => {
  t.plan(3, { wait: true })

  const instance = initJob({
    url: [
      server1,
      server2,
      server3
    ].map(server => `http://localhost:${server.address().port}`),
    duration: 1,
    connections: 3
  })

  let receivedServer1 = false
  let receivedServer2 = false
  let receivedServer3 = false

  instance.on('response', (client) => {
    if (!receivedServer1 && client.parser.chunk.toString().includes('from server1')) {
      receivedServer1 = true
      t.assert.ok(true)
    }
    if (!receivedServer2 && client.parser.chunk.toString().includes('from server2')) {
      receivedServer2 = true
      t.assert.ok(true)
    }
    if (!receivedServer3 && client.parser.chunk.toString().includes('from server3')) {
      receivedServer3 = true
      t.assert.ok(true)
    }
  })
})
