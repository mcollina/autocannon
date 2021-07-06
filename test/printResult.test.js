'use strict'

const test = require('tap').test
const split = require('split2')
const path = require('path')
const childProcess = require('child_process')
const printResult = require('../lib/printResult')

test('should stdout (print) the result', (t) => {
  const lines = [
    /.*/,
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
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, 'printResult-process.js')], {
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

test('verify amount of total requests', (t) => {
  t.plan(1)

  // arrange
  const connections = 10
  const pipelining = 2
  const result = {
    url: 'http://localhost:3000/users',
    connections,
    pipelining,
    workers: 0,
    duration: 1.02,
    start: '2021-07-06T18:04:30.810Z',
    finish: '2021-07-06T18:04:31.832Z',
    errors: 0,
    timeouts: 0,
    mismatches: 0,
    non2xx: 0,
    resets: 0,
    '1xx': 0,
    '2xx': 10,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    statusCodeStats: {
      200: {
        count: 10
      }
    },
    latency: {
      average: 48,
      mean: 48,
      stddev: 3.9,
      min: 37,
      max: 51,
      p0_001: 37,
      p0_01: 37,
      p0_1: 37,
      p1: 37,
      p2_5: 37,
      p10: 37,
      p25: 48,
      p50: 48,
      p75: 50,
      p90: 51,
      p97_5: 51,
      p99: 51,
      p99_9: 51,
      p99_99: 51,
      p99_999: 51,
      totalCount: 10
    },
    requests: {
      average: 10,
      mean: 10,
      stddev: 0,
      min: 10,
      max: 10,
      total: 10,
      p0_001: 10,
      p0_01: 10,
      p0_1: 10,
      p1: 10,
      p2_5: 10,
      p10: 10,
      p25: 10,
      p50: 10,
      p75: 10,
      p90: 10,
      p97_5: 10,
      p99: 10,
      p99_9: 10,
      p99_99: 10,
      p99_999: 10,
      sent: 20
    },
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }
  const opts = {
    outputStream: {
      connecting: false,
      _hadError: false,
      _parent: null,
      _host: null,
      _readableState: {
        objectMode: false,
        highWaterMark: 16384,
        buffer: {
          head: null,
          tail: null,
          length: 0
        },
        length: 0,
        pipes: [],
        flowing: null,
        ended: false,
        endEmitted: false,
        reading: false,
        sync: true,
        needReadable: false,
        emittedReadable: false,
        readableListening: false,
        resumeScheduled: false,
        errorEmitted: false,
        emitClose: false,
        autoDestroy: false,
        destroyed: false,
        errored: null,
        closed: false,
        closeEmitted: false,
        defaultEncoding: 'utf8',
        awaitDrainWriters: null,
        multiAwaitDrain: false,
        readingMore: false,
        decoder: null,
        encoding: null,
        readable: false
      },
      _events: {},
      _eventsCount: 1,
      _writableState: {
        objectMode: false,
        highWaterMark: 16384,
        finalCalled: false,
        needDrain: false,
        ending: false,
        ended: false,
        finished: false,
        destroyed: false,
        decodeStrings: false,
        defaultEncoding: 'utf8',
        length: 0,
        writing: false,
        corked: 0,
        sync: false,
        bufferProcessing: false,
        writecb: null,
        writelen: 0,
        afterWriteTickInfo: null,
        buffered: [],
        bufferedIndex: 0,
        allBuffers: true,
        allNoop: true,
        pendingcb: 0,
        prefinished: false,
        errorEmitted: false,
        emitClose: false,
        autoDestroy: false,
        errored: null,
        closed: false
      },
      allowHalfOpen: false,
      _sockname: null,
      _pendingData: null,
      _pendingEncoding: '',
      server: null,
      _server: null,
      _type: 'pipe',
      fd: 2,
      _isStdio: true
    },
    renderProgressBar: true,
    renderResultsTable: true,
    renderLatencyTable: false,
    headers: {},
    method: 'GET',
    duration: 10,
    connections: 10,
    pipelining: 2,
    timeout: 10,
    maxConnectionRequests: 0,
    maxOverallRequests: 0,
    connectionRate: 0,
    overallRate: 0,
    amount: 20,
    reconnectRate: 0,
    forever: false,
    idReplacement: false,
    requests: [
      {}
    ],
    excludeErrorStats: false,
    _: [
      'localhost:3000/users'
    ],
    json: false,
    j: false,
    n: false,
    help: false,
    h: false,
    l: false,
    latency: false,
    progress: true,
    renderStatusCodes: false,
    statusCodes: false,
    f: false,
    I: false,
    x: false,
    onPort: false,
    'on-port': false,
    debug: false,
    ignoreCoordinatedOmission: false,
    C: false,
    p: 2,
    a: 20,
    c: 10,
    t: 10,
    d: 10,
    D: 0,
    m: 'GET',
    workers: 0,
    w: 0,
    '--': [],
    url: 'http://localhost:3000/users',
    harRequests: {},
    progressBarString: 'running [:bar] :percent'
  }

  // act
  const output = printResult(result, opts)

  // assert
  const expectedRequests = connections * pipelining
  t.match(output.includes(`${expectedRequests} requests in`), true)
})
