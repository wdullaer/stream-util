/*!
 * module deps
 */

import domain from 'domain'
import { Readable, Transform } from 'stream'
import co from 'co'

/**
 * LogStream
 *
 * transform stream that log data before passing it down the stream
 */

class LogStream extends Transform {

  constructor(logfn = (x) => console.log(x)) {
    super({ objectMode: true })
    this.log = logfn
  }

  _transform(chunk, encoding, callback) {
    this.log(chunk)
    callback(null, chunk)
  }
}

/**
 * FromArrayStream
 *
 * Readable stream that transdorm an array into stream
 */

class FromArrayStream extends Readable {

  constructor(values = []) {
    super({ objectMode: true })
    this.values = values
  }

  _read() {
    this.values.forEach((v) => this.push(v))
    this.push(null)
  }
}

/**
 * ReadAsyncStream
 */

class ReadAsyncStream extends Readable {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = co.wrap(fn)
  }

  _read() {
    if (this.reading) return
    this.reading = true

    this.fn()
    .then((val) => { this.push(val); this.push(null) })
    .catch((err) => setImmediate(() => this.emit('error', err)))
  }
}

/**
 * MapSyncStream
 */

class MapSyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = fn
  }

  _transform(chunk, encoding, callback) {
    callback(null, this.fn(chunk))
  }
}

/**
 * MapAsyncStream
 */

class MapAsyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = co.wrap(fn)
  }

  _transform(chunk, encoding, callback) {
    this.fn(chunk)
    .then((val) => { callback(null, val) })
    .catch((err) => setImmediate(() => callback(err)))
  }
}

/**
 * ThroughSyncStream
 */

class ThroughSyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = fn.bind(this)
  }

  _transform(chunk, encoding, callback) {
    this.fn(chunk)
    callback()
  }
}

/**
 * ThroughAsyncStream
 */

class ThroughAsyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = co.wrap(fn.bind(this))
  }

  _transform(chunk, encoding, callback) {
    this.fn(chunk)
    .then(() => callback())
    .catch((err) => setImmediate(() => callback(err)))
  }
}

/**
 * concat streams
 *
 * @return {Stream}
 */

class ConcatStream extends Readable {

  constructor(streams) {
    super({ objectMode: true })
    this.streams = streams
    this.endCount = 0
  }

  _read() {
    if (this.resumed) return
    this.resumed = true
    this.resume()

    this.streams.forEach((stream) => {
      stream.on('data', (data) => { this.push(data) })
      stream.on('error', (err) => this.emit('error', err))
      stream.on('end', () => {
        if (++this.endCount === this.streams.length) { this.push(null) }
      })
  })

  }
}

/**
 * FilterSyncStream
 */

class FilterSyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = fn
  }

  _transform(chunk, encoding, callback) {
    if (this.fn(chunk)) this.push(chunk)
    callback()
  }
}

/**
 * FilterAsyncStream
 */

class FilterAsyncStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = co.wrap(fn)
  }

  _transform(chunk, encoding, callback) {
    this.fn(chunk)
    .then((val) => {
      if (val) this.push(chunk)
      callback()
    })
    .catch((err) => setImmediate(() => callback(err)))
  }

  _transform(chunk, encoding, callback) {
    if (this.fn(chunk)) this.push(chunk)
    callback()
  }
}

/*!
 * module export
 */

export default {
  concat: function(arr) {
    if (!Array.isArray(arr)) arr = [].slice.call(arguments)
    return new ConcatStream(arr)
  },
  log(fn) {
    return new LogStream(fn)
  },
  fromArray(arr) {
    return new FromArrayStream(arr)
  },
  readAsync(fn) {
    return new ReadAsyncStream(fn)
  },
  throughSync(fn) {
    return new ThroughSyncStream(fn)
  },
  throughAsync(fn) {
    return new ThroughAsyncStream(fn)
  },
  filterSync(fn) {
    return new FilterSyncStream(fn)
  },
  filterAsync(fn) {
    return new FilterAsyncStream(fn)
  },
  mapSync(fn) {
    return new MapSyncStream(fn)
  },
  mapAsync(fn) {
    return new MapAsyncStream(fn)
  },
  consume(createStream) {
    const d = domain.create()
    const stream = d.bind(createStream)()

    // re-emit error from domain
    d.on('error', (err) => stream.emit('error', err))

    if (stream.readable) stream.resume()
    return stream
  },
  toPromise(stream) {
    return new Promise((fulfill, reject) => {
      stream.once('error', reject)
      stream.once('finish', fulfill)
      stream.once('end', fulfill)
      stream.on('end', fulfill)
      if (stream.readable) stream.resume()
    })
  }
}
