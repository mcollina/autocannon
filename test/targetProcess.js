const server = require('./helper').startServer()

server.ref()
process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})
