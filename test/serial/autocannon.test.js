'use strict'

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const { test } = require('node:test')

const { promisify } = require('util')

const exec = promisify(childProcess.exec).bind(childProcess)
const proxyquire = require('proxyquire')

const baseDir = path.join(__dirname, '..', '..')

test('should print error if url.URL is not a function', (t, done) => {
  t.plan(2)

  const _error = console.error
  const _exit = process.exit

  process.exit = (code) => {
    t.assert.strictEqual(code, 1)
    process.exit = _exit
    done()
  }
  console.error = (obj) => {
    t.assert.strictEqual(
      obj,
      'autocannon requires the WHATWG URL API, but it is not available. Please upgrade to Node 6.13+.'
    )
    console.error = _error
  }
  proxyquire('../..', {
    url: {
      URL: null
    }
  })
})

test('should print version if invoked with --version', async t => {
  t.plan(1, { wait: true })
  const res = await exec(`node ${baseDir}/autocannon.js --version`)
  t.assert.ok(res.stdout.match(/autocannon v(\d+\.\d+\.\d+)/))
})

test('should print help if invoked with --help', async t => {
  t.plan(1, { wait: true })
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js --help`)
  t.assert.deepStrictEqual(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})

test('should print help if no url is provided', async t => {
  t.plan(1, { wait: true })
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js`)
  t.assert.deepStrictEqual(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})

test('start should console an error when a promise is caught', (t) => {
  const Autocannon = proxyquire('../../autocannon', {
    './lib/init': () => new Promise((resolve, reject) => {
      reject(new Error('Test Error'))
    })
  })

  t.plan(1, { wait: true })

  const _error = console.error
  console.error = (obj) => {
    t.assert.strictEqual(
      obj,
      'Test Error'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      'http://localhost/foo/bar'
    ])
  )
})

test('start should console an error when one is thrown without a promise', (t) => {
  const Autocannon = proxyquire('../../autocannon', {
    './lib/init': () => { throw new Error('Test Error') }
  })

  t.plan(1, { wait: true })

  const _error = console.error
  console.error = (obj) => {
    t.assert.strictEqual(
      obj,
      'Test Error'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--forever',
      'http://localhost/foo/bar'
    ])
  )
})

test('start should console an error when --on-port is used without async hooks', (t, done) => {
  const Autocannon = proxyquire('../../autocannon', {
    'has-async-hooks': () => false,
    child_process: {
      spawn: () => {}
    },
    './lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: () => {}
      })
    }
  })

  t.plan(2)

  const _exit = process.exit
  process.exit = (code) => {
    t.assert.strictEqual(code, 1)
    process.exit = _exit
    done()
  }
  const _error = console.error
  console.error = (obj) => {
    t.assert.strictEqual(
      obj,
      'The --on-port flag requires the async_hooks builtin module, but it is not available. Please upgrade to Node 8.1+.'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})

test('When there is a port, createChannel should try to unlink the socketPath', (t) => {
  const Autocannon = proxyquire('../../autocannon', {
    'has-async-hooks': () => true,
    child_process: {
      spawn: () => {}
    },
    './lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: (eventName, cb) => {
          t.assert.strictEqual(eventName, 'close')
          cb()
        }
      })
    }
  })

  t.plan(1, { wait: true })

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})

test('createChannel should try to unlink the socketPath', (t) => {
  const Autocannon = proxyquire('../../autocannon', {
    'has-async-hooks': () => true,
    child_process: {
      spawn: () => {}
    },
    './lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: (_, cb) => {
          t.assert.strictEqual(_, 'close')
          cb()
        }
      })
    }
  })

  t.plan(1, { wait: true })

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})
