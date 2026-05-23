'use strict'

const test = require('tap').test
const split = require('split2')
const path = require('path')
const childProcess = require('child_process')

test('should stdout (print) the result (multiple status codes)', (t) => {
  const lines = [
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
    /.*/,
    /Code.*Count.*$/,
    /.*/,
    /200.*1843.*$/,
    /.*/,
    /302.*1800.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 1.*$/,
    /$/,
    /.* 2xx responses, ([\d])+ non 2xx responses/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, 'printResult-process.js'), '--renderStatusCodes', '--renderOnlyStatusCode=200,302', 'http://127.0.0.1'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.teardown(() => {
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
    .on('end', t.end)
})

test('should stdout (print) the result (single status code)', (t) => {
  const lines = [
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
    /.*/,
    /Code.*Count.*$/,
    /.*/,
    /301.*58.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 1.*$/,
    /$/,
    /.* 2xx responses, ([\d])+ non 2xx responses/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, 'printResult-process.js'), '--renderStatusCodes', '--renderOnlyStatusCode=301', 'http://127.0.0.1'], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.teardown(() => {
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
    .on('end', t.end)
})
