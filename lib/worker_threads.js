const semver = require('semver')

if (semver.lt(process.versions.node, '11.7.0')) {
  module.exports = {
    isMainThread: true
  }
} else {
  module.exports = require('worker_threads')
}
