/* @flow */
/* global it, describe */

import {expect} from 'chai'
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
  filterSync,
  toPromise,
  consume
} from '../lib'

/*!
 * globals
 */

function wait (ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/*!
 * test suite
 */

describe('stream-util specs', function () {
  it('should create stream from array', (done) => {
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
    const transform = toArray()
    const promise = transform.then((arr: Array<string>) =>
        expect(arr).to.deep.equal(src)
      )

    stream.resume().pipe(transform)
    return promise
  })

  it('should create object from stream', () => {
    const src = [ { foo: 1 }, { bar: 1 } ]
    const stream = fromArray(src)
    const transform = toObject()
    const promise = transform.then(o => expect(o).to.deep.equal({
      ...src[0],
      ...src[1]
    }))

    stream.resume().pipe(transform)
    return promise
  })

  it('should log content', (done) => {
    const src = ['foo', 'bar']
    let out = ''
    const stream = fromArray(src)
    stream
      .pipe(log((v: string) => { out += v }))
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
    const transform = toArray()
    const promise = transform.then((arr) =>
      expect(arr.sort()).to.deep.equal([ ...src1, ...src2 ].sort())
    )

    concat([ s1, s2 ]).pipe(transform)
    return promise
  })

  it('should read async', () => {
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal([1, 2])
    )

    readAsync(async function (push) {
      await wait(1)
      push(1)
      await wait(1)
      push(2)
    })
    .pipe(transform)

    return promise
  })

  it('should read sync', () => {
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal([1, 2])
    )

    readSync((push: (chunk: any) => void) => {
      push(1)
      push(2)
    }).pipe(transform)
    return promise
  })

  it('should emit a thrown error when reading sync', (done) => {
    const readFunc = () => {
      throw new Error('foo')
    }
    const errorHandler = (error) => {
      expect(error).to.have.property('message', 'foo')
      done()
    }
    const endHandler = () => done(new Error('should not call end'))

    const stream = readSync(readFunc)
    stream.on('error', errorHandler).on('end', endHandler)

    stream.resume()
  })

  it('should map async', () => {
    const src = ['1', '2']
    const mapping = (it: string) => `${it}:foo`
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal(src.map(mapping))
    )

    fromArray(src)
      .pipe(mapAsync(async function (chunk: string) {
        await wait(1)
        return mapping(chunk)
      }))
      .pipe(transform)

    return promise
  })

  it('should map sync', () => {
    const src = ['1', '2']
    const mapping = (it) => `${it}:foo`
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal(src.map(mapping))
    )

    fromArray(src)
      .pipe(mapSync(mapping))
      .pipe(transform)

    return promise
  })

  it('should emit the thrown error when mapping sync', (done) => {
    const src = ['1', '2']
    const mapping = () => {
      throw new Error('foo')
    }
    const errorHandler = (error) => {
      expect(error).to.have.property('message', 'foo')
      done()
    }
    const endHandler = () => done(new Error('Should not call end'))

    fromArray(src)
      .pipe(mapSync(mapping))
      .on('error', errorHandler)
      .on('end', endHandler)
  })

  it('should through async', () => {
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal([1, 2, 2, 4])
    )

    fromArray([1, 2])
      .pipe(throughAsync(async function (chunk: number, push) {
        await wait(1)
        push(chunk)
        await wait(1)
        push(chunk * 2)
      }))
      .pipe(transform)

    return promise
  })

  it('should through sync', () => {
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal([1, 2, 2, 4])
    )

    fromArray([1, 2])
      .pipe(throughSync(function (chunk: number, push) {
        push(chunk)
        push(chunk * 2)
      }))
      .pipe(transform)
    return promise
  })

  it('should filter aSync', () => {
    const src = [1, 2, 3]
    const filterFn = v => (v % 2) !== 0
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal(src.filter(filterFn))
    )

    fromArray(src)
      .pipe(filterAsync(async function (chunk: number) {
        await wait(1)
        return filterFn(chunk)
      }))
      .pipe(transform)

    return promise
  })

  it('should filter sync', () => {
    const src = [1, 2, 3]
    const filterFn = (v) => v % 2 === 0
    const transform = toArray()
    const promise = transform.then(arr =>
      expect(arr).to.deep.equal(src.filter(filterFn))
    )

    fromArray(src)
      .pipe(filterSync(filterFn))
      .pipe(transform)

    return promise
  })

  it('should emit the thrown error when running filter sync', (done) => {
    const src = [1, 2, 3]
    const filterFn = () => {
      throw new Error('foo')
    }
    const errorHandler = (error) => {
      expect(error).to.have.property('message', 'foo')
      done()
    }
    const endHandler = () => done(new Error('should not call end'))

    fromArray(src)
      .pipe(filterSync(filterFn))
      .on('error', errorHandler)
      .on('end', endHandler)
  })

  it('should promisify a stream', () => {
    return toPromise(fromArray([1]))
  })

  it('should promisify a stream with error', () => {
    return toPromise(fromArray([1])
      .pipe(throughSync(function (chunk: number, onNext, onError) {
        onError(new Error('booum'))
      }))
    ).catch((err: Error) => {
      expect(err.message).to.equal('booum')
    })
  })

  it('should consume stream', (done) => {
    consume(() => fromArray([1, 2])).on('end', () => done())
  })
})
