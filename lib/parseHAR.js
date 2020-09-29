'use strict'

const fs = require('fs')

function parse (data) {
  try {
    const har = JSON.parse(data)
    if (typeof har !== 'object' || typeof har.log !== 'object' || !Array.isArray(har.log.entries) || !har.log.entries.length) {
      throw new Error('file has no entries')
    }
    const entries = new Array(har.log.entries.length)
    for (let i = 0; i < entries.length; i++) {
      const { request: { method, url, headers: headerArray, postData } } = har.log.entries[i]
      // turn headers array to headers object
      const headers = {}
      for (const { name, value } of headerArray) {
        headers[name] = value
      }
      const { pathname, hash, search, origin } = new URL(url)
      entries[i] = {
        origin,
        method,
        // only keep path & hash as our HttpClient will handle origin
        path: `${pathname}${search}${hash}`,
        headers
      }
      if (typeof postData === 'object' && 'text' in postData) {
        entries[i].body = postData.text
      }
    }
    return entries
  } catch (err) {
    throw new Error(`Could not parse HAR file: ${err.message}`)
  }
}

function parseHAR (file, cb) {
  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      return cb(err)
    }
    try {
      cb(null, parse(data))
    } catch (err) {
      return cb(err)
    }
  })
}

function parseHARSync (file) {
  return parse(fs.readFileSync(file, 'utf8'))
}

exports.parseHAR = parseHAR
exports.parseHARSync = parseHARSync
