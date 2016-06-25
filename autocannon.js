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
    boolean: ['json', 'latency', 'help'],
    alias: {
      connections: 'c',
      pipelining: 'p',
      duration: 'd',
      json: 'j',
      latency: 'l',
      method: 'm',
      headers: ['H', 'header'],
      body: 'b',
      bailout: 'B',
      input: 'i',
      progress: 'p',
      help: 'h'
    },
    default: {
      connections: 10,
      pipelining: 1,
      duration: 10,
      progress: true,
      latency: false,
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

    if (argv.json) {
      console.log(JSON.stringify(result, null, 2))
    }
  })

  if (!argv.json) {
    var render = {
      renderProgressBar: argv.progress,
      renderLatencyTable: argv.latency
    }
    track(tracker, render)
  }

  process.once('SIGINT', () => {
    tracker.stop()
  })
}

if (require.main === module) {
  start()
}
