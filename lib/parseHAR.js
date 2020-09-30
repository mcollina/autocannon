'use strict'

// given we support node v8
// eslint-disable-next-line node/no-deprecated-api
const { parse } = require('url')

function parseHAR (har) {
  const requestsPerOrigin = new Map()
  try {
    if (!har || typeof har !== 'object' || typeof har.log !== 'object' || !Array.isArray(har.log.entries) || !har.log.entries.length) {
      throw new Error('no entries found')
    }
    for (const { request: { method, url, headers: headerArray, postData } } of har.log.entries) {
      // turn headers array to headers object
      const headers = {}
      for (const { name, value } of headerArray) {
        headers[name] = value
      }
      const { path, hash, host, protocol } = parse(url)
      const origin = `${protocol}//${host}`

      let requests = requestsPerOrigin.get(origin)
      if (!requests) {
        requests = []
        requestsPerOrigin.set(origin, requests)
      }
      const request = {
        origin,
        method,
        // only keep path & hash as our HttpClient will handle origin
        path: `${path}${hash || ''}`,
        headers
      }
      if (typeof postData === 'object' && 'text' in postData) {
        request.body = postData.text
      }
      requests.push(request)
    }
  } catch (err) {
    throw new Error(`Could not parse HAR content: ${err.message}`)
  }
  return requestsPerOrigin
}

exports.parseHAR = parseHAR
