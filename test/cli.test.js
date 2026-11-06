'use strict'

const { test } = require('node:test')
const split = require('split2')
const path = require('path')
const fs = require('fs')
const os = require('os')
const childProcess = require('child_process')
const helper = require('./helper')
const { hasWorkerSupport } = require('../lib/util')

test('should run benchmark against server', (t, done) => {
  const lines = [
    /Running 1s test @ .*$/,
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
    /# of samples: 1.*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const server = helper.startServer()
  const url = 'http://localhost:' + server.address().port

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', url], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  child
    .stderr
    .pipe(split())
    .on('data', (line) => {
      const regexp = lines.shift()
      t.assert.ok(regexp, 'we are expecting this line')
      t.assert.ok(regexp.test(line), 'line matches ' + regexp)
    })
    .on('end', done)
})

test('should parse HAR file and run requests', (t, done) => {
  const lines = [
    /Running \d+ requests test @ .*$/,
    /1 connections.*$/,
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
    /# of samples: 1.*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length)

  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const harPath = path.join(os.tmpdir(), 'autocannon-test.har')
  const har = helper.customizeHAR('./fixtures/httpbin-simple-get.json', 'https://httpbin.org', url)
  fs.writeFileSync(harPath, JSON.stringify(har))

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-a', 4, '-c', 1, '--har', harPath, url], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  child
    .stderr
    .pipe(split())
    .on('data', (line) => {
      const regexp = lines.shift()
      t.assert.ok(regexp.test(line), `"${line}" matches ${regexp}`)
    })
    .on('end', done)
})

test('should throw on unknown HAR file', (t, done) => {
  t.plan(1)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-a', 4, '-c', 1, '--har', 'does not exist', 'http://localhost'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  const lines = []
  child
    .stderr
    .pipe(split())
    .on('data', line => lines.push(line))
    .on('end', () => {
      const output = lines.join('\n')
      t.assert.ok(output.includes('Error: Failed to load HAR file content: ENOENT'), `Unexpected output:\n${output}`)
      done()
    })
})

test('should throw on invalid HAR file', (t, done) => {
  t.plan(1)

  const harPath = path.join(os.tmpdir(), 'autocannon-test.har')
  fs.writeFileSync(harPath, 'not valid JSON content')

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-a', 4, '-c', 1, '--har', harPath, 'http://localhost'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  const lines = []
  child
    .stderr
    .pipe(split())
    .on('data', line => lines.push(line))
    .on('end', () => {
      const output = lines.join('\n')
      t.assert.ok(output.includes('Error: Failed to load HAR file content: Unexpected token'), `Unexpected output:\n${output}`)
      done()
    })
})

test('should write warning about unused HAR requests', (t, done) => {
  t.plan(1)

  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const harPath = path.join(os.tmpdir(), 'autocannon-test.har')
  const har = helper.customizeHAR('./fixtures/multi-domains.json', 'https://httpbin.org', url)
  fs.writeFileSync(harPath, JSON.stringify(har))

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-a', 4, '-c', 1, '--har', harPath, url], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  const lines = []
  child
    .stderr
    .pipe(split())
    .on('data', line => lines.push(line))
    .on('end', () => {
      const output = lines.join('\n')
      t.assert.ok(output.includes(`Warning: skipping requests to 'https://github.com' as the target is ${url}`), `Unexpected output:\n${output}`)
      done()
    })
})

test('run with workers', { skip: !hasWorkerSupport }, (t, done) => {
  const lines = [
    /Running 1s test @ .*$/,
    /10 connections.*$/,
    /4 workers.*$/,
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
    /.*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const server = helper.startServer()
  const url = 'http://localhost:' + server.address().port

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', url, '--workers', '4'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.after(() => {
    try {
      child.kill()
    } catch {}
  })

  child
    .stderr
    .pipe(split())
    .on('data', (line) => {
      const regexp = lines.shift()
      t.assert.ok(regexp, 'we are expecting this line')
      t.assert.ok(regexp.test(line), 'line matches ' + regexp)
    })
    .on('end', done)
})

test('should run handle PUT bodies', async (t) => {
  await t.test('"number" bodies work', (t, done) => {
    t.plan(2)

    const server = helper.startServer()
    const url = 'http://localhost:' + server.address().port

    const cmd = [
      path.join(__dirname, '..'),
      '-d', '1',
      '-m', 'PUT',
      '-H', 'content-type="application/x-www-form-urlencoded"',
      '-b', '1',
      url
    ]
    const child = childProcess.spawn(process.execPath, cmd, {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    t.after(() => {
      try {
        child.kill()
      } catch {}
    })

    const outputLines = []
    child
      .stderr
      .pipe(split())
      .on('data', (line) => {
        outputLines.push(line)
      })
      .on('end', () => {
        t.assert.strictEqual(
          outputLines.some(l => l === 'body must be either a string or a buffer'),
          false
        )
        t.assert.strictEqual(
          /.* requests in ([0-9]|\.)+s, .* read/.test(outputLines.pop()),
          true
        )
        done()
      })
  })

  await t.test('"string" bodies work', (t, done) => {
    t.plan(2)

    const server = helper.startServer()
    const url = 'http://localhost:' + server.address().port

    const cmd = [
      path.join(__dirname, '..'),
      '-d', '1',
      '-m', 'PUT',
      '-H', 'content-type="application/x-www-form-urlencoded"',
      '-b', '"1"',
      url
    ]
    const child = childProcess.spawn(process.execPath, cmd, {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    t.after(() => {
      try {
        child.kill()
      } catch {}
    })

    const outputLines = []
    child
      .stderr
      .pipe(split())
      .on('data', (line) => {
        outputLines.push(line)
      })
      .on('end', () => {
        t.assert.strictEqual(
          outputLines.some(l => l === 'body must be either a string or a buffer'),
          false
        )
        t.assert.strictEqual(
          /.* requests in ([0-9]|\.)+s, .* read/.test(outputLines.pop()),
          true
        )
        done()
      })
  })
})
