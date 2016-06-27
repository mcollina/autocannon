'use strict'

const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

const options = {
  key: fs.readFileSync(path.join(__dirname, 'test', '/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'test', '/cert.pem')),
  passphrase: 'test'
}
const server = http.createServer(handle)
const server2 = https.createServer(options, handle)

server.listen(3000)
server2.listen(3001)

function handle (req, res) {
  res.end('hello world')
}
