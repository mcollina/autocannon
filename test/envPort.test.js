'use strict'

const t = require('tap')
const split = require('split2')
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

t.plan(lines.length * 2 + 1)

const server = helper.startServer()
const port = server.address().port
const url = '/path' // no hostname

const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', url], {
  cwd: __dirname,
  env: Object.assign({}, process.env, {
    PORT: port
  }),
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
  .on('end', () => {
    t.ok(server.autocannonConnects > 0, 'targeted the correct port')
  })
