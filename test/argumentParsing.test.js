'use strict'

const test = require('tap').test
const Autocannon = require('../autocannon')

test('parse argument', (t) => {
  t.plan(4)

  var args = Autocannon.parseArguments([
    '-H', 'X-Http-Method-Override=GET',
    '-m', 'POST',
    '-b', 'the body',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, { 'X-Http-Method-Override': 'GET' })
  t.equal(args.method, 'POST')
  t.equal(args.body, 'the body')
})

test('parse argument with multiple headers', (t) => {
  t.plan(3)

  var args = Autocannon.parseArguments([
    '-H', 'header1=value1',
    '-H', 'header2=value2',
    '-H', 'header3=value3',
    '-H', 'header4=value4',
    '-H', 'header5=value5',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, {
    'header1': 'value1',
    'header2': 'value2',
    'header3': 'value3',
    'header4': 'value4',
    'header5': 'value5'
  })
  t.equal(args.method, 'GET')
})

test('parse argument with "=" in value header', (t) => {
  t.plan(1)

  var args = Autocannon.parseArguments([
    '-H', 'header1=foo=bar',
    'http://localhost/foo/bar'
  ])

  t.strictSame(args.headers, {
    'header1': 'foo=bar'
  })
})
