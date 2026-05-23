'use strict'

const autocannon = require('../autocannon')
const exampleResult = require('./fixtures/example-result.json')
const exampleResultWithNon2xxResponses = require('./fixtures/example-result-non2xx.json')
const crossArgv = require('cross-argv')
const validateOpts = require('../lib/validate')

let opts = null

if (process.argv.length > 2) {
  const args = crossArgv(process.argv.slice(2))
  opts = autocannon.parseArguments(args)
}

let fixture = exampleResult

if (opts?.renderOnlyStatusCode) {
  fixture = exampleResultWithNon2xxResponses
  opts.renderOnlyStatusCode = validateOpts(opts).renderOnlyStatusCode
}

const resultStr = autocannon.printResult(fixture, opts)
process.stderr.write(resultStr)
