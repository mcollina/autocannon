'use strict'

const { resolve, basename } = require('path')
const { readFileSync } = require('fs')
const { randomBytes } = require('crypto')

function getFormData (string) {
  try {
    return JSON.parse(string)
  } catch (error) {
    try {
      const path = resolve(string)
      const data = readFileSync(path, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      throw new Error('Invalid JSON or file where to get form data')
    }
  }
}

function generateBoundary () {
  return '----Autocannon' + randomBytes(16).toString('hex')
}

class MultipartFormData {
  constructor () {
    this._entries = []
    this._boundary = generateBoundary()
  }

  append (key, value, opts) {
    this._entries.push({ key, value, opts })
  }

  getHeaders () {
    return {
      'content-type': `multipart/form-data; boundary=${this._boundary}`
    }
  }

  getBuffer () {
    const parts = []
    for (const entry of this._entries) {
      parts.push(Buffer.from(
        `--${this._boundary}\r\nContent-Disposition: form-data; name="${entry.key}"`
      ))
      if (entry.opts && entry.opts.filename) {
        parts[parts.length - 1] = Buffer.from(
          `--${this._boundary}\r\nContent-Disposition: form-data; name="${entry.key}"; filename="${entry.opts.filename}"` +
          (entry.opts.contentType ? `\r\nContent-Type: ${entry.opts.contentType}` : '')
        )
      }
      parts.push(Buffer.from('\r\n\r\n'))
      if (Buffer.isBuffer(entry.value)) {
        parts.push(entry.value)
      } else {
        parts.push(Buffer.from(String(entry.value)))
      }
      parts.push(Buffer.from('\r\n'))
    }
    parts.push(Buffer.from(`--${this._boundary}--\r\n`))
    return Buffer.concat(parts)
  }
}

module.exports = (options) => {
  const obj = typeof options === 'string' ? getFormData(options) : options
  const form = new MultipartFormData()
  for (const key in obj) {
    const type = obj[key] && obj[key].type
    switch (type) {
      case 'file': {
        const path = obj[key] && obj[key].path
        if (!path) {
          throw new Error(`Missing key 'path' in form object for key '${key}'`)
        }
        const opts = obj[key] && obj[key].options
        const buffer = readFileSync(path)
        form.append(key, buffer, {
          filename: (opts && opts.filename) || basename(path),
          contentType: opts && opts.contentType
        })
        break
      }
      case 'text': {
        const value = obj[key] && obj[key].value
        if (!value) {
          throw new Error(`Missing key 'value' in form object for key '${key}'`)
        }
        form.append(key, value)
        break
      }
      default:
        throw new Error('A \'type\' key with value \'text\' or \'file\' should be specified')
    }
  }
  return form
}
