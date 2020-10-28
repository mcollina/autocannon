'use strict'

const http = require('http')
const autocannon = require('../autocannon')

const server = http.createServer(handle)

server.listen(0, startBench)

function handle (req, res) {
  res.end('hello world')
}

function startBench () {
  const instance = autocannon({
    connections: 100,
    duration: 2,
    url: 'http://localhost:' + server.address().port,
    numWorkers: 2
  }, finishedBench)

  // this is used to kill the instance on CTRL-C
  process.once('SIGINT', () => {
    instance.stop()
  })

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
