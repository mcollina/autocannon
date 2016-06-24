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
  this.resData = new Array(opts.pipelining)
  this.resData.fill({
    bytes: 0,
    headers: {},
    startTime: [0, 0]
  })

  // cer = current expected response
  this.cer = 0

  this.parser[HTTPParser.kOnHeadersComplete] = (opts) => {
    this.resData[this.cer].headers = opts
  }

  this.parser[HTTPParser.kOnBody] = () => {}

  this.parser[HTTPParser.kOnMessageComplete] = () => {
    let end = process.hrtime(this.resData[this.cer].startTime)
    let responseTime = end[0] * 1e3 + end[1] / 1e6
    this.emit('response', this.resData[this.cer].headers.statusCode, this.resData[this.cer].bytes, responseTime)
    this.resData[this.cer].bytes = 0

    this.cer = this.cer === opts.pipelining - 1 ? 0 : this.cer++
    this._doRequest(this.cer)
  }

  opts.path = opts.path || '/'
  opts.hostname = opts.hostname || 'localhost'

  if (!opts.host && opts.hostname && opts.port) {
    opts.host = opts.hostname + ':' + opts.port
  }

  this.baseReq = `${opts.method} ${opts.path} HTTP/1.1\r\nHost: ${opts.host}\r\nConnection: keep-alive\r\n`

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
    this.resData[this.cer].bytes += chunk.length
    this.parser.execute(chunk)
  })

  this.conn.on('end', () => {
    this._connect()
  })

  for (let i = 0; i < this.opts.pipelining; i++) {
    this._doRequest(i)
  }
}

// rpi = request pipelining index
Client.prototype._doRequest = function (rpi) {
  this.resData[rpi].startTime = process.hrtime()
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
  this._rebuild()
}

Client.prototype.setBody = function (newBody) {
  this.opts.body = newBody

  this._rebuild()
}

Client.prototype.setHeadersAndBody = function (newHeaders, newBody) {
  this.opts.headers = newHeaders || {}
  this.opts.body = newBody

  this._rebuild()
}

Client.prototype._rebuild = function () {
  let body

  if (typeof this.opts.body === 'string') {
    body = new Buffer(this.opts.body)
  } else if (Buffer.isBuffer(this.opts.body)) {
    body = this.opts.body
  } else if (this.opts.body) {
    throw new Error('body must be either a string or a buffer')
  }

  if (body) {
    this.opts.headers['Content-Length'] = '' + body.length
  }

  this._req = Object.keys(this.opts.headers)
    .map((key) => `${key}: ${this.opts.headers[key]}\r\n`)
    .reduce((acc, str) => acc + str, this.baseReq)

  this._req = new Buffer(this._req + '\r\n', 'utf8')

  if (body) {
    this._req = Buffer.concat([this._req, body, new Buffer('\r\n')])
  }
}

module.exports = Client
