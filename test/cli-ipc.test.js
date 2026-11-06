'use strict'

const { test } = require('node:test')
const { once } = require('node:events')
const split = require('split2')
const os = require('os')
const path = require('path')
const childProcess = require('child_process')
const helper = require('./helper')

const win = process.platform === 'win32'

const lines = [
  /Running 1s test @ http:\/\/example.com\/foo \([^)]*\)$/,
  /10 connections.*$/,
  /$/,
  /.*/,
  /$/,
  /Stat.*2\.5%.*50%.*97\.5%.*99%.*Avg.*Stdev.*Max.*$/,
  /.*/,
  /Latency.*$/,
  /$/,
  /.*/,
  /Stat.*1%.*2\.5%.*50%.*97\.5%.*Avg.*Stdev.*Min.*$/,
  /.*/,
  /Req\/Sec.*$/,
  /.*/,
  /Bytes\/Sec.*$/,
  /.*/,
  /$/,
  /Req\/Bytes counts sampled once per second.*$/,
  /# of samples: 10*$/,
  /$/,
  /.* requests in ([0-9]|\.)+s, .* read/
]

test('CLI benchmarks a Unix socket or Windows pipe', async t => {
  const socketPath = win
    ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
    : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

  const server = helper.startServer({ socketPath })
  t.after(() => server.close())

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', '-S', socketPath, 'example.com/foo'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })
  t.after(() => child.kill())
  const closed = once(child, 'close')

  let errorLine = false
  for await (const line of child.stderr.pipe(split())) {
    const regexp = lines.shift()
    if (regexp) {
      t.assert.match(line, regexp)
    } else if (!errorLine && win) {
      // On Windows a few errors are expected. Accept a 1% error rate on the pipe.
      errorLine = true
      const match = line.match(/^(\d+) errors \(0 timeouts\)$/)
      t.assert.ok(match, 'expected the error summary')
      const errors = Number(match[1])
      t.assert.ok(errors / 15000 < 0.01, `should have less than 1% errors on Windows (had ${errors} errors)`)
    } else {
      t.assert.fail('Unexpected line: ' + JSON.stringify(line))
    }
  }

  const [code] = await closed
  t.assert.strictEqual(code, 0)
  t.assert.strictEqual(lines.length, 0, 'all expected output was received')
})
