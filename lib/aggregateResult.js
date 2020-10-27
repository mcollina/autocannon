'use strict'

const hdr = require('hdr-histogram-js')
const histUtil = require('hdr-histogram-percentiles-obj')

const histAsObj = histUtil.histAsObj
const addPercentiles = histUtil.addPercentiles

function aggregateResult (results, opts) {
  results = Array.isArray(results) ? results : [results]

  const aggregated = results.map(r => ({
    ...r,
    latencies: hdr.decodeFromCompressedBase64(r.latencies),
    requests: hdr.decodeFromCompressedBase64(r.requests),
    throughput: hdr.decodeFromCompressedBase64(r.throughput)
  })).reduce((acc, r) => {
    acc.latencies.add(r.latencies)
    acc.requests.add(r.requests)
    acc.throughput.add(r.throughput)

    acc.totalCompletedRequests += r.totalCompletedRequests
    acc.totalRequests += r.totalRequests
    acc.totalBytes += r.totalBytes

    acc.errors += r.errors
    acc.timeouts += r.timeouts
    acc.mismatches += r.mismatches
    acc.non2xx += r.non2xx
    acc.resets += r.resets

    return acc
  })

  const result = {
    title: opts.title,
    url: opts.url,
    socketPath: opts.socketPath,
    connections: opts.connections,
    pipelining: opts.pipelining,

    duration: aggregated.duration,
    start: aggregated.start,
    finish: aggregated.finish,
    errors: aggregated.errors,
    timeouts: aggregated.timeouts,
    mismatches: aggregated.mismatches,
    non2xx: aggregated.non2xx,
    resets: aggregated.resets,
    '1xx': aggregated['1xx'],
    '2xx': aggregated['2xx'],
    '3xx': aggregated['3xx'],
    '4xx': aggregated['4xx'],
    '5xx': aggregated['5xx'],

    requests: addPercentiles(aggregated.requests, histAsObj(aggregated.requests, aggregated.totalCompletedRequests)),
    latency: addPercentiles(aggregated.latencies, histAsObj(aggregated.latencies)),
    throughput: addPercentiles(aggregated.throughput, histAsObj(aggregated.throughput, aggregated.totalBytes))
  }

  result.latency.totalCount = aggregated.latencies.totalCount
  result.requests.sent = aggregated.totalRequests

  if (result.requests.min >= Number.MAX_SAFE_INTEGER) result.requests.min = 0
  if (result.throughput.min >= Number.MAX_SAFE_INTEGER) result.throughput.min = 0
  if (result.latency.min >= Number.MAX_SAFE_INTEGER) result.latency.min = 0

  return result
}

module.exports = aggregateResult
