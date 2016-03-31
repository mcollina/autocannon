'use strict'

const http = require('http')
const server = http.createServer(handle)

server.listen(3000)

function handle (req, res) {
  res.end('hello world')
}
