const defaultOptions = {
  headers: {},
  body: Buffer.alloc(0),
  method: 'GET',
  duration: 10,
  connections: 10,
  pipelining: 1,
  timeout: 10,
  maxConnectionRequests: 0,
  maxOverallRequests: 0,
  connectionRate: 0,
  overallRate: 0,
  amount: 0,
  reconnectRate: 0,
  forever: false,
  idReplacement: false,
  requests: [{}],
  servername: undefined,
  excludeErrorStats: false
}

module.exports = defaultOptions
