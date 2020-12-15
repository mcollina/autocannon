'use strict'

const inherits = require('util').inherits
const EE = require('events').EventEmitter
const net = require('net')
const tls = require('tls')
const retimer = require('retimer')
const HTTPParser = require('http-parser-js').HTTPParser
const RequestIterator = require('./requestIterator')
const noop = require('./noop')
const clone = require('clone')

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }

  this.opts = clone(opts)

  this.opts.setupClient = this.opts.setupClient || noop
  this.opts.pipelining = this.opts.pipelining || 1
  const pipelining = this.opts.pipelining
  this.opts.port = this.opts.port || 80
  this.opts.expectBody = this.opts.expectBody || null
  this.opts.tlsOptions = this.opts.tlsOptions || {}
  this.timeout = (this.opts.timeout || 10) * 1000
  this.ipc = !!this.opts.socketPath
  this.secure = this.opts.protocol === 'https:'
  this.auth = this.opts.auth || null

  if (this.secure && this.opts.port === 80) {
    this.opts.port = 443
  }

  this.parser = new HTTPParser(HTTPParser.RESPONSE)
  this.requestIterator = new RequestIterator(this.opts)

  this.reqsMade = 0

  // used for request limiting
  this.responseMax = this.opts.responseMax

  // used for rate limiting
  this.reqsMadeThisSecond = 0
  this.rate = this.opts.rate

  // used for forcing reconnects
  this.reconnectRate = this.opts.reconnectRate

  this.resData = new Array(pipelining)
  for (let i = 0; i < pipelining; i++) {
    this.resData[i] = {
      bytes: 0,
      body: '',
      headers: {},
      startTime: [0, 0]
    }
  }

  // cer = current expected response
  this.cer = 0
  this.destroyed = false

  this.opts.setupClient(this)

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

  this.parser[HTTPParser.kOnBody] = (body, start, len) => {
    this.resData[this.cer].body += body.slice(start, start + len)
    this.emit('body', body)
  }

  this.parser[HTTPParser.kOnMessageComplete] = () => {
    const resp = this.resData[this.cer]
    const end = process.hrtime(resp.startTime)
    resp.duration = end[0] * 1e3 + end[1] / 1e6

    if (!this.destroyed && this.reconnectRate && this.reqsMade % this.reconnectRate === 0) {
      return this._resetConnection()
    }

    if (this.opts.expectBody && this.opts.expectBody !== resp.body) {
      return this.emit('mismatch', resp.body)
    }

    this.requestIterator.recordBody(resp.req, resp.headers.statusCode, resp.body)

    this.emit('response', resp.headers.statusCode, resp.bytes, resp.duration, this.rate)

    const rpi = (this.cer + pipelining) % pipelining
    resp.body = ''
    resp.bytes = 0
    this.cer = (this.cer + 1) % pipelining
    this._doRequest(rpi)
  }

  this._connect()
}

inherits(Client, EE)

Client.prototype._connect = function () {
  if (this.secure) {
    let servername
    if (this.opts.servername) {
      servername = this.opts.servername
    } else if (!net.isIP(this.opts.hostname)) {
      servername = this.opts.hostname
    }

    if (this.ipc) {
      this.conn = tls.connect(this.opts.socketPath, { ...this.opts.tlsOptions, rejectUnauthorized: false })
    } else {
      this.conn = tls.connect(this.opts.port, this.opts.hostname, { ...this.opts.tlsOptions, rejectUnauthorized: false, servername })
    }
  } else {
    if (this.ipc) {
      this.conn = net.connect(this.opts.socketPath)
    } else {
      this.conn = net.connect(this.opts.port, this.opts.hostname)
    }
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
    if (this.reqsMade > 0) {
      this.requestIterator.nextRequest()
      if (this.requestIterator.resetted) {
        this.emit('reset')
      }
    }
    this.resData[rpi].req = this.requestIterator.currentRequest
    this.resData[rpi].startTime = process.hrtime()
    this.conn.write(this.getRequestBuffer())
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

Client.prototype.getRequestBuffer = function () {
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

module.exports = Client
