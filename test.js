'use strict'

const test = require('tap').test
const http = require('http')
const Client = require('./lib/myhttp')

const server = http.createServer(handle)

server.listen(0)

function handle (req, res) {
  res.end('hello world')
}

server.unref()

test('client calls a server twice', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})
