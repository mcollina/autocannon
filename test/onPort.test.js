'use strict'

const t = require('tap')
const spawn = require('child_process').spawn
const split = require('split2')
const autocannon = require.resolve('../autocannon')
const target = require.resolve('./targetProcess')

const lines = [
  /Running 1s test @ .*$/,
  /10 connections.*$/,
  /$/,
  /Stat.*Avg.*Stdev.*Max.*$/,
  /Latency \(ms\).*$/,
  /Req\/Sec.*$/,
  /Bytes\/Sec.*$/,
  /$/,
  // Ensure that there are more than 0 successful requests
  /[1-9]\d+.* requests in \d+s, .* read/
]

t.plan(lines.length * 2)

const child = spawn(autocannon, [
  '-c', '10',
  '-d', '1',
  '--on-port', '/',
  '--', 'node', target
], {
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
