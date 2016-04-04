'use strict'

const inherits = require('util').inherits
const EE = require('events').EventEmitter
const net = require('net')
const HTTPParser = require('http-parser-js').HTTPParser

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }

  opts.pipelining = opts.pipelining || 1

  this.opts = opts
  this.parser = new HTTPParser(HTTPParser.RESPONSE)
  this.bytes = 0
  this.headers = {}
  this.startTime = [0, 0]

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

  this._req = new Buffer(`GET ${opts.path} HTTP/1.1\r\nHost: ${opts.host}\r\nConnection: keep-alive\r\n\r\n`)

  this._connect()
}

inherits(Client, EE)

Client.prototype._connect = function () {
  this.conn = net.connect(this.opts.port, this.opts.hostname)
  this.conn.on('error', this._connect.bind(this))

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

module.exports = Client
