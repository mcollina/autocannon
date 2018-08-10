'use strict'

const onListen = require('on-net-listen')
const fs = require('fs')

onListen(function (addr) {
  this.destroy()
  const port = Buffer.from(addr.port + '')
  fs.writeSync(3, port, 0, port.length)
})

// `nitm` catches the SIGINT so we write it to a file descriptor instead
const stream = fs.createReadStream('/', { fd: 3 })
process.on('exit', () => stream.close())
stream.once('data', (chunk) => {
  if (chunk.toString() === 'SIGINT') process.exit(0)
})
