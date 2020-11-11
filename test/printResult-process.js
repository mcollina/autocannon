'use strict'

const autocannon = require('../autocannon')
const exampleResult = require('./fixtures/example-result.json')

const resultStr = autocannon.printResult(exampleResult)
process.stderr.write(resultStr)
