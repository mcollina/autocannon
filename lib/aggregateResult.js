function aggregateResult (results, argv) {
  const aggregated = results.reduce((acc, r) => {
    // acc.requests = addPercentiles(r.requests, histAsObj(requests))

    return acc
  }, {})

  return results[0] || aggregated
}

module.exports = aggregateResult
