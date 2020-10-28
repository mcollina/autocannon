'use strict'

const run = require('./run')
const track = require('./progressTracker')

function runTracker (argv, ondone) {
  const tracker = run(argv)

  // While using workers, tracking is handled in manager.js
  if (argv.numWorkers) return

  tracker.on('done', (result) => {
    if (ondone) ondone()
    if (argv.json) {
      console.log(JSON.stringify(result))
    }
  })

  tracker.on('error', (err) => {
    if (err) {
      throw err
    }
  })

  // if not rendering json, or if std isn't a tty, track progress
  if (!argv.json || !process.stdout.isTTY) track(tracker, argv)

  process.once('SIGINT', () => {
    tracker.stop()
  })
}

module.exports = runTracker
