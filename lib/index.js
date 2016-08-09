/* @flow */

import domain from 'domain'
import { Readable, Transform } from 'stream'

type OnNext = (chunk: any) => boolean;
type OnError = (err: Error) => boolean;

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
 * @private
 */

class LogStream extends Transform {
  _logfn: (chunk: any) => void

  constructor (logfn: (chunk: any) => void = (chunk: any) => console.log(chunk)) {
    super({ objectMode: true })
    this._logfn = logfn
  }

  _transform (chunk: any, encoding: string, callback: CallbackFn<any>) {
    this._logfn(chunk)
    callback(null, chunk)
  }
}

/**
 * FromArrayStream
 * @private
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
 * @private
 **/

class ToArrayStream extends Transform {
  _buffer: Array<any>
  _deferred: Deferred<[any]>

  constructor () {
    super({ objectMode: true })
    this._buffer = []
    this._deferred = defer()
  }

  _transform (chunk: any, encoding: string, next: () => void) {
    this._buffer.push(chunk)
    next()
  }

  _flush (done: () => void) {
    this._deferred.resolve(this._buffer)
    done()
  }

  then<U> (onFulfill: (value: Array<any>) => Promise<U> | U): Promise<U> {
    return this._deferred.promise.then(onFulfill)
  }
}

/**
 * ToObjectStream
 * @private
 */

class ToObjectStream extends Transform {

  _buffer: Object;
  _deferred: Deferred<any>;

  constructor () {
    super({ objectMode: true })
    this._buffer = {}
    this._deferred = defer()
  }

  _transform (chunk: any, encoding: string, next: () => void) {
    Object.assign(this._buffer, chunk)
    next()
  }

  _flush (done: () => void) {
    this._deferred.resolve(this._buffer)
    done()
  }

  then<U> (onFulfill: (value: Object) => Promise<U> | U): Promise<U> {
    return this._deferred.promise.then(onFulfill)
  }
}

/**
 * ReadAsyncStream
 * @private
 */

class ReadAsyncStream extends Readable {
  _fn: (next: OnNext) => Promise<void>
  _onNext: OnNext
  _reading: boolean

  constructor (fn: (next: OnNext) => Promise<void>) {
    super({ objectMode: true })
    this._fn = fn
    this._onNext = this.push.bind(this)
  }

  _read () {
    if (this._reading) return
    this._reading = true
    this._fn(this._onNext)
    .then(() => this.push(null))
    .catch((err: Error) => setImmediate(() => this.emit('error', err)))
  }
}

/**
 * ReadSyncStream
 * @private
 */

class ReadSyncStream extends Readable {
  _fn: (next: OnNext) => void;

  constructor (fn: (next: OnNext) => void) {
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
 * @private
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
 * @private
 */

class MapAsyncStream<T> extends Transform {
  _fn: (chunk: any) => Promise<T>;

  constructor (fn: (chunk: any) => Promise<T>) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: string, callback: (err: ?Error) => void) {
    this._fn(chunk)
    .then((val) => { callback(null, val) })
    .catch((err: Error) => setImmediate(() => callback(err)))
  }
}

/**
 * ThroughAsyncStream
 * @private
 */

class ThroughAsyncStream extends Transform {
  _fn: (chunk: any, next: OnNext, error: OnError) => Promise<void>;
  _onNext: OnNext
  _onError: OnError

  constructor (fn: (chunk: any, next: OnNext, error: OnError) => Promise<void>) {
    super({ objectMode: true })
    this._fn = fn
    this._onNext = this.push.bind(this)
    this._onError = (err: Error) => this.emit('error', err)
  }

  _transform (chunk: any, encoding: string, callback: () => void) {
    this._fn(chunk, this._onNext, this._onError)
    .then(() => callback())
    .catch((err: Error) => setImmediate(() => callback(err)))
  }
}

/**
 * ThroughSyncStream
 * @private
 */

class ThroughSyncStream extends Transform {
  _fn: (chunk: any, next: OnNext, error: OnError) => void;
  _onNext: OnNext
  _onError: (err: Error) => boolean

  constructor (fn: (chunk: any, next: OnNext, error: OnError) => void) {
    super({ objectMode: true })
    this._fn = fn
    this._onNext = this.push.bind(this)
    this._onError = (err: Error) => this.emit('error', err)
  }

  _transform (chunk: any, encoding: string, callback: () => void) {
    this._fn(chunk, this._onNext, this._onError)
    callback()
  }
}

/**
 * concat streams
 * @private
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
 * @private
 */

class FilterSyncStream extends Transform {
  _fn: (chunk: any) => boolean

  constructor (fn: (arg: any) => boolean) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: string, callback: () => void) {
    if (this._fn(chunk)) this.push(chunk)
    callback()
  }
}

/**
 * FilterAsyncStream
 * @private
 */

class FilterAsyncStream extends Transform {
  _fn: (chunk: any) => Promise<boolean>

  constructor (fn: (chunk: any) => Promise<boolean>) {
    super({ objectMode: true })
    this._fn = fn
  }

  _transform (chunk: any, encoding: string, callback: (err: ?Error) => void) {
    this._fn(chunk)
    .then((val) => {
      if (val) this.push(chunk)
      callback()
    })
    .catch((err) => setImmediate(() => callback(err)))
  }
}

/*!
 * exports
 */

/**
 *  create a Readable from an array of stream
 */

export function concat (arr: Array<any>): Readable {
  if (!Array.isArray(arr)) arr = Array.from(arguments)
  return new ConcatStream(arr)
}

/**
 *  create a Transform stream that take a log function
 */

export function log (fn: (chunk: any) => void): Transform {
  return new LogStream(fn)
}

/**
 *  create a Readable from an array
 */

export function fromArray<T> (arr: Array<T>): Readable {
  return new FromArrayStream(arr)
}

/**
 *  create a Thenable Transform stream that buffer each data chunk into an array
 */

export function toArray (): ToArrayStream {
  return new ToArrayStream()
}

/**
 *  create a Thenable Transform stream that merge each data chunk into an object
 */

export function toObject (): ToObjectStream {
  return new ToObjectStream()
}

/**
 *  create a Readable stream from an async function
 */

export function readAsync (fn: (next: OnNext) => Promise<void>): Readable {
  return new ReadAsyncStream(fn)
}

/**
 *  create a Readable stream from a sync function
 */

export function readSync (fn: (arg: any) => void): Readable {
  return new ReadSyncStream(fn)
}

/**
 *  create a transform stream that take an async transform function
 */

export function throughAsync (fn: (chunk: any, next: OnNext, error: OnError) => Promise<void>): Transform {
  return new ThroughAsyncStream(fn)
}

/**
 *  create a transform stream that take a sync transform function
 */

export function throughSync (fn: (chunk: any, next: OnNext, error: OnError) => void): Transform {
  return new ThroughSyncStream(fn)
}

/**
 *  create a filtered transform stream that take a sync filter function
 */

export function filterSync (fn: (arg: any) => boolean): Transform {
  return new FilterSyncStream(fn)
}

/**
 *  create a filtered transform stream that take an async filter function
 */

export function filterAsync (fn: (chunk: any) => Promise<boolean>): Transform {
  return new FilterAsyncStream(fn)
}

/**
 *  create a transform stream that take a sync mapping function
 */

export function mapSync<T> (fn: (chunk: any) => T): Transform {
  return new MapSyncStream(fn)
}

/**
 *  create a transform stream that take an async mapping function
 */

export function mapAsync<T> (fn: (chunk: any) => Promise<T>): Transform {
  return new MapAsyncStream(fn)
}

/**
 *  create a stream in flowing mode from a factory function
 *  using domain behind the scene to catch any uncaught error.
 */

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

/**
 *  create a promise from a stream
 */

export function toPromise (stream: Readable): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once('error', reject)
    stream.once('end', resolve)
    stream.once('finish', resolve)
    if (stream.readable) stream.resume()
  })
}
