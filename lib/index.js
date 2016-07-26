/* @flow */

import domain from 'domain'
import { Readable, Transform } from 'stream'

type Pusher = (chunk: any) => boolean;
type CallbackFn<T> = (err: ?Error, value: T) => void;

type Deferred<T> = {
  promise: Promise<T>,
  resolve: (value: T) => void,
  reject: (error: Error) => void
}

function defer<T> (): Deferred<T> {
  let _resolve: (value: T) => void = () => {}
  let _reject: (error: Error) => void = () => {}

  const promise: Promise<T> = new Promise((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })

  return {
    promise,
    resolve: _resolve,
    reject: _reject
  }
}

/**
 * LogStream
 *
 * transform stream that log data before passing it down the stream
 */

class LogStream extends Transform {
  _logfn: (chunk: any) => void

  constructor (logfn: (chunk: any) => void = (chunk) => console.log(chunk)) {
    super({ objectMode: true })
    this._logfn = logfn
  }

  _transform (chunk: any, encoding: any, callback: CallbackFn<any>) {
    this._logfn(chunk)
    callback(null, chunk)
  }
}

/**
 * FromArrayStream
 *
 * Readable stream that transdorm an array into stream
 */

class FromArrayStream<T> extends Readable {
  _values: Array<T>

  constructor (values: Array<T> = []) {
    super({ objectMode: true })
    this._values = values
  }

  _read () {
    this._values.forEach((v) => this.push((v: any))) // TODO remove casting when https://github.com/facebook/flow/issues/2010 fixed
    this.push(null)
  }
}

/**
 * ToArrayStream
 *
 * Transform stream that buffered event into an array
 */

class ToArrayStream extends Transform {
  _buffer: Array<any>
  _deferred: Deferred<[any]>

  constructor () {
    super({ objectMode: true })
    this._buffer = []
    this._deferred = defer()
  }

  _transform (chunk: any, encoding: any, next: () => void) {
    this._buffer.push(chunk)
    next()
  }

  _flush (done: () => void) {
    this._deferred.resolve(this._buffer)
    done()
  }

  promise () {
    return this._deferred.promise
  }

  then<V> (fn: (value: any) => Promise<V>) {
    return this._deferred.promise.then(fn)
  }
}

/**
 * ToObjectStream
 *
 * Transform stream that buffered event into an object
 */

class ToObjectStream extends Transform {

  _buffer: any;
  _deferred: Deferred<any>;

  constructor () {
    super({ objectMode: true })
    this._buffer = {}
    this._deferred = defer()
  }

  _transform (chunk: any, encoding: any, next: () => void) {
    Object.assign(this._buffer, chunk)
    next()
  }

  _flush (done: () => void) {
    this._deferred.resolve(this._buffer)
    done()
  }

  promise () {
    return this._deferred.promise
  }

  then<V> (fn: (value: V) => Promise<V>) {
    return this._deferred.promise.then(fn)
  }
}

/**
 * ReadAsyncStream
 */

class ReadAsyncStream extends Readable {
  _fn: (push: Pusher) => Promise<void>
  _pusher: Pusher
  _reading: boolean

  constructor (fn: (push: Pusher) => Promise<void>) {
    super({ objectMode: true })
    this._fn = fn
    this._pusher = this.push.bind(this)
  }

  _read () {
    if (this._reading) return
    this._reading = true
    this._fn(this._pusher)
    .then(() => this.push(null))
    .catch((err: Error) => setImmediate(() => this.emit('error', err)))
  }
}

/**
 * ReadSyncStream
 */

class ReadSyncStream extends Readable {
  _fn: (push: Pusher) => void;

  constructor (fn: (push: Pusher) => void) {
    super({ objectMode: true })
    this._fn = fn
  }

  _read () {
    this._fn(this.push.bind(this))
    this.push(null)
  }
}

/**
 * MapSyncStream
 */

class MapSyncStream<T> extends Transform {
  _fn: (chunk: any) => T;

  constructor (fn: (chunk: any) => T) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: string, callback: (err: ?Error, val: any) => void) {
    callback(null, this._fn(chunk))
  }
}

/**
 * MapAsyncStream
 */

class MapAsyncStream<T> extends Transform {
  _fn: (chunk: any) => Promise<T>;

  constructor (fn: (chunk: any) => Promise<T>) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: any, callback: (err: ?Error) => void) {
    this._fn(chunk)
    .then((val) => { callback(null, val) })
    .catch((err: Error) => setImmediate(() => callback(err)))
  }
}

/**
 * ThroughAsyncStream
 */

class ThroughAsyncStream extends Transform {
  _fn: (chunk: any, pusher: Pusher) => Promise<void>;
  _pusher: Pusher

  constructor (fn: (chunk: any, pusher: Pusher) => Promise<void>) {
    super({ objectMode: true })
    this._fn = fn
    this._pusher = this.push.bind(this)
  }

  _transform (chunk: any, encoding: any, callback: () => void) {
    this._fn(chunk, this._pusher)
    .then(() => callback())
    .catch((err: Error) => setImmediate(() => callback(err)))
  }
}

/**
 * ThroughSyncStream
 */

class ThroughSyncStream extends Transform {
  _fn: (chunk: any, pusher: Pusher) => void;
  _pusher: Pusher

  constructor (fn: (chunk: any, pusher: Pusher) => void) {
    super({ objectMode: true })
    this._fn = fn
    this._pusher = this.push.bind(this)
  }

  _transform (chunk: any, encoding: any, callback: () => void) {
    this._fn(chunk, this._pusher)
    callback()
  }
}

/**
 * concat streams
 *
 * @return {Stream}
 */

class ConcatStream extends Readable {
  _streams: Array<any>
  _endCount: number
  _reading: boolean

  constructor (streams: Array<any>) {
    super({ objectMode: true })
    this._streams = streams
    this._endCount = 0
  }

  _read () {
    if (this._reading) return
    this._reading = true
    this.resume()

    this._streams.forEach((stream: Readable) => {
      stream.on('data', (data: any) => { this.push(data) })
      stream.on('error', (err: Error) => this.emit('error', err))
      stream.on('end', () => {
        if (++this._endCount === this._streams.length) { this.push(null) }
      })
    })
  }
}

/**
 * FilterSyncStream
 */

class FilterSyncStream extends Transform {
  _fn: (chunk: any) => boolean

  constructor (fn: (arg: any) => boolean) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: any, callback: () => void) {
    if (this._fn(chunk)) this.push(chunk)
    callback()
  }
}

/**
 * FilterAsyncStream
 */

class FilterAsyncStream extends Transform {
  _fn: (chunk: any) => Promise<boolean>

  constructor (fn: (chunk: any) => Promise<boolean>) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: any, callback: (err: ?Error) => void) {
    this._fn(chunk)
    .then((val) => {
      if (val) this.push(chunk)
      callback()
    })
    .catch((err) => setImmediate(() => callback(err)))
  }
}

/*!
 * module export
 */

export function concat (arr: Array<any>): Readable {
  if (!Array.isArray(arr)) arr = [].slice.call(arguments)
  return new ConcatStream(arr)
}

export function log (fn: () => void): Transform {
  return new LogStream(fn)
}

export function fromArray<T> (arr: Array<T>): Readable {
  return new FromArrayStream(arr)
}

export function toArray (): ToArrayStream {
  return new ToArrayStream()
}

export function toObject (): ToObjectStream {
  return new ToObjectStream()
}

export function readAsync (fn: (push: Pusher) => Promise<void>): Readable {
  return new ReadAsyncStream(fn)
}

export function readSync (fn: (arg: any) => void): Readable {
  return new ReadSyncStream(fn)
}

export function throughAsync (fn: (chunk: any, pusher: Pusher) => Promise<void>): Transform {
  return new ThroughAsyncStream(fn)
}

export function throughSync (fn: (chunk: any, pusher: Pusher) => void): Transform {
  return new ThroughSyncStream(fn)
}

export function filterSync (fn: (arg: any) => boolean): Transform {
  return new FilterSyncStream(fn)
}

export function filterAsync (fn: (chunk: any) => Promise<boolean>): Transform {
  return new FilterAsyncStream(fn)
}

export function mapSync<T> (fn: (chunk: any) => T): Transform {
  return new MapSyncStream(fn)
}

export function mapAsync<T> (fn: (chunk: any) => Promise<T>): Transform {
  return new MapAsyncStream(fn)
}

export function consume (createStream: () => any): Readable {
  const d = domain.create()
  const stream = d.bind(createStream)()

  // re-emit error from domain
  d.on('error', (err) => {
    setImmediate(() => stream.emit('error', err))
  })

  if (stream.readable) stream.resume()
  return stream
}

export function toPromise (stream: any) {
  return new Promise((resolve, reject) => {
    stream.once('error', reject)
    stream.once('end', resolve)
    stream.once('finish', resolve)
    if (stream.readable) stream.resume()
  })
}
