'use strict'

const xtend = require('xtend')
const methods = require('./httpMethods')

// this is a build request factory, that curries the build request function
// and sets the default for it
function requestBuilder (defaults) {
  // these need to be defined per request builder creation, because of the way
  // headers don't get deep copied
  const builderDefaults = {
    method: 'GET',
    path: '/',
    headers: {},
    body: new Buffer(0),
    hostname: 'localhost',
    port: 80
  }

  defaults = xtend(builderDefaults, defaults)

  // buildRequest takes an object, and turns it into a buffer representing the
  // http request
  return function buildRequest (reqData) {
    // below is a hack to enable deep extending of the headers so the default
    // headers object isn't overwritten by accident
    reqData = reqData || {}
    reqData.headers = xtend(defaults.headers, reqData.headers)

    reqData = xtend(defaults, reqData)
    // for some reason some tests fail with method === undefined
    // the reqData.method should be set to SOMETHING in this case
    // cannot find reason for failure if `|| 'GET'` is taken out
    const method = reqData.method
    const path = reqData.path
    const headers = reqData.headers
    const body = reqData.body

    let host = reqData.host
    if (!host) {
      const hostname = reqData.hostname
      const port = reqData.port
      host = hostname + ':' + port
    }

    if (methods.indexOf(method) < 0) {
      throw new Error(`${method} HTTP method is not supported`)
    }

    const baseReq = `${method} ${path} HTTP/1.1\r\nHost: ${host}\r\nConnection: keep-alive\r\n`

    let bodyBuf

    if (typeof body === 'string') {
      bodyBuf = new Buffer(body)
    } else if (Buffer.isBuffer(body)) {
      bodyBuf = body
    } else if (body) {
      throw new Error('body must be either a string or a buffer')
    }

    if (bodyBuf && bodyBuf.length > 0) {
      headers['Content-Length'] = '' + bodyBuf.length
    }

    let req = Object.keys(headers)
      .map((key) => `${key}: ${headers[key]}\r\n`)
      .reduce((acc, str) => acc + str, baseReq)

    req = new Buffer(req + '\r\n', 'utf8')

    if (bodyBuf && bodyBuf.length > 0) {
      req = Buffer.concat([req, bodyBuf, new Buffer('\r\n')])
    }

    return req
  }
}

module.exports = requestBuilder
