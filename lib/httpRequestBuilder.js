'use strict'

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
    body: Buffer.alloc(0),
    hostname: 'localhost',
    chunkSize: 0,
    setupRequest: reqData => reqData,
    port: 80
  }

  defaults = Object.assign(builderDefaults, defaults)

  // cache chunks to avoid reprocessing
  const chunkBodyCache = {}
  const chunkBody = (body, size) => {
    if (size === 0) {
      return body
    }
    if (chunkBodyCache[body]) {
      return chunkBodyCache[body]
    }

    const chunks = []
    let found = body.search(/\[<id>\]/g)
    found = found === -1 ? false : found
    let start = 0
    while (start < body.length) {
      if (found && (start + size) > found) {
        chunks.push(body.substr(start, found - start))
        chunks.push('[<id>]')
        start = found + '[<id>]'.length
        found = false
        continue
      }
      chunks.push(body.substr(start, size))
      start = start + size
    }
    chunkBodyCache[body] = chunks
    return chunks
  }

  const makeChunkedBody = (chunks) => {
    if (typeof chunks === 'string') {
      return [Buffer.from(chunks)]
    }
    const body = []
    for (let i = 0; i < chunks.length; ++i) {
      const chunk = chunks[i]
      if (typeof chunk === 'string') {
        body.push(Buffer.from(`${chunk.length}\r\n`))
        body.push(Buffer.concat([Buffer.from(chunk), Buffer.from('\r\n')]))
      } else if (Buffer.isBuffer(chunk)) {
        body.push(Buffer.from(`${chunk.length}\r\n`))
        body.push(Buffer.concat([chunk, Buffer.from('\r\n')]))
      } else {
        throw new Error('body item must be either a string or a buffer')
      }
    }
    body.push(Buffer.from('0\r\n')) // End of request marker
    return body
  }

  // buildRequest takes an object, and turns it into a buffer representing the
  // http request
  return function buildRequest (reqData) {
    // below is a hack to enable deep extending of the headers so the default
    // headers object isn't overwritten by accident
    reqData = reqData || {}
    reqData.headers = Object.assign({}, defaults.headers, reqData.headers)

    reqData = Object.assign({}, defaults, reqData)

    reqData = reqData.setupRequest(reqData)

    // for some reason some tests fail with method === undefined
    // the reqData.method should be set to SOMETHING in this case
    // cannot find reason for failure if `|| 'GET'` is taken out
    const method = reqData.method
    const path = reqData.path
    const headers = reqData.headers
    const body = reqData.body
    const chunkSize = reqData.chunkSize

    let host = reqData.headers.host || reqData.host
    if (!host) {
      const hostname = reqData.hostname
      const port = reqData.port
      host = hostname + ':' + port
    }

    if (reqData.auth) {
      const encodedAuth = Buffer.from(reqData.auth).toString('base64')
      headers.Authorization = `Basic ${encodedAuth}`
    }

    if (methods.indexOf(method) < 0) {
      throw new Error(`${method} HTTP method is not supported`)
    }

    const baseReq = [
      `${method} ${path} HTTP/1.1`,
      `Host: ${host}`,
      'Connection: keep-alive'
    ]

    let bodyBuf

    if (typeof body === 'string') {
      bodyBuf = makeChunkedBody(chunkBody(body, chunkSize))
    } else if (Buffer.isBuffer(body)) {
      bodyBuf = [body]
    } else if (Array.isArray(body)) {
      bodyBuf = makeChunkedBody(body)
    } else if (body) {
      throw new Error('body must be either a string or a buffer or an array')
    }

    if (bodyBuf && bodyBuf.length > 0) {
      if (bodyBuf.length > 1) {
        headers['Transfer-Encoding'] = 'chunked'
      } else if (bodyBuf[0].length > 0) {
        const idCount = reqData.idReplacement
          ? (bodyBuf[0].toString().match(/\[<id>\]/g) || []).length
          : 0
        headers['Content-Length'] = `${bodyBuf[0].length + (idCount * 27)}`
      }
    }

    for (const [key, header] of Object.entries(headers)) {
      baseReq.push(`${key}: ${header}`)
    }

    let req = Buffer.from(baseReq.join('\r\n') + '\r\n\r\n', 'utf8')

    if (bodyBuf && bodyBuf.length > 0) {
      bodyBuf.unshift(req)
      req = Buffer.concat(bodyBuf)
    }

    return req
  }
}

module.exports = requestBuilder
