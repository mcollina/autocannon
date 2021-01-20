'use strict'

const semver = require('semver')
const hasWorkerSupport = semver.gte(process.versions.node, '11.7.0')

module.exports = { hasWorkerSupport }
