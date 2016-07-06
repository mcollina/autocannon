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
    boolean: ['json', 'n', 'help', 'renderLatencyTable', 'renderProgressBar'],
    alias: {
      connections: 'c',
      pipelining: 'p',
      timeout: 't',
      duration: 'd',
      json: 'j',
      renderLatencyTable: ['l', 'latency'],
      method: 'm',
      headers: ['H', 'header'],
      body: 'b',
      bailout: 'B',
      input: 'i',
      maxConnectionRequests: 'M',
      maxOverallRequests: 'O',
      renderProgressBar: 'progress',
      title: 'T',
      version: 'v',
      help: 'h'
    },
    default: {
      connections: 10,
      timeout: 10,
      pipelining: 1,
      duration: 10,
      renderLatencyTable: false,
      renderProgressBar: true,
      json: false,
      method: 'GET'
    }
  })

  argv.url = argv._[0]

  // support -n to disable the progress bar
  if (argv.n) {
    argv.renderProgressBar = false
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

  const tracker = run(argv, (err, result) => {
    if (err) {
      throw err
    }

    if (argv.json) {
      console.log(JSON.stringify(result, null, 2))
    }
  })

  if (!argv.json) {
    track(tracker, argv)
  }

  process.once('SIGINT', () => {
    tracker.stop()
  })
}

if (require.main === module) {
  start()
}
