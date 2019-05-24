![banner](autocannon-banner.png)

# autocannon

[![Join the chat at https://gitter.im/mcollina/autocannon](https://badges.gitter.im/mcollina/autocannon.svg)](https://gitter.im/mcollina/autocannon?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Travis Build Status](https://travis-ci.org/mcollina/autocannon.svg?branch=master)](https://travis-ci.org/mcollina/autocannon)
[![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/mcollina/autocannon?svg=true)](https://ci.appveyor.com/project/mcollina/autocannon) [![Greenkeeper badge](https://badges.greenkeeper.io/mcollina/autocannon.svg)](https://greenkeeper.io/)


![demo](https://raw.githubusercontent.com/mcollina/autocannon/master/demo.gif)

A HTTP/1.1 benchmarking tool written in node, greatly inspired by [wrk][wrk]
and [wrk2][wrk2], with support for HTTP pipelining and HTTPS.
On _my_ box, *autocannon* can produce more load than `wrk` and `wrk2`.

* [Installation](#install)
* [Usage](#usage)
* [API](#api)
* [Acknowledgements](#acknowledgements)
* [License](#license)

## Install

```
npm i autocannon -g
```

or if you want to use the [API](#api) or as a dependency:

```
npm i autocannon --save
```

## Usage

### Command Line

```
Usage: autocannon [opts] URL

URL is any valid http or https url.
If the PORT environment variable is set, the URL can be a path. In that case 'http://localhost:$PORT/path' will be used as the URL.

Available options:

  -c/--connections NUM
        The number of concurrent connections to use. default: 10.
  -p/--pipelining NUM
        The number of pipelined requests to use. default: 1.
  -d/--duration SEC
        The number of seconds to run the autocannnon. default: 10.
  -a/--amount NUM
        The amount of requests to make before exiting the benchmark. If set, duration is ignored.
  -S/--socketPath
        A path to a Unix Domain Socket or a Windows Named Pipe. A URL is still required in order to send the correct Host header and path.
  --on-port
        Start the command listed after -- on the command line. When it starts listening on a port,
        start sending requests to that port. A URL is still required in order to send requests to
        the correct path. The hostname can be omitted, `localhost` will be used by default.
  -m/--method METHOD
        The http method to use. default: 'GET'.
  -t/--timeout NUM
        The number of seconds before timing out and resetting a connection. default: 10
  -T/--title TITLE
        The title to place in the results for identification.
  -b/--body BODY
        The body of the request. 
	Note: This option needs to be used with the '-H/--headers' option in some frameworks
  -i/--input FILE
        The body of the request. See '-b/body' for more details.
  -H/--headers K=V
        The request headers.
  -B/--bailout NUM
        The number of failures before initiating a bailout.
  -M/--maxConnectionRequests NUM
        The max number of requests to make per connection to the server.
  -O/--maxOverallRequests NUM
        The max number of requests to make overall to the server.
  -r/--connectionRate NUM
        The max number of requests to make per second from an individual connection.
  -R/--overallRate NUM
        The max number of requests to make per second from an all connections.
        connection rate will take precedence if both are set.
        NOTE: if using rate limiting and a very large rate is entered which cannot be met,
              Autocannon will do as many requests as possible per second.
  -D/--reconnectRate NUM
        Some number of requests to make before resetting a connections connection to the
        server.
  -n/--no-progress
        Don't render the progress bar. default: false.
  -l/--latency
        Print all the latency data. default: false.
  -I/--idReplacement
        Enable replacement of [<id>] with a randomly generated ID within the request body. default: false.
  -j/--json
        Print the output as newline delimited json. This will cause the progress bar and results not to be rendered. default: false.
  -f/--forever
        Run the benchmark forever. Efficiently restarts the benchmark on completion. default: false.
  -s/--servername
        Server name for the SNI (Server Name Indication) TLS extension.
  -x/--excludeErrorStats
        Exclude error statistics (non 2xx http responses) from the final latency and bytes per second averages. default: false.
  -v/--version
        Print the version number.
  -h/--help
        Print this menu.
```

autocannon outputs data in tables like this:

```
Running 10s test @ http://localhost:3000
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬──────────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max      │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼──────────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 1 ms │ 0.02 ms │ 0.16 ms │ 16.45 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴──────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 20623   │ 20623   │ 25583   │ 26271   │ 25131.2 │ 1540.94 │ 20615   │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 2.29 MB │ 2.29 MB │ 2.84 MB │ 2.92 MB │ 2.79 MB │ 171 kB  │ 2.29 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

251k requests in 10.05s, 27.9 MB read
```

There are two tables: one for the request latency, and one for the request volume.

The latency table lists the request times at the 2.5% percentile, the fast outliers; at 50%, the median; at 97.5%, the slow outliers; at 99%, the very slowest outliers. Here, lower means faster.

The request volume table lists the amount of requests sent and the amount of bytes downloaded. These values are sampled once per second. Higher values mean more requests were processed. In the above example, 4.78 MB was downloaded in 1 second in the worst case (slowest 1%). Since we only ran for 5 seconds, there are just 5 samples—the Min value and the 1% and 2.5% percentiles are actually all the same sample. With longer durations these numbers will differ more.

When passing the `-l` flag, a third table lists all the latency percentiles recorded by autocannon:

```
┌────────────┬──────────────┐
│ Percentile │ Latency (ms) │
├────────────┼──────────────┤
│ 0.001      │ 0            │
├────────────┼──────────────┤
│ 0.01       │ 0            │
├────────────┼──────────────┤
│ 0.1        │ 0            │
├────────────┼──────────────┤
│ 1          │ 0            │
├────────────┼──────────────┤
│ 2.5        │ 0            │
├────────────┼──────────────┤
│ 10         │ 0            │
├────────────┼──────────────┤
│ 25         │ 0            │
├────────────┼──────────────┤
│ 50         │ 0            │
├────────────┼──────────────┤
│ 75         │ 0            │
├────────────┼──────────────┤
│ 90         │ 0            │
├────────────┼──────────────┤
│ 97.5       │ 0            │
├────────────┼──────────────┤
│ 99         │ 1            │
├────────────┼──────────────┤
│ 99.9       │ 1            │
├────────────┼──────────────┤
│ 99.99      │ 3            │
├────────────┼──────────────┤
│ 99.999     │ 15           │
└────────────┴──────────────┘
```

This can give some more insight if a lot (millions) of requests were sent.

### Programmatically

```js
'use strict'

const autocannon = require('autocannon')

autocannon({
  url: 'http://localhost:3000',
  connections: 10, //default
  pipelining: 1, // default
  duration: 10 // default
}, console.log)

// async/await
async function foo () {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 10, //default
    pipelining: 1, // default
    duration: 10 // default
  })
  console.log(result)
}

```

## API

### autocannon(opts[, cb])

Start autocannon against the given target.

* `opts`: Configuration options for the autocannon instance. This can have the following attributes. _REQUIRED_.
    * `url`: The given target. Can be http or https. _REQUIRED_.
    * `socketPath`: A path to a Unix Domain Socket or a Windows Named Pipe. A `url` is still required in order to send the correct Host header and path. _OPTIONAL_.
    * `connections`: The number of concurrent connections. _OPTIONAL_ default: `10`.
    * `duration`: The number of seconds to run the autocannon. Can be a [timestring](https://www.npmjs.com/package/timestring). _OPTIONAL_ default: `10`.
    * `amount`: A `Number` stating the amount of requests to make before ending the test. This overrides duration and takes precedence, so the test won't end until the amount of requests needed to be completed are completed. _OPTIONAL_.
    * `timeout`: The number of seconds to wait for a response before . _OPTIONAL_ default: `10`.
    * `pipelining`: The number of [pipelined requests](https://en.wikipedia.org/wiki/HTTP_pipelining) for each connection. Will cause the `Client` API to throw when greater than 1. _OPTIONAL_ default: `1`.
    * `bailout`: The threshold of the number of errors when making the requests to the server before this instance bail's out. This instance will take all existing results so far and aggregate them into the results. If none passed here, the instance will ignore errors and never bail out. _OPTIONAL_ default: `undefined`.
    * `method`: The http method to use. _OPTIONAL_ `default: 'GET'`.
    * `title`: A `String` to be added to the results for identification. _OPTIONAL_ default: `undefined`.
    * `body`: A `String` or a `Buffer` containing the body of the request. Insert one or more randomly generated IDs into the body by including `[<id>]` where the randomly generated ID should be inserted (Must also set idReplacement to true). This can be useful in soak testing POST endpoints where one or more fields must be unique. Leave undefined for an empty body. _OPTIONAL_ default: `undefined`.
    * `headers`: An `Object` containing the headers of the request. _OPTIONAL_ default: `{}`.
    * `setupClient`: A `Function` which will be passed the `Client` object for each connection to be made. This can be used to customise each individual connection headers and body using the API shown below. The changes you make to the client in this function will take precedence over the default `body` and `headers` you pass in here. There is an example of this in the samples folder. _OPTIONAL_ default: `function noop () {}`.
    * `maxConnectionRequests`: A `Number` stating the max requests to make per connection. `amount` takes precedence if both are set. _OPTIONAL_
    * `maxOverallRequests`: A `Number` stating the max requests to make overall. Can't be less than `connections`. `maxConnectionRequests` takes precedence if both are set. _OPTIONAL_
    * `connectionRate`: A `Number` stating the rate of requests to make per second from each individual connection. No rate limiting by default. _OPTIONAL_
    * `overallRate`: A `Number` stating the rate of requests to make per second from all connections. `connectionRate` takes precedence if both are set. No rate limiting by default. _OPTIONAL_
    * `reconnectRate`: A `Number` which makes the individual connections disconnect and reconnect to the server whenever it has sent that number of requests. _OPTIONAL_
    * `requests`: An `Array` of `Object`s which represents the sequence of requests to make while benchmarking. Can be used in conjunction with the `body`, `headers` and `method` params above. The `Object`s in this array can have `body`, `headers`, `method`, or `path` attributes, which overwrite those that are passed in this `opts` object. Therefore, the ones in this (`opts`) object take precedence and should be viewed as defaults. Check the samples folder for an example of how this might be used. _OPTIONAL_.
    * `idReplacement`: A `Boolean` which enables the replacement of `[<id>]` tags within the request body with a randomly generated ID, allowing for unique fields to be sent with requests. Check out [an example of programmatic usage](./samples/using-id-replacement.js) can be found in the samples. _OPTIONAL_ default: `false`
    * `forever`: A `Boolean` which allows you to setup an instance of autocannon that restarts indefinitely after emiting results with the `done` event. Useful for efficiently restarting your instance. To stop running forever, you must cause a `SIGINT` or call the `.stop()` function on your instance. _OPTIONAL_ default: `false`
    * `servername`: A `String` identifying the server name for the SNI (Server Name Indication) TLS extension. _OPTIONAL_ default: `undefined`.
    * `excludeErrorStats`: A `Boolean` which allows you to disable tracking non 2xx code responses in latency and bytes per second calculations. _OPTIONAL_ default: `false`.
* `cb`: The callback which is called on completion of a benchmark. Takes the following params. _OPTIONAL_.
    * `err`: If there was an error encountered with the run.
    * `results`: The results of the run.

**Returns** an instance/event emitter for tracking progress, etc. If cb omitted, the return value can also be used as a Promise.

### autocannon.track(instance[, opts])

Track the progress of your autocannon, programmatically.

* `instance`: The instance of autocannon. _REQUIRED_.
* `opts`: Configuration options for tracking. This can have the following attibutes. _OPTIONAL_.
    * `outputStream`: The stream to output to. default: `process.stderr`.
    * `renderProgressBar`: A truthy value to enable the rendering of the progress bar. default: `true`.
    * `renderResultsTable`: A truthy value to enable the rendering of the results table. default: `true`.
    * `renderLatencyTable`: A truthy value to enable the rendering of the advanced latency table. default: `false`.
    * `progressBarString`: A `string` defining the format of the progress display output. Must be valid input for the [progress bar module](http://npm.im/progress). default: `'running [:bar] :percent'`.

Example that just prints the table of results on completion:

```js
'use strict'

const autocannon = require('autocannon')

const instance = autocannon({
  url: 'http://localhost:3000'
}, console.log)

// this is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  instance.stop()
})

// just render results
autocannon.track(instance, {renderProgressBar: false})
```

Checkout [this example](./samples/track-run.js) to see it in use, as well.

### autocannon events

Because an autocannon instance is an `EventEmitter`, it emits several events. these are below:

* `start`: Emitted once everything has been setup in your autocannon instance and it has started. Useful for if running the instance forever.
* `tick`: Emitted every second this autocannon is running a benchmark. Useful for displaying stats, etc. Used by the `track` function.
* `done`: Emitted when the autocannon finishes a benchmark. passes the `results` as an argument to the callback.
* `response`: Emitted when the autocannons http-client gets a http response from the server. This passes the following arguments to the callback:
    * `client`: The `http-client` itself. Can be used to modify the headers and body the client will send to the server. API below.
    * `statusCode`: The http status code of the response.
    * `resBytes`: The response byte length.
    * `responseTime`: The time taken to get a response for the initiating the request.
* `reqError`: Emitted in the case of a request error e.g. a timeout.
* `error`: Emitted if there is an error during the setup phase of autocannon.

### results

The results object emitted by `done` and passed to the `autocannon()` callback has these properties:

* `title`: Value of the `title` option passed to `autocannon()`.
* `url`: The URL that was targeted.
* `socketPath`: The UNIX Domain Socket or Windows Named Pipe that was targeted, or `undefined`.
* `requests`: A histogram object containing statistics about the amount of requests that were sent per second.
* `latency`: A histogram object containing statistics about response latency.
* `throughput`: A histogram object containing statistics about the response data throughput per second.
* `duration`: The amount of time the test took, **in seconds**.
* `errors`: The number of connection errors (including timeouts) that occurred.
* `timeouts`: The number of connection timeouts that occurred.
* `start`: A Date object representing when the test started.
* `finish`: A Date object representing when the test ended.
* `connections`: The amount of connections used (value of `opts.connections`).
* `pipelining`: The number of pipelined requests used per connection (value of `opts.pipelining`).
* `non2xx`: The number of non-2xx response status codes received.

The histogram objects for `requests`, `latency` and `throughput` are [hdr-histogram-percentiles-obj](https://github.com/thekemkid/hdr-histogram-percentiles-obj) objects and have this shape:

* `min`: The lowest value for this statistic.
* `max`: The highest value for this statistic.
* `average`: The average (mean) value.
* `stddev`: The standard deviation.
* `p*`: The XXth percentile value for this statistic. The percentile properties are: `p2_5`, `p50`, `p75`, `p90`, `p97_5`, `p99`, `p99_9`, `p99_99`, `p99_999`.

### `Client` API

This object is passed as the first parameter of both the `setupClient` function and the `response` event from an autocannon instance. You can use this to modify the requests you are sending while benchmarking. This is also an `EventEmitter`, with the events and their params listed below.

* `client.setHeaders(headers)`: Used to modify the headers of the request this client iterator is currently on. `headers` should be an `Object`, or `undefined` if you want to remove your headers.
* `client.setBody(body)`: Used to modify the body of the request this client iterator is currently on. `body` should be a `String` or `Buffer`, or `undefined` if you want to remove the body.
* `client.setHeadersAndBody(headers, body)`: Used to modify the both the headers and body this client iterator is currently on.`headers` and `body` should take the same form as above.
* `client.setRequest(request)`: Used to modify the both the entire request that this client iterator is currently on. Can have `headers`, `body`, `method`, or `path` as attributes. Defaults to the values passed into the autocannon instance when it was created. `Note: call this when modifying multiple request values for faster encoding`
* `client.setRequests(newRequests)`: Used to overwrite the entire requests array that was passed into the instance on initiation. `Note: call this when modifying multiple requests for faster encoding`

### `Client` events

The events a `Client` can emit are listed here:

* `headers`: Emitted when a request sent from this client has received the headers of its reply. This received an `Object` as the parameter.
* `body`: Emitted when a request sent from this client has received the body of a reply. This receives a `Buffer` as the parameter.
* `response`: Emitted when the client has received a completed response for a request it made. This is passed the following arguments:
    * `statusCode`: The http status code of the response.
    * `resBytes`: The response byte length.
    * `responseTime`: The time taken to get a response for the initiating the request.

Example using the autocannon events and the client API and events:

```js
'use strict'

const autocannon = require('autocannon')

const instance = autocannon({
  url: 'http://localhost:3000',
  setupClient: setupClient
}, (err, result) => handleResults(result))
// results passed to the callback are the same as those emitted from the done events
instance.on('done', handleResults)

instance.on('tick', () => console.log('ticking'))

instance.on('response', handleResponse)

function setupClient (client) {
  client.on('body', console.log) // console.log a response body when its received
}

function handleResponse (client, statusCode, resBytes, responseTime) {
  console.log(`Got response with code ${statusCode} in ${responseTime} milliseconds`)
  console.log(`response: ${resBytes.toString()}`)

  //update the body or headers
  client.setHeaders({new: 'header'})
  client.setBody('new body')
  client.setHeadersAndBody({new: 'header'}, 'new body')
}

function handleResults(result) {
  // ...
}
```

<a name="acknowledgements"></a>
## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

Logo and identity designed by Cosmic Fox Design: https://www.behance.net/cosmicfox.

[wrk][wrk] and [wrk2][wrk2] provided great inspiration.

### Chat on Gitter

If you are using autocannon or you have any questions, let us know: [Gitter](https://gitter.im/mcollina/autocannon)

## License

Copyright [Matteo Collina](https://github.com/mcollina) and other contributors, Licensed under [MIT](./LICENSE).

[node-gyp]: https://github.com/nodejs/node-gyp#installation
[wrk]: https://github.com/wg/wrk
[wrk2]: https://github.com/giltene/wrk2
