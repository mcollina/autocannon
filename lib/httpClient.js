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
  if (this.secure && this.opts.port === 80) this.opts.port = 443
  this.parser = new HTTPParser(HTTPParser.RESPONSE)
  this.requestIterator = new RequestIterator(opts.requests, opts)

  this.reqsMade = 0

  // used for request limiting
  this.responseMax = opts.responseMax

  // used for rate limiting
  this.reqsMadeThisSecond = 0
  this.rate = opts.rate

  // used for forcing reconnects
  this.reconnectRate = opts.reconnectRate

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

    // timeout has already occured, need to set a new timeoutTicker
    this.timeoutTicker = retimer(handleTimeout, this.timeout)

    this._connect()
  }

  if (this.rate) {
    this.rateInterval = setInterval(() => {
      this.reqsMadeThisSecond = 0
      if (this.paused) this._doRequest(this.cer)
      this.paused = false
    }, 1000)
  }

  this.timeoutTicker = retimer(handleTimeout, this.timeout)
  this.parser[HTTPParser.kOnHeaders] = () => {}
  this.parser[HTTPParser.kOnHeadersComplete] = (opts) => {
    this.emit('headers', opts)
    this.resData[this.cer].headers = opts
  }

  this.parser[HTTPParser.kOnBody] = (body) => {
    this.emit('body', body)
  }

  this.parser[HTTPParser.kOnMessageComplete] = () => {
    let end = process.hrtime(this.resData[this.cer].startTime)
    let responseTime = end[0] * 1e3 + end[1] / 1e6
    this.emit('response', this.resData[this.cer].headers.statusCode, this.resData[this.cer].bytes, responseTime)
    this.resData[this.cer].bytes = 0

    if (!this.destroyed && this.reconnectRate && this.reqsMade % this.reconnectRate === 0) {
      return this._resetConnection()
    }

    this.cer = this.cer === opts.pipelining - 1 ? 0 : this.cer++
    this._doRequest(this.cer)
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

  this.conn.on('error', (error) => {
    this.emit('connError', error)
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
  if (!this.rate || (this.rate && this.reqsMadeThisSecond++ < this.rate)) {
    if (!this.destroyed && this.responseMax && this.reqsMade >= this.responseMax) {
      return this.destroy()
    }
    this.emit('request')
    this.resData[rpi].startTime = process.hrtime()
    this.conn.write(this.requestIterator.move())
    this.timeoutTicker.reschedule(this.timeout)
    this.reqsMade++
  } else {
    this.paused = true
  }
}

Client.prototype._resetConnection = function () {
  this._destroyConnection()
  this._connect()
}

Client.prototype._destroyConnection = function () {
  this.conn.removeAllListeners('error')
  this.conn.removeAllListeners('end')
  this.conn.on('error', () => {})
  this.conn.destroy()
}

Client.prototype.destroy = function () {
  if (!this.destroyed) {
    this.destroyed = true
    this.timeoutTicker.clear()
    if (this.rate) clearInterval(this.rateInterval)
    this.emit('done')
    this._destroyConnection()
  }
}

Client.prototype.getRequestBuffer = function (newHeaders) {
  return this.requestIterator.currentRequest.requestBuffer
}

Client.prototype.setHeaders = function (newHeaders) {
  this._okayToUpdateCheck()
  this.requestIterator.setHeaders(newHeaders)
}

Client.prototype.setBody = function (newBody) {
  this._okayToUpdateCheck()
  this.requestIterator.setBody(newBody)
}

Client.prototype.setHeadersAndBody = function (newHeaders, newBody) {
  this._okayToUpdateCheck()
  this.requestIterator.setHeadersAndBody(newHeaders, newBody)
}

Client.prototype.setRequest = function (newRequest) {
  this._okayToUpdateCheck()
  this.requestIterator.setRequest(newRequest)
}

Client.prototype.setRequests = function (newRequests) {
  this._okayToUpdateCheck()
  this.requestIterator.setRequests(newRequests)
}

Client.prototype._okayToUpdateCheck = function () {
  if (this.opts.pipelining > 1) {
    throw new Error('cannot update requests when the piplining factor is greater than 1')
  }
}

function noop () {}

module.exports = Client
