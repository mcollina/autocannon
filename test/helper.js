'use strict'

const http = require('http')

function startServer () {
  const server = http.createServer(handle)

  server.listen(0)

  function handle (req, res) {
    res.end('hello world')
  }

  server.unref()

  return server
}

module.exports.startServer = startServer
