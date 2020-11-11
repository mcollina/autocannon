'use strict'

const printResult = require('./printResult')

const defaults = {
  renderResultsTable: true,
  renderLatencyTable: false
}

const printResultAPI = (result, opts) => {
  opts = Object.assign({ returnAsString: true }, defaults, opts)

  return printResult(result, opts)
}

module.exports = printResultAPI
