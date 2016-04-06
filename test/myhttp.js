'use strict'

const test = require('tap').test
const Client = require('../lib/myhttp')
const server = require('./helper').startServer()
const bl = require('bl')

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

test('myhttp client automatically reconnects', (t) => {
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

  server.once('request', function (req, res) {
    setImmediate(() => {
      req.socket.destroy()
    })
  })
})

test('client supports custom headers', (t) => {
  t.plan(3)

  const opts = server.address()
  opts.headers = {
    hello: 'world'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.hello, 'world', 'custom header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

;[
  'DELETE',
  'POST',
  'PUT'
].forEach((method) => {
  test(`client supports ${method}`, (t) => {
    t.plan(3)

    const opts = server.address()
    opts.method = method

    const client = new Client(opts)

    server.once('request', (req, res) => {
      t.equal(req.method, method, 'custom method matches')
    })

    client.on('response', (statusCode, length) => {
      t.equal(statusCode, 200, 'status code matches')
      t.ok(length > 'hello world'.length, 'length includes the headers')
      client.destroy()
    })
  })
})

test('client does not supports HEAD', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'HEAD'

  t.throws(() => new Client(opts))
})

test('client supports sending a body', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = new Buffer('hello world')

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.deepEqual(body.toString(), opts.body.toString(), 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})
