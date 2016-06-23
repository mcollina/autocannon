'use strict'

const inherits = require('util').inherits
const EE = require('events').EventEmitter
const net = require('net')
const HTTPParser = require('http-parser-js').HTTPParser
const methods = [
  'GET',
  'DELETE',
  'POST',
  'PUT'
]

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }

  opts.pipelining = opts.pipelining || 1
  opts.port = opts.port || 80
  opts.method = opts.method || 'GET'

  if (methods.indexOf(opts.method) < 0) {
    throw new Error(`${opts.method} HTTP method is not supported`)
  }

  this.opts = opts
  this.parser = new HTTPParser(HTTPParser.RESPONSE)
  this.bytes = 0
  this.headers = {}
  this.startTime = [0, 0]
  this.body = this.opts.body

  this.parser[HTTPParser.kOnHeadersComplete] = (opts) => {
    this.headers = opts
  }

  this.parser[HTTPParser.kOnBody] = () => {}

  this.parser[HTTPParser.kOnMessageComplete] = () => {
    let end = process.hrtime(this.startTime)
    let responseTime = end[0] * 1e3 + end[1] / 1e6
    this.emit('response', this.headers.statusCode, this.bytes, responseTime)
    this.bytes = 0
    this._doRequest()
  }

  opts.path = opts.path || '/'
  opts.hostname = opts.hostname || 'localhost'

  if (!opts.host && opts.hostname && opts.port) {
    opts.host = opts.hostname + ':' + opts.port
  }

  this._req = `${opts.method} ${opts.path} HTTP/1.1\r\nHost: ${opts.host}\r\nConnection: keep-alive\r\n`

  this.setHeaders(opts.headers)

  this._connect()
}

inherits(Client, EE)

Client.prototype._connect = function () {
  this.conn = net.connect(this.opts.port, this.opts.hostname)
  this.conn.on('error', () => {
    this.emit('connError')
    this._connect()
  })

  this.conn.on('data', (chunk) => {
    this.bytes += chunk.length
    this.parser.execute(chunk)
  })

  this.conn.on('end', () => {
    this._connect()
  })

  for (let i = 0; i < this.opts.pipelining; i++) {
    this._doRequest()
  }
}

Client.prototype._doRequest = function () {
  this.startTime = process.hrtime()
  this.conn.write(this._req)
}

Client.prototype.destroy = function () {
  this.conn.removeAllListeners('error')
  this.conn.removeAllListeners('end')
  this.conn.on('error', () => {})
  this.conn.destroy()
}

Client.prototype.setHeaders = function (newHeaders) {
  this.opts.headers = newHeaders || {}
  this.rebuildRequest()
}

Client.prototype.setBody = function (newBody) {
  this.opts.body = newBody
  this.body = newBody

  this.rebuildRequest()
}

Client.prototype.rebuildRequest = function () {
  // this.body should take precedence, as the user can reassign directly to it
  this.opts.body = this.body || this.opts.body

  let bodyReq

  if (typeof this.opts.body === 'string') {
    bodyReq = new Buffer(this.opts.body)
  } else if (Buffer.isBuffer(this.opts.body)) {
    bodyReq = this.opts.body
  } else if (this.opts.body) {
    throw new Error('body must be either a string or a buffer')
  }

  if (bodyReq) {
    this.opts.headers['Content-Length'] = '' + bodyReq.length
  }

  this._req = Object.keys(this.opts.headers)
    .map((key) => `${key}: ${this.opts.headers[key]}\r\n`)
    .reduce((acc, str) => acc + str, this._req)

  this._req = new Buffer(this._req + '\r\n', 'utf8')

  if (bodyReq) {
    this._req = Buffer.concat([this._req, bodyReq, new Buffer('\r\n')])
  }
}

module.exports = Client
