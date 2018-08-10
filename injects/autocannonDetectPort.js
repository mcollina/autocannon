'use strict'

const onListen = require('on-net-listen')
const net = require('net')

const socket = net.connect(process.env.AUTOCANNON_SOCKET, {
  allowHalfOpen: true
})

onListen(function (addr) {
  this.destroy()
  const port = Buffer.from(addr.port + '')
  socket.end(port)
})

// `nitm` catches the SIGINT so we write it to a file descriptor instead
socket.once('data', (chunk) => {
  if (chunk.toString() === 'SIGINT') process.exit(0)
})
socket.unref()
