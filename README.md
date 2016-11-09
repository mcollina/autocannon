![banner](autocannon-banner.png)

# autocannon

[![Join the chat at https://gitter.im/mcollina/autocannon](https://badges.gitter.im/mcollina/autocannon.svg)](https://gitter.im/mcollina/autocannon?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Travis Build Status](https://travis-ci.org/mcollina/autocannon.svg?branch=master)](https://travis-ci.org/mcollina/autocannon)
[![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/mcollina/autocannon?svg=true)](https://ci.appveyor.com/project/mcollina/autocannon)


![demo](https://raw.githubusercontent.com/mcollina/autocannon/master/demo.gif)

A HTTP/1.1 benchmarking tool written in node, greatly inspired by [wrk][wrk]
and [wrk2][wrk2], with support for HTTP pipelining and HTTPS.
On _my_ box, *autocannon* can produce more load than `wrk` and `wrk2`.

* [Installation](#install)
* [Usage](#usage)
* [Benchmarks](#benchmarks)
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

### Supported systems

**autocannon** is supported on Linux, Mac OS X and Windows.
If you see any errors during installation, you might need to configure
your system to compile native addons:
follow the instructions at [node-gyp][node-gyp].

## Usage

### Command Line

```
Usage: autocannon [opts] URL

URL is any valid http or https url.

Available options:

  -c/--connections NUM
        The number of concurrent connections to use. default: 10.
  -p/--pipelining NUM
        The number of pipelined requests to use. default: 1.
  -d/--duration SEC
        The number of seconds to run the autocannnon. default: 10.
  -a/--amount NUM
        The amount of requests to make before exiting the benchmark. If set, duration is ignored.
  -m/--method METHOD
        The http method to use. default: 'GET'.
  -t/--timeout NUM
        The number of seconds before timing out and resetting a connection. default: 10
  -T/--title TITLE
        The title to place in the results for identification.
  -b/--body BODY
        The body of the request.
  -i/--input FILE
        The body of the request.
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
  -j/--json
        Print the output as newline delimited json. This will cause the progress bar and results not to be rendered. default: false.
  -f/--forever
        Run the benchmark forever. Efficiently restarts the benchmark on completion. default: false.
  -v/--version
        Print the version number.
  -h/--help
        Print this menu.
```

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
```

## API

### autocannon(opts[, cb])

Start autocannon against the given target.

* `opts`: Configuration options for the autocannon instance. This can have the following attributes. _REQUIRED_.
    * `url`: The given target. Can be http or https. _REQUIRED_.
    * `connections`: The number of concurrent connections. _OPTIONAL_ default: `10`.
    * `duration`: The number of seconds to run the autocannon. Can be a [timestring](https://www.npmjs.com/package/timestring). _OPTIONAL_ default: `10`.
    * `amount`: A `Number` stating the amount of requests to make before ending the test. This overrides duration and takes precedence, so the test won't end until the amount of requests needed to be completed are completed. _OPTIONAL_.
    * `timeout`: The number of seconds to wait for a response before . _OPTIONAL_ default: `10`.
    * `pipelining`: The number of [pipelined requests](https://en.wikipedia.org/wiki/HTTP_pipelining) for each connection. Will cause the `Client` API to throw when greater than 1. _OPTIONAL_ default: `1`.
    * `bailout`: The threshold of the number of errors when making the requests to the server before this instance bail's out. This instance will take all existing results so far and aggregate them into the results. If none passed here, the instance will ignore errors and never bail out. _OPTIONAL_ default: `undefined`.
    * `method`: The http method to use. _OPTIONAL_ `default: 'GET'`.
    * `title`: A `String` to be added to the results for identification. _OPTIONAL_ default: `undefined`.
    * `body`: A `String` or a `Buffer` containing the body of the request. Leave undefined for an empty body. _OPTIONAL_ default: `undefined`.
    * `headers`: An `Object` containing the headers of the request. _OPTIONAL_ default: `{}`.
    * `setupClient`: A `Function` which will be passed the `Client` object for each connection to be made. This can be used to customise each individual connection headers and body using the API shown below. The changes you make to the client in this function will take precedence over the default `body` and `headers` you pass in here. There is an example of this in the samples folder. _OPTIONAL_ default: `function noop () {}`.
    * `maxConnectionRequests`: A `Number` stating the max requests to make per connection. `amount` takes precedence if both are set. _OPTIONAL_
    * `maxOverallRequests`: A `Number` stating the max requests to make overall. Can't be less than `connections`. `maxConnectionRequests` takes precedence if both are set. _OPTIONAL_
    * `connectionRate`: A `Number` stating the rate of requests to make per second from each individual connection. No rate limiting by default. _OPTIONAL_
    * `overallRate`: A `Number` stating the rate of requests to make per second from all connections. `conenctionRate` takes precedence if both are set. No rate limiting by default. _OPTIONAL_
    * `reconnectRate`: A `Number` which makes the individual connections disconnect and reconnect to the server whenever it has sent that number of requests. _OPTIONAL_
    * `requests`: An `Array` of `Object`s which represents the sequence of requests to make while benchmarking. Can be used in conjunction with the `body`, `headers` and `method` params above. The `Object`s in this array can have `body`, `headers`, `method`, or `path` attributes, which overwrite those that are passed in this `opts` object. Therefore, the ones in this (`opts`) object take precedence and should be viewed as defaults. Check the samples folder for an example of how this might be used. _OPTIONAL_.
    * `forever`: A `Boolean` which allows you to setup an instance of autocannon that restarts indefinatly after emiting results with the `done` event. Useful for efficiently restarting your instance. To stop running forever, you must cause a `SIGINT` or call the `.stop()` function on your instance. _OPTIONAL_ default: `false`
* `cb`: The callback which is called on completion of a benchmark. Takes the following params. _OPTIONAL_.
    * `err`: If there was an error encountered with the run.
    * `results`: The results of the run.

**Returns** an instance/event emitter for tracking progress, etc.

### autocannon.track(instance[, opts])

Track the progress of your autocannon, programmatically.

* `instance`: The instance of autocannon. _REQUIRED_.
* `opts`: Configuration options for tracking. This can have the following attibutes. _OPTIONAL_.
    * `outputStream`: The stream to output to. default: `process.stderr`.
    * `renderProgressBar`: A truthy value to enable the rendering of the progress bar. default: `true`.
    * `renderResultTable`: A truthy value to enable the rendering of the results table. default: `true`.
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

Logo and identity designed by Beibhinn Murphy O'Brien: https://www.behance.net/BeibhinnMurphyOBrien.

[wrk][wrk] and [wrk2][wrk2] provided great inspiration.

### Chat on Gitter

If you are using autocannon or you have any questions, let us know: [Gitter](https://gitter.im/mcollina/autocannon)

## License

Copyright [Matteo Collina](https://github.com/mcollina) and other contributors, Licensed under [MIT](./LICENSE).

[node-gyp]: https://github.com/nodejs/node-gyp#installation
[wrk]: https://github.com/wg/wrk
[wrk2]: https://github.com/giltene/wrk2
