const methods = [
  'GET',
  'DELETE',
  'POST',
  'PUT'
]

// buildRequest takes an object, and turns it into a buffer representing the
// http request
function buildRequest (reqData, defaults) {
  defaults = defaults || {}

  const method = reqData.method || defaults.method || 'GET'
  const path = reqData.path || defaults.path || '/'
  const headers = reqData.headers || defaults.headers || {}
  const body = reqData.body || defaults.body

  let host = reqData.host
  if (!host) {
    const hostname = reqData.hostname || defaults.hostname || 'localhost'
    const port = reqData.port || 80
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

  if (bodyBuf) {
    headers['Content-Length'] = '' + bodyBuf.length
  }

  let req = Object.keys(headers)
    .map((key) => `${key}: ${headers[key]}\r\n`)
    .reduce((acc, str) => acc + str, baseReq)

  req = new Buffer(req + '\r\n', 'utf8')

  if (bodyBuf) {
    req = Buffer.concat([req, bodyBuf, new Buffer('\r\n')])
  }

  return req
}

module.exports = buildRequest
