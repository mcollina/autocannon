'use strict'

const hyperid = require('hyperid')(true)
const inherits = require('util').inherits
const requestBuilder = require('./httpRequestBuilder')

function RequestIterator (opts) {
  if (!(this instanceof RequestIterator)) {
    return new RequestIterator(opts)
  }

  this.context = {}
  this.reqDefaults = opts
  this.requestBuilder = requestBuilder(opts)
  this.setRequests(opts.requests)
}

inherits(RequestIterator, Object)

RequestIterator.prototype.nextRequest = function () {
  ++this.currentRequestIndex
  this.currentRequestIndex = this.currentRequestIndex < this.requests.length ? this.currentRequestIndex : 0
  if (this.currentRequestIndex === 0) {
    this.context = {}
  }
  this.currentRequest = this.requests[this.currentRequestIndex]
  this.rebuildRequest()
  return this.currentRequest
}

RequestIterator.prototype.nextRequestBuffer = function () {
  // get next request
  this.nextRequest()
  return this.currentRequest.requestBuffer
}

RequestIterator.prototype.setRequests = function (newRequests) {
  this.requests = newRequests || [{}]
  this.currentRequestIndex = 0
  this.currentRequest = this.requests[0]
  this.rebuildRequest()
}

RequestIterator.prototype.setHeaders = function (newHeaders) {
  this.currentRequest.headers = newHeaders || {}
  this.rebuildRequest()
}

RequestIterator.prototype.setBody = function (newBody) {
  this.currentRequest.body = newBody || Buffer.alloc(0)
  this.rebuildRequest()
}

RequestIterator.prototype.setHeadersAndBody = function (newHeaders, newBody) {
  this.currentRequest.headers = newHeaders || {}
  this.currentRequest.body = newBody || Buffer.alloc(0)
  this.rebuildRequest()
}

RequestIterator.prototype.setRequest = function (newRequest) {
  this.currentRequest = newRequest || {}
  this.rebuildRequest()
}

RequestIterator.prototype.rebuildRequest = function () {
  if (this.currentRequest) {
    const data = this.requestBuilder(this.currentRequest, this.context)
    this.currentRequest.requestBuffer = this.reqDefaults.idReplacement
      ? Buffer.from(data.toString().replace(/\[<id>\]/g, hyperid()))
      : data
  }
}

RequestIterator.prototype.expectsBody = function () {
  return this.currentRequest && typeof this.currentRequest.onResponse === 'function'
}

RequestIterator.prototype.recordBody = function (status, body) {
  if (this.expectsBody()) {
    this.currentRequest.onResponse(status, body, this.context)
  }
}

module.exports = RequestIterator
