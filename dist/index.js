'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _setImmediate2 = require('babel-runtime/core-js/set-immediate');

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.concat = concat;
exports.log = log;
exports.fromArray = fromArray;
exports.toArray = toArray;
exports.toObject = toObject;
exports.readAsync = readAsync;
exports.readSync = readSync;
exports.throughAsync = throughAsync;
exports.throughSync = throughSync;
exports.filterSync = filterSync;
exports.filterAsync = filterAsync;
exports.mapSync = mapSync;
exports.mapAsync = mapAsync;
exports.consume = consume;
exports.toPromise = toPromise;

var _domain = require('domain');

var _domain2 = _interopRequireDefault(_domain);

var _stream = require('stream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function defer() {
  var _resolve = function _resolve() {};
  var _reject = function _reject() {};

  var promise = new _promise2.default(function (resolve, reject) {
    _resolve = resolve;
    _reject = reject;
  });

  return {
    promise: promise,
    resolve: _resolve,
    reject: _reject
  };
}

/**
 * LogStream
 * @private
 */

var LogStream = function (_Transform) {
  (0, _inherits3.default)(LogStream, _Transform);

  function LogStream() {
    var logfn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function (chunk) {
      return console.log(chunk);
    };
    (0, _classCallCheck3.default)(this, LogStream);

    var _this = (0, _possibleConstructorReturn3.default)(this, (LogStream.__proto__ || (0, _getPrototypeOf2.default)(LogStream)).call(this, { objectMode: true }));

    _this._logfn = logfn;
    return _this;
  }

  (0, _createClass3.default)(LogStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this._logfn(chunk);
      callback(null, chunk);
    }
  }]);
  return LogStream;
}(_stream.Transform);

/**
 * FromArrayStream
 * @private
 */

var FromArrayStream = function (_Readable) {
  (0, _inherits3.default)(FromArrayStream, _Readable);

  function FromArrayStream() {
    var values = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    (0, _classCallCheck3.default)(this, FromArrayStream);

    var _this2 = (0, _possibleConstructorReturn3.default)(this, (FromArrayStream.__proto__ || (0, _getPrototypeOf2.default)(FromArrayStream)).call(this, { objectMode: true }));

    _this2._values = values;
    return _this2;
  }

  (0, _createClass3.default)(FromArrayStream, [{
    key: '_read',
    value: function _read() {
      var _this3 = this;

      this._values.forEach(function (v) {
        return _this3.push(v);
      }); // TODO remove casting when https://github.com/facebook/flow/issues/2010 fixed
      this.push(null);
    }
  }]);
  return FromArrayStream;
}(_stream.Readable);

/**
 * ToArrayStream
 * @private
 **/

var ToArrayStream = function (_Transform2) {
  (0, _inherits3.default)(ToArrayStream, _Transform2);

  function ToArrayStream() {
    (0, _classCallCheck3.default)(this, ToArrayStream);

    var _this4 = (0, _possibleConstructorReturn3.default)(this, (ToArrayStream.__proto__ || (0, _getPrototypeOf2.default)(ToArrayStream)).call(this, { objectMode: true }));

    _this4._buffer = [];
    _this4._deferred = defer();
    return _this4;
  }

  (0, _createClass3.default)(ToArrayStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, next) {
      this._buffer.push(chunk);
      next();
    }
  }, {
    key: '_flush',
    value: function _flush(done) {
      this._deferred.resolve(this._buffer);
      done();
    }
  }, {
    key: 'then',
    value: function then(onFulfill) {
      return this._deferred.promise.then(onFulfill);
    }
  }]);
  return ToArrayStream;
}(_stream.Transform);

/**
 * ToObjectStream
 * @private
 */

var ToObjectStream = function (_Transform3) {
  (0, _inherits3.default)(ToObjectStream, _Transform3);

  function ToObjectStream() {
    (0, _classCallCheck3.default)(this, ToObjectStream);

    var _this5 = (0, _possibleConstructorReturn3.default)(this, (ToObjectStream.__proto__ || (0, _getPrototypeOf2.default)(ToObjectStream)).call(this, { objectMode: true }));

    _this5._buffer = {};
    _this5._deferred = defer();
    return _this5;
  }

  (0, _createClass3.default)(ToObjectStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, next) {
      (0, _assign2.default)(this._buffer, chunk);
      next();
    }
  }, {
    key: '_flush',
    value: function _flush(done) {
      this._deferred.resolve(this._buffer);
      done();
    }
  }, {
    key: 'then',
    value: function then(onFulfill) {
      return this._deferred.promise.then(onFulfill);
    }
  }]);
  return ToObjectStream;
}(_stream.Transform);

/**
 * ReadAsyncStream
 * @private
 */

var ReadAsyncStream = function (_Readable2) {
  (0, _inherits3.default)(ReadAsyncStream, _Readable2);

  function ReadAsyncStream(fn) {
    (0, _classCallCheck3.default)(this, ReadAsyncStream);

    var _this6 = (0, _possibleConstructorReturn3.default)(this, (ReadAsyncStream.__proto__ || (0, _getPrototypeOf2.default)(ReadAsyncStream)).call(this, { objectMode: true }));

    _this6._fn = fn;
    _this6._onNext = _this6.push.bind(_this6);
    return _this6;
  }

  (0, _createClass3.default)(ReadAsyncStream, [{
    key: '_read',
    value: function _read() {
      var _this7 = this;

      if (this._reading) return;
      this._reading = true;
      this._fn(this._onNext).then(function () {
        return _this7.push(null);
      }).catch(function (err) {
        return (0, _setImmediate3.default)(function () {
          return _this7.emit('error', err);
        });
      });
    }
  }]);
  return ReadAsyncStream;
}(_stream.Readable);

/**
 * ReadSyncStream
 * @private
 */

var ReadSyncStream = function (_Readable3) {
  (0, _inherits3.default)(ReadSyncStream, _Readable3);

  function ReadSyncStream(fn) {
    (0, _classCallCheck3.default)(this, ReadSyncStream);

    var _this8 = (0, _possibleConstructorReturn3.default)(this, (ReadSyncStream.__proto__ || (0, _getPrototypeOf2.default)(ReadSyncStream)).call(this, { objectMode: true }));

    _this8._fn = fn;
    return _this8;
  }

  (0, _createClass3.default)(ReadSyncStream, [{
    key: '_read',
    value: function _read() {
      try {
        this._fn(this.push.bind(this));
      } catch (err) {
        return this.emit('error', err);
      }
      this.push(null);
    }
  }]);
  return ReadSyncStream;
}(_stream.Readable);

/**
 * MapSyncStream
 * @private
 */

var MapSyncStream = function (_Transform4) {
  (0, _inherits3.default)(MapSyncStream, _Transform4);

  function MapSyncStream(fn) {
    (0, _classCallCheck3.default)(this, MapSyncStream);

    var _this9 = (0, _possibleConstructorReturn3.default)(this, (MapSyncStream.__proto__ || (0, _getPrototypeOf2.default)(MapSyncStream)).call(this, { objectMode: true }));

    _this9._fn = fn;
    return _this9;
  }

  (0, _createClass3.default)(MapSyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      try {
        callback(null, this._fn(chunk));
      } catch (err) {
        callback(err);
      }
    }
  }]);
  return MapSyncStream;
}(_stream.Transform);

/**
 * MapAsyncStream
 * @private
 */

var MapAsyncStream = function (_Transform5) {
  (0, _inherits3.default)(MapAsyncStream, _Transform5);

  function MapAsyncStream(fn) {
    (0, _classCallCheck3.default)(this, MapAsyncStream);

    var _this10 = (0, _possibleConstructorReturn3.default)(this, (MapAsyncStream.__proto__ || (0, _getPrototypeOf2.default)(MapAsyncStream)).call(this, { objectMode: true }));

    _this10._fn = fn;
    return _this10;
  }

  (0, _createClass3.default)(MapAsyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this._fn(chunk).then(function (val) {
        callback(null, val);
      }).catch(function (err) {
        return (0, _setImmediate3.default)(function () {
          return callback(err);
        });
      });
    }
  }]);
  return MapAsyncStream;
}(_stream.Transform);

/**
 * ThroughAsyncStream
 * @private
 */

var ThroughAsyncStream = function (_Transform6) {
  (0, _inherits3.default)(ThroughAsyncStream, _Transform6);

  function ThroughAsyncStream(fn) {
    (0, _classCallCheck3.default)(this, ThroughAsyncStream);

    var _this11 = (0, _possibleConstructorReturn3.default)(this, (ThroughAsyncStream.__proto__ || (0, _getPrototypeOf2.default)(ThroughAsyncStream)).call(this, { objectMode: true }));

    _this11._fn = fn;
    _this11._onNext = _this11.push.bind(_this11);
    _this11._onError = function (err) {
      return _this11.emit('error', err);
    };
    return _this11;
  }

  (0, _createClass3.default)(ThroughAsyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this._fn(chunk, this._onNext, this._onError).then(function () {
        return callback();
      }).catch(function (err) {
        return (0, _setImmediate3.default)(function () {
          return callback(err);
        });
      });
    }
  }]);
  return ThroughAsyncStream;
}(_stream.Transform);

/**
 * ThroughSyncStream
 * @private
 */

var ThroughSyncStream = function (_Transform7) {
  (0, _inherits3.default)(ThroughSyncStream, _Transform7);

  function ThroughSyncStream(fn) {
    (0, _classCallCheck3.default)(this, ThroughSyncStream);

    var _this12 = (0, _possibleConstructorReturn3.default)(this, (ThroughSyncStream.__proto__ || (0, _getPrototypeOf2.default)(ThroughSyncStream)).call(this, { objectMode: true }));

    _this12._fn = fn;
    _this12._onNext = _this12.push.bind(_this12);
    _this12._onError = function (err) {
      return _this12.emit('error', err);
    };
    return _this12;
  }

  (0, _createClass3.default)(ThroughSyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this._fn(chunk, this._onNext, this._onError);
      callback();
    }
  }]);
  return ThroughSyncStream;
}(_stream.Transform);

/**
 * concat streams
 * @private
 */

var ConcatStream = function (_Readable4) {
  (0, _inherits3.default)(ConcatStream, _Readable4);

  function ConcatStream(streams) {
    (0, _classCallCheck3.default)(this, ConcatStream);

    var _this13 = (0, _possibleConstructorReturn3.default)(this, (ConcatStream.__proto__ || (0, _getPrototypeOf2.default)(ConcatStream)).call(this, { objectMode: true }));

    _this13._streams = streams;
    _this13._endCount = 0;
    return _this13;
  }

  (0, _createClass3.default)(ConcatStream, [{
    key: '_read',
    value: function _read() {
      var _this14 = this;

      if (this._reading) return;
      this._reading = true;
      this.resume();

      this._streams.forEach(function (stream) {
        stream.on('data', function (data) {
          _this14.push(data);
        });
        stream.on('error', function (err) {
          return _this14.emit('error', err);
        });
        stream.on('end', function () {
          if (++_this14._endCount === _this14._streams.length) {
            _this14.push(null);
          }
        });
      });
    }
  }]);
  return ConcatStream;
}(_stream.Readable);

/**
 * FilterSyncStream
 * @private
 */

var FilterSyncStream = function (_Transform8) {
  (0, _inherits3.default)(FilterSyncStream, _Transform8);

  function FilterSyncStream(fn) {
    (0, _classCallCheck3.default)(this, FilterSyncStream);

    var _this15 = (0, _possibleConstructorReturn3.default)(this, (FilterSyncStream.__proto__ || (0, _getPrototypeOf2.default)(FilterSyncStream)).call(this, { objectMode: true }));

    _this15._fn = fn;
    return _this15;
  }

  (0, _createClass3.default)(FilterSyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      try {
        if (this._fn(chunk)) this.push(chunk);
        callback();
      } catch (err) {
        callback(err);
      }
    }
  }]);
  return FilterSyncStream;
}(_stream.Transform);

/**
 * FilterAsyncStream
 * @private
 */

var FilterAsyncStream = function (_Transform9) {
  (0, _inherits3.default)(FilterAsyncStream, _Transform9);

  function FilterAsyncStream(fn) {
    (0, _classCallCheck3.default)(this, FilterAsyncStream);

    var _this16 = (0, _possibleConstructorReturn3.default)(this, (FilterAsyncStream.__proto__ || (0, _getPrototypeOf2.default)(FilterAsyncStream)).call(this, { objectMode: true }));

    _this16._fn = fn;
    return _this16;
  }

  (0, _createClass3.default)(FilterAsyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      var _this17 = this;

      this._fn(chunk).then(function (val) {
        if (val) _this17.push(chunk);
        callback();
      }).catch(function (err) {
        return (0, _setImmediate3.default)(function () {
          return callback(err);
        });
      });
    }
  }]);
  return FilterAsyncStream;
}(_stream.Transform);

/*!
 * exports
 */

/**
 *  create a Readable from an array of stream
 */

function concat(arr) {
  if (!Array.isArray(arr)) arr = (0, _from2.default)(arguments);
  return new ConcatStream(arr);
}

/**
 *  create a Transform stream that take a log function
 */

function log(fn) {
  return new LogStream(fn);
}

/**
 *  create a Readable from an array
 */

function fromArray(arr) {
  return new FromArrayStream(arr);
}

/**
 *  create a Thenable Transform stream that buffer each data chunk into an array
 */

function toArray() {
  return new ToArrayStream();
}

/**
 *  create a Thenable Transform stream that merge each data chunk into an object
 */

function toObject() {
  return new ToObjectStream();
}

/**
 *  create a Readable stream from an async function
 */

function readAsync(fn) {
  return new ReadAsyncStream(fn);
}

/**
 *  create a Readable stream from a sync function
 */

function readSync(fn) {
  return new ReadSyncStream(fn);
}

/**
 *  create a transform stream that take an async transform function
 */

function throughAsync(fn) {
  return new ThroughAsyncStream(fn);
}

/**
 *  create a transform stream that take a sync transform function
 */

function throughSync(fn) {
  return new ThroughSyncStream(fn);
}

/**
 *  create a filtered transform stream that take a sync filter function
 */

function filterSync(fn) {
  return new FilterSyncStream(fn);
}

/**
 *  create a filtered transform stream that take an async filter function
 */

function filterAsync(fn) {
  return new FilterAsyncStream(fn);
}

/**
 *  create a transform stream that take a sync mapping function
 */

function mapSync(fn) {
  return new MapSyncStream(fn);
}

/**
 *  create a transform stream that take an async mapping function
 */

function mapAsync(fn) {
  return new MapAsyncStream(fn);
}

/**
 *  create a stream in flowing mode from a factory function
 *  using domain behind the scene to catch any uncaught error.
 */

function consume(createStream) {
  var d = _domain2.default.create();
  var stream = d.bind(createStream)();

  // re-emit error from domain
  d.on('error', function (err) {
    (0, _setImmediate3.default)(function () {
      return stream.emit('error', err);
    });
  });

  if (stream.readable) stream.resume();
  return stream;
}

/**
 *  create a promise from a stream
 */

function toPromise(stream) {
  return new _promise2.default(function (resolve, reject) {
    stream.once('error', reject);
    stream.once('end', resolve);
    stream.once('finish', resolve);
    if (stream.readable) stream.resume();
  });
}