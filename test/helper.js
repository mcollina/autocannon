'use strict'

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

function startServer (opts) {
  opts = opts || {}

  const statusCode = opts.statusCode || 200
  const server = http.createServer(handle)
  server.autocannonConnects = 0

  server.on('connection', () => { server.autocannonConnects++ })

  server.listen(0)

  function handle (req, res) {
    res.statusCode = statusCode
    res.end('hello world')
  }

  server.unref()

  return server
}

function startTrailerServer () {
  const server = http.createServer(handle)

  function handle (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Trailer': 'Content-MD5' })
    res.write('hello ')
    res.addTrailers({'Content-MD5': '7895bf4b8828b55ceaf47747b4bca667'})
    res.end('world')
  }

  server.listen(0)

  server.unref()

  return server
}

// this server won't reply to requests
function startTimeoutServer () {
  const server = http.createServer(() => {})

  server.listen(0)
  server.unref()

  return server
}

// this server won't reply to requests
function startHttpsServer () {
  const options = {
    key: fs.readFileSync(path.join(__dirname, '/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/cert.pem')),
    passphrase: 'test'
  }

  const server = https.createServer(options, handle)

  server.listen(0)

  function handle (req, res) {
    res.end('hello world')
  }

  server.unref()

  return server
}

module.exports.startServer = startServer
module.exports.startTimeoutServer = startTimeoutServer
module.exports.startHttpsServer = startHttpsServer
module.exports.startTrailerServer = startTrailerServer
