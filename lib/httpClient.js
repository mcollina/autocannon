'use strict'

const inherits = require('util').inherits
const EE = require('events').EventEmitter
const net = require('net')
const tls = require('tls')
const retimer = require('retimer')
const HTTPParser = require('http-parser-js').HTTPParser
const RequestIterator = require('./requestIterator')

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }

  opts.setupClient = opts.setupClient || noop
  opts.pipelining = opts.pipelining || 1
  opts.port = opts.port || 80

  this.opts = opts
  this.timeout = (opts.timeout || 10) * 1000
  this.secure = opts.protocol === 'https:'
  this.parser = new HTTPParser(HTTPParser.RESPONSE)
  this.requestIterator = new RequestIterator(opts.requests, opts)

  this.resData = new Array(opts.pipelining)
  for (var i = 0; i < this.resData.length; i++) {
    this.resData[i] = {
      bytes: 0,
      headers: {},
      startTime: [0, 0]
    }
  }

  // cer = current expected response
  this.cer = 0
  this.destroyed = false

  opts.setupClient(this)

  const handleTimeout = () => {
    // all pipelined requests have timed out here
    this.resData.forEach(() => this.emit('timeout'))
    this.cer = 0
    this._destroyConnection()
    this._connect()

    // timeout has already occured, need to set a new timeoutTicker
    this.timeoutTicker = retimer(handleTimeout, this.timeout)
  }

  this.timeoutTicker = retimer(handleTimeout, this.timeout)

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

    this.timeoutTicker.reschedule(this.timeout)
  }

  this._connect()
}

inherits(Client, EE)

Client.prototype._connect = function () {
  if (this.secure) {
    this.conn = tls.connect(this.opts.port, this.opts.hostname, { rejectUnauthorized: false })
  } else {
    this.conn = net.connect(this.opts.port, this.opts.hostname)
  }

  this.conn.on('error', () => {
    this.emit('connError')
    if (!this.destroyed) this._connect()
  })

  this.conn.on('data', (chunk) => {
    this.resData[this.cer].bytes += chunk.length
    this.parser.execute(chunk)
  })

  this.conn.on('end', () => {
    if (!this.destroyed) this._connect()
  })

  for (let i = 0; i < this.opts.pipelining; i++) {
    this._doRequest(i)
  }
}

// rpi = request pipelining index
Client.prototype._doRequest = function (rpi) {
  this.resData[rpi].startTime = process.hrtime()
  this.conn.write(this.requestIterator.move())
}

Client.prototype._destroyConnection = function () {
  // if (!this.conn) return
  this.conn.removeAllListeners('error')
  this.conn.removeAllListeners('end')
  this.conn.on('error', () => {})
  this.conn.destroy()
}

Client.prototype.destroy = function () {
  this.destroyed = true
  this.timeoutTicker.clear()
  this._destroyConnection()
}

Client.prototype.getRequestBuffer = function (newHeaders) {
  return this.requestIterator.currentRequest.requestBuffer
}

Client.prototype.setHeaders = function (newHeaders) {
  this.requestIterator.setHeaders(newHeaders)
}

Client.prototype.setBody = function (newBody) {
  this.requestIterator.setBody(newBody)
}

Client.prototype.setHeadersAndBody = function (newHeaders, newBody) {
  this.requestIterator.setHeadersAndBody(newHeaders, newBody)
}

function noop () {}

module.exports = Client
