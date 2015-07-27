/*!
 * module deps
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _domain = require('domain');

var _domain2 = _interopRequireDefault(_domain);

var _concurrentTransform = require('concurrent-transform');

var _concurrentTransform2 = _interopRequireDefault(_concurrentTransform);

var _stream = require('stream');

var _co = require('co');

/**
 * ReadValuesStream
 *
 * Readable stream that transdorm an array into stream
 */

var _co2 = _interopRequireDefault(_co);

var ReadValuesStream = (function (_Readable) {
  _inherits(ReadValuesStream, _Readable);

  function ReadValuesStream() {
    var values = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

    _classCallCheck(this, ReadValuesStream);

    _get(Object.getPrototypeOf(ReadValuesStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.values = values;
  }

  /**
   * PushValuesStream
   * transform stream that push additional values into stream
   */

  _createClass(ReadValuesStream, [{
    key: '_read',
    value: function _read() {
      var _this = this;

      this.values.forEach(function (v) {
        return _this.push(v);
      });
      this.push(null);
    }
  }]);

  return ReadValuesStream;
})(_stream.Readable);

var PushValuesStream = (function (_Transform) {
  _inherits(PushValuesStream, _Transform);

  function PushValuesStream() {
    var values = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

    _classCallCheck(this, PushValuesStream);

    _get(Object.getPrototypeOf(PushValuesStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.values = values;
  }

  /**
   * ReadAsyncStream
   */

  _createClass(PushValuesStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this.push(chunk);
      var index = this.values.indexOf(chunk);
      if (index !== -1) this.values.splice(index, 1);
      callback();
    }
  }, {
    key: '_flush',
    value: function _flush(callback) {
      var _this2 = this;

      // push remaining values
      this.values.forEach(function (v) {
        return _this2.push(v);
      });
      callback();
    }
  }]);

  return PushValuesStream;
})(_stream.Transform);

var ReadAsyncStream = (function (_Readable2) {
  _inherits(ReadAsyncStream, _Readable2);

  function ReadAsyncStream(fn) {
    _classCallCheck(this, ReadAsyncStream);

    _get(Object.getPrototypeOf(ReadAsyncStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.fn = _co2['default'].wrap(fn);
  }

  /**
   * MapAsyncStream
   */

  _createClass(ReadAsyncStream, [{
    key: '_read',
    value: function _read() {
      var _this3 = this;

      if (this.reading) return;
      this.reading = true;

      this.fn().then(function (val) {
        _this3.push(val);_this3.push(null);
      })['catch'](function (err) {
        return setImmediate(function () {
          return _this3.emit('error', err);
        });
      });
    }
  }]);

  return ReadAsyncStream;
})(_stream.Readable);

var MapAsyncStream = (function (_Transform2) {
  _inherits(MapAsyncStream, _Transform2);

  function MapAsyncStream(fn) {
    _classCallCheck(this, MapAsyncStream);

    _get(Object.getPrototypeOf(MapAsyncStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.fn = _co2['default'].wrap(fn);
  }

  /**
   * ThroughAsyncStream
   */

  _createClass(MapAsyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this.fn(chunk).then(function (val) {
        callback(null, val);
      })['catch'](function (err) {
        return setImmediate(function () {
          return callback(err);
        });
      });
    }
  }]);

  return MapAsyncStream;
})(_stream.Transform);

var ThroughAsyncStream = (function (_Transform3) {
  _inherits(ThroughAsyncStream, _Transform3);

  function ThroughAsyncStream(fn) {
    _classCallCheck(this, ThroughAsyncStream);

    _get(Object.getPrototypeOf(ThroughAsyncStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.fn = _co2['default'].wrap(fn.bind(this));
  }

  /**
   * concat streams
   *
   * @return {Stream}
   */

  _createClass(ThroughAsyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this.fn(chunk).then(function () {
        return callback();
      })['catch'](function (err) {
        return setImmediate(function () {
          return callback(err);
        });
      });
    }
  }]);

  return ThroughAsyncStream;
})(_stream.Transform);

var ConcatStream = (function (_Readable3) {
  _inherits(ConcatStream, _Readable3);

  function ConcatStream(streams) {
    _classCallCheck(this, ConcatStream);

    _get(Object.getPrototypeOf(ConcatStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.streams = streams;
    this.endCount = 0;
  }

  /**
   * MapSyncStream
   */

  _createClass(ConcatStream, [{
    key: '_read',
    value: function _read() {
      var _this4 = this;

      if (this.resumed) return;
      this.resumed = true;
      this.resume();

      this.streams.forEach(function (stream) {
        stream.on('data', function (data) {
          _this4.push(data);
        });
        stream.on('error', function (err) {
          return _this4.emit('error', err);
        });
        stream.on('end', function () {
          if (++_this4.endCount === _this4.streams.length) {
            _this4.push(null);
          }
        });
      });
    }
  }]);

  return ConcatStream;
})(_stream.Readable);

var MapSyncStream = (function (_Transform4) {
  _inherits(MapSyncStream, _Transform4);

  function MapSyncStream(fn) {
    _classCallCheck(this, MapSyncStream);

    _get(Object.getPrototypeOf(MapSyncStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.fn = fn;
  }

  /**
   * ThroughStream
   */

  _createClass(MapSyncStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      callback(null, this.fn(chunk));
    }
  }]);

  return MapSyncStream;
})(_stream.Transform);

var ThroughStream = (function (_Transform5) {
  _inherits(ThroughStream, _Transform5);

  function ThroughStream(fn) {
    _classCallCheck(this, ThroughStream);

    _get(Object.getPrototypeOf(ThroughStream.prototype), 'constructor', this).call(this, { objectMode: true });
    this.fn = fn.bind(this);
  }

  /*!
   * module export
   */

  _createClass(ThroughStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      this.fn(chunk);
      callback();
    }
  }]);

  return ThroughStream;
})(_stream.Transform);

exports['default'] = {
  concat: function concat(arr) {
    if (!Array.isArray(arr)) arr = [].slice.call(arguments);
    return new ConcatStream(arr);
  },
  through: function through(fn) {
    return new ThroughStream(fn);
  },
  throughAsync: function throughAsync(fn) {
    return new ThroughAsyncStream(fn);
  },
  readValues: function readValues(arr) {
    return new ReadValuesStream(arr);
  },
  pushValues: function pushValues(arr) {
    return new PushValuesStream(arr);
  },
  readAsync: function readAsync(fn) {
    return new ReadAsyncStream(fn);
  },
  mapAsync: function mapAsync(fn) {
    return new MapAsyncStream(fn);
  },
  parallelAsync: function parallelAsync(concurrent, fn) {
    return (0, _concurrentTransform2['default'])(new MapAsyncStream(fn), concurrent);
  },
  mapSync: function mapSync(fn) {
    return new MapSyncStream(fn);
  },
  consume: function consume(createStream) {
    return new Promise(function (fulfill, reject) {
      var d = _domain2['default'].create();
      var stream = d.bind(createStream)();
      d.once('error', reject);
      stream.once('end', fulfill);
      stream.once('finish', fulfill);
      stream.once('error', reject);
      if (stream.readable) stream.resume();
    });
  }
};
module.exports = exports['default'];