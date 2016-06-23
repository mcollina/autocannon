'use strict'

const ProgressBar = require('progress')
const table = require('table')
const chalk = require('chalk')
const prettyBytes = require('pretty-bytes')
const format = require('./format')
const percentiles = require('./percentiles')

function track (instance, outputStream) {
  if (!instance) {
    throw new Error('instance required for tracking')
  }

  const opts = instance.opts

  // use stderr as its progressBar's default
  outputStream = outputStream || process.stderr

  const progressBar = new ProgressBar(`${chalk.green('running')} [:bar] :percent`, {
    width: 20,
    incomplete: ' ',
    total: opts.duration,
    clear: true,
    stream: outputStream
  })

  console.log(`Running ${opts.duration}s test @ ${opts.url}`)
  let msg = `${opts.connections} connections`
  if (opts.pipelining > 1) {
    msg += ` with ${opts.pipelining} pipelining factor`
  }
  console.log(msg)
  console.log()

  progressBar.tick(0)

  instance.on('tick', () => {
    progressBar.tick()
  })

  process.once('SIGINT', () => {
    progressBar.tick(opts.duration - 1)
  })

  instance.on('done', (result) => {
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

    if (opts.latency) {
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

module.exports = track
