const Table = require('cli-table3')
const Chalk = require('chalk')
const testColorSupport = require('color-support')
const prettyBytes = require('pretty-bytes')
const percentiles = require('hdr-histogram-percentiles-obj').percentiles
const format = require('./format')

const defaults = {
  // use stderr as its progressBar's default
  outputStream: process.stderr,
  renderResultsTable: true,
  renderLatencyTable: false
}

const printResult = (result, opts) => {
  opts = Object.assign({}, defaults, opts)

  opts.outputStream.write('\n')
  const chalk = new Chalk.Instance(testColorSupport({ stream: opts.outputStream, alwaysReturn: true }))

  const shortLatency = new Table({
    head: asColor(chalk.cyan, ['Stat', '2.5%', '50%', '97.5%', '99%', 'Avg', 'Stdev', 'Max'])
  })
  shortLatency.push(asLowRow(chalk.bold('Latency'), asMs(result.latency)))
  logToStream(shortLatency.toString())

  const requests = new Table({
    head: asColor(chalk.cyan, ['Stat', '1%', '2.5%', '50%', '97.5%', 'Avg', 'Stdev', 'Min'])
  })

  requests.push(asHighRow(chalk.bold('Req/Sec'), result.requests))
  requests.push(asHighRow(chalk.bold('Bytes/Sec'), asBytes(result.throughput)))
  logToStream(requests.toString())
  logToStream('')
  logToStream('Req/Bytes counts sampled once per second.\n')

  if (opts.renderLatencyTable) {
    const latencies = new Table({
      head: asColor(chalk.cyan, ['Percentile', 'Latency (ms)'])
    })
    percentiles.map((perc) => {
      const key = `p${perc}`.replace('.', '_')
      return [
        chalk.bold('' + perc),
        result.latency[key]
      ]
    }).forEach(row => {
      latencies.push(row)
    })
    logToStream(latencies.toString())
    logToStream('')
  }

  if (result.non2xx) {
    logToStream(`${result['2xx']} 2xx responses, ${result.non2xx} non 2xx responses`)
  }
  logToStream(`${format(result.requests.total)} requests in ${result.duration}s, ${prettyBytes(result.throughput.total)} read`)
  if (result.errors) {
    logToStream(`${format(result.errors)} errors (${format(result.timeouts)} timeouts)`)
  }
  if (result.mismatches) {
    logToStream(`${format(result.mismatches)} requests with mismatched body`)
  }
  if (result.resets) {
    logToStream(`request pipeline was resetted ${format(result.resets)} ${result.resets === 1 ? 'time' : 'times'}`)
  }

  function logToStream (msg) {
    opts.outputStream.write(msg + '\n')
  }
}

// create a table row for stats where low values is better
function asLowRow (name, stat) {
  return [
    name,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.p99,
    stat.average,
    stat.stddev,
    typeof stat.max === 'string' ? stat.max : Math.floor(stat.max * 100) / 100
  ]
}

// create a table row for stats where high values is better
function asHighRow (name, stat) {
  return [
    name,
    stat.p1,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.average,
    stat.stddev,
    typeof stat.min === 'string' ? stat.min : Math.floor(stat.min * 100) / 100
  ]
}

function asColor (colorise, row) {
  return row.map((entry) => colorise(entry))
}

function asMs (stat) {
  const result = Object.create(null)
  Object.keys(stat).forEach((k) => {
    result[k] = `${stat[k]} ms`
  })
  result.max = typeof stat.max === 'string' ? stat.max : `${Math.floor(stat.max * 100) / 100} ms`

  return result
}

function asBytes (stat) {
  const result = Object.create(stat)

  percentiles.forEach((p) => {
    const key = `p${p}`.replace('.', '_')
    result[key] = prettyBytes(stat[key])
  })

  result.average = prettyBytes(stat.average)
  result.stddev = prettyBytes(stat.stddev)
  result.max = prettyBytes(stat.max)
  result.min = prettyBytes(stat.min)
  return result
}

module.exports = printResult
