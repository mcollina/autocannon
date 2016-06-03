#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const fs = require('fs')
const path = require('path')
const help = fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8')
const ProgressBar = require('progress')
const table = require('table')
const prettyBytes = require('pretty-bytes')
const format = require('./lib/format')
const chalk = require('chalk')
const percentiles = require('./lib/percentiles')
const run = require('./lib/run')

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
      input: 'i',
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
    return
  }

  if (argv.input) {
    argv.body = fs.readFileSync(argv.input)
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
      console.log(`${format(result.requests.total)} requests in ${result.duration}s, ${prettyBytes(result.throughput.total)} read`)
      if (result.errors) {
        console.log(`${format(result.errors)} errors`)
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
    let msg = `${argv.connections} connections`
    if (argv.pipelining > 1) {
      msg += ` with ${argv.pipelining} pipelining factor`
    }
    console.log(msg)
    console.log()

    bar.tick(0)

    tracker.on('tick', () => {
      bar.tick()
    })

    process.once('SIGINT', () => {
      bar.tick(argv.duration - 1)
    })
  }

  process.once('SIGINT', () => {
    tracker.stop()
  })
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
