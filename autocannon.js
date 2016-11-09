#! /usr/bin/env node

'use strict'

const minimist = require('minimist')
const fs = require('fs')
const path = require('path')
const help = fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8')
const run = require('./lib/run')
const track = require('./lib/progressTracker')

module.exports = run
module.exports.track = track

function start () {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['json', 'n', 'help', 'renderLatencyTable', 'renderProgressBar', 'forever'],
    alias: {
      connections: 'c',
      pipelining: 'p',
      timeout: 't',
      duration: 'd',
      amount: 'a',
      json: 'j',
      renderLatencyTable: ['l', 'latency'],
      method: 'm',
      headers: ['H', 'header'],
      body: 'b',
      bailout: 'B',
      input: 'i',
      maxConnectionRequests: 'M',
      maxOverallRequests: 'O',
      connectionRate: 'r',
      overallRate: 'R',
      reconnectRate: 'D',
      renderProgressBar: 'progress',
      title: 'T',
      version: 'v',
      forever: 'f',
      help: 'h'
    },
    default: {
      connections: 10,
      timeout: 10,
      pipelining: 1,
      duration: 10,
      reconnectRate: 0,
      renderLatencyTable: false,
      renderProgressBar: true,
      json: false,
      forever: false,
      method: 'GET'
    }
  })

  argv.url = argv._[0]

  // support -n to disable the progress bar and results table
  if (argv.n) {
    argv.renderProgressBar = false
    argv.renderResultsTable = false
  }

  if (argv.version) {
    console.log('autocannon', 'v' + require('./package').version)
    console.log('node', process.version)
    return
  }

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

  const tracker = run(argv)

  tracker.on('done', (result) => {
    if (argv.json) {
      console.log(JSON.stringify(result))
    }
  })

  tracker.on('error', (err) => {
    if (err) {
      throw err
    }
  })

  // if not rendering json, or if std isn't a tty, track progress
  if (!argv.json || !process.stdout.isTTY) track(tracker, argv)

  process.once('SIGINT', () => {
    tracker.stop()
  })
}

if (require.main === module) {
  start()
}
