'use strict'

// UNIX sockets are not supported by Windows
if (process.platform === 'win32') process.exit(0)

const t = require('tap')
const split = require('split2')
const os = require('os')
const path = require('path')
const childProcess = require('child_process')
const helper = require('./helper')

const lines = [
  /Running 1s test @ .*$/,
  /10 connections.*$/,
  /$/,
  /Stat.*Avg.*Stdev.*Max.*$/,
  /Latency \(ms\).*$/,
  /Req\/Sec.*$/,
  /Bytes\/Sec.*$/,
  /$/,
  /.* requests in \d+s, .* read/
]

t.plan(lines.length * 2)

const socketPath = path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')
helper.startServer({socketPath})

const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', socketPath], {
  cwd: __dirname,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
})

t.tearDown(() => {
  child.kill()
})

child
  .stderr
  .pipe(split())
  .on('data', (line) => {
    const regexp = lines.shift()
    t.ok(regexp, 'we are expecting this line')
    t.ok(regexp.test(line), 'line matches ' + regexp)
  })
