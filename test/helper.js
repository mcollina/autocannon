'use strict'

const http = require('http')
const https = require('https')
const tls = require('tls')
const fs = require('fs')
const path = require('path')
const BusBoy = require('busboy')

function startServer (opts) {
  opts = opts || {}

  if (!Array.isArray(opts.responses)) {
    opts.responses = []
  }

  const fixedStatusCode = opts.statusCode || 200
  const server = http.createServer(handle)
  server.autocannonConnects = 0
  server.autocannonRequests = 0

  server.on('connection', () => { server.autocannonConnects++ })

  server.listen(opts.socketPath || 0)

  function handle (req, res) {
    let { statusCode, body } = opts.responses[server.autocannonRequests] || {}
    server.autocannonRequests++

    if (!statusCode) {
      statusCode = fixedStatusCode
    }

    if (!body) {
      body = opts.body || 'hello world'
    }

    res.statusCode = statusCode
    res.end(typeof body === 'function' ? body(req) : body)
  }

  server.unref()

  return server
}

function startTrailerServer () {
  const server = http.createServer(handle)

  function handle (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain', Trailer: 'Content-MD5' })
    res.write('hello ')
    res.addTrailers({ 'Content-MD5': '7895bf4b8828b55ceaf47747b4bca667' })
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

// this server destroys the socket on connection, should result in ECONNRESET
function startSocketDestroyingServer () {
  const server = http.createServer(handle)

  function handle (req, res) {
    res.destroy()
    server.close()
  }

  server.listen(0)
  server.unref()

  return server
}

// this server won't reply to requests
function startHttpsServer (opts = {}) {
  const options = {
    key: fs.readFileSync(path.join(__dirname, '/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/cert.pem')),
    passphrase: 'test'
  }

  const server = https.createServer(options, handle)

  server.listen(opts.socketPath || 0)

  function handle (req, res) {
    res.end('hello world')
  }

  server.unref()

  return server
}

// this server will echo the SNI Server Name in a HTTP header
function startTlsServer () {
  const key = fs.readFileSync(path.join(__dirname, '/key.pem'))
  const cert = fs.readFileSync(path.join(__dirname, '/cert.pem'))
  const passphrase = 'test'

  const options = {
    key,
    cert,
    passphrase
  }

  const server = tls.createServer(options, handle)

  server.listen(0)

  function handle (socket) {
    const servername = socket.servername || ''
    socket.on('data', function (data) {
      // Assume this is a http get request and send back the servername in an otherwise empty reponse.
      socket.write('HTTP/1.1 200 OK\nX-servername: ' + servername + '\nContent-Length: 0\n\n')
      socket.setEncoding('utf8')
      socket.pipe(socket)
    })

    socket.on('error', noop)
  }

  server.unref()

  return server
}

function startMultipartServer (opts = {}, test = () => {}) {
  const server = http.createServer(handle)
  const allowed = ['POST', 'PUT']
  function handle (req, res) {
    if (allowed.includes(req.method)) {
      const bboy = new BusBoy({ headers: req.headers, ...opts })
      const fileData = []
      const payload = {}
      bboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        payload[fieldname] = {
          filename,
          encoding,
          mimetype
        }
        file.on('data', data => fileData.push(data))
      })
      bboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
        payload[fieldname] = val
      })
      bboy.on('finish', () => {
        res.statusCode = fileData.length ? 201 : 400
        res.write(JSON.stringify(payload))
        res.end()
        test(payload)
      })
      req.pipe(bboy)
    } else {
      res.statusCode = 404
      res.write(JSON.stringify({}))
      res.end()
    }
  }

  server.listen(0)
  server.unref()

  return server
}
function startBasicAuthServer () {
  const server = http.createServer(handle)

  function handle (req, res) {
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
      res.writeHead(401)
      return res.end()
    }

    res.writeHead(200)
    res.end('hello world')
  }

  server.listen(0)
  server.unref()

  return server
}

function customizeHAR (fixturePath, replaced, domain) {
  const har = JSON.parse(JSON.stringify(require(fixturePath)))
  for (const entry of har.log.entries) {
    entry.request.url = entry.request.url.replace(replaced, domain)
  }
  return har
}

module.exports.startServer = startServer
module.exports.startTimeoutServer = startTimeoutServer
module.exports.startSocketDestroyingServer = startSocketDestroyingServer
module.exports.startHttpsServer = startHttpsServer
module.exports.startTrailerServer = startTrailerServer
module.exports.startTlsServer = startTlsServer
module.exports.startMultipartServer = startMultipartServer
module.exports.startBasicAuthServer = startBasicAuthServer
module.exports.customizeHAR = customizeHAR

function noop () {}
