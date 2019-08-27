'use strict'

const hyperid = require('hyperid')(true)
const inherits = require('util').inherits
const requestBuilder = require('./httpRequestBuilder')

function RequestIterator (opts) {
  if (!(this instanceof RequestIterator)) {
    return new RequestIterator(opts)
  }

  this.reqDefaults = opts
  this.requestBuilder = requestBuilder(opts)
  this.setRequests(opts.requests)
}

inherits(RequestIterator, Object)

RequestIterator.prototype.nextRequest = function () {
  ++this.currentRequestIndex
  this.currentRequestIndex = this.currentRequestIndex < this.requests.length ? this.currentRequestIndex : 0
  this.currentRequest = this.requests[this.currentRequestIndex]
  return this.currentRequest
}

RequestIterator.prototype.nextRequestBuffer = function () {
  // get next request
  this.nextRequest()
  return this.currentRequest.requestBuffer
}

RequestIterator.prototype.move = function () {
  // get the current buffer and proceed to next request
  const ret = this.currentRequest.requestBuffer
  this.nextRequest()
  return this.reqDefaults.idReplacement
    ? Buffer.from(ret.toString().replace(/\[<id>\]/g, hyperid()))
    : ret
}

RequestIterator.prototype.setRequests = function (newRequests) {
  this.requests = newRequests || [{}]
  this.currentRequestIndex = 0
  this.currentRequest = this.requests[0]
  this.rebuildRequests()
}

RequestIterator.prototype.rebuildRequests = function () {
  this.requests.forEach((request) => {
    request.requestBuffer = this.requestBuilder(request)
  })
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
  this.currentRequest.requestBuffer = this.requestBuilder(this.currentRequest)
  this.requests[this.currentRequestIndex] = this.currentRequest
}

module.exports = RequestIterator
