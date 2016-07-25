/* global it, describe */

import chai from 'chai'
import {
  fromArray,
  toArray,
  toObject,
  log,
  concat,
  readAsync,
  readSync,
  mapAsync,
  mapSync,
  throughAsync,
  throughSync,
  filterAsync,
  filterSync
} from '../lib'

/*!
 * globals
 */

const expect = chai.expect
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/*!
 * test suite
 */

describe('stream-util specs', function () {
  // 'consume'

  it('should create stream from array', (done: (err: ?Error) => void) => {
    const src = ['foo', 'bar']
    const buffer: Array<string> = []
    const stream = fromArray(['foo', 'bar'])
    stream.on('data', (v: string) => buffer.push(v))
    stream.on('end', () => {
      expect(buffer).to.deep.equal(src)
      done()
    })
    stream.resume()
  })

  it('should create array from stream', () => {
    const src = ['foo', 'bar']
    const stream = fromArray(src)
    return stream.resume().pipe(toArray())
      .then(arr => expect(arr).to.deep.eq(src))
  })

  it('should create object from stream', () => {
    const src = [ { foo: 1 }, { bar: 1 } ]
    const stream = fromArray(src)
    return stream.resume().pipe(toObject())
      .then(arr => expect(arr).to.deep.eq({
        ...src[0],
        ...src[1]
      }))
  })

  it('should log content', (done: () => void) => {
    const src = ['foo', 'bar']
    let out = ''
    const stream = fromArray(src)
    return stream
      .pipe(log((v) => { out += v }))
      .resume()
      .on('end', () => {
        expect(out).to.equal(src.join(''))
        done()
      })
  })

  it('should concat streams', () => {
    const src1 = [ 1, 2, 3 ]
    const src2 = [ 4, 5, 6 ]
    const s1 = fromArray(src1)
    const s2 = fromArray(src2)
    return concat([ s1, s2 ]).pipe(toArray())
      .then((arr) =>
        expect(arr.sort()).to.deep.equal([ ...src1, ...src2 ].sort())
      )
  })

  it('should read async', () => {
    return readAsync(async function (stream) {
      await wait(1)
      stream.push(1)
      await wait(1)
      stream.push(2)
    })
    .pipe(toArray())
    .then(arr =>
      expect(arr).to.deep.equal([1, 2])
    )
  })

  it('should read sync', () => {
    return readSync(function (stream) {
      stream.push(1)
      stream.push(2)
    })
    .pipe(toArray())
    .then(arr =>
      expect(arr).to.deep.equal([1, 2])
    )
  })

  it('should map async', () => {
    const src = [1, 2]
    const mapping = (it) => `${it}:foo`

    return fromArray([1, 2])
      .pipe(mapAsync(async function (chunk) {
        await wait(1)
        return mapping(chunk)
      }))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal(src.map(mapping))
      )
  })

  it('should map sync', () => {
    const src = [1, 2]
    const mapping = (it) => `${it}:foo`

    return fromArray([1, 2])
      .pipe(mapSync(mapping))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal(src.map(mapping))
      )
  })

  it('should through async', () => {
    return fromArray([1, 2])
      .pipe(throughAsync(async function (chunk, stream) {
        await wait(1)
        stream.push(chunk)
        await wait(1)
        stream.push(chunk * 2)
      }))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal([1, 2, 2, 4])
      )
  })

  it('should through sync', () => {
    return fromArray([1, 2])
      .pipe(throughSync(function (chunk, stream) {
        stream.push(chunk)
        stream.push(chunk * 2)
      }))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal([1, 2, 2, 4])
      )
  })

  it('should filter aSync', () => {
    const src = [1, 2, 3]
    const filterFn = v => v % 2

    return fromArray(src)
      .pipe(filterAsync(async function (chunk) {
        await wait(1)
        return filterFn(chunk)
      }))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal(src.filter(filterFn))
      )
  })

  it('should filter sync', () => {
    const src = [1, 2, 3]
    const filterFn = (v) => v % 2

    return fromArray(src)
      .pipe(filterSync(filterFn))
      .pipe(toArray())
      .then(arr =>
        expect(arr).to.deep.equal(src.filter(filterFn))
      )
  })
})
