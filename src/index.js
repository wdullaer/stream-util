/*!
 * module deps
 */

import domain from 'domain'
import parallel from 'concurrent-transform'
import { Readable, Transform } from 'stream'
import co from 'co'

/**
 * ReadValuesStream
 *
 * Readable stream that transdorm an array into stream
 */

class ReadValuesStream extends Readable {

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
 * PushValuesStream
 * transform stream that push additional values into stream
 */

class PushValuesStream extends Transform {

  constructor(values = []) {
    super({ objectMode: true })
    this.values = values
  }

  _transform(chunk, encoding, callback) {
    this.push(chunk)
    const index = this.values.indexOf(chunk)
    if (index !== -1) this.values.splice(index, 1)
    callback()
  }

  _flush(callback) {

    // push remaining values
    this.values.forEach((v) => this.push(v))
    callback()
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
 * ThroughStream
 */

class ThroughStream extends Transform {

  constructor(fn) {
    super({ objectMode: true })
    this.fn = fn.bind(this)
  }

  _transform(chunk, encoding, callback) {
    this.fn(chunk)
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
  through(fn) {
    return new ThroughStream(fn)
  },
  throughAsync(fn) {
    return new ThroughAsyncStream(fn)
  },
  readValues(arr) {
    return new ReadValuesStream(arr)
  },
  pushValues(arr) {
    return new PushValuesStream(arr)
  },
  readAsync(fn) {
    return new ReadAsyncStream(fn)
  },
  mapAsync(fn) {
    return new MapAsyncStream(fn)
  },
  parallelAsync(concurrent, fn) {
    return parallel(new MapAsyncStream(fn), concurrent)
  },
  mapSync(fn) {
    return new MapSyncStream(fn)
  },
  consume(createStream) {
    return new Promise(function(fulfill, reject) {
      const d = domain.create()
      const stream = d.bind(createStream)()
      d.once('error', reject)
      stream.once('end', fulfill)
      stream.once('finish', fulfill)
      stream.once('error', reject)
      if (stream.readable) stream.resume()
    })
  }
}
