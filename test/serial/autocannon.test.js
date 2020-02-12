'use strict'

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const test = require('tap').test

const { promisify } = require('util')

const exec = promisify(childProcess.exec).bind(childProcess)
const proxyquire = require('proxyquire')

const baseDir = path.join(__dirname, '..', '..')

test('should print error if url.URL is not a function', t => {
  t.plan(2)

  const _error = console.error
  const _exit = process.exit

  process.exit = (code) => {
    t.is(code, 1)
    process.exit = _exit
    t.end()
  }
  console.error = (obj) => {
    t.is(
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
  t.plan(1)
  const res = await exec(`node ${baseDir}/autocannon.js --version`)
  t.ok(res.stdout.match(/autocannon v(\d+\.\d+\.\d+)/))
})

test('should print help if invoked with --help', async t => {
  t.plan(1)
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js --help`)
  t.same(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})

test('should print help if no url is provided', async t => {
  t.plan(1)
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js`)
  t.same(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})
