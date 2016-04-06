#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const Histogram = require('native-hdr-histogram')
const URL = require('url')
const fs = require('fs')
const path = require('path')
const help = fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8')
const Client = require('./lib/myhttp')
const EE = require('events').EventEmitter
const ProgressBar = require('progress')
const table = require('table')
const prettyBytes = require('pretty-bytes')
const si = require('si-tools')
const chalk = require('chalk')
const percentiles = [
  50,
  75,
  90,
  99,
  99.9,
  99.99,
  99.999
]

function run (opts, cb) {
  cb = cb || noop

  const tracker = new EE()
  const latencies = new Histogram(1, 10000, 5)
  const requests = new Histogram(1, 1000000, 3)
  const throughput = new Histogram(1, 1000000000, 1)
  const statusCodes = [
    0, // 1xx
    0, // 2xx
    0, // 3xx
    0, // 4xx
    0  // 5xx
  ]

  const url = URL.parse(opts.url)

  opts.pipelining = opts.pipelining || 1

  let counter = 0
  let bytes = 0
  let errors = 0
  let totalBytes = 0
  let totalRequests = 0
  let stop = false

  const interval = setInterval(() => {
    totalBytes += bytes
    totalRequests += counter
    requests.record(counter)
    throughput.record(bytes)
    counter = 0
    bytes = 0
    tracker.emit('tick')

    if (stop) {
      clearInterval(interval)
      clients.forEach((client) => client.destroy())
      let result = {
        requests: histAsObj(requests, totalRequests),
        latency: addPercentiles(latencies, histAsObj(latencies)),
        throughput: histAsObj(throughput, totalBytes),
        errors: errors,
        duration: opts.duration,
        connections: opts.connections,
        pipelining: opts.pipelining,
        '2xx': statusCodes[1],
        'non2xx': statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4]
      }
      tracker.emit('done', result)
      cb(null, result)
    }
  }, 1000)

  if (!opts.connections) {
    cb(new Error('connections > 0'))
    return
  }

  // copy over fields so that the client
  // performs the right HTTP requests
  url.pipelining = opts.pipelining
  url.method = opts.method
  url.body = opts.body
  url.headers = opts.headers

  let clients = []
  for (let i = 0; i < opts.connections; i++) {
    let client = new Client(url)
    client.on('response', record)
    client.on('connError', onError)
    clients.push(client)
  }

  function record (statusCode, resBytes, responseTime) {
    statusCodes[(parseInt(statusCode) / 100) - 1] += 1
    latencies.record(responseTime)
    bytes += resBytes
    counter++
  }

  function onError () {
    errors++
  }

  setTimeout(() => {
    stop = true
  }, opts.duration * 1000)

  return tracker
}

function histAsObj (hist, total) {
  const result = {
    average: Math.ceil(hist.mean() * 100) / 100,
    stddev: Math.ceil(hist.stddev() * 100) / 100,
    min: hist.min(),
    max: hist.max()
  }

  if (typeof total === 'number') {
    result.total = total
  }

  return result
}

function addPercentiles (hist, result) {
  percentiles.forEach((perc) => {
    const key = ('p' + perc).replace('.', '')
    result[key] = hist.percentile(perc)
  })

  return result
}

function noop () {}

module.exports = run

function start () {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['json', 'latency', 'help'],
    alias: {
      connections: 'c',
      pipelining: 'p',
      duration: 'd',
      json: 'j',
      latency: 'l',
      method: 'm',
      headers: 'H',
      body: 'b',
      help: 'h'
    },
    default: {
      connections: 10,
      pipelining: 1,
      duration: 10,
      json: false,
      method: 'GET'
    }
  })

  argv.url = argv._[0]

  if (!argv.url || argv.help) {
    console.error(help)
    process.exit(1)
  }

  if (argv.body) {
    argv.body = fs.readFileSync(argv.body)
  }

  if (argv.headers) {
    if (!Array.isArray(argv.headers)) {
      argv.headers = [argv.headers]
    }

    argv.headers = argv.headers.reduce((obj, header) => {
      const split = header.split('=')
      obj[split[0]] = split[1]
      return obj
    }, {})
  }

  const tracker = run(argv, (err, result) => {
    if (err) {
      throw err
    }

    if (!argv.json) {
      const out = table.default([
        asColor('cyan', ['Stat', 'Avg', 'Stdev', 'Max']),
        asRow(chalk.bold('Latency (ms)'), result.latency),
        asRow(chalk.bold('Req/Sec'), result.requests),
        asRow(chalk.bold('Bytes/Sec'), asBytes(result.throughput))
      ], {
        border: table.getBorderCharacters('void'),
        columnDefault: {
          paddingLeft: 0,
          paddingRight: 1
        },
        drawHorizontalLine: () => false
      })

      console.log(out)

      if (argv.latency) {
        const latency = table.default([
          asColor('cyan', ['Percentile', 'Latency (ms)'])
        ].concat(percentiles.map((perc) => {
          const key = ('p' + perc).replace('.', '')
          return [
            chalk.bold('' + perc),
            result.latency[key]
          ]
        })), {
          border: table.getBorderCharacters('void'),
          columnDefault: {
            paddingLeft: 0,
            paddingRight: 6
          },
          drawHorizontalLine: () => false
        })

        console.log(latency)
      }

      if (result.non2xx) {
        console.log(`${result['2xx']} 2xx responses, ${result.non2xx} non 2xx responses`)
      }
      console.log(`${si.format(result.requests.total, '', 0, 0)} requests in ${result.duration}s, ${prettyBytes(result.throughput.total)} read`)
      if (result.errors) {
        console.log(`${si.format(result.errors)} errors`)
      }
    } else {
      console.log(JSON.stringify(result, null, 2))
    }
  })

  if (!argv.json) {
    const bar = new ProgressBar(`${chalk.green('running')} [:bar] :percent`, {
      width: 20,
      incomplete: ' ',
      total: argv.duration,
      clear: true
    })

    console.log(`Running ${argv.duration}s test @ ${argv.url}`)
    console.log(`${argv.connections} connections with ${argv.pipelining} pipelining factor`)
    console.log()

    bar.tick(0)

    tracker.on('tick', () => {
      bar.tick()
    })
  }
}

function asRow (name, stat) {
  return [
    name,
    stat.average,
    stat.stddev,
    stat.max
  ]
}

function asColor (color, row) {
  return row.map((entry) => chalk[color](entry))
}

function asBytes (stat) {
  const result = Object.create(stat)
  result.average = prettyBytes(stat.average)
  result.stddev = prettyBytes(stat.stddev)
  result.max = prettyBytes(stat.max)
  result.min = prettyBytes(stat.min)
  return result
}

if (require.main === module) {
  start()
}
