'use strict'

const onListen = require('on-net-listen')
const fs = require('fs')

onListen(function (addr) {
  this.destroy()
  const port = Buffer.from(addr.port + '')
  fs.writeSync(3, port, 0, port.length)
  fs.closeSync(3)
})
