'use strict'

const test = require('tap').test
const { parseHARSync, parseHAR } = require('../lib/parseHAR')

test('should synchronously report unknown file', (t) => {
  t.plan(1)

  t.throws(() => parseHARSync('./does-no-exist.har'), /ENOENT: no such file or directory/)
  t.end()
})

test('should synchronously report unparseable file', (t) => {
  t.plan(1)

  t.throws(() => parseHARSync(require.resolve('./key.pem')), /Could not parse HAR file: Unexpected number in JSON/)
  t.end()
})

test('should asynchronously report unknown file', (t) => {
  t.plan(1)

  parseHAR('./does-no-exist.har', (err) => {
    t.match(err, /ENOENT: no such file or directory/)
    t.end()
  })
})

test('should asynchronously report unparseable file', (t) => {
  t.plan(1)

  parseHAR(require.resolve('./key.pem'), (err) => {
    t.match(err, /Could not parse HAR file: Unexpected number in JSON/)
    t.end()
  })
})

test('should report empty HAR file', (t) => {
  t.plan(1)

  t.throws(() => parseHARSync(require.resolve('./fixtures/empty-entries.har')), /Could not parse HAR file: file has no entries/)
  t.end()
})

test('should report HAR with no entries', (t) => {
  t.plan(1)

  t.throws(() => parseHARSync(require.resolve('./fixtures/no-entries.har')), /Could not parse HAR file: file has no entries/)
  t.end()
})

test('should report HAR with empty entries', (t) => {
  t.plan(1)

  t.throws(() => parseHARSync(require.resolve('./fixtures/empty-entries.har')), /Could not parse HAR file: file has no entries/)
  t.end()
})

test('should parse and return GET entries', (t) => {
  t.plan(1)

  t.strictSame(parseHARSync(require.resolve('./fixtures/httpbin-get.har')), [{
    method: 'GET',
    origin: 'https://httpbin.org',
    path: '/get',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      DNT: '1',
      Connection: 'keep-alive'
    }
  }, {
    method: 'GET',
    origin: 'https://httpbin.org',
    path: '/get?from=10&size=20&sort=+name',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    }
  }])
  t.end()
})

test('should parse and return POST entries', (t) => {
  t.plan(1)

  t.strictSame(parseHARSync(require.resolve('./fixtures/httpbin-post.har')), [{
    method: 'POST',
    origin: 'https://httpbin.org',
    path: '/post',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      'Content-Type': 'multipart/form-data; boundary=---------------------------31420230025845772252453285324',
      Origin: 'https://httpbin.org',
      'Content-Length': '362',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: '-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="text"\r\n\r\na text value\r\n-----------------------------31420230025845772252453285324\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\nHello World!\n\r\n-----------------------------31420230025845772252453285324--\r\n'
  }, {
    method: 'POST',
    origin: 'https://httpbin.org',
    path: '/post',
    headers: {
      Host: 'httpbin.org',
      'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
      Accept: '*/*',
      'Accept-Language': 'fr,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: 'https://httpbin.org/',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://httpbin.org',
      'Content-Length': '27',
      DNT: '1',
      Connection: 'keep-alive',
      TE: 'Trailers'
    },
    body: 'text=a+text+value&number=10'
  }])
  t.end()
})
