(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":4}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":6}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
(function (global){
global.bpf = require('babel-polyfill'); global.h3 = require('h3-js'); 

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"babel-polyfill":8,"h3-js":336}],8:[function(require,module,exports){
(function (global){
"use strict";

require("core-js/shim");

require("regenerator-runtime/runtime");

require("core-js/fn/regexp/escape");

if (global._babelPolyfill) {
  throw new Error("only one instance of babel-polyfill is allowed");
}
global._babelPolyfill = true;

var DEFINE_PROPERTY = "defineProperty";
function define(O, key, value) {
  O[key] || Object[DEFINE_PROPERTY](O, key, {
    writable: true,
    configurable: true,
    value: value
  });
}

define(String.prototype, "padLeft", "".padStart);
define(String.prototype, "padRight", "".padEnd);

"pop,reverse,shift,keys,values,entries,indexOf,every,some,forEach,map,filter,find,findIndex,includes,join,slice,concat,push,splice,unshift,sort,lastIndexOf,reduce,reduceRight,copyWithin,fill".split(",").forEach(function (key) {
  [][key] && define(Array, key, Function.call.bind([][key]));
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"core-js/fn/regexp/escape":9,"core-js/shim":332,"regenerator-runtime/runtime":337}],9:[function(require,module,exports){
require('../../modules/core.regexp.escape');
module.exports = require('../../modules/_core').RegExp.escape;

},{"../../modules/_core":30,"../../modules/core.regexp.escape":135}],10:[function(require,module,exports){
module.exports = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

},{}],11:[function(require,module,exports){
var cof = require('./_cof');
module.exports = function (it, msg) {
  if (typeof it != 'number' && cof(it) != 'Number') throw TypeError(msg);
  return +it;
};

},{"./_cof":25}],12:[function(require,module,exports){
// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = require('./_wks')('unscopables');
var ArrayProto = Array.prototype;
if (ArrayProto[UNSCOPABLES] == undefined) require('./_hide')(ArrayProto, UNSCOPABLES, {});
module.exports = function (key) {
  ArrayProto[UNSCOPABLES][key] = true;
};

},{"./_hide":49,"./_wks":133}],13:[function(require,module,exports){
module.exports = function (it, Constructor, name, forbiddenField) {
  if (!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)) {
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};

},{}],14:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function (it) {
  if (!isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

},{"./_is-object":58}],15:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
'use strict';
var toObject = require('./_to-object');
var toAbsoluteIndex = require('./_to-absolute-index');
var toLength = require('./_to-length');

module.exports = [].copyWithin || function copyWithin(target /* = 0 */, start /* = 0, end = @length */) {
  var O = toObject(this);
  var len = toLength(O.length);
  var to = toAbsoluteIndex(target, len);
  var from = toAbsoluteIndex(start, len);
  var end = arguments.length > 2 ? arguments[2] : undefined;
  var count = Math.min((end === undefined ? len : toAbsoluteIndex(end, len)) - from, len - to);
  var inc = 1;
  if (from < to && to < from + count) {
    inc = -1;
    from += count - 1;
    to += count - 1;
  }
  while (count-- > 0) {
    if (from in O) O[to] = O[from];
    else delete O[to];
    to += inc;
    from += inc;
  } return O;
};

},{"./_to-absolute-index":118,"./_to-length":122,"./_to-object":123}],16:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
'use strict';
var toObject = require('./_to-object');
var toAbsoluteIndex = require('./_to-absolute-index');
var toLength = require('./_to-length');
module.exports = function fill(value /* , start = 0, end = @length */) {
  var O = toObject(this);
  var length = toLength(O.length);
  var aLen = arguments.length;
  var index = toAbsoluteIndex(aLen > 1 ? arguments[1] : undefined, length);
  var end = aLen > 2 ? arguments[2] : undefined;
  var endPos = end === undefined ? length : toAbsoluteIndex(end, length);
  while (endPos > index) O[index++] = value;
  return O;
};

},{"./_to-absolute-index":118,"./_to-length":122,"./_to-object":123}],17:[function(require,module,exports){
var forOf = require('./_for-of');

module.exports = function (iter, ITERATOR) {
  var result = [];
  forOf(iter, false, result.push, result, ITERATOR);
  return result;
};

},{"./_for-of":46}],18:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./_to-iobject');
var toLength = require('./_to-length');
var toAbsoluteIndex = require('./_to-absolute-index');
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

},{"./_to-absolute-index":118,"./_to-iobject":121,"./_to-length":122}],19:[function(require,module,exports){
// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx = require('./_ctx');
var IObject = require('./_iobject');
var toObject = require('./_to-object');
var toLength = require('./_to-length');
var asc = require('./_array-species-create');
module.exports = function (TYPE, $create) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  var create = $create || asc;
  return function ($this, callbackfn, that) {
    var O = toObject($this);
    var self = IObject(O);
    var f = ctx(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var val, res;
    for (;length > index; index++) if (NO_HOLES || index in self) {
      val = self[index];
      res = f(val, index, O);
      if (TYPE) {
        if (IS_MAP) result[index] = res;   // map
        else if (res) switch (TYPE) {
          case 3: return true;             // some
          case 5: return val;              // find
          case 6: return index;            // findIndex
          case 2: result.push(val);        // filter
        } else if (IS_EVERY) return false; // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};

},{"./_array-species-create":22,"./_ctx":32,"./_iobject":54,"./_to-length":122,"./_to-object":123}],20:[function(require,module,exports){
var aFunction = require('./_a-function');
var toObject = require('./_to-object');
var IObject = require('./_iobject');
var toLength = require('./_to-length');

module.exports = function (that, callbackfn, aLen, memo, isRight) {
  aFunction(callbackfn);
  var O = toObject(that);
  var self = IObject(O);
  var length = toLength(O.length);
  var index = isRight ? length - 1 : 0;
  var i = isRight ? -1 : 1;
  if (aLen < 2) for (;;) {
    if (index in self) {
      memo = self[index];
      index += i;
      break;
    }
    index += i;
    if (isRight ? index < 0 : length <= index) {
      throw TypeError('Reduce of empty array with no initial value');
    }
  }
  for (;isRight ? index >= 0 : length > index; index += i) if (index in self) {
    memo = callbackfn(memo, self[index], index, O);
  }
  return memo;
};

},{"./_a-function":10,"./_iobject":54,"./_to-length":122,"./_to-object":123}],21:[function(require,module,exports){
var isObject = require('./_is-object');
var isArray = require('./_is-array');
var SPECIES = require('./_wks')('species');

module.exports = function (original) {
  var C;
  if (isArray(original)) {
    C = original.constructor;
    // cross-realm fallback
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return C === undefined ? Array : C;
};

},{"./_is-array":56,"./_is-object":58,"./_wks":133}],22:[function(require,module,exports){
// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var speciesConstructor = require('./_array-species-constructor');

module.exports = function (original, length) {
  return new (speciesConstructor(original))(length);
};

},{"./_array-species-constructor":21}],23:[function(require,module,exports){
'use strict';
var aFunction = require('./_a-function');
var isObject = require('./_is-object');
var invoke = require('./_invoke');
var arraySlice = [].slice;
var factories = {};

var construct = function (F, len, args) {
  if (!(len in factories)) {
    for (var n = [], i = 0; i < len; i++) n[i] = 'a[' + i + ']';
    // eslint-disable-next-line no-new-func
    factories[len] = Function('F,a', 'return new F(' + n.join(',') + ')');
  } return factories[len](F, args);
};

module.exports = Function.bind || function bind(that /* , ...args */) {
  var fn = aFunction(this);
  var partArgs = arraySlice.call(arguments, 1);
  var bound = function (/* args... */) {
    var args = partArgs.concat(arraySlice.call(arguments));
    return this instanceof bound ? construct(fn, args.length, args) : invoke(fn, args, that);
  };
  if (isObject(fn.prototype)) bound.prototype = fn.prototype;
  return bound;
};

},{"./_a-function":10,"./_invoke":53,"./_is-object":58}],24:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./_cof');
var TAG = require('./_wks')('toStringTag');
// ES3 wrong here
var ARG = cof(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

module.exports = function (it) {
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

},{"./_cof":25,"./_wks":133}],25:[function(require,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],26:[function(require,module,exports){
'use strict';
var dP = require('./_object-dp').f;
var create = require('./_object-create');
var redefineAll = require('./_redefine-all');
var ctx = require('./_ctx');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var $iterDefine = require('./_iter-define');
var step = require('./_iter-step');
var setSpecies = require('./_set-species');
var DESCRIPTORS = require('./_descriptors');
var fastKey = require('./_meta').fastKey;
var validate = require('./_validate-collection');
var SIZE = DESCRIPTORS ? '_s' : 'size';

var getEntry = function (that, key) {
  // fast case
  var index = fastKey(key);
  var entry;
  if (index !== 'F') return that._i[index];
  // frozen object case
  for (entry = that._f; entry; entry = entry.n) {
    if (entry.k == key) return entry;
  }
};

module.exports = {
  getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
    var C = wrapper(function (that, iterable) {
      anInstance(that, C, NAME, '_i');
      that._t = NAME;         // collection type
      that._i = create(null); // index
      that._f = undefined;    // first entry
      that._l = undefined;    // last entry
      that[SIZE] = 0;         // size
      if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear() {
        for (var that = validate(this, NAME), data = that._i, entry = that._f; entry; entry = entry.n) {
          entry.r = true;
          if (entry.p) entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function (key) {
        var that = validate(this, NAME);
        var entry = getEntry(that, key);
        if (entry) {
          var next = entry.n;
          var prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if (prev) prev.n = next;
          if (next) next.p = prev;
          if (that._f == entry) that._f = next;
          if (that._l == entry) that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /* , that = undefined */) {
        validate(this, NAME);
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3);
        var entry;
        while (entry = entry ? entry.n : this._f) {
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while (entry && entry.r) entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key) {
        return !!getEntry(validate(this, NAME), key);
      }
    });
    if (DESCRIPTORS) dP(C.prototype, 'size', {
      get: function () {
        return validate(this, NAME)[SIZE];
      }
    });
    return C;
  },
  def: function (that, key, value) {
    var entry = getEntry(that, key);
    var prev, index;
    // change existing entry
    if (entry) {
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if (!that._f) that._f = entry;
      if (prev) prev.n = entry;
      that[SIZE]++;
      // add to index
      if (index !== 'F') that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function (C, NAME, IS_MAP) {
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function (iterated, kind) {
      this._t = validate(iterated, NAME); // target
      this._k = kind;                     // kind
      this._l = undefined;                // previous
    }, function () {
      var that = this;
      var kind = that._k;
      var entry = that._l;
      // revert to the last existing entry
      while (entry && entry.r) entry = entry.p;
      // get next entry
      if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if (kind == 'keys') return step(0, entry.k);
      if (kind == 'values') return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};

},{"./_an-instance":13,"./_ctx":32,"./_descriptors":36,"./_for-of":46,"./_iter-define":62,"./_iter-step":64,"./_meta":72,"./_object-create":77,"./_object-dp":78,"./_redefine-all":97,"./_set-species":104,"./_validate-collection":130}],27:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var classof = require('./_classof');
var from = require('./_array-from-iterable');
module.exports = function (NAME) {
  return function toJSON() {
    if (classof(this) != NAME) throw TypeError(NAME + "#toJSON isn't generic");
    return from(this);
  };
};

},{"./_array-from-iterable":17,"./_classof":24}],28:[function(require,module,exports){
'use strict';
var redefineAll = require('./_redefine-all');
var getWeak = require('./_meta').getWeak;
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var createArrayMethod = require('./_array-methods');
var $has = require('./_has');
var validate = require('./_validate-collection');
var arrayFind = createArrayMethod(5);
var arrayFindIndex = createArrayMethod(6);
var id = 0;

// fallback for uncaught frozen keys
var uncaughtFrozenStore = function (that) {
  return that._l || (that._l = new UncaughtFrozenStore());
};
var UncaughtFrozenStore = function () {
  this.a = [];
};
var findUncaughtFrozen = function (store, key) {
  return arrayFind(store.a, function (it) {
    return it[0] === key;
  });
};
UncaughtFrozenStore.prototype = {
  get: function (key) {
    var entry = findUncaughtFrozen(this, key);
    if (entry) return entry[1];
  },
  has: function (key) {
    return !!findUncaughtFrozen(this, key);
  },
  set: function (key, value) {
    var entry = findUncaughtFrozen(this, key);
    if (entry) entry[1] = value;
    else this.a.push([key, value]);
  },
  'delete': function (key) {
    var index = arrayFindIndex(this.a, function (it) {
      return it[0] === key;
    });
    if (~index) this.a.splice(index, 1);
    return !!~index;
  }
};

module.exports = {
  getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
    var C = wrapper(function (that, iterable) {
      anInstance(that, C, NAME, '_i');
      that._t = NAME;      // collection type
      that._i = id++;      // collection id
      that._l = undefined; // leak store for uncaught frozen objects
      if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.3.3.2 WeakMap.prototype.delete(key)
      // 23.4.3.3 WeakSet.prototype.delete(value)
      'delete': function (key) {
        if (!isObject(key)) return false;
        var data = getWeak(key);
        if (data === true) return uncaughtFrozenStore(validate(this, NAME))['delete'](key);
        return data && $has(data, this._i) && delete data[this._i];
      },
      // 23.3.3.4 WeakMap.prototype.has(key)
      // 23.4.3.4 WeakSet.prototype.has(value)
      has: function has(key) {
        if (!isObject(key)) return false;
        var data = getWeak(key);
        if (data === true) return uncaughtFrozenStore(validate(this, NAME)).has(key);
        return data && $has(data, this._i);
      }
    });
    return C;
  },
  def: function (that, key, value) {
    var data = getWeak(anObject(key), true);
    if (data === true) uncaughtFrozenStore(that).set(key, value);
    else data[that._i] = value;
    return that;
  },
  ufstore: uncaughtFrozenStore
};

},{"./_an-instance":13,"./_an-object":14,"./_array-methods":19,"./_for-of":46,"./_has":48,"./_is-object":58,"./_meta":72,"./_redefine-all":97,"./_validate-collection":130}],29:[function(require,module,exports){
'use strict';
var global = require('./_global');
var $export = require('./_export');
var redefine = require('./_redefine');
var redefineAll = require('./_redefine-all');
var meta = require('./_meta');
var forOf = require('./_for-of');
var anInstance = require('./_an-instance');
var isObject = require('./_is-object');
var fails = require('./_fails');
var $iterDetect = require('./_iter-detect');
var setToStringTag = require('./_set-to-string-tag');
var inheritIfRequired = require('./_inherit-if-required');

module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
  var Base = global[NAME];
  var C = Base;
  var ADDER = IS_MAP ? 'set' : 'add';
  var proto = C && C.prototype;
  var O = {};
  var fixMethod = function (KEY) {
    var fn = proto[KEY];
    redefine(proto, KEY,
      KEY == 'delete' ? function (a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'has' ? function has(a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'get' ? function get(a) {
        return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'add' ? function add(a) { fn.call(this, a === 0 ? 0 : a); return this; }
        : function set(a, b) { fn.call(this, a === 0 ? 0 : a, b); return this; }
    );
  };
  if (typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
    new C().entries().next();
  }))) {
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
    meta.NEED = true;
  } else {
    var instance = new C();
    // early implementations not supports chaining
    var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
    // V8 ~  Chromium 40- weak-collections throws on primitives, but should return false
    var THROWS_ON_PRIMITIVES = fails(function () { instance.has(1); });
    // most early implementations doesn't supports iterables, most modern - not close it correctly
    var ACCEPT_ITERABLES = $iterDetect(function (iter) { new C(iter); }); // eslint-disable-line no-new
    // for early implementations -0 and +0 not the same
    var BUGGY_ZERO = !IS_WEAK && fails(function () {
      // V8 ~ Chromium 42- fails only with 5+ elements
      var $instance = new C();
      var index = 5;
      while (index--) $instance[ADDER](index, index);
      return !$instance.has(-0);
    });
    if (!ACCEPT_ITERABLES) {
      C = wrapper(function (target, iterable) {
        anInstance(target, C, NAME);
        var that = inheritIfRequired(new Base(), target, C);
        if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
        return that;
      });
      C.prototype = proto;
      proto.constructor = C;
    }
    if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
      fixMethod('delete');
      fixMethod('has');
      IS_MAP && fixMethod('get');
    }
    if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);
    // weak collections should not contains .clear method
    if (IS_WEAK && proto.clear) delete proto.clear;
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F * (C != Base), O);

  if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);

  return C;
};

},{"./_an-instance":13,"./_export":40,"./_fails":42,"./_for-of":46,"./_global":47,"./_inherit-if-required":52,"./_is-object":58,"./_iter-detect":63,"./_meta":72,"./_redefine":98,"./_redefine-all":97,"./_set-to-string-tag":105}],30:[function(require,module,exports){
var core = module.exports = { version: '2.5.7' };
if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

},{}],31:[function(require,module,exports){
'use strict';
var $defineProperty = require('./_object-dp');
var createDesc = require('./_property-desc');

module.exports = function (object, index, value) {
  if (index in object) $defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};

},{"./_object-dp":78,"./_property-desc":96}],32:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

},{"./_a-function":10}],33:[function(require,module,exports){
'use strict';
// 20.3.4.36 / 15.9.5.43 Date.prototype.toISOString()
var fails = require('./_fails');
var getTime = Date.prototype.getTime;
var $toISOString = Date.prototype.toISOString;

var lz = function (num) {
  return num > 9 ? num : '0' + num;
};

// PhantomJS / old WebKit has a broken implementations
module.exports = (fails(function () {
  return $toISOString.call(new Date(-5e13 - 1)) != '0385-07-25T07:06:39.999Z';
}) || !fails(function () {
  $toISOString.call(new Date(NaN));
})) ? function toISOString() {
  if (!isFinite(getTime.call(this))) throw RangeError('Invalid time value');
  var d = this;
  var y = d.getUTCFullYear();
  var m = d.getUTCMilliseconds();
  var s = y < 0 ? '-' : y > 9999 ? '+' : '';
  return s + ('00000' + Math.abs(y)).slice(s ? -6 : -4) +
    '-' + lz(d.getUTCMonth() + 1) + '-' + lz(d.getUTCDate()) +
    'T' + lz(d.getUTCHours()) + ':' + lz(d.getUTCMinutes()) +
    ':' + lz(d.getUTCSeconds()) + '.' + (m > 99 ? m : '0' + lz(m)) + 'Z';
} : $toISOString;

},{"./_fails":42}],34:[function(require,module,exports){
'use strict';
var anObject = require('./_an-object');
var toPrimitive = require('./_to-primitive');
var NUMBER = 'number';

module.exports = function (hint) {
  if (hint !== 'string' && hint !== NUMBER && hint !== 'default') throw TypeError('Incorrect hint');
  return toPrimitive(anObject(this), hint != NUMBER);
};

},{"./_an-object":14,"./_to-primitive":124}],35:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

},{}],36:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_fails":42}],37:[function(require,module,exports){
var isObject = require('./_is-object');
var document = require('./_global').document;
// typeof document.createElement is 'object' in old IE
var is = isObject(document) && isObject(document.createElement);
module.exports = function (it) {
  return is ? document.createElement(it) : {};
};

},{"./_global":47,"./_is-object":58}],38:[function(require,module,exports){
// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

},{}],39:[function(require,module,exports){
// all enumerable object keys, includes symbols
var getKeys = require('./_object-keys');
var gOPS = require('./_object-gops');
var pIE = require('./_object-pie');
module.exports = function (it) {
  var result = getKeys(it);
  var getSymbols = gOPS.f;
  if (getSymbols) {
    var symbols = getSymbols(it);
    var isEnum = pIE.f;
    var i = 0;
    var key;
    while (symbols.length > i) if (isEnum.call(it, key = symbols[i++])) result.push(key);
  } return result;
};

},{"./_object-gops":84,"./_object-keys":87,"./_object-pie":88}],40:[function(require,module,exports){
var global = require('./_global');
var core = require('./_core');
var hide = require('./_hide');
var redefine = require('./_redefine');
var ctx = require('./_ctx');
var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var target = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE];
  var exports = IS_GLOBAL ? core : core[name] || (core[name] = {});
  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
  var key, own, out, exp;
  if (IS_GLOBAL) source = name;
  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // extend global
    if (target) redefine(target, key, out, type & $export.U);
    // export
    if (exports[key] != out) hide(exports, key, exp);
    if (IS_PROTO && expProto[key] != out) expProto[key] = out;
  }
};
global.core = core;
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library`
module.exports = $export;

},{"./_core":30,"./_ctx":32,"./_global":47,"./_hide":49,"./_redefine":98}],41:[function(require,module,exports){
var MATCH = require('./_wks')('match');
module.exports = function (KEY) {
  var re = /./;
  try {
    '/./'[KEY](re);
  } catch (e) {
    try {
      re[MATCH] = false;
      return !'/./'[KEY](re);
    } catch (f) { /* empty */ }
  } return true;
};

},{"./_wks":133}],42:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

},{}],43:[function(require,module,exports){
'use strict';
var hide = require('./_hide');
var redefine = require('./_redefine');
var fails = require('./_fails');
var defined = require('./_defined');
var wks = require('./_wks');

module.exports = function (KEY, length, exec) {
  var SYMBOL = wks(KEY);
  var fns = exec(defined, SYMBOL, ''[KEY]);
  var strfn = fns[0];
  var rxfn = fns[1];
  if (fails(function () {
    var O = {};
    O[SYMBOL] = function () { return 7; };
    return ''[KEY](O) != 7;
  })) {
    redefine(String.prototype, KEY, strfn);
    hide(RegExp.prototype, SYMBOL, length == 2
      // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
      // 21.2.5.11 RegExp.prototype[@@split](string, limit)
      ? function (string, arg) { return rxfn.call(string, this, arg); }
      // 21.2.5.6 RegExp.prototype[@@match](string)
      // 21.2.5.9 RegExp.prototype[@@search](string)
      : function (string) { return rxfn.call(string, this); }
    );
  }
};

},{"./_defined":35,"./_fails":42,"./_hide":49,"./_redefine":98,"./_wks":133}],44:[function(require,module,exports){
'use strict';
// 21.2.5.3 get RegExp.prototype.flags
var anObject = require('./_an-object');
module.exports = function () {
  var that = anObject(this);
  var result = '';
  if (that.global) result += 'g';
  if (that.ignoreCase) result += 'i';
  if (that.multiline) result += 'm';
  if (that.unicode) result += 'u';
  if (that.sticky) result += 'y';
  return result;
};

},{"./_an-object":14}],45:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-flatMap/#sec-FlattenIntoArray
var isArray = require('./_is-array');
var isObject = require('./_is-object');
var toLength = require('./_to-length');
var ctx = require('./_ctx');
var IS_CONCAT_SPREADABLE = require('./_wks')('isConcatSpreadable');

function flattenIntoArray(target, original, source, sourceLen, start, depth, mapper, thisArg) {
  var targetIndex = start;
  var sourceIndex = 0;
  var mapFn = mapper ? ctx(mapper, thisArg, 3) : false;
  var element, spreadable;

  while (sourceIndex < sourceLen) {
    if (sourceIndex in source) {
      element = mapFn ? mapFn(source[sourceIndex], sourceIndex, original) : source[sourceIndex];

      spreadable = false;
      if (isObject(element)) {
        spreadable = element[IS_CONCAT_SPREADABLE];
        spreadable = spreadable !== undefined ? !!spreadable : isArray(element);
      }

      if (spreadable && depth > 0) {
        targetIndex = flattenIntoArray(target, original, element, toLength(element.length), targetIndex, depth - 1) - 1;
      } else {
        if (targetIndex >= 0x1fffffffffffff) throw TypeError();
        target[targetIndex] = element;
      }

      targetIndex++;
    }
    sourceIndex++;
  }
  return targetIndex;
}

module.exports = flattenIntoArray;

},{"./_ctx":32,"./_is-array":56,"./_is-object":58,"./_to-length":122,"./_wks":133}],46:[function(require,module,exports){
var ctx = require('./_ctx');
var call = require('./_iter-call');
var isArrayIter = require('./_is-array-iter');
var anObject = require('./_an-object');
var toLength = require('./_to-length');
var getIterFn = require('./core.get-iterator-method');
var BREAK = {};
var RETURN = {};
var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
  var iterFn = ITERATOR ? function () { return iterable; } : getIterFn(iterable);
  var f = ctx(fn, that, entries ? 2 : 1);
  var index = 0;
  var length, step, iterator, result;
  if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if (result === BREAK || result === RETURN) return result;
  } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
    result = call(iterator, f, step.value, entries);
    if (result === BREAK || result === RETURN) return result;
  }
};
exports.BREAK = BREAK;
exports.RETURN = RETURN;

},{"./_an-object":14,"./_ctx":32,"./_is-array-iter":55,"./_iter-call":60,"./_to-length":122,"./core.get-iterator-method":134}],47:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();
if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

},{}],48:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],49:[function(require,module,exports){
var dP = require('./_object-dp');
var createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function (object, key, value) {
  return dP.f(object, key, createDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"./_descriptors":36,"./_object-dp":78,"./_property-desc":96}],50:[function(require,module,exports){
var document = require('./_global').document;
module.exports = document && document.documentElement;

},{"./_global":47}],51:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function () {
  return Object.defineProperty(require('./_dom-create')('div'), 'a', { get: function () { return 7; } }).a != 7;
});

},{"./_descriptors":36,"./_dom-create":37,"./_fails":42}],52:[function(require,module,exports){
var isObject = require('./_is-object');
var setPrototypeOf = require('./_set-proto').set;
module.exports = function (that, target, C) {
  var S = target.constructor;
  var P;
  if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
    setPrototypeOf(that, P);
  } return that;
};

},{"./_is-object":58,"./_set-proto":103}],53:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function (fn, args, that) {
  var un = that === undefined;
  switch (args.length) {
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return fn.apply(that, args);
};

},{}],54:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./_cof');
// eslint-disable-next-line no-prototype-builtins
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
  return cof(it) == 'String' ? it.split('') : Object(it);
};

},{"./_cof":25}],55:[function(require,module,exports){
// check on default Array iterator
var Iterators = require('./_iterators');
var ITERATOR = require('./_wks')('iterator');
var ArrayProto = Array.prototype;

module.exports = function (it) {
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};

},{"./_iterators":65,"./_wks":133}],56:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./_cof');
module.exports = Array.isArray || function isArray(arg) {
  return cof(arg) == 'Array';
};

},{"./_cof":25}],57:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var isObject = require('./_is-object');
var floor = Math.floor;
module.exports = function isInteger(it) {
  return !isObject(it) && isFinite(it) && floor(it) === it;
};

},{"./_is-object":58}],58:[function(require,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],59:[function(require,module,exports){
// 7.2.8 IsRegExp(argument)
var isObject = require('./_is-object');
var cof = require('./_cof');
var MATCH = require('./_wks')('match');
module.exports = function (it) {
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
};

},{"./_cof":25,"./_is-object":58,"./_wks":133}],60:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./_an-object');
module.exports = function (iterator, fn, value, entries) {
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch (e) {
    var ret = iterator['return'];
    if (ret !== undefined) anObject(ret.call(iterator));
    throw e;
  }
};

},{"./_an-object":14}],61:[function(require,module,exports){
'use strict';
var create = require('./_object-create');
var descriptor = require('./_property-desc');
var setToStringTag = require('./_set-to-string-tag');
var IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./_hide')(IteratorPrototype, require('./_wks')('iterator'), function () { return this; });

module.exports = function (Constructor, NAME, next) {
  Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
  setToStringTag(Constructor, NAME + ' Iterator');
};

},{"./_hide":49,"./_object-create":77,"./_property-desc":96,"./_set-to-string-tag":105,"./_wks":133}],62:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var $export = require('./_export');
var redefine = require('./_redefine');
var hide = require('./_hide');
var Iterators = require('./_iterators');
var $iterCreate = require('./_iter-create');
var setToStringTag = require('./_set-to-string-tag');
var getPrototypeOf = require('./_object-gpo');
var ITERATOR = require('./_wks')('iterator');
var BUGGY = !([].keys && 'next' in [].keys()); // Safari has buggy iterators w/o `next`
var FF_ITERATOR = '@@iterator';
var KEYS = 'keys';
var VALUES = 'values';

var returnThis = function () { return this; };

module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
  $iterCreate(Constructor, NAME, next);
  var getMethod = function (kind) {
    if (!BUGGY && kind in proto) return proto[kind];
    switch (kind) {
      case KEYS: return function keys() { return new Constructor(this, kind); };
      case VALUES: return function values() { return new Constructor(this, kind); };
    } return function entries() { return new Constructor(this, kind); };
  };
  var TAG = NAME + ' Iterator';
  var DEF_VALUES = DEFAULT == VALUES;
  var VALUES_BUG = false;
  var proto = Base.prototype;
  var $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT];
  var $default = $native || getMethod(DEFAULT);
  var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined;
  var $anyNative = NAME == 'Array' ? proto.entries || $native : $native;
  var methods, key, IteratorPrototype;
  // Fix native
  if ($anyNative) {
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
    if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if (!LIBRARY && typeof IteratorPrototype[ITERATOR] != 'function') hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEF_VALUES && $native && $native.name !== VALUES) {
    VALUES_BUG = true;
    $default = function values() { return $native.call(this); };
  }
  // Define iterator
  if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG] = returnThis;
  if (DEFAULT) {
    methods = {
      values: DEF_VALUES ? $default : getMethod(VALUES),
      keys: IS_SET ? $default : getMethod(KEYS),
      entries: $entries
    };
    if (FORCED) for (key in methods) {
      if (!(key in proto)) redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

},{"./_export":40,"./_hide":49,"./_iter-create":61,"./_iterators":65,"./_library":66,"./_object-gpo":85,"./_redefine":98,"./_set-to-string-tag":105,"./_wks":133}],63:[function(require,module,exports){
var ITERATOR = require('./_wks')('iterator');
var SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function () { SAFE_CLOSING = true; };
  // eslint-disable-next-line no-throw-literal
  Array.from(riter, function () { throw 2; });
} catch (e) { /* empty */ }

module.exports = function (exec, skipClosing) {
  if (!skipClosing && !SAFE_CLOSING) return false;
  var safe = false;
  try {
    var arr = [7];
    var iter = arr[ITERATOR]();
    iter.next = function () { return { done: safe = true }; };
    arr[ITERATOR] = function () { return iter; };
    exec(arr);
  } catch (e) { /* empty */ }
  return safe;
};

},{"./_wks":133}],64:[function(require,module,exports){
module.exports = function (done, value) {
  return { value: value, done: !!done };
};

},{}],65:[function(require,module,exports){
module.exports = {};

},{}],66:[function(require,module,exports){
module.exports = false;

},{}],67:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
var $expm1 = Math.expm1;
module.exports = (!$expm1
  // Old FF bug
  || $expm1(10) > 22025.465794806719 || $expm1(10) < 22025.4657948067165168
  // Tor Browser bug
  || $expm1(-2e-17) != -2e-17
) ? function expm1(x) {
  return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : Math.exp(x) - 1;
} : $expm1;

},{}],68:[function(require,module,exports){
// 20.2.2.16 Math.fround(x)
var sign = require('./_math-sign');
var pow = Math.pow;
var EPSILON = pow(2, -52);
var EPSILON32 = pow(2, -23);
var MAX32 = pow(2, 127) * (2 - EPSILON32);
var MIN32 = pow(2, -126);

var roundTiesToEven = function (n) {
  return n + 1 / EPSILON - 1 / EPSILON;
};

module.exports = Math.fround || function fround(x) {
  var $abs = Math.abs(x);
  var $sign = sign(x);
  var a, result;
  if ($abs < MIN32) return $sign * roundTiesToEven($abs / MIN32 / EPSILON32) * MIN32 * EPSILON32;
  a = (1 + EPSILON32 / EPSILON) * $abs;
  result = a - (a - $abs);
  // eslint-disable-next-line no-self-compare
  if (result > MAX32 || result != result) return $sign * Infinity;
  return $sign * result;
};

},{"./_math-sign":71}],69:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
module.exports = Math.log1p || function log1p(x) {
  return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : Math.log(1 + x);
};

},{}],70:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
module.exports = Math.scale || function scale(x, inLow, inHigh, outLow, outHigh) {
  if (
    arguments.length === 0
      // eslint-disable-next-line no-self-compare
      || x != x
      // eslint-disable-next-line no-self-compare
      || inLow != inLow
      // eslint-disable-next-line no-self-compare
      || inHigh != inHigh
      // eslint-disable-next-line no-self-compare
      || outLow != outLow
      // eslint-disable-next-line no-self-compare
      || outHigh != outHigh
  ) return NaN;
  if (x === Infinity || x === -Infinity) return x;
  return (x - inLow) * (outHigh - outLow) / (inHigh - inLow) + outLow;
};

},{}],71:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
module.exports = Math.sign || function sign(x) {
  // eslint-disable-next-line no-self-compare
  return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
};

},{}],72:[function(require,module,exports){
var META = require('./_uid')('meta');
var isObject = require('./_is-object');
var has = require('./_has');
var setDesc = require('./_object-dp').f;
var id = 0;
var isExtensible = Object.isExtensible || function () {
  return true;
};
var FREEZE = !require('./_fails')(function () {
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function (it) {
  setDesc(it, META, { value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  } });
};
var fastKey = function (it, create) {
  // return primitive with prefix
  if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return 'F';
    // not necessary to add metadata
    if (!create) return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function (it, create) {
  if (!has(it, META)) {
    // can't set metadata to uncaught frozen object
    if (!isExtensible(it)) return true;
    // not necessary to add metadata
    if (!create) return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function (it) {
  if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY: META,
  NEED: false,
  fastKey: fastKey,
  getWeak: getWeak,
  onFreeze: onFreeze
};

},{"./_fails":42,"./_has":48,"./_is-object":58,"./_object-dp":78,"./_uid":128}],73:[function(require,module,exports){
var Map = require('./es6.map');
var $export = require('./_export');
var shared = require('./_shared')('metadata');
var store = shared.store || (shared.store = new (require('./es6.weak-map'))());

var getOrCreateMetadataMap = function (target, targetKey, create) {
  var targetMetadata = store.get(target);
  if (!targetMetadata) {
    if (!create) return undefined;
    store.set(target, targetMetadata = new Map());
  }
  var keyMetadata = targetMetadata.get(targetKey);
  if (!keyMetadata) {
    if (!create) return undefined;
    targetMetadata.set(targetKey, keyMetadata = new Map());
  } return keyMetadata;
};
var ordinaryHasOwnMetadata = function (MetadataKey, O, P) {
  var metadataMap = getOrCreateMetadataMap(O, P, false);
  return metadataMap === undefined ? false : metadataMap.has(MetadataKey);
};
var ordinaryGetOwnMetadata = function (MetadataKey, O, P) {
  var metadataMap = getOrCreateMetadataMap(O, P, false);
  return metadataMap === undefined ? undefined : metadataMap.get(MetadataKey);
};
var ordinaryDefineOwnMetadata = function (MetadataKey, MetadataValue, O, P) {
  getOrCreateMetadataMap(O, P, true).set(MetadataKey, MetadataValue);
};
var ordinaryOwnMetadataKeys = function (target, targetKey) {
  var metadataMap = getOrCreateMetadataMap(target, targetKey, false);
  var keys = [];
  if (metadataMap) metadataMap.forEach(function (_, key) { keys.push(key); });
  return keys;
};
var toMetaKey = function (it) {
  return it === undefined || typeof it == 'symbol' ? it : String(it);
};
var exp = function (O) {
  $export($export.S, 'Reflect', O);
};

module.exports = {
  store: store,
  map: getOrCreateMetadataMap,
  has: ordinaryHasOwnMetadata,
  get: ordinaryGetOwnMetadata,
  set: ordinaryDefineOwnMetadata,
  keys: ordinaryOwnMetadataKeys,
  key: toMetaKey,
  exp: exp
};

},{"./_export":40,"./_shared":107,"./es6.map":165,"./es6.weak-map":271}],74:[function(require,module,exports){
var global = require('./_global');
var macrotask = require('./_task').set;
var Observer = global.MutationObserver || global.WebKitMutationObserver;
var process = global.process;
var Promise = global.Promise;
var isNode = require('./_cof')(process) == 'process';

module.exports = function () {
  var head, last, notify;

  var flush = function () {
    var parent, fn;
    if (isNode && (parent = process.domain)) parent.exit();
    while (head) {
      fn = head.fn;
      head = head.next;
      try {
        fn();
      } catch (e) {
        if (head) notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if (parent) parent.enter();
  };

  // Node.js
  if (isNode) {
    notify = function () {
      process.nextTick(flush);
    };
  // browsers with MutationObserver, except iOS Safari - https://github.com/zloirock/core-js/issues/339
  } else if (Observer && !(global.navigator && global.navigator.standalone)) {
    var toggle = true;
    var node = document.createTextNode('');
    new Observer(flush).observe(node, { characterData: true }); // eslint-disable-line no-new
    notify = function () {
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if (Promise && Promise.resolve) {
    // Promise.resolve without an argument throws an error in LG WebOS 2
    var promise = Promise.resolve(undefined);
    notify = function () {
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function () {
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function (fn) {
    var task = { fn: fn, next: undefined };
    if (last) last.next = task;
    if (!head) {
      head = task;
      notify();
    } last = task;
  };
};

},{"./_cof":25,"./_global":47,"./_task":117}],75:[function(require,module,exports){
'use strict';
// 25.4.1.5 NewPromiseCapability(C)
var aFunction = require('./_a-function');

function PromiseCapability(C) {
  var resolve, reject;
  this.promise = new C(function ($$resolve, $$reject) {
    if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject = aFunction(reject);
}

module.exports.f = function (C) {
  return new PromiseCapability(C);
};

},{"./_a-function":10}],76:[function(require,module,exports){
'use strict';
// 19.1.2.1 Object.assign(target, source, ...)
var getKeys = require('./_object-keys');
var gOPS = require('./_object-gops');
var pIE = require('./_object-pie');
var toObject = require('./_to-object');
var IObject = require('./_iobject');
var $assign = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || require('./_fails')(function () {
  var A = {};
  var B = {};
  // eslint-disable-next-line no-undef
  var S = Symbol();
  var K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function (k) { B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source) { // eslint-disable-line no-unused-vars
  var T = toObject(target);
  var aLen = arguments.length;
  var index = 1;
  var getSymbols = gOPS.f;
  var isEnum = pIE.f;
  while (aLen > index) {
    var S = IObject(arguments[index++]);
    var keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
  } return T;
} : $assign;

},{"./_fails":42,"./_iobject":54,"./_object-gops":84,"./_object-keys":87,"./_object-pie":88,"./_to-object":123}],77:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = require('./_an-object');
var dPs = require('./_object-dps');
var enumBugKeys = require('./_enum-bug-keys');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var Empty = function () { /* empty */ };
var PROTOTYPE = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = require('./_dom-create')('iframe');
  var i = enumBugKeys.length;
  var lt = '<';
  var gt = '>';
  var iframeDocument;
  iframe.style.display = 'none';
  require('./_html').appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};

},{"./_an-object":14,"./_dom-create":37,"./_enum-bug-keys":38,"./_html":50,"./_object-dps":79,"./_shared-key":106}],78:[function(require,module,exports){
var anObject = require('./_an-object');
var IE8_DOM_DEFINE = require('./_ie8-dom-define');
var toPrimitive = require('./_to-primitive');
var dP = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return dP(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"./_an-object":14,"./_descriptors":36,"./_ie8-dom-define":51,"./_to-primitive":124}],79:[function(require,module,exports){
var dP = require('./_object-dp');
var anObject = require('./_an-object');
var getKeys = require('./_object-keys');

module.exports = require('./_descriptors') ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = getKeys(Properties);
  var length = keys.length;
  var i = 0;
  var P;
  while (length > i) dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

},{"./_an-object":14,"./_descriptors":36,"./_object-dp":78,"./_object-keys":87}],80:[function(require,module,exports){
'use strict';
// Forced replacement prototype accessors methods
module.exports = require('./_library') || !require('./_fails')(function () {
  var K = Math.random();
  // In FF throws only define methods
  // eslint-disable-next-line no-undef, no-useless-call
  __defineSetter__.call(null, K, function () { /* empty */ });
  delete require('./_global')[K];
});

},{"./_fails":42,"./_global":47,"./_library":66}],81:[function(require,module,exports){
var pIE = require('./_object-pie');
var createDesc = require('./_property-desc');
var toIObject = require('./_to-iobject');
var toPrimitive = require('./_to-primitive');
var has = require('./_has');
var IE8_DOM_DEFINE = require('./_ie8-dom-define');
var gOPD = Object.getOwnPropertyDescriptor;

exports.f = require('./_descriptors') ? gOPD : function getOwnPropertyDescriptor(O, P) {
  O = toIObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return gOPD(O, P);
  } catch (e) { /* empty */ }
  if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
};

},{"./_descriptors":36,"./_has":48,"./_ie8-dom-define":51,"./_object-pie":88,"./_property-desc":96,"./_to-iobject":121,"./_to-primitive":124}],82:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./_to-iobject');
var gOPN = require('./_object-gopn').f;
var toString = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function (it) {
  try {
    return gOPN(it);
  } catch (e) {
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it) {
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};

},{"./_object-gopn":83,"./_to-iobject":121}],83:[function(require,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys = require('./_object-keys-internal');
var hiddenKeys = require('./_enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return $keys(O, hiddenKeys);
};

},{"./_enum-bug-keys":38,"./_object-keys-internal":86}],84:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;

},{}],85:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = require('./_has');
var toObject = require('./_to-object');
var IE_PROTO = require('./_shared-key')('IE_PROTO');
var ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

},{"./_has":48,"./_shared-key":106,"./_to-object":123}],86:[function(require,module,exports){
var has = require('./_has');
var toIObject = require('./_to-iobject');
var arrayIndexOf = require('./_array-includes')(false);
var IE_PROTO = require('./_shared-key')('IE_PROTO');

module.exports = function (object, names) {
  var O = toIObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

},{"./_array-includes":18,"./_has":48,"./_shared-key":106,"./_to-iobject":121}],87:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys = require('./_object-keys-internal');
var enumBugKeys = require('./_enum-bug-keys');

module.exports = Object.keys || function keys(O) {
  return $keys(O, enumBugKeys);
};

},{"./_enum-bug-keys":38,"./_object-keys-internal":86}],88:[function(require,module,exports){
exports.f = {}.propertyIsEnumerable;

},{}],89:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./_export');
var core = require('./_core');
var fails = require('./_fails');
module.exports = function (KEY, exec) {
  var fn = (core.Object || {})[KEY] || Object[KEY];
  var exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function () { fn(1); }), 'Object', exp);
};

},{"./_core":30,"./_export":40,"./_fails":42}],90:[function(require,module,exports){
var getKeys = require('./_object-keys');
var toIObject = require('./_to-iobject');
var isEnum = require('./_object-pie').f;
module.exports = function (isEntries) {
  return function (it) {
    var O = toIObject(it);
    var keys = getKeys(O);
    var length = keys.length;
    var i = 0;
    var result = [];
    var key;
    while (length > i) if (isEnum.call(O, key = keys[i++])) {
      result.push(isEntries ? [key, O[key]] : O[key]);
    } return result;
  };
};

},{"./_object-keys":87,"./_object-pie":88,"./_to-iobject":121}],91:[function(require,module,exports){
// all object keys, includes non-enumerable and symbols
var gOPN = require('./_object-gopn');
var gOPS = require('./_object-gops');
var anObject = require('./_an-object');
var Reflect = require('./_global').Reflect;
module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
  var keys = gOPN.f(anObject(it));
  var getSymbols = gOPS.f;
  return getSymbols ? keys.concat(getSymbols(it)) : keys;
};

},{"./_an-object":14,"./_global":47,"./_object-gopn":83,"./_object-gops":84}],92:[function(require,module,exports){
var $parseFloat = require('./_global').parseFloat;
var $trim = require('./_string-trim').trim;

module.exports = 1 / $parseFloat(require('./_string-ws') + '-0') !== -Infinity ? function parseFloat(str) {
  var string = $trim(String(str), 3);
  var result = $parseFloat(string);
  return result === 0 && string.charAt(0) == '-' ? -0 : result;
} : $parseFloat;

},{"./_global":47,"./_string-trim":115,"./_string-ws":116}],93:[function(require,module,exports){
var $parseInt = require('./_global').parseInt;
var $trim = require('./_string-trim').trim;
var ws = require('./_string-ws');
var hex = /^[-+]?0[xX]/;

module.exports = $parseInt(ws + '08') !== 8 || $parseInt(ws + '0x16') !== 22 ? function parseInt(str, radix) {
  var string = $trim(String(str), 3);
  return $parseInt(string, (radix >>> 0) || (hex.test(string) ? 16 : 10));
} : $parseInt;

},{"./_global":47,"./_string-trim":115,"./_string-ws":116}],94:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return { e: false, v: exec() };
  } catch (e) {
    return { e: true, v: e };
  }
};

},{}],95:[function(require,module,exports){
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var newPromiseCapability = require('./_new-promise-capability');

module.exports = function (C, x) {
  anObject(C);
  if (isObject(x) && x.constructor === C) return x;
  var promiseCapability = newPromiseCapability.f(C);
  var resolve = promiseCapability.resolve;
  resolve(x);
  return promiseCapability.promise;
};

},{"./_an-object":14,"./_is-object":58,"./_new-promise-capability":75}],96:[function(require,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],97:[function(require,module,exports){
var redefine = require('./_redefine');
module.exports = function (target, src, safe) {
  for (var key in src) redefine(target, key, src[key], safe);
  return target;
};

},{"./_redefine":98}],98:[function(require,module,exports){
var global = require('./_global');
var hide = require('./_hide');
var has = require('./_has');
var SRC = require('./_uid')('src');
var TO_STRING = 'toString';
var $toString = Function[TO_STRING];
var TPL = ('' + $toString).split(TO_STRING);

require('./_core').inspectSource = function (it) {
  return $toString.call(it);
};

(module.exports = function (O, key, val, safe) {
  var isFunction = typeof val == 'function';
  if (isFunction) has(val, 'name') || hide(val, 'name', key);
  if (O[key] === val) return;
  if (isFunction) has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if (O === global) {
    O[key] = val;
  } else if (!safe) {
    delete O[key];
    hide(O, key, val);
  } else if (O[key]) {
    O[key] = val;
  } else {
    hide(O, key, val);
  }
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, TO_STRING, function toString() {
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});

},{"./_core":30,"./_global":47,"./_has":48,"./_hide":49,"./_uid":128}],99:[function(require,module,exports){
module.exports = function (regExp, replace) {
  var replacer = replace === Object(replace) ? function (part) {
    return replace[part];
  } : replace;
  return function (it) {
    return String(it).replace(regExp, replacer);
  };
};

},{}],100:[function(require,module,exports){
// 7.2.9 SameValue(x, y)
module.exports = Object.is || function is(x, y) {
  // eslint-disable-next-line no-self-compare
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};

},{}],101:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-setmap-offrom/
var $export = require('./_export');
var aFunction = require('./_a-function');
var ctx = require('./_ctx');
var forOf = require('./_for-of');

module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, { from: function from(source /* , mapFn, thisArg */) {
    var mapFn = arguments[1];
    var mapping, A, n, cb;
    aFunction(this);
    mapping = mapFn !== undefined;
    if (mapping) aFunction(mapFn);
    if (source == undefined) return new this();
    A = [];
    if (mapping) {
      n = 0;
      cb = ctx(mapFn, arguments[2], 2);
      forOf(source, false, function (nextItem) {
        A.push(cb(nextItem, n++));
      });
    } else {
      forOf(source, false, A.push, A);
    }
    return new this(A);
  } });
};

},{"./_a-function":10,"./_ctx":32,"./_export":40,"./_for-of":46}],102:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-setmap-offrom/
var $export = require('./_export');

module.exports = function (COLLECTION) {
  $export($export.S, COLLECTION, { of: function of() {
    var length = arguments.length;
    var A = new Array(length);
    while (length--) A[length] = arguments[length];
    return new this(A);
  } });
};

},{"./_export":40}],103:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var isObject = require('./_is-object');
var anObject = require('./_an-object');
var check = function (O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function (test, buggy, set) {
      try {
        set = require('./_ctx')(Function.call, require('./_object-gopd').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) { buggy = true; }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy) O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};

},{"./_an-object":14,"./_ctx":32,"./_is-object":58,"./_object-gopd":81}],104:[function(require,module,exports){
'use strict';
var global = require('./_global');
var dP = require('./_object-dp');
var DESCRIPTORS = require('./_descriptors');
var SPECIES = require('./_wks')('species');

module.exports = function (KEY) {
  var C = global[KEY];
  if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
    configurable: true,
    get: function () { return this; }
  });
};

},{"./_descriptors":36,"./_global":47,"./_object-dp":78,"./_wks":133}],105:[function(require,module,exports){
var def = require('./_object-dp').f;
var has = require('./_has');
var TAG = require('./_wks')('toStringTag');

module.exports = function (it, tag, stat) {
  if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
};

},{"./_has":48,"./_object-dp":78,"./_wks":133}],106:[function(require,module,exports){
var shared = require('./_shared')('keys');
var uid = require('./_uid');
module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

},{"./_shared":107,"./_uid":128}],107:[function(require,module,exports){
var core = require('./_core');
var global = require('./_global');
var SHARED = '__core-js_shared__';
var store = global[SHARED] || (global[SHARED] = {});

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: core.version,
  mode: require('./_library') ? 'pure' : 'global',
  copyright: '© 2018 Denis Pushkarev (zloirock.ru)'
});

},{"./_core":30,"./_global":47,"./_library":66}],108:[function(require,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject = require('./_an-object');
var aFunction = require('./_a-function');
var SPECIES = require('./_wks')('species');
module.exports = function (O, D) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};

},{"./_a-function":10,"./_an-object":14,"./_wks":133}],109:[function(require,module,exports){
'use strict';
var fails = require('./_fails');

module.exports = function (method, arg) {
  return !!method && fails(function () {
    // eslint-disable-next-line no-useless-call
    arg ? method.call(null, function () { /* empty */ }, 1) : method.call(null);
  });
};

},{"./_fails":42}],110:[function(require,module,exports){
var toInteger = require('./_to-integer');
var defined = require('./_defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function (TO_STRING) {
  return function (that, pos) {
    var s = String(defined(that));
    var i = toInteger(pos);
    var l = s.length;
    var a, b;
    if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

},{"./_defined":35,"./_to-integer":120}],111:[function(require,module,exports){
// helper for String#{startsWith, endsWith, includes}
var isRegExp = require('./_is-regexp');
var defined = require('./_defined');

module.exports = function (that, searchString, NAME) {
  if (isRegExp(searchString)) throw TypeError('String#' + NAME + " doesn't accept regex!");
  return String(defined(that));
};

},{"./_defined":35,"./_is-regexp":59}],112:[function(require,module,exports){
var $export = require('./_export');
var fails = require('./_fails');
var defined = require('./_defined');
var quot = /"/g;
// B.2.3.2.1 CreateHTML(string, tag, attribute, value)
var createHTML = function (string, tag, attribute, value) {
  var S = String(defined(string));
  var p1 = '<' + tag;
  if (attribute !== '') p1 += ' ' + attribute + '="' + String(value).replace(quot, '&quot;') + '"';
  return p1 + '>' + S + '</' + tag + '>';
};
module.exports = function (NAME, exec) {
  var O = {};
  O[NAME] = exec(createHTML);
  $export($export.P + $export.F * fails(function () {
    var test = ''[NAME]('"');
    return test !== test.toLowerCase() || test.split('"').length > 3;
  }), 'String', O);
};

},{"./_defined":35,"./_export":40,"./_fails":42}],113:[function(require,module,exports){
// https://github.com/tc39/proposal-string-pad-start-end
var toLength = require('./_to-length');
var repeat = require('./_string-repeat');
var defined = require('./_defined');

module.exports = function (that, maxLength, fillString, left) {
  var S = String(defined(that));
  var stringLength = S.length;
  var fillStr = fillString === undefined ? ' ' : String(fillString);
  var intMaxLength = toLength(maxLength);
  if (intMaxLength <= stringLength || fillStr == '') return S;
  var fillLen = intMaxLength - stringLength;
  var stringFiller = repeat.call(fillStr, Math.ceil(fillLen / fillStr.length));
  if (stringFiller.length > fillLen) stringFiller = stringFiller.slice(0, fillLen);
  return left ? stringFiller + S : S + stringFiller;
};

},{"./_defined":35,"./_string-repeat":114,"./_to-length":122}],114:[function(require,module,exports){
'use strict';
var toInteger = require('./_to-integer');
var defined = require('./_defined');

module.exports = function repeat(count) {
  var str = String(defined(this));
  var res = '';
  var n = toInteger(count);
  if (n < 0 || n == Infinity) throw RangeError("Count can't be negative");
  for (;n > 0; (n >>>= 1) && (str += str)) if (n & 1) res += str;
  return res;
};

},{"./_defined":35,"./_to-integer":120}],115:[function(require,module,exports){
var $export = require('./_export');
var defined = require('./_defined');
var fails = require('./_fails');
var spaces = require('./_string-ws');
var space = '[' + spaces + ']';
var non = '\u200b\u0085';
var ltrim = RegExp('^' + space + space + '*');
var rtrim = RegExp(space + space + '*$');

var exporter = function (KEY, exec, ALIAS) {
  var exp = {};
  var FORCE = fails(function () {
    return !!spaces[KEY]() || non[KEY]() != non;
  });
  var fn = exp[KEY] = FORCE ? exec(trim) : spaces[KEY];
  if (ALIAS) exp[ALIAS] = fn;
  $export($export.P + $export.F * FORCE, 'String', exp);
};

// 1 -> String#trimLeft
// 2 -> String#trimRight
// 3 -> String#trim
var trim = exporter.trim = function (string, TYPE) {
  string = String(defined(string));
  if (TYPE & 1) string = string.replace(ltrim, '');
  if (TYPE & 2) string = string.replace(rtrim, '');
  return string;
};

module.exports = exporter;

},{"./_defined":35,"./_export":40,"./_fails":42,"./_string-ws":116}],116:[function(require,module,exports){
module.exports = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' +
  '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

},{}],117:[function(require,module,exports){
var ctx = require('./_ctx');
var invoke = require('./_invoke');
var html = require('./_html');
var cel = require('./_dom-create');
var global = require('./_global');
var process = global.process;
var setTask = global.setImmediate;
var clearTask = global.clearImmediate;
var MessageChannel = global.MessageChannel;
var Dispatch = global.Dispatch;
var counter = 0;
var queue = {};
var ONREADYSTATECHANGE = 'onreadystatechange';
var defer, channel, port;
var run = function () {
  var id = +this;
  // eslint-disable-next-line no-prototype-builtins
  if (queue.hasOwnProperty(id)) {
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function (event) {
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if (!setTask || !clearTask) {
  setTask = function setImmediate(fn) {
    var args = [];
    var i = 1;
    while (arguments.length > i) args.push(arguments[i++]);
    queue[++counter] = function () {
      // eslint-disable-next-line no-new-func
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id) {
    delete queue[id];
  };
  // Node.js 0.8-
  if (require('./_cof')(process) == 'process') {
    defer = function (id) {
      process.nextTick(ctx(run, id, 1));
    };
  // Sphere (JS game engine) Dispatch API
  } else if (Dispatch && Dispatch.now) {
    defer = function (id) {
      Dispatch.now(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if (MessageChannel) {
    channel = new MessageChannel();
    port = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
    defer = function (id) {
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if (ONREADYSTATECHANGE in cel('script')) {
    defer = function (id) {
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function (id) {
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set: setTask,
  clear: clearTask
};

},{"./_cof":25,"./_ctx":32,"./_dom-create":37,"./_global":47,"./_html":50,"./_invoke":53}],118:[function(require,module,exports){
var toInteger = require('./_to-integer');
var max = Math.max;
var min = Math.min;
module.exports = function (index, length) {
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

},{"./_to-integer":120}],119:[function(require,module,exports){
// https://tc39.github.io/ecma262/#sec-toindex
var toInteger = require('./_to-integer');
var toLength = require('./_to-length');
module.exports = function (it) {
  if (it === undefined) return 0;
  var number = toInteger(it);
  var length = toLength(number);
  if (number !== length) throw RangeError('Wrong length!');
  return length;
};

},{"./_to-integer":120,"./_to-length":122}],120:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil = Math.ceil;
var floor = Math.floor;
module.exports = function (it) {
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

},{}],121:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./_iobject');
var defined = require('./_defined');
module.exports = function (it) {
  return IObject(defined(it));
};

},{"./_defined":35,"./_iobject":54}],122:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./_to-integer');
var min = Math.min;
module.exports = function (it) {
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

},{"./_to-integer":120}],123:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./_defined');
module.exports = function (it) {
  return Object(defined(it));
};

},{"./_defined":35}],124:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"./_is-object":58}],125:[function(require,module,exports){
'use strict';
if (require('./_descriptors')) {
  var LIBRARY = require('./_library');
  var global = require('./_global');
  var fails = require('./_fails');
  var $export = require('./_export');
  var $typed = require('./_typed');
  var $buffer = require('./_typed-buffer');
  var ctx = require('./_ctx');
  var anInstance = require('./_an-instance');
  var propertyDesc = require('./_property-desc');
  var hide = require('./_hide');
  var redefineAll = require('./_redefine-all');
  var toInteger = require('./_to-integer');
  var toLength = require('./_to-length');
  var toIndex = require('./_to-index');
  var toAbsoluteIndex = require('./_to-absolute-index');
  var toPrimitive = require('./_to-primitive');
  var has = require('./_has');
  var classof = require('./_classof');
  var isObject = require('./_is-object');
  var toObject = require('./_to-object');
  var isArrayIter = require('./_is-array-iter');
  var create = require('./_object-create');
  var getPrototypeOf = require('./_object-gpo');
  var gOPN = require('./_object-gopn').f;
  var getIterFn = require('./core.get-iterator-method');
  var uid = require('./_uid');
  var wks = require('./_wks');
  var createArrayMethod = require('./_array-methods');
  var createArrayIncludes = require('./_array-includes');
  var speciesConstructor = require('./_species-constructor');
  var ArrayIterators = require('./es6.array.iterator');
  var Iterators = require('./_iterators');
  var $iterDetect = require('./_iter-detect');
  var setSpecies = require('./_set-species');
  var arrayFill = require('./_array-fill');
  var arrayCopyWithin = require('./_array-copy-within');
  var $DP = require('./_object-dp');
  var $GOPD = require('./_object-gopd');
  var dP = $DP.f;
  var gOPD = $GOPD.f;
  var RangeError = global.RangeError;
  var TypeError = global.TypeError;
  var Uint8Array = global.Uint8Array;
  var ARRAY_BUFFER = 'ArrayBuffer';
  var SHARED_BUFFER = 'Shared' + ARRAY_BUFFER;
  var BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT';
  var PROTOTYPE = 'prototype';
  var ArrayProto = Array[PROTOTYPE];
  var $ArrayBuffer = $buffer.ArrayBuffer;
  var $DataView = $buffer.DataView;
  var arrayForEach = createArrayMethod(0);
  var arrayFilter = createArrayMethod(2);
  var arraySome = createArrayMethod(3);
  var arrayEvery = createArrayMethod(4);
  var arrayFind = createArrayMethod(5);
  var arrayFindIndex = createArrayMethod(6);
  var arrayIncludes = createArrayIncludes(true);
  var arrayIndexOf = createArrayIncludes(false);
  var arrayValues = ArrayIterators.values;
  var arrayKeys = ArrayIterators.keys;
  var arrayEntries = ArrayIterators.entries;
  var arrayLastIndexOf = ArrayProto.lastIndexOf;
  var arrayReduce = ArrayProto.reduce;
  var arrayReduceRight = ArrayProto.reduceRight;
  var arrayJoin = ArrayProto.join;
  var arraySort = ArrayProto.sort;
  var arraySlice = ArrayProto.slice;
  var arrayToString = ArrayProto.toString;
  var arrayToLocaleString = ArrayProto.toLocaleString;
  var ITERATOR = wks('iterator');
  var TAG = wks('toStringTag');
  var TYPED_CONSTRUCTOR = uid('typed_constructor');
  var DEF_CONSTRUCTOR = uid('def_constructor');
  var ALL_CONSTRUCTORS = $typed.CONSTR;
  var TYPED_ARRAY = $typed.TYPED;
  var VIEW = $typed.VIEW;
  var WRONG_LENGTH = 'Wrong length!';

  var $map = createArrayMethod(1, function (O, length) {
    return allocate(speciesConstructor(O, O[DEF_CONSTRUCTOR]), length);
  });

  var LITTLE_ENDIAN = fails(function () {
    // eslint-disable-next-line no-undef
    return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  });

  var FORCED_SET = !!Uint8Array && !!Uint8Array[PROTOTYPE].set && fails(function () {
    new Uint8Array(1).set({});
  });

  var toOffset = function (it, BYTES) {
    var offset = toInteger(it);
    if (offset < 0 || offset % BYTES) throw RangeError('Wrong offset!');
    return offset;
  };

  var validate = function (it) {
    if (isObject(it) && TYPED_ARRAY in it) return it;
    throw TypeError(it + ' is not a typed array!');
  };

  var allocate = function (C, length) {
    if (!(isObject(C) && TYPED_CONSTRUCTOR in C)) {
      throw TypeError('It is not a typed array constructor!');
    } return new C(length);
  };

  var speciesFromList = function (O, list) {
    return fromList(speciesConstructor(O, O[DEF_CONSTRUCTOR]), list);
  };

  var fromList = function (C, list) {
    var index = 0;
    var length = list.length;
    var result = allocate(C, length);
    while (length > index) result[index] = list[index++];
    return result;
  };

  var addGetter = function (it, key, internal) {
    dP(it, key, { get: function () { return this._d[internal]; } });
  };

  var $from = function from(source /* , mapfn, thisArg */) {
    var O = toObject(source);
    var aLen = arguments.length;
    var mapfn = aLen > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var iterFn = getIterFn(O);
    var i, length, values, result, step, iterator;
    if (iterFn != undefined && !isArrayIter(iterFn)) {
      for (iterator = iterFn.call(O), values = [], i = 0; !(step = iterator.next()).done; i++) {
        values.push(step.value);
      } O = values;
    }
    if (mapping && aLen > 2) mapfn = ctx(mapfn, arguments[2], 2);
    for (i = 0, length = toLength(O.length), result = allocate(this, length); length > i; i++) {
      result[i] = mapping ? mapfn(O[i], i) : O[i];
    }
    return result;
  };

  var $of = function of(/* ...items */) {
    var index = 0;
    var length = arguments.length;
    var result = allocate(this, length);
    while (length > index) result[index] = arguments[index++];
    return result;
  };

  // iOS Safari 6.x fails here
  var TO_LOCALE_BUG = !!Uint8Array && fails(function () { arrayToLocaleString.call(new Uint8Array(1)); });

  var $toLocaleString = function toLocaleString() {
    return arrayToLocaleString.apply(TO_LOCALE_BUG ? arraySlice.call(validate(this)) : validate(this), arguments);
  };

  var proto = {
    copyWithin: function copyWithin(target, start /* , end */) {
      return arrayCopyWithin.call(validate(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
    },
    every: function every(callbackfn /* , thisArg */) {
      return arrayEvery(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    fill: function fill(value /* , start, end */) { // eslint-disable-line no-unused-vars
      return arrayFill.apply(validate(this), arguments);
    },
    filter: function filter(callbackfn /* , thisArg */) {
      return speciesFromList(this, arrayFilter(validate(this), callbackfn,
        arguments.length > 1 ? arguments[1] : undefined));
    },
    find: function find(predicate /* , thisArg */) {
      return arrayFind(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    findIndex: function findIndex(predicate /* , thisArg */) {
      return arrayFindIndex(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
    },
    forEach: function forEach(callbackfn /* , thisArg */) {
      arrayForEach(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    indexOf: function indexOf(searchElement /* , fromIndex */) {
      return arrayIndexOf(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    includes: function includes(searchElement /* , fromIndex */) {
      return arrayIncludes(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
    },
    join: function join(separator) { // eslint-disable-line no-unused-vars
      return arrayJoin.apply(validate(this), arguments);
    },
    lastIndexOf: function lastIndexOf(searchElement /* , fromIndex */) { // eslint-disable-line no-unused-vars
      return arrayLastIndexOf.apply(validate(this), arguments);
    },
    map: function map(mapfn /* , thisArg */) {
      return $map(validate(this), mapfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    reduce: function reduce(callbackfn /* , initialValue */) { // eslint-disable-line no-unused-vars
      return arrayReduce.apply(validate(this), arguments);
    },
    reduceRight: function reduceRight(callbackfn /* , initialValue */) { // eslint-disable-line no-unused-vars
      return arrayReduceRight.apply(validate(this), arguments);
    },
    reverse: function reverse() {
      var that = this;
      var length = validate(that).length;
      var middle = Math.floor(length / 2);
      var index = 0;
      var value;
      while (index < middle) {
        value = that[index];
        that[index++] = that[--length];
        that[length] = value;
      } return that;
    },
    some: function some(callbackfn /* , thisArg */) {
      return arraySome(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    },
    sort: function sort(comparefn) {
      return arraySort.call(validate(this), comparefn);
    },
    subarray: function subarray(begin, end) {
      var O = validate(this);
      var length = O.length;
      var $begin = toAbsoluteIndex(begin, length);
      return new (speciesConstructor(O, O[DEF_CONSTRUCTOR]))(
        O.buffer,
        O.byteOffset + $begin * O.BYTES_PER_ELEMENT,
        toLength((end === undefined ? length : toAbsoluteIndex(end, length)) - $begin)
      );
    }
  };

  var $slice = function slice(start, end) {
    return speciesFromList(this, arraySlice.call(validate(this), start, end));
  };

  var $set = function set(arrayLike /* , offset */) {
    validate(this);
    var offset = toOffset(arguments[1], 1);
    var length = this.length;
    var src = toObject(arrayLike);
    var len = toLength(src.length);
    var index = 0;
    if (len + offset > length) throw RangeError(WRONG_LENGTH);
    while (index < len) this[offset + index] = src[index++];
  };

  var $iterators = {
    entries: function entries() {
      return arrayEntries.call(validate(this));
    },
    keys: function keys() {
      return arrayKeys.call(validate(this));
    },
    values: function values() {
      return arrayValues.call(validate(this));
    }
  };

  var isTAIndex = function (target, key) {
    return isObject(target)
      && target[TYPED_ARRAY]
      && typeof key != 'symbol'
      && key in target
      && String(+key) == String(key);
  };
  var $getDesc = function getOwnPropertyDescriptor(target, key) {
    return isTAIndex(target, key = toPrimitive(key, true))
      ? propertyDesc(2, target[key])
      : gOPD(target, key);
  };
  var $setDesc = function defineProperty(target, key, desc) {
    if (isTAIndex(target, key = toPrimitive(key, true))
      && isObject(desc)
      && has(desc, 'value')
      && !has(desc, 'get')
      && !has(desc, 'set')
      // TODO: add validation descriptor w/o calling accessors
      && !desc.configurable
      && (!has(desc, 'writable') || desc.writable)
      && (!has(desc, 'enumerable') || desc.enumerable)
    ) {
      target[key] = desc.value;
      return target;
    } return dP(target, key, desc);
  };

  if (!ALL_CONSTRUCTORS) {
    $GOPD.f = $getDesc;
    $DP.f = $setDesc;
  }

  $export($export.S + $export.F * !ALL_CONSTRUCTORS, 'Object', {
    getOwnPropertyDescriptor: $getDesc,
    defineProperty: $setDesc
  });

  if (fails(function () { arrayToString.call({}); })) {
    arrayToString = arrayToLocaleString = function toString() {
      return arrayJoin.call(this);
    };
  }

  var $TypedArrayPrototype$ = redefineAll({}, proto);
  redefineAll($TypedArrayPrototype$, $iterators);
  hide($TypedArrayPrototype$, ITERATOR, $iterators.values);
  redefineAll($TypedArrayPrototype$, {
    slice: $slice,
    set: $set,
    constructor: function () { /* noop */ },
    toString: arrayToString,
    toLocaleString: $toLocaleString
  });
  addGetter($TypedArrayPrototype$, 'buffer', 'b');
  addGetter($TypedArrayPrototype$, 'byteOffset', 'o');
  addGetter($TypedArrayPrototype$, 'byteLength', 'l');
  addGetter($TypedArrayPrototype$, 'length', 'e');
  dP($TypedArrayPrototype$, TAG, {
    get: function () { return this[TYPED_ARRAY]; }
  });

  // eslint-disable-next-line max-statements
  module.exports = function (KEY, BYTES, wrapper, CLAMPED) {
    CLAMPED = !!CLAMPED;
    var NAME = KEY + (CLAMPED ? 'Clamped' : '') + 'Array';
    var GETTER = 'get' + KEY;
    var SETTER = 'set' + KEY;
    var TypedArray = global[NAME];
    var Base = TypedArray || {};
    var TAC = TypedArray && getPrototypeOf(TypedArray);
    var FORCED = !TypedArray || !$typed.ABV;
    var O = {};
    var TypedArrayPrototype = TypedArray && TypedArray[PROTOTYPE];
    var getter = function (that, index) {
      var data = that._d;
      return data.v[GETTER](index * BYTES + data.o, LITTLE_ENDIAN);
    };
    var setter = function (that, index, value) {
      var data = that._d;
      if (CLAMPED) value = (value = Math.round(value)) < 0 ? 0 : value > 0xff ? 0xff : value & 0xff;
      data.v[SETTER](index * BYTES + data.o, value, LITTLE_ENDIAN);
    };
    var addElement = function (that, index) {
      dP(that, index, {
        get: function () {
          return getter(this, index);
        },
        set: function (value) {
          return setter(this, index, value);
        },
        enumerable: true
      });
    };
    if (FORCED) {
      TypedArray = wrapper(function (that, data, $offset, $length) {
        anInstance(that, TypedArray, NAME, '_d');
        var index = 0;
        var offset = 0;
        var buffer, byteLength, length, klass;
        if (!isObject(data)) {
          length = toIndex(data);
          byteLength = length * BYTES;
          buffer = new $ArrayBuffer(byteLength);
        } else if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
          buffer = data;
          offset = toOffset($offset, BYTES);
          var $len = data.byteLength;
          if ($length === undefined) {
            if ($len % BYTES) throw RangeError(WRONG_LENGTH);
            byteLength = $len - offset;
            if (byteLength < 0) throw RangeError(WRONG_LENGTH);
          } else {
            byteLength = toLength($length) * BYTES;
            if (byteLength + offset > $len) throw RangeError(WRONG_LENGTH);
          }
          length = byteLength / BYTES;
        } else if (TYPED_ARRAY in data) {
          return fromList(TypedArray, data);
        } else {
          return $from.call(TypedArray, data);
        }
        hide(that, '_d', {
          b: buffer,
          o: offset,
          l: byteLength,
          e: length,
          v: new $DataView(buffer)
        });
        while (index < length) addElement(that, index++);
      });
      TypedArrayPrototype = TypedArray[PROTOTYPE] = create($TypedArrayPrototype$);
      hide(TypedArrayPrototype, 'constructor', TypedArray);
    } else if (!fails(function () {
      TypedArray(1);
    }) || !fails(function () {
      new TypedArray(-1); // eslint-disable-line no-new
    }) || !$iterDetect(function (iter) {
      new TypedArray(); // eslint-disable-line no-new
      new TypedArray(null); // eslint-disable-line no-new
      new TypedArray(1.5); // eslint-disable-line no-new
      new TypedArray(iter); // eslint-disable-line no-new
    }, true)) {
      TypedArray = wrapper(function (that, data, $offset, $length) {
        anInstance(that, TypedArray, NAME);
        var klass;
        // `ws` module bug, temporarily remove validation length for Uint8Array
        // https://github.com/websockets/ws/pull/645
        if (!isObject(data)) return new Base(toIndex(data));
        if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
          return $length !== undefined
            ? new Base(data, toOffset($offset, BYTES), $length)
            : $offset !== undefined
              ? new Base(data, toOffset($offset, BYTES))
              : new Base(data);
        }
        if (TYPED_ARRAY in data) return fromList(TypedArray, data);
        return $from.call(TypedArray, data);
      });
      arrayForEach(TAC !== Function.prototype ? gOPN(Base).concat(gOPN(TAC)) : gOPN(Base), function (key) {
        if (!(key in TypedArray)) hide(TypedArray, key, Base[key]);
      });
      TypedArray[PROTOTYPE] = TypedArrayPrototype;
      if (!LIBRARY) TypedArrayPrototype.constructor = TypedArray;
    }
    var $nativeIterator = TypedArrayPrototype[ITERATOR];
    var CORRECT_ITER_NAME = !!$nativeIterator
      && ($nativeIterator.name == 'values' || $nativeIterator.name == undefined);
    var $iterator = $iterators.values;
    hide(TypedArray, TYPED_CONSTRUCTOR, true);
    hide(TypedArrayPrototype, TYPED_ARRAY, NAME);
    hide(TypedArrayPrototype, VIEW, true);
    hide(TypedArrayPrototype, DEF_CONSTRUCTOR, TypedArray);

    if (CLAMPED ? new TypedArray(1)[TAG] != NAME : !(TAG in TypedArrayPrototype)) {
      dP(TypedArrayPrototype, TAG, {
        get: function () { return NAME; }
      });
    }

    O[NAME] = TypedArray;

    $export($export.G + $export.W + $export.F * (TypedArray != Base), O);

    $export($export.S, NAME, {
      BYTES_PER_ELEMENT: BYTES
    });

    $export($export.S + $export.F * fails(function () { Base.of.call(TypedArray, 1); }), NAME, {
      from: $from,
      of: $of
    });

    if (!(BYTES_PER_ELEMENT in TypedArrayPrototype)) hide(TypedArrayPrototype, BYTES_PER_ELEMENT, BYTES);

    $export($export.P, NAME, proto);

    setSpecies(NAME);

    $export($export.P + $export.F * FORCED_SET, NAME, { set: $set });

    $export($export.P + $export.F * !CORRECT_ITER_NAME, NAME, $iterators);

    if (!LIBRARY && TypedArrayPrototype.toString != arrayToString) TypedArrayPrototype.toString = arrayToString;

    $export($export.P + $export.F * fails(function () {
      new TypedArray(1).slice();
    }), NAME, { slice: $slice });

    $export($export.P + $export.F * (fails(function () {
      return [1, 2].toLocaleString() != new TypedArray([1, 2]).toLocaleString();
    }) || !fails(function () {
      TypedArrayPrototype.toLocaleString.call([1, 2]);
    })), NAME, { toLocaleString: $toLocaleString });

    Iterators[NAME] = CORRECT_ITER_NAME ? $nativeIterator : $iterator;
    if (!LIBRARY && !CORRECT_ITER_NAME) hide(TypedArrayPrototype, ITERATOR, $iterator);
  };
} else module.exports = function () { /* empty */ };

},{"./_an-instance":13,"./_array-copy-within":15,"./_array-fill":16,"./_array-includes":18,"./_array-methods":19,"./_classof":24,"./_ctx":32,"./_descriptors":36,"./_export":40,"./_fails":42,"./_global":47,"./_has":48,"./_hide":49,"./_is-array-iter":55,"./_is-object":58,"./_iter-detect":63,"./_iterators":65,"./_library":66,"./_object-create":77,"./_object-dp":78,"./_object-gopd":81,"./_object-gopn":83,"./_object-gpo":85,"./_property-desc":96,"./_redefine-all":97,"./_set-species":104,"./_species-constructor":108,"./_to-absolute-index":118,"./_to-index":119,"./_to-integer":120,"./_to-length":122,"./_to-object":123,"./_to-primitive":124,"./_typed":127,"./_typed-buffer":126,"./_uid":128,"./_wks":133,"./core.get-iterator-method":134,"./es6.array.iterator":146}],126:[function(require,module,exports){
'use strict';
var global = require('./_global');
var DESCRIPTORS = require('./_descriptors');
var LIBRARY = require('./_library');
var $typed = require('./_typed');
var hide = require('./_hide');
var redefineAll = require('./_redefine-all');
var fails = require('./_fails');
var anInstance = require('./_an-instance');
var toInteger = require('./_to-integer');
var toLength = require('./_to-length');
var toIndex = require('./_to-index');
var gOPN = require('./_object-gopn').f;
var dP = require('./_object-dp').f;
var arrayFill = require('./_array-fill');
var setToStringTag = require('./_set-to-string-tag');
var ARRAY_BUFFER = 'ArrayBuffer';
var DATA_VIEW = 'DataView';
var PROTOTYPE = 'prototype';
var WRONG_LENGTH = 'Wrong length!';
var WRONG_INDEX = 'Wrong index!';
var $ArrayBuffer = global[ARRAY_BUFFER];
var $DataView = global[DATA_VIEW];
var Math = global.Math;
var RangeError = global.RangeError;
// eslint-disable-next-line no-shadow-restricted-names
var Infinity = global.Infinity;
var BaseBuffer = $ArrayBuffer;
var abs = Math.abs;
var pow = Math.pow;
var floor = Math.floor;
var log = Math.log;
var LN2 = Math.LN2;
var BUFFER = 'buffer';
var BYTE_LENGTH = 'byteLength';
var BYTE_OFFSET = 'byteOffset';
var $BUFFER = DESCRIPTORS ? '_b' : BUFFER;
var $LENGTH = DESCRIPTORS ? '_l' : BYTE_LENGTH;
var $OFFSET = DESCRIPTORS ? '_o' : BYTE_OFFSET;

// IEEE754 conversions based on https://github.com/feross/ieee754
function packIEEE754(value, mLen, nBytes) {
  var buffer = new Array(nBytes);
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? pow(2, -24) - pow(2, -77) : 0;
  var i = 0;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  var e, m, c;
  value = abs(value);
  // eslint-disable-next-line no-self-compare
  if (value != value || value === Infinity) {
    // eslint-disable-next-line no-self-compare
    m = value != value ? 1 : 0;
    e = eMax;
  } else {
    e = floor(log(value) / LN2);
    if (value * (c = pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }
    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * pow(2, eBias - 1) * pow(2, mLen);
      e = 0;
    }
  }
  for (; mLen >= 8; buffer[i++] = m & 255, m /= 256, mLen -= 8);
  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer[i++] = e & 255, e /= 256, eLen -= 8);
  buffer[--i] |= s * 128;
  return buffer;
}
function unpackIEEE754(buffer, mLen, nBytes) {
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = eLen - 7;
  var i = nBytes - 1;
  var s = buffer[i--];
  var e = s & 127;
  var m;
  s >>= 7;
  for (; nBits > 0; e = e * 256 + buffer[i], i--, nBits -= 8);
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[i], i--, nBits -= 8);
  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : s ? -Infinity : Infinity;
  } else {
    m = m + pow(2, mLen);
    e = e - eBias;
  } return (s ? -1 : 1) * m * pow(2, e - mLen);
}

function unpackI32(bytes) {
  return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
}
function packI8(it) {
  return [it & 0xff];
}
function packI16(it) {
  return [it & 0xff, it >> 8 & 0xff];
}
function packI32(it) {
  return [it & 0xff, it >> 8 & 0xff, it >> 16 & 0xff, it >> 24 & 0xff];
}
function packF64(it) {
  return packIEEE754(it, 52, 8);
}
function packF32(it) {
  return packIEEE754(it, 23, 4);
}

function addGetter(C, key, internal) {
  dP(C[PROTOTYPE], key, { get: function () { return this[internal]; } });
}

function get(view, bytes, index, isLittleEndian) {
  var numIndex = +index;
  var intIndex = toIndex(numIndex);
  if (intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b;
  var start = intIndex + view[$OFFSET];
  var pack = store.slice(start, start + bytes);
  return isLittleEndian ? pack : pack.reverse();
}
function set(view, bytes, index, conversion, value, isLittleEndian) {
  var numIndex = +index;
  var intIndex = toIndex(numIndex);
  if (intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
  var store = view[$BUFFER]._b;
  var start = intIndex + view[$OFFSET];
  var pack = conversion(+value);
  for (var i = 0; i < bytes; i++) store[start + i] = pack[isLittleEndian ? i : bytes - i - 1];
}

if (!$typed.ABV) {
  $ArrayBuffer = function ArrayBuffer(length) {
    anInstance(this, $ArrayBuffer, ARRAY_BUFFER);
    var byteLength = toIndex(length);
    this._b = arrayFill.call(new Array(byteLength), 0);
    this[$LENGTH] = byteLength;
  };

  $DataView = function DataView(buffer, byteOffset, byteLength) {
    anInstance(this, $DataView, DATA_VIEW);
    anInstance(buffer, $ArrayBuffer, DATA_VIEW);
    var bufferLength = buffer[$LENGTH];
    var offset = toInteger(byteOffset);
    if (offset < 0 || offset > bufferLength) throw RangeError('Wrong offset!');
    byteLength = byteLength === undefined ? bufferLength - offset : toLength(byteLength);
    if (offset + byteLength > bufferLength) throw RangeError(WRONG_LENGTH);
    this[$BUFFER] = buffer;
    this[$OFFSET] = offset;
    this[$LENGTH] = byteLength;
  };

  if (DESCRIPTORS) {
    addGetter($ArrayBuffer, BYTE_LENGTH, '_l');
    addGetter($DataView, BUFFER, '_b');
    addGetter($DataView, BYTE_LENGTH, '_l');
    addGetter($DataView, BYTE_OFFSET, '_o');
  }

  redefineAll($DataView[PROTOTYPE], {
    getInt8: function getInt8(byteOffset) {
      return get(this, 1, byteOffset)[0] << 24 >> 24;
    },
    getUint8: function getUint8(byteOffset) {
      return get(this, 1, byteOffset)[0];
    },
    getInt16: function getInt16(byteOffset /* , littleEndian */) {
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
    },
    getUint16: function getUint16(byteOffset /* , littleEndian */) {
      var bytes = get(this, 2, byteOffset, arguments[1]);
      return bytes[1] << 8 | bytes[0];
    },
    getInt32: function getInt32(byteOffset /* , littleEndian */) {
      return unpackI32(get(this, 4, byteOffset, arguments[1]));
    },
    getUint32: function getUint32(byteOffset /* , littleEndian */) {
      return unpackI32(get(this, 4, byteOffset, arguments[1])) >>> 0;
    },
    getFloat32: function getFloat32(byteOffset /* , littleEndian */) {
      return unpackIEEE754(get(this, 4, byteOffset, arguments[1]), 23, 4);
    },
    getFloat64: function getFloat64(byteOffset /* , littleEndian */) {
      return unpackIEEE754(get(this, 8, byteOffset, arguments[1]), 52, 8);
    },
    setInt8: function setInt8(byteOffset, value) {
      set(this, 1, byteOffset, packI8, value);
    },
    setUint8: function setUint8(byteOffset, value) {
      set(this, 1, byteOffset, packI8, value);
    },
    setInt16: function setInt16(byteOffset, value /* , littleEndian */) {
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setUint16: function setUint16(byteOffset, value /* , littleEndian */) {
      set(this, 2, byteOffset, packI16, value, arguments[2]);
    },
    setInt32: function setInt32(byteOffset, value /* , littleEndian */) {
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setUint32: function setUint32(byteOffset, value /* , littleEndian */) {
      set(this, 4, byteOffset, packI32, value, arguments[2]);
    },
    setFloat32: function setFloat32(byteOffset, value /* , littleEndian */) {
      set(this, 4, byteOffset, packF32, value, arguments[2]);
    },
    setFloat64: function setFloat64(byteOffset, value /* , littleEndian */) {
      set(this, 8, byteOffset, packF64, value, arguments[2]);
    }
  });
} else {
  if (!fails(function () {
    $ArrayBuffer(1);
  }) || !fails(function () {
    new $ArrayBuffer(-1); // eslint-disable-line no-new
  }) || fails(function () {
    new $ArrayBuffer(); // eslint-disable-line no-new
    new $ArrayBuffer(1.5); // eslint-disable-line no-new
    new $ArrayBuffer(NaN); // eslint-disable-line no-new
    return $ArrayBuffer.name != ARRAY_BUFFER;
  })) {
    $ArrayBuffer = function ArrayBuffer(length) {
      anInstance(this, $ArrayBuffer);
      return new BaseBuffer(toIndex(length));
    };
    var ArrayBufferProto = $ArrayBuffer[PROTOTYPE] = BaseBuffer[PROTOTYPE];
    for (var keys = gOPN(BaseBuffer), j = 0, key; keys.length > j;) {
      if (!((key = keys[j++]) in $ArrayBuffer)) hide($ArrayBuffer, key, BaseBuffer[key]);
    }
    if (!LIBRARY) ArrayBufferProto.constructor = $ArrayBuffer;
  }
  // iOS Safari 7.x bug
  var view = new $DataView(new $ArrayBuffer(2));
  var $setInt8 = $DataView[PROTOTYPE].setInt8;
  view.setInt8(0, 2147483648);
  view.setInt8(1, 2147483649);
  if (view.getInt8(0) || !view.getInt8(1)) redefineAll($DataView[PROTOTYPE], {
    setInt8: function setInt8(byteOffset, value) {
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    },
    setUint8: function setUint8(byteOffset, value) {
      $setInt8.call(this, byteOffset, value << 24 >> 24);
    }
  }, true);
}
setToStringTag($ArrayBuffer, ARRAY_BUFFER);
setToStringTag($DataView, DATA_VIEW);
hide($DataView[PROTOTYPE], $typed.VIEW, true);
exports[ARRAY_BUFFER] = $ArrayBuffer;
exports[DATA_VIEW] = $DataView;

},{"./_an-instance":13,"./_array-fill":16,"./_descriptors":36,"./_fails":42,"./_global":47,"./_hide":49,"./_library":66,"./_object-dp":78,"./_object-gopn":83,"./_redefine-all":97,"./_set-to-string-tag":105,"./_to-index":119,"./_to-integer":120,"./_to-length":122,"./_typed":127}],127:[function(require,module,exports){
var global = require('./_global');
var hide = require('./_hide');
var uid = require('./_uid');
var TYPED = uid('typed_array');
var VIEW = uid('view');
var ABV = !!(global.ArrayBuffer && global.DataView);
var CONSTR = ABV;
var i = 0;
var l = 9;
var Typed;

var TypedArrayConstructors = (
  'Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array'
).split(',');

while (i < l) {
  if (Typed = global[TypedArrayConstructors[i++]]) {
    hide(Typed.prototype, TYPED, true);
    hide(Typed.prototype, VIEW, true);
  } else CONSTR = false;
}

module.exports = {
  ABV: ABV,
  CONSTR: CONSTR,
  TYPED: TYPED,
  VIEW: VIEW
};

},{"./_global":47,"./_hide":49,"./_uid":128}],128:[function(require,module,exports){
var id = 0;
var px = Math.random();
module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

},{}],129:[function(require,module,exports){
var global = require('./_global');
var navigator = global.navigator;

module.exports = navigator && navigator.userAgent || '';

},{"./_global":47}],130:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function (it, TYPE) {
  if (!isObject(it) || it._t !== TYPE) throw TypeError('Incompatible receiver, ' + TYPE + ' required!');
  return it;
};

},{"./_is-object":58}],131:[function(require,module,exports){
var global = require('./_global');
var core = require('./_core');
var LIBRARY = require('./_library');
var wksExt = require('./_wks-ext');
var defineProperty = require('./_object-dp').f;
module.exports = function (name) {
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
};

},{"./_core":30,"./_global":47,"./_library":66,"./_object-dp":78,"./_wks-ext":132}],132:[function(require,module,exports){
exports.f = require('./_wks');

},{"./_wks":133}],133:[function(require,module,exports){
var store = require('./_shared')('wks');
var uid = require('./_uid');
var Symbol = require('./_global').Symbol;
var USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function (name) {
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

},{"./_global":47,"./_shared":107,"./_uid":128}],134:[function(require,module,exports){
var classof = require('./_classof');
var ITERATOR = require('./_wks')('iterator');
var Iterators = require('./_iterators');
module.exports = require('./_core').getIteratorMethod = function (it) {
  if (it != undefined) return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};

},{"./_classof":24,"./_core":30,"./_iterators":65,"./_wks":133}],135:[function(require,module,exports){
// https://github.com/benjamingr/RexExp.escape
var $export = require('./_export');
var $re = require('./_replacer')(/[\\^$*+?.()|[\]{}]/g, '\\$&');

$export($export.S, 'RegExp', { escape: function escape(it) { return $re(it); } });

},{"./_export":40,"./_replacer":99}],136:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
var $export = require('./_export');

$export($export.P, 'Array', { copyWithin: require('./_array-copy-within') });

require('./_add-to-unscopables')('copyWithin');

},{"./_add-to-unscopables":12,"./_array-copy-within":15,"./_export":40}],137:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $every = require('./_array-methods')(4);

$export($export.P + $export.F * !require('./_strict-method')([].every, true), 'Array', {
  // 22.1.3.5 / 15.4.4.16 Array.prototype.every(callbackfn [, thisArg])
  every: function every(callbackfn /* , thisArg */) {
    return $every(this, callbackfn, arguments[1]);
  }
});

},{"./_array-methods":19,"./_export":40,"./_strict-method":109}],138:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
var $export = require('./_export');

$export($export.P, 'Array', { fill: require('./_array-fill') });

require('./_add-to-unscopables')('fill');

},{"./_add-to-unscopables":12,"./_array-fill":16,"./_export":40}],139:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $filter = require('./_array-methods')(2);

$export($export.P + $export.F * !require('./_strict-method')([].filter, true), 'Array', {
  // 22.1.3.7 / 15.4.4.20 Array.prototype.filter(callbackfn [, thisArg])
  filter: function filter(callbackfn /* , thisArg */) {
    return $filter(this, callbackfn, arguments[1]);
  }
});

},{"./_array-methods":19,"./_export":40,"./_strict-method":109}],140:[function(require,module,exports){
'use strict';
// 22.1.3.9 Array.prototype.findIndex(predicate, thisArg = undefined)
var $export = require('./_export');
var $find = require('./_array-methods')(6);
var KEY = 'findIndex';
var forced = true;
// Shouldn't skip holes
if (KEY in []) Array(1)[KEY](function () { forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  findIndex: function findIndex(callbackfn /* , that = undefined */) {
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./_add-to-unscopables')(KEY);

},{"./_add-to-unscopables":12,"./_array-methods":19,"./_export":40}],141:[function(require,module,exports){
'use strict';
// 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
var $export = require('./_export');
var $find = require('./_array-methods')(5);
var KEY = 'find';
var forced = true;
// Shouldn't skip holes
if (KEY in []) Array(1)[KEY](function () { forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  find: function find(callbackfn /* , that = undefined */) {
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./_add-to-unscopables')(KEY);

},{"./_add-to-unscopables":12,"./_array-methods":19,"./_export":40}],142:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $forEach = require('./_array-methods')(0);
var STRICT = require('./_strict-method')([].forEach, true);

$export($export.P + $export.F * !STRICT, 'Array', {
  // 22.1.3.10 / 15.4.4.18 Array.prototype.forEach(callbackfn [, thisArg])
  forEach: function forEach(callbackfn /* , thisArg */) {
    return $forEach(this, callbackfn, arguments[1]);
  }
});

},{"./_array-methods":19,"./_export":40,"./_strict-method":109}],143:[function(require,module,exports){
'use strict';
var ctx = require('./_ctx');
var $export = require('./_export');
var toObject = require('./_to-object');
var call = require('./_iter-call');
var isArrayIter = require('./_is-array-iter');
var toLength = require('./_to-length');
var createProperty = require('./_create-property');
var getIterFn = require('./core.get-iterator-method');

$export($export.S + $export.F * !require('./_iter-detect')(function (iter) { Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
    var O = toObject(arrayLike);
    var C = typeof this == 'function' ? this : Array;
    var aLen = arguments.length;
    var mapfn = aLen > 1 ? arguments[1] : undefined;
    var mapping = mapfn !== undefined;
    var index = 0;
    var iterFn = getIterFn(O);
    var length, result, step, iterator;
    if (mapping) mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
      for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for (result = new C(length); length > index; index++) {
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});

},{"./_create-property":31,"./_ctx":32,"./_export":40,"./_is-array-iter":55,"./_iter-call":60,"./_iter-detect":63,"./_to-length":122,"./_to-object":123,"./core.get-iterator-method":134}],144:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $indexOf = require('./_array-includes')(false);
var $native = [].indexOf;
var NEGATIVE_ZERO = !!$native && 1 / [1].indexOf(1, -0) < 0;

$export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
  // 22.1.3.11 / 15.4.4.14 Array.prototype.indexOf(searchElement [, fromIndex])
  indexOf: function indexOf(searchElement /* , fromIndex = 0 */) {
    return NEGATIVE_ZERO
      // convert -0 to +0
      ? $native.apply(this, arguments) || 0
      : $indexOf(this, searchElement, arguments[1]);
  }
});

},{"./_array-includes":18,"./_export":40,"./_strict-method":109}],145:[function(require,module,exports){
// 22.1.2.2 / 15.4.3.2 Array.isArray(arg)
var $export = require('./_export');

$export($export.S, 'Array', { isArray: require('./_is-array') });

},{"./_export":40,"./_is-array":56}],146:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./_add-to-unscopables');
var step = require('./_iter-step');
var Iterators = require('./_iterators');
var toIObject = require('./_to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./_iter-define')(Array, 'Array', function (iterated, kind) {
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var kind = this._k;
  var index = this._i++;
  if (!O || index >= O.length) {
    this._t = undefined;
    return step(1);
  }
  if (kind == 'keys') return step(0, index);
  if (kind == 'values') return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

},{"./_add-to-unscopables":12,"./_iter-define":62,"./_iter-step":64,"./_iterators":65,"./_to-iobject":121}],147:[function(require,module,exports){
'use strict';
// 22.1.3.13 Array.prototype.join(separator)
var $export = require('./_export');
var toIObject = require('./_to-iobject');
var arrayJoin = [].join;

// fallback for not array-like strings
$export($export.P + $export.F * (require('./_iobject') != Object || !require('./_strict-method')(arrayJoin)), 'Array', {
  join: function join(separator) {
    return arrayJoin.call(toIObject(this), separator === undefined ? ',' : separator);
  }
});

},{"./_export":40,"./_iobject":54,"./_strict-method":109,"./_to-iobject":121}],148:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toIObject = require('./_to-iobject');
var toInteger = require('./_to-integer');
var toLength = require('./_to-length');
var $native = [].lastIndexOf;
var NEGATIVE_ZERO = !!$native && 1 / [1].lastIndexOf(1, -0) < 0;

$export($export.P + $export.F * (NEGATIVE_ZERO || !require('./_strict-method')($native)), 'Array', {
  // 22.1.3.14 / 15.4.4.15 Array.prototype.lastIndexOf(searchElement [, fromIndex])
  lastIndexOf: function lastIndexOf(searchElement /* , fromIndex = @[*-1] */) {
    // convert -0 to +0
    if (NEGATIVE_ZERO) return $native.apply(this, arguments) || 0;
    var O = toIObject(this);
    var length = toLength(O.length);
    var index = length - 1;
    if (arguments.length > 1) index = Math.min(index, toInteger(arguments[1]));
    if (index < 0) index = length + index;
    for (;index >= 0; index--) if (index in O) if (O[index] === searchElement) return index || 0;
    return -1;
  }
});

},{"./_export":40,"./_strict-method":109,"./_to-integer":120,"./_to-iobject":121,"./_to-length":122}],149:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $map = require('./_array-methods')(1);

$export($export.P + $export.F * !require('./_strict-method')([].map, true), 'Array', {
  // 22.1.3.15 / 15.4.4.19 Array.prototype.map(callbackfn [, thisArg])
  map: function map(callbackfn /* , thisArg */) {
    return $map(this, callbackfn, arguments[1]);
  }
});

},{"./_array-methods":19,"./_export":40,"./_strict-method":109}],150:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var createProperty = require('./_create-property');

// WebKit Array.of isn't generic
$export($export.S + $export.F * require('./_fails')(function () {
  function F() { /* empty */ }
  return !(Array.of.call(F) instanceof F);
}), 'Array', {
  // 22.1.2.3 Array.of( ...items)
  of: function of(/* ...args */) {
    var index = 0;
    var aLen = arguments.length;
    var result = new (typeof this == 'function' ? this : Array)(aLen);
    while (aLen > index) createProperty(result, index, arguments[index++]);
    result.length = aLen;
    return result;
  }
});

},{"./_create-property":31,"./_export":40,"./_fails":42}],151:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $reduce = require('./_array-reduce');

$export($export.P + $export.F * !require('./_strict-method')([].reduceRight, true), 'Array', {
  // 22.1.3.19 / 15.4.4.22 Array.prototype.reduceRight(callbackfn [, initialValue])
  reduceRight: function reduceRight(callbackfn /* , initialValue */) {
    return $reduce(this, callbackfn, arguments.length, arguments[1], true);
  }
});

},{"./_array-reduce":20,"./_export":40,"./_strict-method":109}],152:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $reduce = require('./_array-reduce');

$export($export.P + $export.F * !require('./_strict-method')([].reduce, true), 'Array', {
  // 22.1.3.18 / 15.4.4.21 Array.prototype.reduce(callbackfn [, initialValue])
  reduce: function reduce(callbackfn /* , initialValue */) {
    return $reduce(this, callbackfn, arguments.length, arguments[1], false);
  }
});

},{"./_array-reduce":20,"./_export":40,"./_strict-method":109}],153:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var html = require('./_html');
var cof = require('./_cof');
var toAbsoluteIndex = require('./_to-absolute-index');
var toLength = require('./_to-length');
var arraySlice = [].slice;

// fallback for not array-like ES3 strings and DOM objects
$export($export.P + $export.F * require('./_fails')(function () {
  if (html) arraySlice.call(html);
}), 'Array', {
  slice: function slice(begin, end) {
    var len = toLength(this.length);
    var klass = cof(this);
    end = end === undefined ? len : end;
    if (klass == 'Array') return arraySlice.call(this, begin, end);
    var start = toAbsoluteIndex(begin, len);
    var upTo = toAbsoluteIndex(end, len);
    var size = toLength(upTo - start);
    var cloned = new Array(size);
    var i = 0;
    for (; i < size; i++) cloned[i] = klass == 'String'
      ? this.charAt(start + i)
      : this[start + i];
    return cloned;
  }
});

},{"./_cof":25,"./_export":40,"./_fails":42,"./_html":50,"./_to-absolute-index":118,"./_to-length":122}],154:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $some = require('./_array-methods')(3);

$export($export.P + $export.F * !require('./_strict-method')([].some, true), 'Array', {
  // 22.1.3.23 / 15.4.4.17 Array.prototype.some(callbackfn [, thisArg])
  some: function some(callbackfn /* , thisArg */) {
    return $some(this, callbackfn, arguments[1]);
  }
});

},{"./_array-methods":19,"./_export":40,"./_strict-method":109}],155:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var aFunction = require('./_a-function');
var toObject = require('./_to-object');
var fails = require('./_fails');
var $sort = [].sort;
var test = [1, 2, 3];

$export($export.P + $export.F * (fails(function () {
  // IE8-
  test.sort(undefined);
}) || !fails(function () {
  // V8 bug
  test.sort(null);
  // Old WebKit
}) || !require('./_strict-method')($sort)), 'Array', {
  // 22.1.3.25 Array.prototype.sort(comparefn)
  sort: function sort(comparefn) {
    return comparefn === undefined
      ? $sort.call(toObject(this))
      : $sort.call(toObject(this), aFunction(comparefn));
  }
});

},{"./_a-function":10,"./_export":40,"./_fails":42,"./_strict-method":109,"./_to-object":123}],156:[function(require,module,exports){
require('./_set-species')('Array');

},{"./_set-species":104}],157:[function(require,module,exports){
// 20.3.3.1 / 15.9.4.4 Date.now()
var $export = require('./_export');

$export($export.S, 'Date', { now: function () { return new Date().getTime(); } });

},{"./_export":40}],158:[function(require,module,exports){
// 20.3.4.36 / 15.9.5.43 Date.prototype.toISOString()
var $export = require('./_export');
var toISOString = require('./_date-to-iso-string');

// PhantomJS / old WebKit has a broken implementations
$export($export.P + $export.F * (Date.prototype.toISOString !== toISOString), 'Date', {
  toISOString: toISOString
});

},{"./_date-to-iso-string":33,"./_export":40}],159:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toObject = require('./_to-object');
var toPrimitive = require('./_to-primitive');

$export($export.P + $export.F * require('./_fails')(function () {
  return new Date(NaN).toJSON() !== null
    || Date.prototype.toJSON.call({ toISOString: function () { return 1; } }) !== 1;
}), 'Date', {
  // eslint-disable-next-line no-unused-vars
  toJSON: function toJSON(key) {
    var O = toObject(this);
    var pv = toPrimitive(O);
    return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
  }
});

},{"./_export":40,"./_fails":42,"./_to-object":123,"./_to-primitive":124}],160:[function(require,module,exports){
var TO_PRIMITIVE = require('./_wks')('toPrimitive');
var proto = Date.prototype;

if (!(TO_PRIMITIVE in proto)) require('./_hide')(proto, TO_PRIMITIVE, require('./_date-to-primitive'));

},{"./_date-to-primitive":34,"./_hide":49,"./_wks":133}],161:[function(require,module,exports){
var DateProto = Date.prototype;
var INVALID_DATE = 'Invalid Date';
var TO_STRING = 'toString';
var $toString = DateProto[TO_STRING];
var getTime = DateProto.getTime;
if (new Date(NaN) + '' != INVALID_DATE) {
  require('./_redefine')(DateProto, TO_STRING, function toString() {
    var value = getTime.call(this);
    // eslint-disable-next-line no-self-compare
    return value === value ? $toString.call(this) : INVALID_DATE;
  });
}

},{"./_redefine":98}],162:[function(require,module,exports){
// 19.2.3.2 / 15.3.4.5 Function.prototype.bind(thisArg, args...)
var $export = require('./_export');

$export($export.P, 'Function', { bind: require('./_bind') });

},{"./_bind":23,"./_export":40}],163:[function(require,module,exports){
'use strict';
var isObject = require('./_is-object');
var getPrototypeOf = require('./_object-gpo');
var HAS_INSTANCE = require('./_wks')('hasInstance');
var FunctionProto = Function.prototype;
// 19.2.3.6 Function.prototype[@@hasInstance](V)
if (!(HAS_INSTANCE in FunctionProto)) require('./_object-dp').f(FunctionProto, HAS_INSTANCE, { value: function (O) {
  if (typeof this != 'function' || !isObject(O)) return false;
  if (!isObject(this.prototype)) return O instanceof this;
  // for environment w/o native `@@hasInstance` logic enough `instanceof`, but add this:
  while (O = getPrototypeOf(O)) if (this.prototype === O) return true;
  return false;
} });

},{"./_is-object":58,"./_object-dp":78,"./_object-gpo":85,"./_wks":133}],164:[function(require,module,exports){
var dP = require('./_object-dp').f;
var FProto = Function.prototype;
var nameRE = /^\s*function ([^ (]*)/;
var NAME = 'name';

// 19.2.4.2 name
NAME in FProto || require('./_descriptors') && dP(FProto, NAME, {
  configurable: true,
  get: function () {
    try {
      return ('' + this).match(nameRE)[1];
    } catch (e) {
      return '';
    }
  }
});

},{"./_descriptors":36,"./_object-dp":78}],165:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');
var validate = require('./_validate-collection');
var MAP = 'Map';

// 23.1 Map Objects
module.exports = require('./_collection')(MAP, function (get) {
  return function Map() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key) {
    var entry = strong.getEntry(validate(this, MAP), key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value) {
    return strong.def(validate(this, MAP), key === 0 ? 0 : key, value);
  }
}, strong, true);

},{"./_collection":29,"./_collection-strong":26,"./_validate-collection":130}],166:[function(require,module,exports){
// 20.2.2.3 Math.acosh(x)
var $export = require('./_export');
var log1p = require('./_math-log1p');
var sqrt = Math.sqrt;
var $acosh = Math.acosh;

$export($export.S + $export.F * !($acosh
  // V8 bug: https://code.google.com/p/v8/issues/detail?id=3509
  && Math.floor($acosh(Number.MAX_VALUE)) == 710
  // Tor Browser bug: Math.acosh(Infinity) -> NaN
  && $acosh(Infinity) == Infinity
), 'Math', {
  acosh: function acosh(x) {
    return (x = +x) < 1 ? NaN : x > 94906265.62425156
      ? Math.log(x) + Math.LN2
      : log1p(x - 1 + sqrt(x - 1) * sqrt(x + 1));
  }
});

},{"./_export":40,"./_math-log1p":69}],167:[function(require,module,exports){
// 20.2.2.5 Math.asinh(x)
var $export = require('./_export');
var $asinh = Math.asinh;

function asinh(x) {
  return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : Math.log(x + Math.sqrt(x * x + 1));
}

// Tor Browser bug: Math.asinh(0) -> -0
$export($export.S + $export.F * !($asinh && 1 / $asinh(0) > 0), 'Math', { asinh: asinh });

},{"./_export":40}],168:[function(require,module,exports){
// 20.2.2.7 Math.atanh(x)
var $export = require('./_export');
var $atanh = Math.atanh;

// Tor Browser bug: Math.atanh(-0) -> 0
$export($export.S + $export.F * !($atanh && 1 / $atanh(-0) < 0), 'Math', {
  atanh: function atanh(x) {
    return (x = +x) == 0 ? x : Math.log((1 + x) / (1 - x)) / 2;
  }
});

},{"./_export":40}],169:[function(require,module,exports){
// 20.2.2.9 Math.cbrt(x)
var $export = require('./_export');
var sign = require('./_math-sign');

$export($export.S, 'Math', {
  cbrt: function cbrt(x) {
    return sign(x = +x) * Math.pow(Math.abs(x), 1 / 3);
  }
});

},{"./_export":40,"./_math-sign":71}],170:[function(require,module,exports){
// 20.2.2.11 Math.clz32(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  clz32: function clz32(x) {
    return (x >>>= 0) ? 31 - Math.floor(Math.log(x + 0.5) * Math.LOG2E) : 32;
  }
});

},{"./_export":40}],171:[function(require,module,exports){
// 20.2.2.12 Math.cosh(x)
var $export = require('./_export');
var exp = Math.exp;

$export($export.S, 'Math', {
  cosh: function cosh(x) {
    return (exp(x = +x) + exp(-x)) / 2;
  }
});

},{"./_export":40}],172:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
var $export = require('./_export');
var $expm1 = require('./_math-expm1');

$export($export.S + $export.F * ($expm1 != Math.expm1), 'Math', { expm1: $expm1 });

},{"./_export":40,"./_math-expm1":67}],173:[function(require,module,exports){
// 20.2.2.16 Math.fround(x)
var $export = require('./_export');

$export($export.S, 'Math', { fround: require('./_math-fround') });

},{"./_export":40,"./_math-fround":68}],174:[function(require,module,exports){
// 20.2.2.17 Math.hypot([value1[, value2[, … ]]])
var $export = require('./_export');
var abs = Math.abs;

$export($export.S, 'Math', {
  hypot: function hypot(value1, value2) { // eslint-disable-line no-unused-vars
    var sum = 0;
    var i = 0;
    var aLen = arguments.length;
    var larg = 0;
    var arg, div;
    while (i < aLen) {
      arg = abs(arguments[i++]);
      if (larg < arg) {
        div = larg / arg;
        sum = sum * div * div + 1;
        larg = arg;
      } else if (arg > 0) {
        div = arg / larg;
        sum += div * div;
      } else sum += arg;
    }
    return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
  }
});

},{"./_export":40}],175:[function(require,module,exports){
// 20.2.2.18 Math.imul(x, y)
var $export = require('./_export');
var $imul = Math.imul;

// some WebKit versions fails with big numbers, some has wrong arity
$export($export.S + $export.F * require('./_fails')(function () {
  return $imul(0xffffffff, 5) != -5 || $imul.length != 2;
}), 'Math', {
  imul: function imul(x, y) {
    var UINT16 = 0xffff;
    var xn = +x;
    var yn = +y;
    var xl = UINT16 & xn;
    var yl = UINT16 & yn;
    return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
  }
});

},{"./_export":40,"./_fails":42}],176:[function(require,module,exports){
// 20.2.2.21 Math.log10(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  log10: function log10(x) {
    return Math.log(x) * Math.LOG10E;
  }
});

},{"./_export":40}],177:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
var $export = require('./_export');

$export($export.S, 'Math', { log1p: require('./_math-log1p') });

},{"./_export":40,"./_math-log1p":69}],178:[function(require,module,exports){
// 20.2.2.22 Math.log2(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  log2: function log2(x) {
    return Math.log(x) / Math.LN2;
  }
});

},{"./_export":40}],179:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
var $export = require('./_export');

$export($export.S, 'Math', { sign: require('./_math-sign') });

},{"./_export":40,"./_math-sign":71}],180:[function(require,module,exports){
// 20.2.2.30 Math.sinh(x)
var $export = require('./_export');
var expm1 = require('./_math-expm1');
var exp = Math.exp;

// V8 near Chromium 38 has a problem with very small numbers
$export($export.S + $export.F * require('./_fails')(function () {
  return !Math.sinh(-2e-17) != -2e-17;
}), 'Math', {
  sinh: function sinh(x) {
    return Math.abs(x = +x) < 1
      ? (expm1(x) - expm1(-x)) / 2
      : (exp(x - 1) - exp(-x - 1)) * (Math.E / 2);
  }
});

},{"./_export":40,"./_fails":42,"./_math-expm1":67}],181:[function(require,module,exports){
// 20.2.2.33 Math.tanh(x)
var $export = require('./_export');
var expm1 = require('./_math-expm1');
var exp = Math.exp;

$export($export.S, 'Math', {
  tanh: function tanh(x) {
    var a = expm1(x = +x);
    var b = expm1(-x);
    return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
  }
});

},{"./_export":40,"./_math-expm1":67}],182:[function(require,module,exports){
// 20.2.2.34 Math.trunc(x)
var $export = require('./_export');

$export($export.S, 'Math', {
  trunc: function trunc(it) {
    return (it > 0 ? Math.floor : Math.ceil)(it);
  }
});

},{"./_export":40}],183:[function(require,module,exports){
'use strict';
var global = require('./_global');
var has = require('./_has');
var cof = require('./_cof');
var inheritIfRequired = require('./_inherit-if-required');
var toPrimitive = require('./_to-primitive');
var fails = require('./_fails');
var gOPN = require('./_object-gopn').f;
var gOPD = require('./_object-gopd').f;
var dP = require('./_object-dp').f;
var $trim = require('./_string-trim').trim;
var NUMBER = 'Number';
var $Number = global[NUMBER];
var Base = $Number;
var proto = $Number.prototype;
// Opera ~12 has broken Object#toString
var BROKEN_COF = cof(require('./_object-create')(proto)) == NUMBER;
var TRIM = 'trim' in String.prototype;

// 7.1.3 ToNumber(argument)
var toNumber = function (argument) {
  var it = toPrimitive(argument, false);
  if (typeof it == 'string' && it.length > 2) {
    it = TRIM ? it.trim() : $trim(it, 3);
    var first = it.charCodeAt(0);
    var third, radix, maxCode;
    if (first === 43 || first === 45) {
      third = it.charCodeAt(2);
      if (third === 88 || third === 120) return NaN; // Number('+0x1') should be NaN, old V8 fix
    } else if (first === 48) {
      switch (it.charCodeAt(1)) {
        case 66: case 98: radix = 2; maxCode = 49; break; // fast equal /^0b[01]+$/i
        case 79: case 111: radix = 8; maxCode = 55; break; // fast equal /^0o[0-7]+$/i
        default: return +it;
      }
      for (var digits = it.slice(2), i = 0, l = digits.length, code; i < l; i++) {
        code = digits.charCodeAt(i);
        // parseInt parses a string to a first unavailable symbol
        // but ToNumber should return NaN if a string contains unavailable symbols
        if (code < 48 || code > maxCode) return NaN;
      } return parseInt(digits, radix);
    }
  } return +it;
};

if (!$Number(' 0o1') || !$Number('0b1') || $Number('+0x1')) {
  $Number = function Number(value) {
    var it = arguments.length < 1 ? 0 : value;
    var that = this;
    return that instanceof $Number
      // check on 1..constructor(foo) case
      && (BROKEN_COF ? fails(function () { proto.valueOf.call(that); }) : cof(that) != NUMBER)
        ? inheritIfRequired(new Base(toNumber(it)), that, $Number) : toNumber(it);
  };
  for (var keys = require('./_descriptors') ? gOPN(Base) : (
    // ES3:
    'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
    // ES6 (in case, if modules with ES6 Number statics required before):
    'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
    'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
  ).split(','), j = 0, key; keys.length > j; j++) {
    if (has(Base, key = keys[j]) && !has($Number, key)) {
      dP($Number, key, gOPD(Base, key));
    }
  }
  $Number.prototype = proto;
  proto.constructor = $Number;
  require('./_redefine')(global, NUMBER, $Number);
}

},{"./_cof":25,"./_descriptors":36,"./_fails":42,"./_global":47,"./_has":48,"./_inherit-if-required":52,"./_object-create":77,"./_object-dp":78,"./_object-gopd":81,"./_object-gopn":83,"./_redefine":98,"./_string-trim":115,"./_to-primitive":124}],184:[function(require,module,exports){
// 20.1.2.1 Number.EPSILON
var $export = require('./_export');

$export($export.S, 'Number', { EPSILON: Math.pow(2, -52) });

},{"./_export":40}],185:[function(require,module,exports){
// 20.1.2.2 Number.isFinite(number)
var $export = require('./_export');
var _isFinite = require('./_global').isFinite;

$export($export.S, 'Number', {
  isFinite: function isFinite(it) {
    return typeof it == 'number' && _isFinite(it);
  }
});

},{"./_export":40,"./_global":47}],186:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var $export = require('./_export');

$export($export.S, 'Number', { isInteger: require('./_is-integer') });

},{"./_export":40,"./_is-integer":57}],187:[function(require,module,exports){
// 20.1.2.4 Number.isNaN(number)
var $export = require('./_export');

$export($export.S, 'Number', {
  isNaN: function isNaN(number) {
    // eslint-disable-next-line no-self-compare
    return number != number;
  }
});

},{"./_export":40}],188:[function(require,module,exports){
// 20.1.2.5 Number.isSafeInteger(number)
var $export = require('./_export');
var isInteger = require('./_is-integer');
var abs = Math.abs;

$export($export.S, 'Number', {
  isSafeInteger: function isSafeInteger(number) {
    return isInteger(number) && abs(number) <= 0x1fffffffffffff;
  }
});

},{"./_export":40,"./_is-integer":57}],189:[function(require,module,exports){
// 20.1.2.6 Number.MAX_SAFE_INTEGER
var $export = require('./_export');

$export($export.S, 'Number', { MAX_SAFE_INTEGER: 0x1fffffffffffff });

},{"./_export":40}],190:[function(require,module,exports){
// 20.1.2.10 Number.MIN_SAFE_INTEGER
var $export = require('./_export');

$export($export.S, 'Number', { MIN_SAFE_INTEGER: -0x1fffffffffffff });

},{"./_export":40}],191:[function(require,module,exports){
var $export = require('./_export');
var $parseFloat = require('./_parse-float');
// 20.1.2.12 Number.parseFloat(string)
$export($export.S + $export.F * (Number.parseFloat != $parseFloat), 'Number', { parseFloat: $parseFloat });

},{"./_export":40,"./_parse-float":92}],192:[function(require,module,exports){
var $export = require('./_export');
var $parseInt = require('./_parse-int');
// 20.1.2.13 Number.parseInt(string, radix)
$export($export.S + $export.F * (Number.parseInt != $parseInt), 'Number', { parseInt: $parseInt });

},{"./_export":40,"./_parse-int":93}],193:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toInteger = require('./_to-integer');
var aNumberValue = require('./_a-number-value');
var repeat = require('./_string-repeat');
var $toFixed = 1.0.toFixed;
var floor = Math.floor;
var data = [0, 0, 0, 0, 0, 0];
var ERROR = 'Number.toFixed: incorrect invocation!';
var ZERO = '0';

var multiply = function (n, c) {
  var i = -1;
  var c2 = c;
  while (++i < 6) {
    c2 += n * data[i];
    data[i] = c2 % 1e7;
    c2 = floor(c2 / 1e7);
  }
};
var divide = function (n) {
  var i = 6;
  var c = 0;
  while (--i >= 0) {
    c += data[i];
    data[i] = floor(c / n);
    c = (c % n) * 1e7;
  }
};
var numToString = function () {
  var i = 6;
  var s = '';
  while (--i >= 0) {
    if (s !== '' || i === 0 || data[i] !== 0) {
      var t = String(data[i]);
      s = s === '' ? t : s + repeat.call(ZERO, 7 - t.length) + t;
    }
  } return s;
};
var pow = function (x, n, acc) {
  return n === 0 ? acc : n % 2 === 1 ? pow(x, n - 1, acc * x) : pow(x * x, n / 2, acc);
};
var log = function (x) {
  var n = 0;
  var x2 = x;
  while (x2 >= 4096) {
    n += 12;
    x2 /= 4096;
  }
  while (x2 >= 2) {
    n += 1;
    x2 /= 2;
  } return n;
};

$export($export.P + $export.F * (!!$toFixed && (
  0.00008.toFixed(3) !== '0.000' ||
  0.9.toFixed(0) !== '1' ||
  1.255.toFixed(2) !== '1.25' ||
  1000000000000000128.0.toFixed(0) !== '1000000000000000128'
) || !require('./_fails')(function () {
  // V8 ~ Android 4.3-
  $toFixed.call({});
})), 'Number', {
  toFixed: function toFixed(fractionDigits) {
    var x = aNumberValue(this, ERROR);
    var f = toInteger(fractionDigits);
    var s = '';
    var m = ZERO;
    var e, z, j, k;
    if (f < 0 || f > 20) throw RangeError(ERROR);
    // eslint-disable-next-line no-self-compare
    if (x != x) return 'NaN';
    if (x <= -1e21 || x >= 1e21) return String(x);
    if (x < 0) {
      s = '-';
      x = -x;
    }
    if (x > 1e-21) {
      e = log(x * pow(2, 69, 1)) - 69;
      z = e < 0 ? x * pow(2, -e, 1) : x / pow(2, e, 1);
      z *= 0x10000000000000;
      e = 52 - e;
      if (e > 0) {
        multiply(0, z);
        j = f;
        while (j >= 7) {
          multiply(1e7, 0);
          j -= 7;
        }
        multiply(pow(10, j, 1), 0);
        j = e - 1;
        while (j >= 23) {
          divide(1 << 23);
          j -= 23;
        }
        divide(1 << j);
        multiply(1, 1);
        divide(2);
        m = numToString();
      } else {
        multiply(0, z);
        multiply(1 << -e, 0);
        m = numToString() + repeat.call(ZERO, f);
      }
    }
    if (f > 0) {
      k = m.length;
      m = s + (k <= f ? '0.' + repeat.call(ZERO, f - k) + m : m.slice(0, k - f) + '.' + m.slice(k - f));
    } else {
      m = s + m;
    } return m;
  }
});

},{"./_a-number-value":11,"./_export":40,"./_fails":42,"./_string-repeat":114,"./_to-integer":120}],194:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $fails = require('./_fails');
var aNumberValue = require('./_a-number-value');
var $toPrecision = 1.0.toPrecision;

$export($export.P + $export.F * ($fails(function () {
  // IE7-
  return $toPrecision.call(1, undefined) !== '1';
}) || !$fails(function () {
  // V8 ~ Android 4.3-
  $toPrecision.call({});
})), 'Number', {
  toPrecision: function toPrecision(precision) {
    var that = aNumberValue(this, 'Number#toPrecision: incorrect invocation!');
    return precision === undefined ? $toPrecision.call(that) : $toPrecision.call(that, precision);
  }
});

},{"./_a-number-value":11,"./_export":40,"./_fails":42}],195:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = require('./_export');

$export($export.S + $export.F, 'Object', { assign: require('./_object-assign') });

},{"./_export":40,"./_object-assign":76}],196:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', { create: require('./_object-create') });

},{"./_export":40,"./_object-create":77}],197:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', { defineProperties: require('./_object-dps') });

},{"./_descriptors":36,"./_export":40,"./_object-dps":79}],198:[function(require,module,exports){
var $export = require('./_export');
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !require('./_descriptors'), 'Object', { defineProperty: require('./_object-dp').f });

},{"./_descriptors":36,"./_export":40,"./_object-dp":78}],199:[function(require,module,exports){
// 19.1.2.5 Object.freeze(O)
var isObject = require('./_is-object');
var meta = require('./_meta').onFreeze;

require('./_object-sap')('freeze', function ($freeze) {
  return function freeze(it) {
    return $freeze && isObject(it) ? $freeze(meta(it)) : it;
  };
});

},{"./_is-object":58,"./_meta":72,"./_object-sap":89}],200:[function(require,module,exports){
// 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
var toIObject = require('./_to-iobject');
var $getOwnPropertyDescriptor = require('./_object-gopd').f;

require('./_object-sap')('getOwnPropertyDescriptor', function () {
  return function getOwnPropertyDescriptor(it, key) {
    return $getOwnPropertyDescriptor(toIObject(it), key);
  };
});

},{"./_object-gopd":81,"./_object-sap":89,"./_to-iobject":121}],201:[function(require,module,exports){
// 19.1.2.7 Object.getOwnPropertyNames(O)
require('./_object-sap')('getOwnPropertyNames', function () {
  return require('./_object-gopn-ext').f;
});

},{"./_object-gopn-ext":82,"./_object-sap":89}],202:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = require('./_to-object');
var $getPrototypeOf = require('./_object-gpo');

require('./_object-sap')('getPrototypeOf', function () {
  return function getPrototypeOf(it) {
    return $getPrototypeOf(toObject(it));
  };
});

},{"./_object-gpo":85,"./_object-sap":89,"./_to-object":123}],203:[function(require,module,exports){
// 19.1.2.11 Object.isExtensible(O)
var isObject = require('./_is-object');

require('./_object-sap')('isExtensible', function ($isExtensible) {
  return function isExtensible(it) {
    return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
  };
});

},{"./_is-object":58,"./_object-sap":89}],204:[function(require,module,exports){
// 19.1.2.12 Object.isFrozen(O)
var isObject = require('./_is-object');

require('./_object-sap')('isFrozen', function ($isFrozen) {
  return function isFrozen(it) {
    return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
  };
});

},{"./_is-object":58,"./_object-sap":89}],205:[function(require,module,exports){
// 19.1.2.13 Object.isSealed(O)
var isObject = require('./_is-object');

require('./_object-sap')('isSealed', function ($isSealed) {
  return function isSealed(it) {
    return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
  };
});

},{"./_is-object":58,"./_object-sap":89}],206:[function(require,module,exports){
// 19.1.3.10 Object.is(value1, value2)
var $export = require('./_export');
$export($export.S, 'Object', { is: require('./_same-value') });

},{"./_export":40,"./_same-value":100}],207:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./_to-object');
var $keys = require('./_object-keys');

require('./_object-sap')('keys', function () {
  return function keys(it) {
    return $keys(toObject(it));
  };
});

},{"./_object-keys":87,"./_object-sap":89,"./_to-object":123}],208:[function(require,module,exports){
// 19.1.2.15 Object.preventExtensions(O)
var isObject = require('./_is-object');
var meta = require('./_meta').onFreeze;

require('./_object-sap')('preventExtensions', function ($preventExtensions) {
  return function preventExtensions(it) {
    return $preventExtensions && isObject(it) ? $preventExtensions(meta(it)) : it;
  };
});

},{"./_is-object":58,"./_meta":72,"./_object-sap":89}],209:[function(require,module,exports){
// 19.1.2.17 Object.seal(O)
var isObject = require('./_is-object');
var meta = require('./_meta').onFreeze;

require('./_object-sap')('seal', function ($seal) {
  return function seal(it) {
    return $seal && isObject(it) ? $seal(meta(it)) : it;
  };
});

},{"./_is-object":58,"./_meta":72,"./_object-sap":89}],210:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./_export');
$export($export.S, 'Object', { setPrototypeOf: require('./_set-proto').set });

},{"./_export":40,"./_set-proto":103}],211:[function(require,module,exports){
'use strict';
// 19.1.3.6 Object.prototype.toString()
var classof = require('./_classof');
var test = {};
test[require('./_wks')('toStringTag')] = 'z';
if (test + '' != '[object z]') {
  require('./_redefine')(Object.prototype, 'toString', function toString() {
    return '[object ' + classof(this) + ']';
  }, true);
}

},{"./_classof":24,"./_redefine":98,"./_wks":133}],212:[function(require,module,exports){
var $export = require('./_export');
var $parseFloat = require('./_parse-float');
// 18.2.4 parseFloat(string)
$export($export.G + $export.F * (parseFloat != $parseFloat), { parseFloat: $parseFloat });

},{"./_export":40,"./_parse-float":92}],213:[function(require,module,exports){
var $export = require('./_export');
var $parseInt = require('./_parse-int');
// 18.2.5 parseInt(string, radix)
$export($export.G + $export.F * (parseInt != $parseInt), { parseInt: $parseInt });

},{"./_export":40,"./_parse-int":93}],214:[function(require,module,exports){
'use strict';
var LIBRARY = require('./_library');
var global = require('./_global');
var ctx = require('./_ctx');
var classof = require('./_classof');
var $export = require('./_export');
var isObject = require('./_is-object');
var aFunction = require('./_a-function');
var anInstance = require('./_an-instance');
var forOf = require('./_for-of');
var speciesConstructor = require('./_species-constructor');
var task = require('./_task').set;
var microtask = require('./_microtask')();
var newPromiseCapabilityModule = require('./_new-promise-capability');
var perform = require('./_perform');
var userAgent = require('./_user-agent');
var promiseResolve = require('./_promise-resolve');
var PROMISE = 'Promise';
var TypeError = global.TypeError;
var process = global.process;
var versions = process && process.versions;
var v8 = versions && versions.v8 || '';
var $Promise = global[PROMISE];
var isNode = classof(process) == 'process';
var empty = function () { /* empty */ };
var Internal, newGenericPromiseCapability, OwnPromiseCapability, Wrapper;
var newPromiseCapability = newGenericPromiseCapability = newPromiseCapabilityModule.f;

var USE_NATIVE = !!function () {
  try {
    // correct subclassing with @@species support
    var promise = $Promise.resolve(1);
    var FakePromise = (promise.constructor = {})[require('./_wks')('species')] = function (exec) {
      exec(empty, empty);
    };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function')
      && promise.then(empty) instanceof FakePromise
      // v8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
      // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
      // we can't detect it synchronously, so just check versions
      && v8.indexOf('6.6') !== 0
      && userAgent.indexOf('Chrome/66') === -1;
  } catch (e) { /* empty */ }
}();

// helpers
var isThenable = function (it) {
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var notify = function (promise, isReject) {
  if (promise._n) return;
  promise._n = true;
  var chain = promise._c;
  microtask(function () {
    var value = promise._v;
    var ok = promise._s == 1;
    var i = 0;
    var run = function (reaction) {
      var handler = ok ? reaction.ok : reaction.fail;
      var resolve = reaction.resolve;
      var reject = reaction.reject;
      var domain = reaction.domain;
      var result, then, exited;
      try {
        if (handler) {
          if (!ok) {
            if (promise._h == 2) onHandleUnhandled(promise);
            promise._h = 1;
          }
          if (handler === true) result = value;
          else {
            if (domain) domain.enter();
            result = handler(value); // may throw
            if (domain) {
              domain.exit();
              exited = true;
            }
          }
          if (result === reaction.promise) {
            reject(TypeError('Promise-chain cycle'));
          } else if (then = isThenable(result)) {
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch (e) {
        if (domain && !exited) domain.exit();
        reject(e);
      }
    };
    while (chain.length > i) run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if (isReject && !promise._h) onUnhandled(promise);
  });
};
var onUnhandled = function (promise) {
  task.call(global, function () {
    var value = promise._v;
    var unhandled = isUnhandled(promise);
    var result, handler, console;
    if (unhandled) {
      result = perform(function () {
        if (isNode) {
          process.emit('unhandledRejection', value, promise);
        } else if (handler = global.onunhandledrejection) {
          handler({ promise: promise, reason: value });
        } else if ((console = global.console) && console.error) {
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if (unhandled && result.e) throw result.v;
  });
};
var isUnhandled = function (promise) {
  return promise._h !== 1 && (promise._a || promise._c).length === 0;
};
var onHandleUnhandled = function (promise) {
  task.call(global, function () {
    var handler;
    if (isNode) {
      process.emit('rejectionHandled', promise);
    } else if (handler = global.onrejectionhandled) {
      handler({ promise: promise, reason: promise._v });
    }
  });
};
var $reject = function (value) {
  var promise = this;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if (!promise._a) promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function (value) {
  var promise = this;
  var then;
  if (promise._d) return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if (promise === value) throw TypeError("Promise can't be resolved itself");
    if (then = isThenable(value)) {
      microtask(function () {
        var wrapper = { _w: promise, _d: false }; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch (e) {
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch (e) {
    $reject.call({ _w: promise, _d: false }, e); // wrap
  }
};

// constructor polyfill
if (!USE_NATIVE) {
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor) {
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch (err) {
      $reject.call(this, err);
    }
  };
  // eslint-disable-next-line no-unused-vars
  Internal = function Promise(executor) {
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = require('./_redefine-all')($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected) {
      var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if (this._a) this._a.push(reaction);
      if (this._s) notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function (onRejected) {
      return this.then(undefined, onRejected);
    }
  });
  OwnPromiseCapability = function () {
    var promise = new Internal();
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject = ctx($reject, promise, 1);
  };
  newPromiseCapabilityModule.f = newPromiseCapability = function (C) {
    return C === $Promise || C === Wrapper
      ? new OwnPromiseCapability(C)
      : newGenericPromiseCapability(C);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Promise: $Promise });
require('./_set-to-string-tag')($Promise, PROMISE);
require('./_set-species')(PROMISE);
Wrapper = require('./_core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r) {
    var capability = newPromiseCapability(this);
    var $$reject = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x) {
    return promiseResolve(LIBRARY && this === Wrapper ? $Promise : this, x);
  }
});
$export($export.S + $export.F * !(USE_NATIVE && require('./_iter-detect')(function (iter) {
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var resolve = capability.resolve;
    var reject = capability.reject;
    var result = perform(function () {
      var values = [];
      var index = 0;
      var remaining = 1;
      forOf(iterable, false, function (promise) {
        var $index = index++;
        var alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function (value) {
          if (alreadyCalled) return;
          alreadyCalled = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if (result.e) reject(result.v);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable) {
    var C = this;
    var capability = newPromiseCapability(C);
    var reject = capability.reject;
    var result = perform(function () {
      forOf(iterable, false, function (promise) {
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if (result.e) reject(result.v);
    return capability.promise;
  }
});

},{"./_a-function":10,"./_an-instance":13,"./_classof":24,"./_core":30,"./_ctx":32,"./_export":40,"./_for-of":46,"./_global":47,"./_is-object":58,"./_iter-detect":63,"./_library":66,"./_microtask":74,"./_new-promise-capability":75,"./_perform":94,"./_promise-resolve":95,"./_redefine-all":97,"./_set-species":104,"./_set-to-string-tag":105,"./_species-constructor":108,"./_task":117,"./_user-agent":129,"./_wks":133}],215:[function(require,module,exports){
// 26.1.1 Reflect.apply(target, thisArgument, argumentsList)
var $export = require('./_export');
var aFunction = require('./_a-function');
var anObject = require('./_an-object');
var rApply = (require('./_global').Reflect || {}).apply;
var fApply = Function.apply;
// MS Edge argumentsList argument is optional
$export($export.S + $export.F * !require('./_fails')(function () {
  rApply(function () { /* empty */ });
}), 'Reflect', {
  apply: function apply(target, thisArgument, argumentsList) {
    var T = aFunction(target);
    var L = anObject(argumentsList);
    return rApply ? rApply(T, thisArgument, L) : fApply.call(T, thisArgument, L);
  }
});

},{"./_a-function":10,"./_an-object":14,"./_export":40,"./_fails":42,"./_global":47}],216:[function(require,module,exports){
// 26.1.2 Reflect.construct(target, argumentsList [, newTarget])
var $export = require('./_export');
var create = require('./_object-create');
var aFunction = require('./_a-function');
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var fails = require('./_fails');
var bind = require('./_bind');
var rConstruct = (require('./_global').Reflect || {}).construct;

// MS Edge supports only 2 arguments and argumentsList argument is optional
// FF Nightly sets third argument as `new.target`, but does not create `this` from it
var NEW_TARGET_BUG = fails(function () {
  function F() { /* empty */ }
  return !(rConstruct(function () { /* empty */ }, [], F) instanceof F);
});
var ARGS_BUG = !fails(function () {
  rConstruct(function () { /* empty */ });
});

$export($export.S + $export.F * (NEW_TARGET_BUG || ARGS_BUG), 'Reflect', {
  construct: function construct(Target, args /* , newTarget */) {
    aFunction(Target);
    anObject(args);
    var newTarget = arguments.length < 3 ? Target : aFunction(arguments[2]);
    if (ARGS_BUG && !NEW_TARGET_BUG) return rConstruct(Target, args, newTarget);
    if (Target == newTarget) {
      // w/o altered newTarget, optimization for 0-4 arguments
      switch (args.length) {
        case 0: return new Target();
        case 1: return new Target(args[0]);
        case 2: return new Target(args[0], args[1]);
        case 3: return new Target(args[0], args[1], args[2]);
        case 4: return new Target(args[0], args[1], args[2], args[3]);
      }
      // w/o altered newTarget, lot of arguments case
      var $args = [null];
      $args.push.apply($args, args);
      return new (bind.apply(Target, $args))();
    }
    // with altered newTarget, not support built-in constructors
    var proto = newTarget.prototype;
    var instance = create(isObject(proto) ? proto : Object.prototype);
    var result = Function.apply.call(Target, instance, args);
    return isObject(result) ? result : instance;
  }
});

},{"./_a-function":10,"./_an-object":14,"./_bind":23,"./_export":40,"./_fails":42,"./_global":47,"./_is-object":58,"./_object-create":77}],217:[function(require,module,exports){
// 26.1.3 Reflect.defineProperty(target, propertyKey, attributes)
var dP = require('./_object-dp');
var $export = require('./_export');
var anObject = require('./_an-object');
var toPrimitive = require('./_to-primitive');

// MS Edge has broken Reflect.defineProperty - throwing instead of returning false
$export($export.S + $export.F * require('./_fails')(function () {
  // eslint-disable-next-line no-undef
  Reflect.defineProperty(dP.f({}, 1, { value: 1 }), 1, { value: 2 });
}), 'Reflect', {
  defineProperty: function defineProperty(target, propertyKey, attributes) {
    anObject(target);
    propertyKey = toPrimitive(propertyKey, true);
    anObject(attributes);
    try {
      dP.f(target, propertyKey, attributes);
      return true;
    } catch (e) {
      return false;
    }
  }
});

},{"./_an-object":14,"./_export":40,"./_fails":42,"./_object-dp":78,"./_to-primitive":124}],218:[function(require,module,exports){
// 26.1.4 Reflect.deleteProperty(target, propertyKey)
var $export = require('./_export');
var gOPD = require('./_object-gopd').f;
var anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  deleteProperty: function deleteProperty(target, propertyKey) {
    var desc = gOPD(anObject(target), propertyKey);
    return desc && !desc.configurable ? false : delete target[propertyKey];
  }
});

},{"./_an-object":14,"./_export":40,"./_object-gopd":81}],219:[function(require,module,exports){
'use strict';
// 26.1.5 Reflect.enumerate(target)
var $export = require('./_export');
var anObject = require('./_an-object');
var Enumerate = function (iterated) {
  this._t = anObject(iterated); // target
  this._i = 0;                  // next index
  var keys = this._k = [];      // keys
  var key;
  for (key in iterated) keys.push(key);
};
require('./_iter-create')(Enumerate, 'Object', function () {
  var that = this;
  var keys = that._k;
  var key;
  do {
    if (that._i >= keys.length) return { value: undefined, done: true };
  } while (!((key = keys[that._i++]) in that._t));
  return { value: key, done: false };
});

$export($export.S, 'Reflect', {
  enumerate: function enumerate(target) {
    return new Enumerate(target);
  }
});

},{"./_an-object":14,"./_export":40,"./_iter-create":61}],220:[function(require,module,exports){
// 26.1.7 Reflect.getOwnPropertyDescriptor(target, propertyKey)
var gOPD = require('./_object-gopd');
var $export = require('./_export');
var anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
    return gOPD.f(anObject(target), propertyKey);
  }
});

},{"./_an-object":14,"./_export":40,"./_object-gopd":81}],221:[function(require,module,exports){
// 26.1.8 Reflect.getPrototypeOf(target)
var $export = require('./_export');
var getProto = require('./_object-gpo');
var anObject = require('./_an-object');

$export($export.S, 'Reflect', {
  getPrototypeOf: function getPrototypeOf(target) {
    return getProto(anObject(target));
  }
});

},{"./_an-object":14,"./_export":40,"./_object-gpo":85}],222:[function(require,module,exports){
// 26.1.6 Reflect.get(target, propertyKey [, receiver])
var gOPD = require('./_object-gopd');
var getPrototypeOf = require('./_object-gpo');
var has = require('./_has');
var $export = require('./_export');
var isObject = require('./_is-object');
var anObject = require('./_an-object');

function get(target, propertyKey /* , receiver */) {
  var receiver = arguments.length < 3 ? target : arguments[2];
  var desc, proto;
  if (anObject(target) === receiver) return target[propertyKey];
  if (desc = gOPD.f(target, propertyKey)) return has(desc, 'value')
    ? desc.value
    : desc.get !== undefined
      ? desc.get.call(receiver)
      : undefined;
  if (isObject(proto = getPrototypeOf(target))) return get(proto, propertyKey, receiver);
}

$export($export.S, 'Reflect', { get: get });

},{"./_an-object":14,"./_export":40,"./_has":48,"./_is-object":58,"./_object-gopd":81,"./_object-gpo":85}],223:[function(require,module,exports){
// 26.1.9 Reflect.has(target, propertyKey)
var $export = require('./_export');

$export($export.S, 'Reflect', {
  has: function has(target, propertyKey) {
    return propertyKey in target;
  }
});

},{"./_export":40}],224:[function(require,module,exports){
// 26.1.10 Reflect.isExtensible(target)
var $export = require('./_export');
var anObject = require('./_an-object');
var $isExtensible = Object.isExtensible;

$export($export.S, 'Reflect', {
  isExtensible: function isExtensible(target) {
    anObject(target);
    return $isExtensible ? $isExtensible(target) : true;
  }
});

},{"./_an-object":14,"./_export":40}],225:[function(require,module,exports){
// 26.1.11 Reflect.ownKeys(target)
var $export = require('./_export');

$export($export.S, 'Reflect', { ownKeys: require('./_own-keys') });

},{"./_export":40,"./_own-keys":91}],226:[function(require,module,exports){
// 26.1.12 Reflect.preventExtensions(target)
var $export = require('./_export');
var anObject = require('./_an-object');
var $preventExtensions = Object.preventExtensions;

$export($export.S, 'Reflect', {
  preventExtensions: function preventExtensions(target) {
    anObject(target);
    try {
      if ($preventExtensions) $preventExtensions(target);
      return true;
    } catch (e) {
      return false;
    }
  }
});

},{"./_an-object":14,"./_export":40}],227:[function(require,module,exports){
// 26.1.14 Reflect.setPrototypeOf(target, proto)
var $export = require('./_export');
var setProto = require('./_set-proto');

if (setProto) $export($export.S, 'Reflect', {
  setPrototypeOf: function setPrototypeOf(target, proto) {
    setProto.check(target, proto);
    try {
      setProto.set(target, proto);
      return true;
    } catch (e) {
      return false;
    }
  }
});

},{"./_export":40,"./_set-proto":103}],228:[function(require,module,exports){
// 26.1.13 Reflect.set(target, propertyKey, V [, receiver])
var dP = require('./_object-dp');
var gOPD = require('./_object-gopd');
var getPrototypeOf = require('./_object-gpo');
var has = require('./_has');
var $export = require('./_export');
var createDesc = require('./_property-desc');
var anObject = require('./_an-object');
var isObject = require('./_is-object');

function set(target, propertyKey, V /* , receiver */) {
  var receiver = arguments.length < 4 ? target : arguments[3];
  var ownDesc = gOPD.f(anObject(target), propertyKey);
  var existingDescriptor, proto;
  if (!ownDesc) {
    if (isObject(proto = getPrototypeOf(target))) {
      return set(proto, propertyKey, V, receiver);
    }
    ownDesc = createDesc(0);
  }
  if (has(ownDesc, 'value')) {
    if (ownDesc.writable === false || !isObject(receiver)) return false;
    if (existingDescriptor = gOPD.f(receiver, propertyKey)) {
      if (existingDescriptor.get || existingDescriptor.set || existingDescriptor.writable === false) return false;
      existingDescriptor.value = V;
      dP.f(receiver, propertyKey, existingDescriptor);
    } else dP.f(receiver, propertyKey, createDesc(0, V));
    return true;
  }
  return ownDesc.set === undefined ? false : (ownDesc.set.call(receiver, V), true);
}

$export($export.S, 'Reflect', { set: set });

},{"./_an-object":14,"./_export":40,"./_has":48,"./_is-object":58,"./_object-dp":78,"./_object-gopd":81,"./_object-gpo":85,"./_property-desc":96}],229:[function(require,module,exports){
var global = require('./_global');
var inheritIfRequired = require('./_inherit-if-required');
var dP = require('./_object-dp').f;
var gOPN = require('./_object-gopn').f;
var isRegExp = require('./_is-regexp');
var $flags = require('./_flags');
var $RegExp = global.RegExp;
var Base = $RegExp;
var proto = $RegExp.prototype;
var re1 = /a/g;
var re2 = /a/g;
// "new" creates a new object, old webkit buggy here
var CORRECT_NEW = new $RegExp(re1) !== re1;

if (require('./_descriptors') && (!CORRECT_NEW || require('./_fails')(function () {
  re2[require('./_wks')('match')] = false;
  // RegExp constructor can alter flags and IsRegExp works correct with @@match
  return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
}))) {
  $RegExp = function RegExp(p, f) {
    var tiRE = this instanceof $RegExp;
    var piRE = isRegExp(p);
    var fiU = f === undefined;
    return !tiRE && piRE && p.constructor === $RegExp && fiU ? p
      : inheritIfRequired(CORRECT_NEW
        ? new Base(piRE && !fiU ? p.source : p, f)
        : Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f)
      , tiRE ? this : proto, $RegExp);
  };
  var proxy = function (key) {
    key in $RegExp || dP($RegExp, key, {
      configurable: true,
      get: function () { return Base[key]; },
      set: function (it) { Base[key] = it; }
    });
  };
  for (var keys = gOPN(Base), i = 0; keys.length > i;) proxy(keys[i++]);
  proto.constructor = $RegExp;
  $RegExp.prototype = proto;
  require('./_redefine')(global, 'RegExp', $RegExp);
}

require('./_set-species')('RegExp');

},{"./_descriptors":36,"./_fails":42,"./_flags":44,"./_global":47,"./_inherit-if-required":52,"./_is-regexp":59,"./_object-dp":78,"./_object-gopn":83,"./_redefine":98,"./_set-species":104,"./_wks":133}],230:[function(require,module,exports){
// 21.2.5.3 get RegExp.prototype.flags()
if (require('./_descriptors') && /./g.flags != 'g') require('./_object-dp').f(RegExp.prototype, 'flags', {
  configurable: true,
  get: require('./_flags')
});

},{"./_descriptors":36,"./_flags":44,"./_object-dp":78}],231:[function(require,module,exports){
// @@match logic
require('./_fix-re-wks')('match', 1, function (defined, MATCH, $match) {
  // 21.1.3.11 String.prototype.match(regexp)
  return [function match(regexp) {
    'use strict';
    var O = defined(this);
    var fn = regexp == undefined ? undefined : regexp[MATCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
  }, $match];
});

},{"./_fix-re-wks":43}],232:[function(require,module,exports){
// @@replace logic
require('./_fix-re-wks')('replace', 2, function (defined, REPLACE, $replace) {
  // 21.1.3.14 String.prototype.replace(searchValue, replaceValue)
  return [function replace(searchValue, replaceValue) {
    'use strict';
    var O = defined(this);
    var fn = searchValue == undefined ? undefined : searchValue[REPLACE];
    return fn !== undefined
      ? fn.call(searchValue, O, replaceValue)
      : $replace.call(String(O), searchValue, replaceValue);
  }, $replace];
});

},{"./_fix-re-wks":43}],233:[function(require,module,exports){
// @@search logic
require('./_fix-re-wks')('search', 1, function (defined, SEARCH, $search) {
  // 21.1.3.15 String.prototype.search(regexp)
  return [function search(regexp) {
    'use strict';
    var O = defined(this);
    var fn = regexp == undefined ? undefined : regexp[SEARCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
  }, $search];
});

},{"./_fix-re-wks":43}],234:[function(require,module,exports){
// @@split logic
require('./_fix-re-wks')('split', 2, function (defined, SPLIT, $split) {
  'use strict';
  var isRegExp = require('./_is-regexp');
  var _split = $split;
  var $push = [].push;
  var $SPLIT = 'split';
  var LENGTH = 'length';
  var LAST_INDEX = 'lastIndex';
  if (
    'abbc'[$SPLIT](/(b)*/)[1] == 'c' ||
    'test'[$SPLIT](/(?:)/, -1)[LENGTH] != 4 ||
    'ab'[$SPLIT](/(?:ab)*/)[LENGTH] != 2 ||
    '.'[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 ||
    '.'[$SPLIT](/()()/)[LENGTH] > 1 ||
    ''[$SPLIT](/.?/)[LENGTH]
  ) {
    var NPCG = /()??/.exec('')[1] === undefined; // nonparticipating capturing group
    // based on es5-shim implementation, need to rework it
    $split = function (separator, limit) {
      var string = String(this);
      if (separator === undefined && limit === 0) return [];
      // If `separator` is not a regex, use native split
      if (!isRegExp(separator)) return _split.call(string, separator, limit);
      var output = [];
      var flags = (separator.ignoreCase ? 'i' : '') +
                  (separator.multiline ? 'm' : '') +
                  (separator.unicode ? 'u' : '') +
                  (separator.sticky ? 'y' : '');
      var lastLastIndex = 0;
      var splitLimit = limit === undefined ? 4294967295 : limit >>> 0;
      // Make `global` and avoid `lastIndex` issues by working with a copy
      var separatorCopy = new RegExp(separator.source, flags + 'g');
      var separator2, match, lastIndex, lastLength, i;
      // Doesn't need flags gy, but they don't hurt
      if (!NPCG) separator2 = new RegExp('^' + separatorCopy.source + '$(?!\\s)', flags);
      while (match = separatorCopy.exec(string)) {
        // `separatorCopy.lastIndex` is not reliable cross-browser
        lastIndex = match.index + match[0][LENGTH];
        if (lastIndex > lastLastIndex) {
          output.push(string.slice(lastLastIndex, match.index));
          // Fix browsers whose `exec` methods don't consistently return `undefined` for NPCG
          // eslint-disable-next-line no-loop-func
          if (!NPCG && match[LENGTH] > 1) match[0].replace(separator2, function () {
            for (i = 1; i < arguments[LENGTH] - 2; i++) if (arguments[i] === undefined) match[i] = undefined;
          });
          if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
          lastLength = match[0][LENGTH];
          lastLastIndex = lastIndex;
          if (output[LENGTH] >= splitLimit) break;
        }
        if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++; // Avoid an infinite loop
      }
      if (lastLastIndex === string[LENGTH]) {
        if (lastLength || !separatorCopy.test('')) output.push('');
      } else output.push(string.slice(lastLastIndex));
      return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
    };
  // Chakra, V8
  } else if ('0'[$SPLIT](undefined, 0)[LENGTH]) {
    $split = function (separator, limit) {
      return separator === undefined && limit === 0 ? [] : _split.call(this, separator, limit);
    };
  }
  // 21.1.3.17 String.prototype.split(separator, limit)
  return [function split(separator, limit) {
    var O = defined(this);
    var fn = separator == undefined ? undefined : separator[SPLIT];
    return fn !== undefined ? fn.call(separator, O, limit) : $split.call(String(O), separator, limit);
  }, $split];
});

},{"./_fix-re-wks":43,"./_is-regexp":59}],235:[function(require,module,exports){
'use strict';
require('./es6.regexp.flags');
var anObject = require('./_an-object');
var $flags = require('./_flags');
var DESCRIPTORS = require('./_descriptors');
var TO_STRING = 'toString';
var $toString = /./[TO_STRING];

var define = function (fn) {
  require('./_redefine')(RegExp.prototype, TO_STRING, fn, true);
};

// 21.2.5.14 RegExp.prototype.toString()
if (require('./_fails')(function () { return $toString.call({ source: 'a', flags: 'b' }) != '/a/b'; })) {
  define(function toString() {
    var R = anObject(this);
    return '/'.concat(R.source, '/',
      'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? $flags.call(R) : undefined);
  });
// FF44- RegExp#toString has a wrong name
} else if ($toString.name != TO_STRING) {
  define(function toString() {
    return $toString.call(this);
  });
}

},{"./_an-object":14,"./_descriptors":36,"./_fails":42,"./_flags":44,"./_redefine":98,"./es6.regexp.flags":230}],236:[function(require,module,exports){
'use strict';
var strong = require('./_collection-strong');
var validate = require('./_validate-collection');
var SET = 'Set';

// 23.2 Set Objects
module.exports = require('./_collection')(SET, function (get) {
  return function Set() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value) {
    return strong.def(validate(this, SET), value = value === 0 ? 0 : value, value);
  }
}, strong);

},{"./_collection":29,"./_collection-strong":26,"./_validate-collection":130}],237:[function(require,module,exports){
'use strict';
// B.2.3.2 String.prototype.anchor(name)
require('./_string-html')('anchor', function (createHTML) {
  return function anchor(name) {
    return createHTML(this, 'a', 'name', name);
  };
});

},{"./_string-html":112}],238:[function(require,module,exports){
'use strict';
// B.2.3.3 String.prototype.big()
require('./_string-html')('big', function (createHTML) {
  return function big() {
    return createHTML(this, 'big', '', '');
  };
});

},{"./_string-html":112}],239:[function(require,module,exports){
'use strict';
// B.2.3.4 String.prototype.blink()
require('./_string-html')('blink', function (createHTML) {
  return function blink() {
    return createHTML(this, 'blink', '', '');
  };
});

},{"./_string-html":112}],240:[function(require,module,exports){
'use strict';
// B.2.3.5 String.prototype.bold()
require('./_string-html')('bold', function (createHTML) {
  return function bold() {
    return createHTML(this, 'b', '', '');
  };
});

},{"./_string-html":112}],241:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $at = require('./_string-at')(false);
$export($export.P, 'String', {
  // 21.1.3.3 String.prototype.codePointAt(pos)
  codePointAt: function codePointAt(pos) {
    return $at(this, pos);
  }
});

},{"./_export":40,"./_string-at":110}],242:[function(require,module,exports){
// 21.1.3.6 String.prototype.endsWith(searchString [, endPosition])
'use strict';
var $export = require('./_export');
var toLength = require('./_to-length');
var context = require('./_string-context');
var ENDS_WITH = 'endsWith';
var $endsWith = ''[ENDS_WITH];

$export($export.P + $export.F * require('./_fails-is-regexp')(ENDS_WITH), 'String', {
  endsWith: function endsWith(searchString /* , endPosition = @length */) {
    var that = context(this, searchString, ENDS_WITH);
    var endPosition = arguments.length > 1 ? arguments[1] : undefined;
    var len = toLength(that.length);
    var end = endPosition === undefined ? len : Math.min(toLength(endPosition), len);
    var search = String(searchString);
    return $endsWith
      ? $endsWith.call(that, search, end)
      : that.slice(end - search.length, end) === search;
  }
});

},{"./_export":40,"./_fails-is-regexp":41,"./_string-context":111,"./_to-length":122}],243:[function(require,module,exports){
'use strict';
// B.2.3.6 String.prototype.fixed()
require('./_string-html')('fixed', function (createHTML) {
  return function fixed() {
    return createHTML(this, 'tt', '', '');
  };
});

},{"./_string-html":112}],244:[function(require,module,exports){
'use strict';
// B.2.3.7 String.prototype.fontcolor(color)
require('./_string-html')('fontcolor', function (createHTML) {
  return function fontcolor(color) {
    return createHTML(this, 'font', 'color', color);
  };
});

},{"./_string-html":112}],245:[function(require,module,exports){
'use strict';
// B.2.3.8 String.prototype.fontsize(size)
require('./_string-html')('fontsize', function (createHTML) {
  return function fontsize(size) {
    return createHTML(this, 'font', 'size', size);
  };
});

},{"./_string-html":112}],246:[function(require,module,exports){
var $export = require('./_export');
var toAbsoluteIndex = require('./_to-absolute-index');
var fromCharCode = String.fromCharCode;
var $fromCodePoint = String.fromCodePoint;

// length should be 1, old FF problem
$export($export.S + $export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', {
  // 21.1.2.2 String.fromCodePoint(...codePoints)
  fromCodePoint: function fromCodePoint(x) { // eslint-disable-line no-unused-vars
    var res = [];
    var aLen = arguments.length;
    var i = 0;
    var code;
    while (aLen > i) {
      code = +arguments[i++];
      if (toAbsoluteIndex(code, 0x10ffff) !== code) throw RangeError(code + ' is not a valid code point');
      res.push(code < 0x10000
        ? fromCharCode(code)
        : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
      );
    } return res.join('');
  }
});

},{"./_export":40,"./_to-absolute-index":118}],247:[function(require,module,exports){
// 21.1.3.7 String.prototype.includes(searchString, position = 0)
'use strict';
var $export = require('./_export');
var context = require('./_string-context');
var INCLUDES = 'includes';

$export($export.P + $export.F * require('./_fails-is-regexp')(INCLUDES), 'String', {
  includes: function includes(searchString /* , position = 0 */) {
    return !!~context(this, searchString, INCLUDES)
      .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
  }
});

},{"./_export":40,"./_fails-is-regexp":41,"./_string-context":111}],248:[function(require,module,exports){
'use strict';
// B.2.3.9 String.prototype.italics()
require('./_string-html')('italics', function (createHTML) {
  return function italics() {
    return createHTML(this, 'i', '', '');
  };
});

},{"./_string-html":112}],249:[function(require,module,exports){
'use strict';
var $at = require('./_string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./_iter-define')(String, 'String', function (iterated) {
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function () {
  var O = this._t;
  var index = this._i;
  var point;
  if (index >= O.length) return { value: undefined, done: true };
  point = $at(O, index);
  this._i += point.length;
  return { value: point, done: false };
});

},{"./_iter-define":62,"./_string-at":110}],250:[function(require,module,exports){
'use strict';
// B.2.3.10 String.prototype.link(url)
require('./_string-html')('link', function (createHTML) {
  return function link(url) {
    return createHTML(this, 'a', 'href', url);
  };
});

},{"./_string-html":112}],251:[function(require,module,exports){
var $export = require('./_export');
var toIObject = require('./_to-iobject');
var toLength = require('./_to-length');

$export($export.S, 'String', {
  // 21.1.2.4 String.raw(callSite, ...substitutions)
  raw: function raw(callSite) {
    var tpl = toIObject(callSite.raw);
    var len = toLength(tpl.length);
    var aLen = arguments.length;
    var res = [];
    var i = 0;
    while (len > i) {
      res.push(String(tpl[i++]));
      if (i < aLen) res.push(String(arguments[i]));
    } return res.join('');
  }
});

},{"./_export":40,"./_to-iobject":121,"./_to-length":122}],252:[function(require,module,exports){
var $export = require('./_export');

$export($export.P, 'String', {
  // 21.1.3.13 String.prototype.repeat(count)
  repeat: require('./_string-repeat')
});

},{"./_export":40,"./_string-repeat":114}],253:[function(require,module,exports){
'use strict';
// B.2.3.11 String.prototype.small()
require('./_string-html')('small', function (createHTML) {
  return function small() {
    return createHTML(this, 'small', '', '');
  };
});

},{"./_string-html":112}],254:[function(require,module,exports){
// 21.1.3.18 String.prototype.startsWith(searchString [, position ])
'use strict';
var $export = require('./_export');
var toLength = require('./_to-length');
var context = require('./_string-context');
var STARTS_WITH = 'startsWith';
var $startsWith = ''[STARTS_WITH];

$export($export.P + $export.F * require('./_fails-is-regexp')(STARTS_WITH), 'String', {
  startsWith: function startsWith(searchString /* , position = 0 */) {
    var that = context(this, searchString, STARTS_WITH);
    var index = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length));
    var search = String(searchString);
    return $startsWith
      ? $startsWith.call(that, search, index)
      : that.slice(index, index + search.length) === search;
  }
});

},{"./_export":40,"./_fails-is-regexp":41,"./_string-context":111,"./_to-length":122}],255:[function(require,module,exports){
'use strict';
// B.2.3.12 String.prototype.strike()
require('./_string-html')('strike', function (createHTML) {
  return function strike() {
    return createHTML(this, 'strike', '', '');
  };
});

},{"./_string-html":112}],256:[function(require,module,exports){
'use strict';
// B.2.3.13 String.prototype.sub()
require('./_string-html')('sub', function (createHTML) {
  return function sub() {
    return createHTML(this, 'sub', '', '');
  };
});

},{"./_string-html":112}],257:[function(require,module,exports){
'use strict';
// B.2.3.14 String.prototype.sup()
require('./_string-html')('sup', function (createHTML) {
  return function sup() {
    return createHTML(this, 'sup', '', '');
  };
});

},{"./_string-html":112}],258:[function(require,module,exports){
'use strict';
// 21.1.3.25 String.prototype.trim()
require('./_string-trim')('trim', function ($trim) {
  return function trim() {
    return $trim(this, 3);
  };
});

},{"./_string-trim":115}],259:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global = require('./_global');
var has = require('./_has');
var DESCRIPTORS = require('./_descriptors');
var $export = require('./_export');
var redefine = require('./_redefine');
var META = require('./_meta').KEY;
var $fails = require('./_fails');
var shared = require('./_shared');
var setToStringTag = require('./_set-to-string-tag');
var uid = require('./_uid');
var wks = require('./_wks');
var wksExt = require('./_wks-ext');
var wksDefine = require('./_wks-define');
var enumKeys = require('./_enum-keys');
var isArray = require('./_is-array');
var anObject = require('./_an-object');
var isObject = require('./_is-object');
var toIObject = require('./_to-iobject');
var toPrimitive = require('./_to-primitive');
var createDesc = require('./_property-desc');
var _create = require('./_object-create');
var gOPNExt = require('./_object-gopn-ext');
var $GOPD = require('./_object-gopd');
var $DP = require('./_object-dp');
var $keys = require('./_object-keys');
var gOPD = $GOPD.f;
var dP = $DP.f;
var gOPN = gOPNExt.f;
var $Symbol = global.Symbol;
var $JSON = global.JSON;
var _stringify = $JSON && $JSON.stringify;
var PROTOTYPE = 'prototype';
var HIDDEN = wks('_hidden');
var TO_PRIMITIVE = wks('toPrimitive');
var isEnum = {}.propertyIsEnumerable;
var SymbolRegistry = shared('symbol-registry');
var AllSymbols = shared('symbols');
var OPSymbols = shared('op-symbols');
var ObjectProto = Object[PROTOTYPE];
var USE_NATIVE = typeof $Symbol == 'function';
var QObject = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function () {
  return _create(dP({}, 'a', {
    get: function () { return dP(this, 'a', { value: 7 }).a; }
  })).a != 7;
}) ? function (it, key, D) {
  var protoDesc = gOPD(ObjectProto, key);
  if (protoDesc) delete ObjectProto[key];
  dP(it, key, D);
  if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function (tag) {
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D) {
  if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if (has(AllSymbols, key)) {
    if (!D.enumerable) {
      if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
      D = _create(D, { enumerable: createDesc(0, false) });
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P) {
  anObject(it);
  var keys = enumKeys(P = toIObject(P));
  var i = 0;
  var l = keys.length;
  var key;
  while (l > i) $defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P) {
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key) {
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
  it = toIObject(it);
  key = toPrimitive(key, true);
  if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
  var D = gOPD(it, key);
  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it) {
  var names = gOPN(toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
  var IS_OP = it === ObjectProto;
  var names = gOPN(IS_OP ? OPSymbols : toIObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if (!USE_NATIVE) {
  $Symbol = function Symbol() {
    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function (value) {
      if (this === ObjectProto) $set.call(OPSymbols, value);
      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, { configurable: true, set: $set });
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f = $defineProperty;
  require('./_object-gopn').f = gOPNExt.f = $getOwnPropertyNames;
  require('./_object-pie').f = $propertyIsEnumerable;
  require('./_object-gops').f = $getOwnPropertySymbols;

  if (DESCRIPTORS && !require('./_library')) {
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function (name) {
    return wrap(wks(name));
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });

for (var es6Symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), j = 0; es6Symbols.length > j;)wks(es6Symbols[j++]);

for (var wellKnownSymbols = $keys(wks.store), k = 0; wellKnownSymbols.length > k;) wksDefine(wellKnownSymbols[k++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function (key) {
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(sym) {
    if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol!');
    for (var key in SymbolRegistry) if (SymbolRegistry[key] === sym) return key;
  },
  useSetter: function () { setter = true; },
  useSimple: function () { setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it) {
    var args = [it];
    var i = 1;
    var replacer, $replacer;
    while (arguments.length > i) args.push(arguments[i++]);
    $replacer = replacer = args[1];
    if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
    if (!isArray(replacer)) replacer = function (key, value) {
      if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
      if (!isSymbol(value)) return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || require('./_hide')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);

},{"./_an-object":14,"./_descriptors":36,"./_enum-keys":39,"./_export":40,"./_fails":42,"./_global":47,"./_has":48,"./_hide":49,"./_is-array":56,"./_is-object":58,"./_library":66,"./_meta":72,"./_object-create":77,"./_object-dp":78,"./_object-gopd":81,"./_object-gopn":83,"./_object-gopn-ext":82,"./_object-gops":84,"./_object-keys":87,"./_object-pie":88,"./_property-desc":96,"./_redefine":98,"./_set-to-string-tag":105,"./_shared":107,"./_to-iobject":121,"./_to-primitive":124,"./_uid":128,"./_wks":133,"./_wks-define":131,"./_wks-ext":132}],260:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var $typed = require('./_typed');
var buffer = require('./_typed-buffer');
var anObject = require('./_an-object');
var toAbsoluteIndex = require('./_to-absolute-index');
var toLength = require('./_to-length');
var isObject = require('./_is-object');
var ArrayBuffer = require('./_global').ArrayBuffer;
var speciesConstructor = require('./_species-constructor');
var $ArrayBuffer = buffer.ArrayBuffer;
var $DataView = buffer.DataView;
var $isView = $typed.ABV && ArrayBuffer.isView;
var $slice = $ArrayBuffer.prototype.slice;
var VIEW = $typed.VIEW;
var ARRAY_BUFFER = 'ArrayBuffer';

$export($export.G + $export.W + $export.F * (ArrayBuffer !== $ArrayBuffer), { ArrayBuffer: $ArrayBuffer });

$export($export.S + $export.F * !$typed.CONSTR, ARRAY_BUFFER, {
  // 24.1.3.1 ArrayBuffer.isView(arg)
  isView: function isView(it) {
    return $isView && $isView(it) || isObject(it) && VIEW in it;
  }
});

$export($export.P + $export.U + $export.F * require('./_fails')(function () {
  return !new $ArrayBuffer(2).slice(1, undefined).byteLength;
}), ARRAY_BUFFER, {
  // 24.1.4.3 ArrayBuffer.prototype.slice(start, end)
  slice: function slice(start, end) {
    if ($slice !== undefined && end === undefined) return $slice.call(anObject(this), start); // FF fix
    var len = anObject(this).byteLength;
    var first = toAbsoluteIndex(start, len);
    var fin = toAbsoluteIndex(end === undefined ? len : end, len);
    var result = new (speciesConstructor(this, $ArrayBuffer))(toLength(fin - first));
    var viewS = new $DataView(this);
    var viewT = new $DataView(result);
    var index = 0;
    while (first < fin) {
      viewT.setUint8(index++, viewS.getUint8(first++));
    } return result;
  }
});

require('./_set-species')(ARRAY_BUFFER);

},{"./_an-object":14,"./_export":40,"./_fails":42,"./_global":47,"./_is-object":58,"./_set-species":104,"./_species-constructor":108,"./_to-absolute-index":118,"./_to-length":122,"./_typed":127,"./_typed-buffer":126}],261:[function(require,module,exports){
var $export = require('./_export');
$export($export.G + $export.W + $export.F * !require('./_typed').ABV, {
  DataView: require('./_typed-buffer').DataView
});

},{"./_export":40,"./_typed":127,"./_typed-buffer":126}],262:[function(require,module,exports){
require('./_typed-array')('Float32', 4, function (init) {
  return function Float32Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],263:[function(require,module,exports){
require('./_typed-array')('Float64', 8, function (init) {
  return function Float64Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],264:[function(require,module,exports){
require('./_typed-array')('Int16', 2, function (init) {
  return function Int16Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],265:[function(require,module,exports){
require('./_typed-array')('Int32', 4, function (init) {
  return function Int32Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],266:[function(require,module,exports){
require('./_typed-array')('Int8', 1, function (init) {
  return function Int8Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],267:[function(require,module,exports){
require('./_typed-array')('Uint16', 2, function (init) {
  return function Uint16Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],268:[function(require,module,exports){
require('./_typed-array')('Uint32', 4, function (init) {
  return function Uint32Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],269:[function(require,module,exports){
require('./_typed-array')('Uint8', 1, function (init) {
  return function Uint8Array(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
});

},{"./_typed-array":125}],270:[function(require,module,exports){
require('./_typed-array')('Uint8', 1, function (init) {
  return function Uint8ClampedArray(data, byteOffset, length) {
    return init(this, data, byteOffset, length);
  };
}, true);

},{"./_typed-array":125}],271:[function(require,module,exports){
'use strict';
var each = require('./_array-methods')(0);
var redefine = require('./_redefine');
var meta = require('./_meta');
var assign = require('./_object-assign');
var weak = require('./_collection-weak');
var isObject = require('./_is-object');
var fails = require('./_fails');
var validate = require('./_validate-collection');
var WEAK_MAP = 'WeakMap';
var getWeak = meta.getWeak;
var isExtensible = Object.isExtensible;
var uncaughtFrozenStore = weak.ufstore;
var tmp = {};
var InternalMap;

var wrapper = function (get) {
  return function WeakMap() {
    return get(this, arguments.length > 0 ? arguments[0] : undefined);
  };
};

var methods = {
  // 23.3.3.3 WeakMap.prototype.get(key)
  get: function get(key) {
    if (isObject(key)) {
      var data = getWeak(key);
      if (data === true) return uncaughtFrozenStore(validate(this, WEAK_MAP)).get(key);
      return data ? data[this._i] : undefined;
    }
  },
  // 23.3.3.5 WeakMap.prototype.set(key, value)
  set: function set(key, value) {
    return weak.def(validate(this, WEAK_MAP), key, value);
  }
};

// 23.3 WeakMap Objects
var $WeakMap = module.exports = require('./_collection')(WEAK_MAP, wrapper, methods, weak, true, true);

// IE11 WeakMap frozen keys fix
if (fails(function () { return new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7; })) {
  InternalMap = weak.getConstructor(wrapper, WEAK_MAP);
  assign(InternalMap.prototype, methods);
  meta.NEED = true;
  each(['delete', 'has', 'get', 'set'], function (key) {
    var proto = $WeakMap.prototype;
    var method = proto[key];
    redefine(proto, key, function (a, b) {
      // store frozen objects on internal weakmap shim
      if (isObject(a) && !isExtensible(a)) {
        if (!this._f) this._f = new InternalMap();
        var result = this._f[key](a, b);
        return key == 'set' ? this : result;
      // store all the rest on native weakmap
      } return method.call(this, a, b);
    });
  });
}

},{"./_array-methods":19,"./_collection":29,"./_collection-weak":28,"./_fails":42,"./_is-object":58,"./_meta":72,"./_object-assign":76,"./_redefine":98,"./_validate-collection":130}],272:[function(require,module,exports){
'use strict';
var weak = require('./_collection-weak');
var validate = require('./_validate-collection');
var WEAK_SET = 'WeakSet';

// 23.4 WeakSet Objects
require('./_collection')(WEAK_SET, function (get) {
  return function WeakSet() { return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.4.3.1 WeakSet.prototype.add(value)
  add: function add(value) {
    return weak.def(validate(this, WEAK_SET), value, true);
  }
}, weak, false, true);

},{"./_collection":29,"./_collection-weak":28,"./_validate-collection":130}],273:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-flatMap/#sec-Array.prototype.flatMap
var $export = require('./_export');
var flattenIntoArray = require('./_flatten-into-array');
var toObject = require('./_to-object');
var toLength = require('./_to-length');
var aFunction = require('./_a-function');
var arraySpeciesCreate = require('./_array-species-create');

$export($export.P, 'Array', {
  flatMap: function flatMap(callbackfn /* , thisArg */) {
    var O = toObject(this);
    var sourceLen, A;
    aFunction(callbackfn);
    sourceLen = toLength(O.length);
    A = arraySpeciesCreate(O, 0);
    flattenIntoArray(A, O, O, sourceLen, 0, 1, callbackfn, arguments[1]);
    return A;
  }
});

require('./_add-to-unscopables')('flatMap');

},{"./_a-function":10,"./_add-to-unscopables":12,"./_array-species-create":22,"./_export":40,"./_flatten-into-array":45,"./_to-length":122,"./_to-object":123}],274:[function(require,module,exports){
'use strict';
// https://tc39.github.io/proposal-flatMap/#sec-Array.prototype.flatten
var $export = require('./_export');
var flattenIntoArray = require('./_flatten-into-array');
var toObject = require('./_to-object');
var toLength = require('./_to-length');
var toInteger = require('./_to-integer');
var arraySpeciesCreate = require('./_array-species-create');

$export($export.P, 'Array', {
  flatten: function flatten(/* depthArg = 1 */) {
    var depthArg = arguments[0];
    var O = toObject(this);
    var sourceLen = toLength(O.length);
    var A = arraySpeciesCreate(O, 0);
    flattenIntoArray(A, O, O, sourceLen, 0, depthArg === undefined ? 1 : toInteger(depthArg));
    return A;
  }
});

require('./_add-to-unscopables')('flatten');

},{"./_add-to-unscopables":12,"./_array-species-create":22,"./_export":40,"./_flatten-into-array":45,"./_to-integer":120,"./_to-length":122,"./_to-object":123}],275:[function(require,module,exports){
'use strict';
// https://github.com/tc39/Array.prototype.includes
var $export = require('./_export');
var $includes = require('./_array-includes')(true);

$export($export.P, 'Array', {
  includes: function includes(el /* , fromIndex = 0 */) {
    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
  }
});

require('./_add-to-unscopables')('includes');

},{"./_add-to-unscopables":12,"./_array-includes":18,"./_export":40}],276:[function(require,module,exports){
// https://github.com/rwaldron/tc39-notes/blob/master/es6/2014-09/sept-25.md#510-globalasap-for-enqueuing-a-microtask
var $export = require('./_export');
var microtask = require('./_microtask')();
var process = require('./_global').process;
var isNode = require('./_cof')(process) == 'process';

$export($export.G, {
  asap: function asap(fn) {
    var domain = isNode && process.domain;
    microtask(domain ? domain.bind(fn) : fn);
  }
});

},{"./_cof":25,"./_export":40,"./_global":47,"./_microtask":74}],277:[function(require,module,exports){
// https://github.com/ljharb/proposal-is-error
var $export = require('./_export');
var cof = require('./_cof');

$export($export.S, 'Error', {
  isError: function isError(it) {
    return cof(it) === 'Error';
  }
});

},{"./_cof":25,"./_export":40}],278:[function(require,module,exports){
// https://github.com/tc39/proposal-global
var $export = require('./_export');

$export($export.G, { global: require('./_global') });

},{"./_export":40,"./_global":47}],279:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-map.from
require('./_set-collection-from')('Map');

},{"./_set-collection-from":101}],280:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-map.of
require('./_set-collection-of')('Map');

},{"./_set-collection-of":102}],281:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export = require('./_export');

$export($export.P + $export.R, 'Map', { toJSON: require('./_collection-to-json')('Map') });

},{"./_collection-to-json":27,"./_export":40}],282:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');

$export($export.S, 'Math', {
  clamp: function clamp(x, lower, upper) {
    return Math.min(upper, Math.max(lower, x));
  }
});

},{"./_export":40}],283:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');

$export($export.S, 'Math', { DEG_PER_RAD: Math.PI / 180 });

},{"./_export":40}],284:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');
var RAD_PER_DEG = 180 / Math.PI;

$export($export.S, 'Math', {
  degrees: function degrees(radians) {
    return radians * RAD_PER_DEG;
  }
});

},{"./_export":40}],285:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');
var scale = require('./_math-scale');
var fround = require('./_math-fround');

$export($export.S, 'Math', {
  fscale: function fscale(x, inLow, inHigh, outLow, outHigh) {
    return fround(scale(x, inLow, inHigh, outLow, outHigh));
  }
});

},{"./_export":40,"./_math-fround":68,"./_math-scale":70}],286:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  iaddh: function iaddh(x0, x1, y0, y1) {
    var $x0 = x0 >>> 0;
    var $x1 = x1 >>> 0;
    var $y0 = y0 >>> 0;
    return $x1 + (y1 >>> 0) + (($x0 & $y0 | ($x0 | $y0) & ~($x0 + $y0 >>> 0)) >>> 31) | 0;
  }
});

},{"./_export":40}],287:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  imulh: function imulh(u, v) {
    var UINT16 = 0xffff;
    var $u = +u;
    var $v = +v;
    var u0 = $u & UINT16;
    var v0 = $v & UINT16;
    var u1 = $u >> 16;
    var v1 = $v >> 16;
    var t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
    return u1 * v1 + (t >> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >> 16);
  }
});

},{"./_export":40}],288:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  isubh: function isubh(x0, x1, y0, y1) {
    var $x0 = x0 >>> 0;
    var $x1 = x1 >>> 0;
    var $y0 = y0 >>> 0;
    return $x1 - (y1 >>> 0) - ((~$x0 & $y0 | ~($x0 ^ $y0) & $x0 - $y0 >>> 0) >>> 31) | 0;
  }
});

},{"./_export":40}],289:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');

$export($export.S, 'Math', { RAD_PER_DEG: 180 / Math.PI });

},{"./_export":40}],290:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');
var DEG_PER_RAD = Math.PI / 180;

$export($export.S, 'Math', {
  radians: function radians(degrees) {
    return degrees * DEG_PER_RAD;
  }
});

},{"./_export":40}],291:[function(require,module,exports){
// https://rwaldron.github.io/proposal-math-extensions/
var $export = require('./_export');

$export($export.S, 'Math', { scale: require('./_math-scale') });

},{"./_export":40,"./_math-scale":70}],292:[function(require,module,exports){
// http://jfbastien.github.io/papers/Math.signbit.html
var $export = require('./_export');

$export($export.S, 'Math', { signbit: function signbit(x) {
  // eslint-disable-next-line no-self-compare
  return (x = +x) != x ? x : x == 0 ? 1 / x == Infinity : x > 0;
} });

},{"./_export":40}],293:[function(require,module,exports){
// https://gist.github.com/BrendanEich/4294d5c212a6d2254703
var $export = require('./_export');

$export($export.S, 'Math', {
  umulh: function umulh(u, v) {
    var UINT16 = 0xffff;
    var $u = +u;
    var $v = +v;
    var u0 = $u & UINT16;
    var v0 = $v & UINT16;
    var u1 = $u >>> 16;
    var v1 = $v >>> 16;
    var t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
    return u1 * v1 + (t >>> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >>> 16);
  }
});

},{"./_export":40}],294:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toObject = require('./_to-object');
var aFunction = require('./_a-function');
var $defineProperty = require('./_object-dp');

// B.2.2.2 Object.prototype.__defineGetter__(P, getter)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __defineGetter__: function __defineGetter__(P, getter) {
    $defineProperty.f(toObject(this), P, { get: aFunction(getter), enumerable: true, configurable: true });
  }
});

},{"./_a-function":10,"./_descriptors":36,"./_export":40,"./_object-dp":78,"./_object-forced-pam":80,"./_to-object":123}],295:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toObject = require('./_to-object');
var aFunction = require('./_a-function');
var $defineProperty = require('./_object-dp');

// B.2.2.3 Object.prototype.__defineSetter__(P, setter)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __defineSetter__: function __defineSetter__(P, setter) {
    $defineProperty.f(toObject(this), P, { set: aFunction(setter), enumerable: true, configurable: true });
  }
});

},{"./_a-function":10,"./_descriptors":36,"./_export":40,"./_object-dp":78,"./_object-forced-pam":80,"./_to-object":123}],296:[function(require,module,exports){
// https://github.com/tc39/proposal-object-values-entries
var $export = require('./_export');
var $entries = require('./_object-to-array')(true);

$export($export.S, 'Object', {
  entries: function entries(it) {
    return $entries(it);
  }
});

},{"./_export":40,"./_object-to-array":90}],297:[function(require,module,exports){
// https://github.com/tc39/proposal-object-getownpropertydescriptors
var $export = require('./_export');
var ownKeys = require('./_own-keys');
var toIObject = require('./_to-iobject');
var gOPD = require('./_object-gopd');
var createProperty = require('./_create-property');

$export($export.S, 'Object', {
  getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object) {
    var O = toIObject(object);
    var getDesc = gOPD.f;
    var keys = ownKeys(O);
    var result = {};
    var i = 0;
    var key, desc;
    while (keys.length > i) {
      desc = getDesc(O, key = keys[i++]);
      if (desc !== undefined) createProperty(result, key, desc);
    }
    return result;
  }
});

},{"./_create-property":31,"./_export":40,"./_object-gopd":81,"./_own-keys":91,"./_to-iobject":121}],298:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toObject = require('./_to-object');
var toPrimitive = require('./_to-primitive');
var getPrototypeOf = require('./_object-gpo');
var getOwnPropertyDescriptor = require('./_object-gopd').f;

// B.2.2.4 Object.prototype.__lookupGetter__(P)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __lookupGetter__: function __lookupGetter__(P) {
    var O = toObject(this);
    var K = toPrimitive(P, true);
    var D;
    do {
      if (D = getOwnPropertyDescriptor(O, K)) return D.get;
    } while (O = getPrototypeOf(O));
  }
});

},{"./_descriptors":36,"./_export":40,"./_object-forced-pam":80,"./_object-gopd":81,"./_object-gpo":85,"./_to-object":123,"./_to-primitive":124}],299:[function(require,module,exports){
'use strict';
var $export = require('./_export');
var toObject = require('./_to-object');
var toPrimitive = require('./_to-primitive');
var getPrototypeOf = require('./_object-gpo');
var getOwnPropertyDescriptor = require('./_object-gopd').f;

// B.2.2.5 Object.prototype.__lookupSetter__(P)
require('./_descriptors') && $export($export.P + require('./_object-forced-pam'), 'Object', {
  __lookupSetter__: function __lookupSetter__(P) {
    var O = toObject(this);
    var K = toPrimitive(P, true);
    var D;
    do {
      if (D = getOwnPropertyDescriptor(O, K)) return D.set;
    } while (O = getPrototypeOf(O));
  }
});

},{"./_descriptors":36,"./_export":40,"./_object-forced-pam":80,"./_object-gopd":81,"./_object-gpo":85,"./_to-object":123,"./_to-primitive":124}],300:[function(require,module,exports){
// https://github.com/tc39/proposal-object-values-entries
var $export = require('./_export');
var $values = require('./_object-to-array')(false);

$export($export.S, 'Object', {
  values: function values(it) {
    return $values(it);
  }
});

},{"./_export":40,"./_object-to-array":90}],301:[function(require,module,exports){
'use strict';
// https://github.com/zenparsing/es-observable
var $export = require('./_export');
var global = require('./_global');
var core = require('./_core');
var microtask = require('./_microtask')();
var OBSERVABLE = require('./_wks')('observable');
var aFunction = require('./_a-function');
var anObject = require('./_an-object');
var anInstance = require('./_an-instance');
var redefineAll = require('./_redefine-all');
var hide = require('./_hide');
var forOf = require('./_for-of');
var RETURN = forOf.RETURN;

var getMethod = function (fn) {
  return fn == null ? undefined : aFunction(fn);
};

var cleanupSubscription = function (subscription) {
  var cleanup = subscription._c;
  if (cleanup) {
    subscription._c = undefined;
    cleanup();
  }
};

var subscriptionClosed = function (subscription) {
  return subscription._o === undefined;
};

var closeSubscription = function (subscription) {
  if (!subscriptionClosed(subscription)) {
    subscription._o = undefined;
    cleanupSubscription(subscription);
  }
};

var Subscription = function (observer, subscriber) {
  anObject(observer);
  this._c = undefined;
  this._o = observer;
  observer = new SubscriptionObserver(this);
  try {
    var cleanup = subscriber(observer);
    var subscription = cleanup;
    if (cleanup != null) {
      if (typeof cleanup.unsubscribe === 'function') cleanup = function () { subscription.unsubscribe(); };
      else aFunction(cleanup);
      this._c = cleanup;
    }
  } catch (e) {
    observer.error(e);
    return;
  } if (subscriptionClosed(this)) cleanupSubscription(this);
};

Subscription.prototype = redefineAll({}, {
  unsubscribe: function unsubscribe() { closeSubscription(this); }
});

var SubscriptionObserver = function (subscription) {
  this._s = subscription;
};

SubscriptionObserver.prototype = redefineAll({}, {
  next: function next(value) {
    var subscription = this._s;
    if (!subscriptionClosed(subscription)) {
      var observer = subscription._o;
      try {
        var m = getMethod(observer.next);
        if (m) return m.call(observer, value);
      } catch (e) {
        try {
          closeSubscription(subscription);
        } finally {
          throw e;
        }
      }
    }
  },
  error: function error(value) {
    var subscription = this._s;
    if (subscriptionClosed(subscription)) throw value;
    var observer = subscription._o;
    subscription._o = undefined;
    try {
      var m = getMethod(observer.error);
      if (!m) throw value;
      value = m.call(observer, value);
    } catch (e) {
      try {
        cleanupSubscription(subscription);
      } finally {
        throw e;
      }
    } cleanupSubscription(subscription);
    return value;
  },
  complete: function complete(value) {
    var subscription = this._s;
    if (!subscriptionClosed(subscription)) {
      var observer = subscription._o;
      subscription._o = undefined;
      try {
        var m = getMethod(observer.complete);
        value = m ? m.call(observer, value) : undefined;
      } catch (e) {
        try {
          cleanupSubscription(subscription);
        } finally {
          throw e;
        }
      } cleanupSubscription(subscription);
      return value;
    }
  }
});

var $Observable = function Observable(subscriber) {
  anInstance(this, $Observable, 'Observable', '_f')._f = aFunction(subscriber);
};

redefineAll($Observable.prototype, {
  subscribe: function subscribe(observer) {
    return new Subscription(observer, this._f);
  },
  forEach: function forEach(fn) {
    var that = this;
    return new (core.Promise || global.Promise)(function (resolve, reject) {
      aFunction(fn);
      var subscription = that.subscribe({
        next: function (value) {
          try {
            return fn(value);
          } catch (e) {
            reject(e);
            subscription.unsubscribe();
          }
        },
        error: reject,
        complete: resolve
      });
    });
  }
});

redefineAll($Observable, {
  from: function from(x) {
    var C = typeof this === 'function' ? this : $Observable;
    var method = getMethod(anObject(x)[OBSERVABLE]);
    if (method) {
      var observable = anObject(method.call(x));
      return observable.constructor === C ? observable : new C(function (observer) {
        return observable.subscribe(observer);
      });
    }
    return new C(function (observer) {
      var done = false;
      microtask(function () {
        if (!done) {
          try {
            if (forOf(x, false, function (it) {
              observer.next(it);
              if (done) return RETURN;
            }) === RETURN) return;
          } catch (e) {
            if (done) throw e;
            observer.error(e);
            return;
          } observer.complete();
        }
      });
      return function () { done = true; };
    });
  },
  of: function of() {
    for (var i = 0, l = arguments.length, items = new Array(l); i < l;) items[i] = arguments[i++];
    return new (typeof this === 'function' ? this : $Observable)(function (observer) {
      var done = false;
      microtask(function () {
        if (!done) {
          for (var j = 0; j < items.length; ++j) {
            observer.next(items[j]);
            if (done) return;
          } observer.complete();
        }
      });
      return function () { done = true; };
    });
  }
});

hide($Observable.prototype, OBSERVABLE, function () { return this; });

$export($export.G, { Observable: $Observable });

require('./_set-species')('Observable');

},{"./_a-function":10,"./_an-instance":13,"./_an-object":14,"./_core":30,"./_export":40,"./_for-of":46,"./_global":47,"./_hide":49,"./_microtask":74,"./_redefine-all":97,"./_set-species":104,"./_wks":133}],302:[function(require,module,exports){
// https://github.com/tc39/proposal-promise-finally
'use strict';
var $export = require('./_export');
var core = require('./_core');
var global = require('./_global');
var speciesConstructor = require('./_species-constructor');
var promiseResolve = require('./_promise-resolve');

$export($export.P + $export.R, 'Promise', { 'finally': function (onFinally) {
  var C = speciesConstructor(this, core.Promise || global.Promise);
  var isFunction = typeof onFinally == 'function';
  return this.then(
    isFunction ? function (x) {
      return promiseResolve(C, onFinally()).then(function () { return x; });
    } : onFinally,
    isFunction ? function (e) {
      return promiseResolve(C, onFinally()).then(function () { throw e; });
    } : onFinally
  );
} });

},{"./_core":30,"./_export":40,"./_global":47,"./_promise-resolve":95,"./_species-constructor":108}],303:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-promise-try
var $export = require('./_export');
var newPromiseCapability = require('./_new-promise-capability');
var perform = require('./_perform');

$export($export.S, 'Promise', { 'try': function (callbackfn) {
  var promiseCapability = newPromiseCapability.f(this);
  var result = perform(callbackfn);
  (result.e ? promiseCapability.reject : promiseCapability.resolve)(result.v);
  return promiseCapability.promise;
} });

},{"./_export":40,"./_new-promise-capability":75,"./_perform":94}],304:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var toMetaKey = metadata.key;
var ordinaryDefineOwnMetadata = metadata.set;

metadata.exp({ defineMetadata: function defineMetadata(metadataKey, metadataValue, target, targetKey) {
  ordinaryDefineOwnMetadata(metadataKey, metadataValue, anObject(target), toMetaKey(targetKey));
} });

},{"./_an-object":14,"./_metadata":73}],305:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var toMetaKey = metadata.key;
var getOrCreateMetadataMap = metadata.map;
var store = metadata.store;

metadata.exp({ deleteMetadata: function deleteMetadata(metadataKey, target /* , targetKey */) {
  var targetKey = arguments.length < 3 ? undefined : toMetaKey(arguments[2]);
  var metadataMap = getOrCreateMetadataMap(anObject(target), targetKey, false);
  if (metadataMap === undefined || !metadataMap['delete'](metadataKey)) return false;
  if (metadataMap.size) return true;
  var targetMetadata = store.get(target);
  targetMetadata['delete'](targetKey);
  return !!targetMetadata.size || store['delete'](target);
} });

},{"./_an-object":14,"./_metadata":73}],306:[function(require,module,exports){
var Set = require('./es6.set');
var from = require('./_array-from-iterable');
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var getPrototypeOf = require('./_object-gpo');
var ordinaryOwnMetadataKeys = metadata.keys;
var toMetaKey = metadata.key;

var ordinaryMetadataKeys = function (O, P) {
  var oKeys = ordinaryOwnMetadataKeys(O, P);
  var parent = getPrototypeOf(O);
  if (parent === null) return oKeys;
  var pKeys = ordinaryMetadataKeys(parent, P);
  return pKeys.length ? oKeys.length ? from(new Set(oKeys.concat(pKeys))) : pKeys : oKeys;
};

metadata.exp({ getMetadataKeys: function getMetadataKeys(target /* , targetKey */) {
  return ordinaryMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
} });

},{"./_an-object":14,"./_array-from-iterable":17,"./_metadata":73,"./_object-gpo":85,"./es6.set":236}],307:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var getPrototypeOf = require('./_object-gpo');
var ordinaryHasOwnMetadata = metadata.has;
var ordinaryGetOwnMetadata = metadata.get;
var toMetaKey = metadata.key;

var ordinaryGetMetadata = function (MetadataKey, O, P) {
  var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
  if (hasOwn) return ordinaryGetOwnMetadata(MetadataKey, O, P);
  var parent = getPrototypeOf(O);
  return parent !== null ? ordinaryGetMetadata(MetadataKey, parent, P) : undefined;
};

metadata.exp({ getMetadata: function getMetadata(metadataKey, target /* , targetKey */) {
  return ordinaryGetMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
} });

},{"./_an-object":14,"./_metadata":73,"./_object-gpo":85}],308:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var ordinaryOwnMetadataKeys = metadata.keys;
var toMetaKey = metadata.key;

metadata.exp({ getOwnMetadataKeys: function getOwnMetadataKeys(target /* , targetKey */) {
  return ordinaryOwnMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
} });

},{"./_an-object":14,"./_metadata":73}],309:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var ordinaryGetOwnMetadata = metadata.get;
var toMetaKey = metadata.key;

metadata.exp({ getOwnMetadata: function getOwnMetadata(metadataKey, target /* , targetKey */) {
  return ordinaryGetOwnMetadata(metadataKey, anObject(target)
    , arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
} });

},{"./_an-object":14,"./_metadata":73}],310:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var getPrototypeOf = require('./_object-gpo');
var ordinaryHasOwnMetadata = metadata.has;
var toMetaKey = metadata.key;

var ordinaryHasMetadata = function (MetadataKey, O, P) {
  var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
  if (hasOwn) return true;
  var parent = getPrototypeOf(O);
  return parent !== null ? ordinaryHasMetadata(MetadataKey, parent, P) : false;
};

metadata.exp({ hasMetadata: function hasMetadata(metadataKey, target /* , targetKey */) {
  return ordinaryHasMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
} });

},{"./_an-object":14,"./_metadata":73,"./_object-gpo":85}],311:[function(require,module,exports){
var metadata = require('./_metadata');
var anObject = require('./_an-object');
var ordinaryHasOwnMetadata = metadata.has;
var toMetaKey = metadata.key;

metadata.exp({ hasOwnMetadata: function hasOwnMetadata(metadataKey, target /* , targetKey */) {
  return ordinaryHasOwnMetadata(metadataKey, anObject(target)
    , arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
} });

},{"./_an-object":14,"./_metadata":73}],312:[function(require,module,exports){
var $metadata = require('./_metadata');
var anObject = require('./_an-object');
var aFunction = require('./_a-function');
var toMetaKey = $metadata.key;
var ordinaryDefineOwnMetadata = $metadata.set;

$metadata.exp({ metadata: function metadata(metadataKey, metadataValue) {
  return function decorator(target, targetKey) {
    ordinaryDefineOwnMetadata(
      metadataKey, metadataValue,
      (targetKey !== undefined ? anObject : aFunction)(target),
      toMetaKey(targetKey)
    );
  };
} });

},{"./_a-function":10,"./_an-object":14,"./_metadata":73}],313:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-set.from
require('./_set-collection-from')('Set');

},{"./_set-collection-from":101}],314:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-set.of
require('./_set-collection-of')('Set');

},{"./_set-collection-of":102}],315:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export = require('./_export');

$export($export.P + $export.R, 'Set', { toJSON: require('./_collection-to-json')('Set') });

},{"./_collection-to-json":27,"./_export":40}],316:[function(require,module,exports){
'use strict';
// https://github.com/mathiasbynens/String.prototype.at
var $export = require('./_export');
var $at = require('./_string-at')(true);

$export($export.P, 'String', {
  at: function at(pos) {
    return $at(this, pos);
  }
});

},{"./_export":40,"./_string-at":110}],317:[function(require,module,exports){
'use strict';
// https://tc39.github.io/String.prototype.matchAll/
var $export = require('./_export');
var defined = require('./_defined');
var toLength = require('./_to-length');
var isRegExp = require('./_is-regexp');
var getFlags = require('./_flags');
var RegExpProto = RegExp.prototype;

var $RegExpStringIterator = function (regexp, string) {
  this._r = regexp;
  this._s = string;
};

require('./_iter-create')($RegExpStringIterator, 'RegExp String', function next() {
  var match = this._r.exec(this._s);
  return { value: match, done: match === null };
});

$export($export.P, 'String', {
  matchAll: function matchAll(regexp) {
    defined(this);
    if (!isRegExp(regexp)) throw TypeError(regexp + ' is not a regexp!');
    var S = String(this);
    var flags = 'flags' in RegExpProto ? String(regexp.flags) : getFlags.call(regexp);
    var rx = new RegExp(regexp.source, ~flags.indexOf('g') ? flags : 'g' + flags);
    rx.lastIndex = toLength(regexp.lastIndex);
    return new $RegExpStringIterator(rx, S);
  }
});

},{"./_defined":35,"./_export":40,"./_flags":44,"./_is-regexp":59,"./_iter-create":61,"./_to-length":122}],318:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-string-pad-start-end
var $export = require('./_export');
var $pad = require('./_string-pad');
var userAgent = require('./_user-agent');

// https://github.com/zloirock/core-js/issues/280
$export($export.P + $export.F * /Version\/10\.\d+(\.\d+)? Safari\//.test(userAgent), 'String', {
  padEnd: function padEnd(maxLength /* , fillString = ' ' */) {
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, false);
  }
});

},{"./_export":40,"./_string-pad":113,"./_user-agent":129}],319:[function(require,module,exports){
'use strict';
// https://github.com/tc39/proposal-string-pad-start-end
var $export = require('./_export');
var $pad = require('./_string-pad');
var userAgent = require('./_user-agent');

// https://github.com/zloirock/core-js/issues/280
$export($export.P + $export.F * /Version\/10\.\d+(\.\d+)? Safari\//.test(userAgent), 'String', {
  padStart: function padStart(maxLength /* , fillString = ' ' */) {
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, true);
  }
});

},{"./_export":40,"./_string-pad":113,"./_user-agent":129}],320:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./_string-trim')('trimLeft', function ($trim) {
  return function trimLeft() {
    return $trim(this, 1);
  };
}, 'trimStart');

},{"./_string-trim":115}],321:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./_string-trim')('trimRight', function ($trim) {
  return function trimRight() {
    return $trim(this, 2);
  };
}, 'trimEnd');

},{"./_string-trim":115}],322:[function(require,module,exports){
require('./_wks-define')('asyncIterator');

},{"./_wks-define":131}],323:[function(require,module,exports){
require('./_wks-define')('observable');

},{"./_wks-define":131}],324:[function(require,module,exports){
// https://github.com/tc39/proposal-global
var $export = require('./_export');

$export($export.S, 'System', { global: require('./_global') });

},{"./_export":40,"./_global":47}],325:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-weakmap.from
require('./_set-collection-from')('WeakMap');

},{"./_set-collection-from":101}],326:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-weakmap.of
require('./_set-collection-of')('WeakMap');

},{"./_set-collection-of":102}],327:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-weakset.from
require('./_set-collection-from')('WeakSet');

},{"./_set-collection-from":101}],328:[function(require,module,exports){
// https://tc39.github.io/proposal-setmap-offrom/#sec-weakset.of
require('./_set-collection-of')('WeakSet');

},{"./_set-collection-of":102}],329:[function(require,module,exports){
var $iterators = require('./es6.array.iterator');
var getKeys = require('./_object-keys');
var redefine = require('./_redefine');
var global = require('./_global');
var hide = require('./_hide');
var Iterators = require('./_iterators');
var wks = require('./_wks');
var ITERATOR = wks('iterator');
var TO_STRING_TAG = wks('toStringTag');
var ArrayValues = Iterators.Array;

var DOMIterables = {
  CSSRuleList: true, // TODO: Not spec compliant, should be false.
  CSSStyleDeclaration: false,
  CSSValueList: false,
  ClientRectList: false,
  DOMRectList: false,
  DOMStringList: false,
  DOMTokenList: true,
  DataTransferItemList: false,
  FileList: false,
  HTMLAllCollection: false,
  HTMLCollection: false,
  HTMLFormElement: false,
  HTMLSelectElement: false,
  MediaList: true, // TODO: Not spec compliant, should be false.
  MimeTypeArray: false,
  NamedNodeMap: false,
  NodeList: true,
  PaintRequestList: false,
  Plugin: false,
  PluginArray: false,
  SVGLengthList: false,
  SVGNumberList: false,
  SVGPathSegList: false,
  SVGPointList: false,
  SVGStringList: false,
  SVGTransformList: false,
  SourceBufferList: false,
  StyleSheetList: true, // TODO: Not spec compliant, should be false.
  TextTrackCueList: false,
  TextTrackList: false,
  TouchList: false
};

for (var collections = getKeys(DOMIterables), i = 0; i < collections.length; i++) {
  var NAME = collections[i];
  var explicit = DOMIterables[NAME];
  var Collection = global[NAME];
  var proto = Collection && Collection.prototype;
  var key;
  if (proto) {
    if (!proto[ITERATOR]) hide(proto, ITERATOR, ArrayValues);
    if (!proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
    Iterators[NAME] = ArrayValues;
    if (explicit) for (key in $iterators) if (!proto[key]) redefine(proto, key, $iterators[key], true);
  }
}

},{"./_global":47,"./_hide":49,"./_iterators":65,"./_object-keys":87,"./_redefine":98,"./_wks":133,"./es6.array.iterator":146}],330:[function(require,module,exports){
var $export = require('./_export');
var $task = require('./_task');
$export($export.G + $export.B, {
  setImmediate: $task.set,
  clearImmediate: $task.clear
});

},{"./_export":40,"./_task":117}],331:[function(require,module,exports){
// ie9- setTimeout & setInterval additional parameters fix
var global = require('./_global');
var $export = require('./_export');
var userAgent = require('./_user-agent');
var slice = [].slice;
var MSIE = /MSIE .\./.test(userAgent); // <- dirty ie9- check
var wrap = function (set) {
  return function (fn, time /* , ...args */) {
    var boundArgs = arguments.length > 2;
    var args = boundArgs ? slice.call(arguments, 2) : false;
    return set(boundArgs ? function () {
      // eslint-disable-next-line no-new-func
      (typeof fn == 'function' ? fn : Function(fn)).apply(this, args);
    } : fn, time);
  };
};
$export($export.G + $export.B + $export.F * MSIE, {
  setTimeout: wrap(global.setTimeout),
  setInterval: wrap(global.setInterval)
});

},{"./_export":40,"./_global":47,"./_user-agent":129}],332:[function(require,module,exports){
require('./modules/es6.symbol');
require('./modules/es6.object.create');
require('./modules/es6.object.define-property');
require('./modules/es6.object.define-properties');
require('./modules/es6.object.get-own-property-descriptor');
require('./modules/es6.object.get-prototype-of');
require('./modules/es6.object.keys');
require('./modules/es6.object.get-own-property-names');
require('./modules/es6.object.freeze');
require('./modules/es6.object.seal');
require('./modules/es6.object.prevent-extensions');
require('./modules/es6.object.is-frozen');
require('./modules/es6.object.is-sealed');
require('./modules/es6.object.is-extensible');
require('./modules/es6.object.assign');
require('./modules/es6.object.is');
require('./modules/es6.object.set-prototype-of');
require('./modules/es6.object.to-string');
require('./modules/es6.function.bind');
require('./modules/es6.function.name');
require('./modules/es6.function.has-instance');
require('./modules/es6.parse-int');
require('./modules/es6.parse-float');
require('./modules/es6.number.constructor');
require('./modules/es6.number.to-fixed');
require('./modules/es6.number.to-precision');
require('./modules/es6.number.epsilon');
require('./modules/es6.number.is-finite');
require('./modules/es6.number.is-integer');
require('./modules/es6.number.is-nan');
require('./modules/es6.number.is-safe-integer');
require('./modules/es6.number.max-safe-integer');
require('./modules/es6.number.min-safe-integer');
require('./modules/es6.number.parse-float');
require('./modules/es6.number.parse-int');
require('./modules/es6.math.acosh');
require('./modules/es6.math.asinh');
require('./modules/es6.math.atanh');
require('./modules/es6.math.cbrt');
require('./modules/es6.math.clz32');
require('./modules/es6.math.cosh');
require('./modules/es6.math.expm1');
require('./modules/es6.math.fround');
require('./modules/es6.math.hypot');
require('./modules/es6.math.imul');
require('./modules/es6.math.log10');
require('./modules/es6.math.log1p');
require('./modules/es6.math.log2');
require('./modules/es6.math.sign');
require('./modules/es6.math.sinh');
require('./modules/es6.math.tanh');
require('./modules/es6.math.trunc');
require('./modules/es6.string.from-code-point');
require('./modules/es6.string.raw');
require('./modules/es6.string.trim');
require('./modules/es6.string.iterator');
require('./modules/es6.string.code-point-at');
require('./modules/es6.string.ends-with');
require('./modules/es6.string.includes');
require('./modules/es6.string.repeat');
require('./modules/es6.string.starts-with');
require('./modules/es6.string.anchor');
require('./modules/es6.string.big');
require('./modules/es6.string.blink');
require('./modules/es6.string.bold');
require('./modules/es6.string.fixed');
require('./modules/es6.string.fontcolor');
require('./modules/es6.string.fontsize');
require('./modules/es6.string.italics');
require('./modules/es6.string.link');
require('./modules/es6.string.small');
require('./modules/es6.string.strike');
require('./modules/es6.string.sub');
require('./modules/es6.string.sup');
require('./modules/es6.date.now');
require('./modules/es6.date.to-json');
require('./modules/es6.date.to-iso-string');
require('./modules/es6.date.to-string');
require('./modules/es6.date.to-primitive');
require('./modules/es6.array.is-array');
require('./modules/es6.array.from');
require('./modules/es6.array.of');
require('./modules/es6.array.join');
require('./modules/es6.array.slice');
require('./modules/es6.array.sort');
require('./modules/es6.array.for-each');
require('./modules/es6.array.map');
require('./modules/es6.array.filter');
require('./modules/es6.array.some');
require('./modules/es6.array.every');
require('./modules/es6.array.reduce');
require('./modules/es6.array.reduce-right');
require('./modules/es6.array.index-of');
require('./modules/es6.array.last-index-of');
require('./modules/es6.array.copy-within');
require('./modules/es6.array.fill');
require('./modules/es6.array.find');
require('./modules/es6.array.find-index');
require('./modules/es6.array.species');
require('./modules/es6.array.iterator');
require('./modules/es6.regexp.constructor');
require('./modules/es6.regexp.to-string');
require('./modules/es6.regexp.flags');
require('./modules/es6.regexp.match');
require('./modules/es6.regexp.replace');
require('./modules/es6.regexp.search');
require('./modules/es6.regexp.split');
require('./modules/es6.promise');
require('./modules/es6.map');
require('./modules/es6.set');
require('./modules/es6.weak-map');
require('./modules/es6.weak-set');
require('./modules/es6.typed.array-buffer');
require('./modules/es6.typed.data-view');
require('./modules/es6.typed.int8-array');
require('./modules/es6.typed.uint8-array');
require('./modules/es6.typed.uint8-clamped-array');
require('./modules/es6.typed.int16-array');
require('./modules/es6.typed.uint16-array');
require('./modules/es6.typed.int32-array');
require('./modules/es6.typed.uint32-array');
require('./modules/es6.typed.float32-array');
require('./modules/es6.typed.float64-array');
require('./modules/es6.reflect.apply');
require('./modules/es6.reflect.construct');
require('./modules/es6.reflect.define-property');
require('./modules/es6.reflect.delete-property');
require('./modules/es6.reflect.enumerate');
require('./modules/es6.reflect.get');
require('./modules/es6.reflect.get-own-property-descriptor');
require('./modules/es6.reflect.get-prototype-of');
require('./modules/es6.reflect.has');
require('./modules/es6.reflect.is-extensible');
require('./modules/es6.reflect.own-keys');
require('./modules/es6.reflect.prevent-extensions');
require('./modules/es6.reflect.set');
require('./modules/es6.reflect.set-prototype-of');
require('./modules/es7.array.includes');
require('./modules/es7.array.flat-map');
require('./modules/es7.array.flatten');
require('./modules/es7.string.at');
require('./modules/es7.string.pad-start');
require('./modules/es7.string.pad-end');
require('./modules/es7.string.trim-left');
require('./modules/es7.string.trim-right');
require('./modules/es7.string.match-all');
require('./modules/es7.symbol.async-iterator');
require('./modules/es7.symbol.observable');
require('./modules/es7.object.get-own-property-descriptors');
require('./modules/es7.object.values');
require('./modules/es7.object.entries');
require('./modules/es7.object.define-getter');
require('./modules/es7.object.define-setter');
require('./modules/es7.object.lookup-getter');
require('./modules/es7.object.lookup-setter');
require('./modules/es7.map.to-json');
require('./modules/es7.set.to-json');
require('./modules/es7.map.of');
require('./modules/es7.set.of');
require('./modules/es7.weak-map.of');
require('./modules/es7.weak-set.of');
require('./modules/es7.map.from');
require('./modules/es7.set.from');
require('./modules/es7.weak-map.from');
require('./modules/es7.weak-set.from');
require('./modules/es7.global');
require('./modules/es7.system.global');
require('./modules/es7.error.is-error');
require('./modules/es7.math.clamp');
require('./modules/es7.math.deg-per-rad');
require('./modules/es7.math.degrees');
require('./modules/es7.math.fscale');
require('./modules/es7.math.iaddh');
require('./modules/es7.math.isubh');
require('./modules/es7.math.imulh');
require('./modules/es7.math.rad-per-deg');
require('./modules/es7.math.radians');
require('./modules/es7.math.scale');
require('./modules/es7.math.umulh');
require('./modules/es7.math.signbit');
require('./modules/es7.promise.finally');
require('./modules/es7.promise.try');
require('./modules/es7.reflect.define-metadata');
require('./modules/es7.reflect.delete-metadata');
require('./modules/es7.reflect.get-metadata');
require('./modules/es7.reflect.get-metadata-keys');
require('./modules/es7.reflect.get-own-metadata');
require('./modules/es7.reflect.get-own-metadata-keys');
require('./modules/es7.reflect.has-metadata');
require('./modules/es7.reflect.has-own-metadata');
require('./modules/es7.reflect.metadata');
require('./modules/es7.asap');
require('./modules/es7.observable');
require('./modules/web.timers');
require('./modules/web.immediate');
require('./modules/web.dom.iterable');
module.exports = require('./modules/_core');

},{"./modules/_core":30,"./modules/es6.array.copy-within":136,"./modules/es6.array.every":137,"./modules/es6.array.fill":138,"./modules/es6.array.filter":139,"./modules/es6.array.find":141,"./modules/es6.array.find-index":140,"./modules/es6.array.for-each":142,"./modules/es6.array.from":143,"./modules/es6.array.index-of":144,"./modules/es6.array.is-array":145,"./modules/es6.array.iterator":146,"./modules/es6.array.join":147,"./modules/es6.array.last-index-of":148,"./modules/es6.array.map":149,"./modules/es6.array.of":150,"./modules/es6.array.reduce":152,"./modules/es6.array.reduce-right":151,"./modules/es6.array.slice":153,"./modules/es6.array.some":154,"./modules/es6.array.sort":155,"./modules/es6.array.species":156,"./modules/es6.date.now":157,"./modules/es6.date.to-iso-string":158,"./modules/es6.date.to-json":159,"./modules/es6.date.to-primitive":160,"./modules/es6.date.to-string":161,"./modules/es6.function.bind":162,"./modules/es6.function.has-instance":163,"./modules/es6.function.name":164,"./modules/es6.map":165,"./modules/es6.math.acosh":166,"./modules/es6.math.asinh":167,"./modules/es6.math.atanh":168,"./modules/es6.math.cbrt":169,"./modules/es6.math.clz32":170,"./modules/es6.math.cosh":171,"./modules/es6.math.expm1":172,"./modules/es6.math.fround":173,"./modules/es6.math.hypot":174,"./modules/es6.math.imul":175,"./modules/es6.math.log10":176,"./modules/es6.math.log1p":177,"./modules/es6.math.log2":178,"./modules/es6.math.sign":179,"./modules/es6.math.sinh":180,"./modules/es6.math.tanh":181,"./modules/es6.math.trunc":182,"./modules/es6.number.constructor":183,"./modules/es6.number.epsilon":184,"./modules/es6.number.is-finite":185,"./modules/es6.number.is-integer":186,"./modules/es6.number.is-nan":187,"./modules/es6.number.is-safe-integer":188,"./modules/es6.number.max-safe-integer":189,"./modules/es6.number.min-safe-integer":190,"./modules/es6.number.parse-float":191,"./modules/es6.number.parse-int":192,"./modules/es6.number.to-fixed":193,"./modules/es6.number.to-precision":194,"./modules/es6.object.assign":195,"./modules/es6.object.create":196,"./modules/es6.object.define-properties":197,"./modules/es6.object.define-property":198,"./modules/es6.object.freeze":199,"./modules/es6.object.get-own-property-descriptor":200,"./modules/es6.object.get-own-property-names":201,"./modules/es6.object.get-prototype-of":202,"./modules/es6.object.is":206,"./modules/es6.object.is-extensible":203,"./modules/es6.object.is-frozen":204,"./modules/es6.object.is-sealed":205,"./modules/es6.object.keys":207,"./modules/es6.object.prevent-extensions":208,"./modules/es6.object.seal":209,"./modules/es6.object.set-prototype-of":210,"./modules/es6.object.to-string":211,"./modules/es6.parse-float":212,"./modules/es6.parse-int":213,"./modules/es6.promise":214,"./modules/es6.reflect.apply":215,"./modules/es6.reflect.construct":216,"./modules/es6.reflect.define-property":217,"./modules/es6.reflect.delete-property":218,"./modules/es6.reflect.enumerate":219,"./modules/es6.reflect.get":222,"./modules/es6.reflect.get-own-property-descriptor":220,"./modules/es6.reflect.get-prototype-of":221,"./modules/es6.reflect.has":223,"./modules/es6.reflect.is-extensible":224,"./modules/es6.reflect.own-keys":225,"./modules/es6.reflect.prevent-extensions":226,"./modules/es6.reflect.set":228,"./modules/es6.reflect.set-prototype-of":227,"./modules/es6.regexp.constructor":229,"./modules/es6.regexp.flags":230,"./modules/es6.regexp.match":231,"./modules/es6.regexp.replace":232,"./modules/es6.regexp.search":233,"./modules/es6.regexp.split":234,"./modules/es6.regexp.to-string":235,"./modules/es6.set":236,"./modules/es6.string.anchor":237,"./modules/es6.string.big":238,"./modules/es6.string.blink":239,"./modules/es6.string.bold":240,"./modules/es6.string.code-point-at":241,"./modules/es6.string.ends-with":242,"./modules/es6.string.fixed":243,"./modules/es6.string.fontcolor":244,"./modules/es6.string.fontsize":245,"./modules/es6.string.from-code-point":246,"./modules/es6.string.includes":247,"./modules/es6.string.italics":248,"./modules/es6.string.iterator":249,"./modules/es6.string.link":250,"./modules/es6.string.raw":251,"./modules/es6.string.repeat":252,"./modules/es6.string.small":253,"./modules/es6.string.starts-with":254,"./modules/es6.string.strike":255,"./modules/es6.string.sub":256,"./modules/es6.string.sup":257,"./modules/es6.string.trim":258,"./modules/es6.symbol":259,"./modules/es6.typed.array-buffer":260,"./modules/es6.typed.data-view":261,"./modules/es6.typed.float32-array":262,"./modules/es6.typed.float64-array":263,"./modules/es6.typed.int16-array":264,"./modules/es6.typed.int32-array":265,"./modules/es6.typed.int8-array":266,"./modules/es6.typed.uint16-array":267,"./modules/es6.typed.uint32-array":268,"./modules/es6.typed.uint8-array":269,"./modules/es6.typed.uint8-clamped-array":270,"./modules/es6.weak-map":271,"./modules/es6.weak-set":272,"./modules/es7.array.flat-map":273,"./modules/es7.array.flatten":274,"./modules/es7.array.includes":275,"./modules/es7.asap":276,"./modules/es7.error.is-error":277,"./modules/es7.global":278,"./modules/es7.map.from":279,"./modules/es7.map.of":280,"./modules/es7.map.to-json":281,"./modules/es7.math.clamp":282,"./modules/es7.math.deg-per-rad":283,"./modules/es7.math.degrees":284,"./modules/es7.math.fscale":285,"./modules/es7.math.iaddh":286,"./modules/es7.math.imulh":287,"./modules/es7.math.isubh":288,"./modules/es7.math.rad-per-deg":289,"./modules/es7.math.radians":290,"./modules/es7.math.scale":291,"./modules/es7.math.signbit":292,"./modules/es7.math.umulh":293,"./modules/es7.object.define-getter":294,"./modules/es7.object.define-setter":295,"./modules/es7.object.entries":296,"./modules/es7.object.get-own-property-descriptors":297,"./modules/es7.object.lookup-getter":298,"./modules/es7.object.lookup-setter":299,"./modules/es7.object.values":300,"./modules/es7.observable":301,"./modules/es7.promise.finally":302,"./modules/es7.promise.try":303,"./modules/es7.reflect.define-metadata":304,"./modules/es7.reflect.delete-metadata":305,"./modules/es7.reflect.get-metadata":307,"./modules/es7.reflect.get-metadata-keys":306,"./modules/es7.reflect.get-own-metadata":309,"./modules/es7.reflect.get-own-metadata-keys":308,"./modules/es7.reflect.has-metadata":310,"./modules/es7.reflect.has-own-metadata":311,"./modules/es7.reflect.metadata":312,"./modules/es7.set.from":313,"./modules/es7.set.of":314,"./modules/es7.set.to-json":315,"./modules/es7.string.at":316,"./modules/es7.string.match-all":317,"./modules/es7.string.pad-end":318,"./modules/es7.string.pad-start":319,"./modules/es7.string.trim-left":320,"./modules/es7.string.trim-right":321,"./modules/es7.symbol.async-iterator":322,"./modules/es7.symbol.observable":323,"./modules/es7.system.global":324,"./modules/es7.weak-map.from":325,"./modules/es7.weak-map.of":326,"./modules/es7.weak-set.from":327,"./modules/es7.weak-set.of":328,"./modules/web.dom.iterable":329,"./modules/web.immediate":330,"./modules/web.timers":331}],333:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Define the C bindings for the h3 library

// Add some aliases to make the function definitions more intelligible
var NUMBER = 'number';
var BOOLEAN = NUMBER;
var H3_LOWER = NUMBER;
var H3_UPPER = NUMBER;
var RESOLUTION = NUMBER;
var POINTER = NUMBER;

// Define the bindings to functions in the C lib. Functions are defined as
// [name, return type, [arg types]]. You must run `npm run build-emscripten`
// before new functions added here will be available.
module.exports = [
    // The size functions are inserted via build/sizes.h
    ['sizeOfH3Index', NUMBER],
    ['sizeOfGeoCoord', NUMBER],
    ['sizeOfGeoBoundary', NUMBER],
    ['sizeOfGeoPolygon', NUMBER],
    ['sizeOfGeofence', NUMBER],
    ['sizeOfLinkedGeoPolygon', NUMBER],
    ['sizeOfCoordIJ', NUMBER],
    // The remaining functions are defined in the core lib in h3Api.h
    ['h3IsValid', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['geoToH3', H3_LOWER, [NUMBER, NUMBER, RESOLUTION]],
    ['h3ToGeo', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['h3ToGeoBoundary', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['maxKringSize', NUMBER, [NUMBER]],
    ['kRing', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER]],
    ['kRingDistances', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER, POINTER]],
    ['hexRing', null, [H3_LOWER, H3_UPPER, NUMBER, POINTER]],
    ['maxPolyfillSize', NUMBER, [POINTER, RESOLUTION]],
    ['polyfill', null, [POINTER, RESOLUTION, POINTER]],
    ['h3SetToLinkedGeo', null, [POINTER, NUMBER, POINTER]],
    ['destroyLinkedPolygon', null, [POINTER]],
    ['compact', NUMBER, [POINTER, POINTER, NUMBER]],
    ['uncompact', NUMBER, [POINTER, NUMBER, POINTER, NUMBER, RESOLUTION]],
    ['maxUncompactSize', NUMBER, [POINTER, NUMBER, RESOLUTION]],
    ['h3IsPentagon', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['h3IsResClassIII', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['h3GetBaseCell', NUMBER, [H3_LOWER, H3_UPPER]],
    ['h3ToParent', H3_LOWER, [H3_LOWER, H3_UPPER, RESOLUTION]],
    ['h3ToChildren', null, [H3_LOWER, H3_UPPER, RESOLUTION, POINTER]],
    ['maxH3ToChildrenSize', NUMBER, [H3_LOWER, H3_UPPER, RESOLUTION]],
    ['h3IndexesAreNeighbors', BOOLEAN, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['getH3UnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['getOriginH3IndexFromUnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER]],
    ['getDestinationH3IndexFromUnidirectionalEdge', H3_LOWER, [H3_LOWER, H3_UPPER]],
    ['h3UnidirectionalEdgeIsValid', BOOLEAN, [H3_LOWER, H3_UPPER]],
    ['getH3IndexesFromUnidirectionalEdge', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['getH3UnidirectionalEdgesFromHexagon', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['getH3UnidirectionalEdgeBoundary', null, [H3_LOWER, H3_UPPER, POINTER]],
    ['h3Distance', NUMBER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['h3Line', NUMBER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER, POINTER]],
    ['h3LineSize', NUMBER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER]],
    ['experimentalH3ToLocalIj', NUMBER, [H3_LOWER, H3_UPPER, H3_LOWER, H3_UPPER, POINTER]],
    ['experimentalLocalIjToH3', NUMBER, [H3_LOWER, H3_UPPER, POINTER, POINTER]],
    ['hexAreaM2', NUMBER, [RESOLUTION]],
    ['hexAreaKm2', NUMBER, [RESOLUTION]],
    ['edgeLengthM', NUMBER, [RESOLUTION]],
    ['edgeLengthKm', NUMBER, [RESOLUTION]],
    ['numHexagons', NUMBER, [RESOLUTION]],
    ['getRes0Indexes', null, [POINTER]],
    ['res0IndexCount', NUMBER]
];

},{}],334:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module h3
 */

var C = require('../out/libh3');
var BINDINGS = require('./bindings');

var H3 = {};

// Create the bound functions themselves
BINDINGS.forEach(function bind(def) {
    H3[def[0]] = C.cwrap.apply(C, def);
});

// Alias the hexidecimal base for legibility
var BASE_16 = 16;

// ----------------------------------------------------------------------------
// Byte size imports

var SZ_INT = 4;
var SZ_PTR = 4;
var SZ_DBL = 8;
var SZ_H3INDEX = H3.sizeOfH3Index();
var SZ_GEOCOORD = H3.sizeOfGeoCoord();
var SZ_GEOBOUNDARY = H3.sizeOfGeoBoundary();
var SZ_GEOPOLYGON = H3.sizeOfGeoPolygon();
var SZ_GEOFENCE = H3.sizeOfGeofence();
var SZ_LINKED_GEOPOLYGON = H3.sizeOfLinkedGeoPolygon();
var SZ_COORDIJ = H3.sizeOfCoordIJ();

// ----------------------------------------------------------------------------
// Unit constants
var UNITS = {
    m: 'm',
    km: 'km',
    m2: 'm2',
    km2: 'km2'
};

// ----------------------------------------------------------------------------
// Utilities and helpers

/**
 * Validate a resolution, throwing an error if invalid
 * @private
 * @param  {mixed} res Value to validate
 * @throws {Error}     Error if invalid
 */
function validateRes(res) {
    if (typeof res !== 'number' || res < 0 || res > 15 || Math.floor(res) !== res) {
        throw new Error(("Invalid resolution: " + res));
    }
}

/**
 * Convert an H3 index (64-bit hexidecimal string) into a "split long" - a pair of 32-bit ints
 * @private
 * @param  {H3Index} h3Index  H3 index to check
 * @return {Number[]}         A two-element array with 32 lower bits and 32 upper bits
 */
function h3IndexToSplitLong(h3Index) {
    if (typeof h3Index !== 'string') {
        return [0, 0];
    }
    var upper = parseInt(h3Index.substring(0, h3Index.length - 8), BASE_16);
    var lower = parseInt(h3Index.substring(h3Index.length - 8), BASE_16);
    return [lower, upper];
}

/**
 * Convert a 32-bit int to a hexdecimal string
 * @private
 * @param  {Number} num  Integer to convert
 * @return {H3Index}     Hexidecimal string
 */
function hexFrom32Bit(num) {
    if (num >= 0) {
        return num.toString(BASE_16);
    }

    // Handle negative numbers
    num = num & 0x7fffffff;
    var tempStr = zeroPad(8, num.toString(BASE_16));
    var topNum = (parseInt(tempStr[0], BASE_16) + 8).toString(BASE_16);
    tempStr = topNum + tempStr.substring(1);
    return tempStr;
}

/**
 * Get a H3 index from a split long (pair of 32-bit ints)
 * @private
 * @param  {Number} lower Lower 32 bits
 * @param  {Number} upper Upper 32 bits
 * @return {H3Index}       H3 index
 */
function splitLongToh3Index(lower, upper) {
    return hexFrom32Bit(upper) + zeroPad(8, hexFrom32Bit(lower));
}

/**
 * Zero-pad a string to a given length
 * @private
 * @param  {Number} fullLen Target length
 * @param  {String} numStr  String to zero-pad
 * @return {String}         Zero-padded string
 */
function zeroPad(fullLen, numStr) {
    var numZeroes = fullLen - numStr.length;
    var outStr = '';
    for (var i = 0; i < numZeroes; i++) {
        outStr += '0';
    }
    outStr = outStr + numStr;
    return outStr;
}

/**
 * Populate a C-appropriate Geofence struct from a polygon array
 * @private
 * @param  {Array[]} polygonArray Polygon, as an array of coordinate pairs
 * @param  {Number}  geofence     C pointer to a Geofence struct
 * @param  {Boolean} isGeoJson    Whether coordinates are in [lng, lat] order per GeoJSON spec
 * @return {Number}               C pointer to populated Geofence struct
 */
function polygonArrayToGeofence(polygonArray, geofence, isGeoJson) {
    var numVerts = polygonArray.length;
    var geoCoordArray = C._calloc(numVerts, SZ_GEOCOORD);
    // Support [lng, lat] pairs if GeoJSON is specified
    var latIndex = isGeoJson ? 1 : 0;
    var lngIndex = isGeoJson ? 0 : 1;
    for (var i = 0; i < numVerts * 2; i += 2) {
        C.HEAPF64.set(
            [polygonArray[i / 2][latIndex], polygonArray[i / 2][lngIndex]].map(degsToRads),
            geoCoordArray / SZ_DBL + i
        );
    }
    C.HEAPU32.set([numVerts, geoCoordArray], geofence / SZ_INT);
    return geofence;
}

/**
 * Create a C-appropriate GeoPolygon struct from an array of polygons
 * @private
 * @param  {Array[]} coordinates  Array of polygons, each an array of coordinate pairs
 * @param  {Boolean} isGeoJson    Whether coordinates are in [lng, lat] order per GeoJSON spec
 * @return {Number}               C pointer to populated GeoPolygon struct
 */
function coordinatesToGeoPolygon(coordinates, isGeoJson) {
    // Any loops beyond the first loop are holes
    var numHoles = coordinates.length - 1;
    var geoPolygon = C._calloc(SZ_GEOPOLYGON);
    // Byte positions within the struct
    var geofenceOffset = 0;
    var numHolesOffset = geofenceOffset + SZ_GEOFENCE;
    var holesOffset = numHolesOffset + SZ_INT;
    // geofence is first part of struct
    polygonArrayToGeofence(coordinates[0], geoPolygon + geofenceOffset, isGeoJson);
    var holes;
    if (numHoles > 0) {
        holes = C._calloc(numHoles, SZ_GEOFENCE);
        for (var i = 0; i < numHoles; i++) {
            polygonArrayToGeofence(coordinates[i + 1], holes + SZ_GEOFENCE * i, isGeoJson);
        }
    }
    C.setValue(geoPolygon + numHolesOffset, numHoles, 'i32');
    C.setValue(geoPolygon + holesOffset, holes, 'i32');
    return geoPolygon;
}

/**
 * Free memory allocated for a GeoPolygon struct. It is an error to access the struct
 * after passing it to this method.
 * @private
 * @return {Number} geoPolygon C pointer to populated GeoPolygon struct
 */
function destroyGeoPolygon(geoPolygon) {
    // Byte positions within the struct
    var geofenceOffset = 0;
    var numHolesOffset = geofenceOffset + SZ_GEOFENCE;
    var holesOffset = numHolesOffset + SZ_INT;
    // Free the outer loop
    C._free(C.getValue(geoPolygon + geofenceOffset, 'i8*'));
    // Free the holes, if any
    var numHoles = C.getValue(geoPolygon + numHolesOffset, 'i32');
    for (var i = 0; i < numHoles; i++) {
        C._free(C.getValue(geoPolygon + holesOffset + SZ_GEOFENCE * i, 'i8*'));
    }
    C._free(geoPolygon);
}

/**
 * Read a long value, returning the lower and upper portions as separate 32-bit integers.
 * Because the upper bits are returned via side effect, the argument to this function is
 * intended to be the invocation that caused the side effect, e.g. readLong(H3.getSomeLong())
 * @private
 * @param  {Number} invocation Invoked function returning a long value. The actual return
 *                             value of these functions is a 32-bit integer.
 * @return {Number}            Long value as a [lower, upper] pair
 */
function readLong(invocation) {
    // Upper 32-bits of the long set via side-effect
    var upper = C.getTempRet0();
    return [invocation, upper];
}

/**
 * Read an H3 index from a C return value. As with readLong, the argument to this function
 * is intended to be an invocation, e.g. readH3Index(H3.getSomeAddress()), to help ensure that
 * the temp value storing the upper bits of the long is still set.
 * @private
 * @param  {Number} invocation  Invoked function returning a single H3 index
 * @return {H3Index}            H3 index, or null if index was invalid
 */
function readH3Index(invocation) {
    var ref = readLong(invocation);
    var lower = ref[0];
    var upper = ref[1];
    // The lower bits are allowed to be 0s, but if the upper bits are 0
    // this represents an invalid H3 index
    return upper ? splitLongToh3Index(lower, upper) : null;
}

/**
 * Read an H3 index from a pointer to C memory.
 * @private
 * @param  {Number} cAddress  Pointer to allocated C memory
 * @param {Number} offset     Offset, in number of H3 indexes, in case we're
 *                            reading an array
 * @return {H3Index}          H3 index, or null if index was invalid
 */
function readH3IndexFromPointer(cAddress, offset) {
    if ( offset === void 0 ) offset = 0;

    var lower = C.getValue(cAddress + SZ_INT * offset * 2, 'i32');
    var upper = C.getValue(cAddress + SZ_INT * (offset * 2 + 1), 'i32');
    // The lower bits are allowed to be 0s, but if the upper bits are 0
    // this represents an invalid H3 index
    return upper ? splitLongToh3Index(lower, upper) : null;
}

/**
 * Store an H3 index in C memory.
 * @private
 * @param  {H3Index} h3Index  H3 index to store
 * @param  {Number} cAddress  Pointer to allocated C memory
 * @param {Number} offset     Offset, in number of H3 indexes, in case we're
 *                            writing an array
 */
function storeH3Index(h3Index, cAddress, offset) {
    if ( offset === void 0 ) offset = 0;

    // HEAPU32 is a typed array projection on the index space
    // as unsigned 32-bit integers. This means the index needs
    // to be divided by SZ_INT (4) to access correctly. Also,
    // the H3 index is 64 bits, so we skip by twos as we're writing
    // to 32-bit integers in the proper order.
    C.HEAPU32.set(h3IndexToSplitLong(h3Index), cAddress / SZ_INT + 2 * offset);
}

/**
 * Read an array of 64-bit H3 indexes from C and convert to a JS array of
 * H3 index strings
 * @private
 * @param  {Number} cAddress    Pointer to C ouput array
 * @param  {Number} maxCount    Max number of hexagons in array. Hexagons with
 *                              the value 0 will be skipped, so this isn't
 *                              necessarily the length of the output array.
 * @return {H3Index[]}          Array of H3 indexes
 */
function readArrayOfHexagons(cAddress, maxCount) {
    var out = [];
    for (var i = 0; i < maxCount; i++) {
        var h3Index = readH3IndexFromPointer(cAddress, i);
        if (h3Index !== null) {
            out.push(h3Index);
        }
    }
    return out;
}

/**
 * Store an array of H3 index strings as a C array of 64-bit integers.
 * @private
 * @param  {Number} cAddress    Pointer to C input array
 * @param  {H3Index[]} hexagons H3 indexes to pass to the C lib
 */
function storeArrayOfHexagons(cAddress, hexagons) {
    // Assuming the cAddress points to an already appropriately
    // allocated space
    var count = hexagons.length;
    for (var i = 0; i < count; i++) {
        storeH3Index(hexagons[i], cAddress, i);
    }
}

function readSingleCoord(cAddress) {
    return radsToDegs(C.getValue(cAddress, 'double'));
}

/**
 * Read a GeoCoord from C and return a [lat, lng] pair.
 * @private
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Number[]}           [lat, lng] pair
 */
function readGeoCoord(cAddress) {
    return [readSingleCoord(cAddress), readSingleCoord(cAddress + SZ_DBL)];
}

/**
 * Read a GeoCoord from C and return a GeoJSON-style [lng, lat] pair.
 * @private
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Number[]}           [lng, lat] pair
 */
function readGeoCoordGeoJson(cAddress) {
    return [readSingleCoord(cAddress + SZ_DBL), readSingleCoord(cAddress)];
}

/**
 * Read the GeoBoundary structure into a list of geo coordinate pairs
 * @private
 * @param {Number}  geoBoundary     C pointer to GeoBoundary struct
 * @param {Boolean} geoJsonCoords   Whether to provide GeoJSON coordinate order: [lng, lat]
 * @param {Boolean} closedLoop      Whether to close the loop
 * @return {Array[]}                Array of geo coordinate pairs
 */
function readGeoBoundary(geoBoundary, geoJsonCoords, closedLoop) {
    var numVerts = C.getValue(geoBoundary, 'i32');
    // Note that though numVerts is an int, the coordinate doubles have to be
    // aligned to 8 bytes, hence the 8-byte offset here
    var vertsPos = geoBoundary + SZ_DBL;
    var out = [];
    // Support [lng, lat] pairs if GeoJSON is specified
    var readCoord = geoJsonCoords ? readGeoCoordGeoJson : readGeoCoord;
    for (var i = 0; i < numVerts * 2; i += 2) {
        out.push(readCoord(vertsPos + SZ_DBL * i));
    }
    if (closedLoop) {
        // Close loop if GeoJSON is specified
        out.push(out[0]);
    }
    return out;
}

/**
 * Read the LinkedGeoPolygon structure into a nested array of MultiPolygon coordinates
 * @private
 * @param {Number}  polygon         C pointer to LinkedGeoPolygon struct
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat], closed loops
 * @return {Array[]}                MultiPolygon-style output.
 */
function readMultiPolygon(polygon, formatAsGeoJson) {
    var output = [];
    var readCoord = formatAsGeoJson ? readGeoCoordGeoJson : readGeoCoord;
    var loops;
    var loop;
    var coords;
    var coord;
    // Loop through the linked structure, building the output
    while (polygon) {
        output.push((loops = []));
        // Follow ->first pointer
        loop = C.getValue(polygon, 'i8*');
        while (loop) {
            loops.push((coords = []));
            // Follow ->first pointer
            coord = C.getValue(loop, 'i8*');
            while (coord) {
                coords.push(readCoord(coord));
                // Follow ->next pointer
                coord = C.getValue(coord + SZ_DBL * 2, 'i8*');
            }
            if (formatAsGeoJson) {
                // Close loop if GeoJSON is requested
                coords.push(coords[0]);
            }
            // Follow ->next pointer
            loop = C.getValue(loop + SZ_PTR * 2, 'i8*');
        }
        // Follow ->next pointer
        polygon = C.getValue(polygon + SZ_PTR * 2, 'i8*');
    }
    return output;
}

/**
 * Read a CoordIJ from C and return an {i, j} pair.
 * @private
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Object}             {i, j} pair
 */
function readCoordIJ(cAddress) {
    return {
        i: C.getValue(cAddress, 'i32'),
        j: C.getValue(cAddress + SZ_INT, 'i32')
    };
}

/**
 * Store an {i, j} pair to a C CoordIJ struct.
 * @private
 * @param  {Number} cAddress    Pointer to C struct
 * @return {Object}             {i, j} pair
 */
function storeCoordIJ(cAddress, ref) {
    var i = ref.i;
    var j = ref.j;

    C.setValue(cAddress, i, 'i32');
    C.setValue(cAddress + SZ_INT, j, 'i32');
}

// ----------------------------------------------------------------------------
// Public API functions: Core

/**
 * Whether a given string represents a valid H3 index
 * @static
 * @param  {H3Index} h3Index  H3 index to check
 * @return {Boolean}          Whether the index is valid
 */
function h3IsValid(h3Index) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsValid(lower, upper));
}

/**
 * Whether the given H3 index is a pentagon
 * @static
 * @param  {H3Index} h3Index  H3 index to check
 * @return {Boolean}          isPentagon
 */
function h3IsPentagon(h3Index) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsPentagon(lower, upper));
}

/**
 * Whether the given H3 index is in a Class III resolution (rotated versus
 * the icosahedron and subject to shape distortion adding extra points on
 * icosahedron edges, making them not true hexagons).
 * @static
 * @param  {H3Index} h3Index  H3 index to check
 * @return {Boolean}          isResClassIII
 */
function h3IsResClassIII(h3Index) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3IsResClassIII(lower, upper));
}

/**
 * Get the number of the base cell for a given H3 index
 * @static
 * @param  {H3Index} h3Index  H3 index to get the base cell for
 * @return {Number}           Index of the base cell (0-121)
 */
function h3GetBaseCell(h3Index) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    return H3.h3GetBaseCell(lower, upper);
}

/**
 * Returns the resolution of an H3 index
 * @static
 * @param  {H3Index} h3Index H3 index to get resolution
 * @return {Number}          The number (0-15) resolution, or -1 if invalid
 */
function h3GetResolution(h3Index) {
    if (typeof h3Index !== 'string') {
        return -1;
    }
    return parseInt(h3Index.charAt(1), BASE_16);
}

/**
 * Get the hexagon containing a lat,lon point
 * @static
 * @param  {Number} lat Latitude of point
 * @param  {Number} lng Longtitude of point
 * @param  {Number} res Resolution of hexagons to return
 * @return {H3Index}    H3 index
 */
function geoToH3(lat, lng, res) {
    var latlng = C._malloc(SZ_GEOCOORD);
    // Slightly more efficient way to set the memory
    C.HEAPF64.set([lat, lng].map(degsToRads), latlng / SZ_DBL);
    // Read value as a split long
    var h3Index = readH3Index(H3.geoToH3(latlng, res));
    C._free(latlng);
    return h3Index;
}

/**
 * Get the lat,lon center of a given hexagon
 * @static
 * @param  {H3Index} h3Index  H3 index
 * @return {Number[]}         Point as a [lat, lng] pair
 */
function h3ToGeo(h3Index) {
    var latlng = C._malloc(SZ_GEOCOORD);
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    H3.h3ToGeo(lower, upper, latlng);
    var out = readGeoCoord(latlng);
    C._free(latlng);
    return out;
}

/**
 * Get the vertices of a given hexagon (or pentagon), as an array of [lat, lng]
 * points. For pentagons and hexagons on the edge of an icosahedron face, this
 * function may return up to 10 vertices.
 * @static
 * @param  {H3Index} h3Index        H3 index
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat], closed loops
 * @return {Array[]}                Array of [lat, lng] pairs
 */
function h3ToGeoBoundary(h3Index, formatAsGeoJson) {
    var geoBoundary = C._malloc(SZ_GEOBOUNDARY);
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    H3.h3ToGeoBoundary(lower, upper, geoBoundary);
    var out = readGeoBoundary(geoBoundary, formatAsGeoJson, formatAsGeoJson);
    C._free(geoBoundary);
    return out;
}

// ----------------------------------------------------------------------------
// Public API functions: Algorithms

/**
 * Get the parent of the given hexagon at a particular resolution
 * @static
 * @param  {H3Index} h3Index  H3 index to get parent for
 * @param  {Number} res       Resolution of hexagon to return
 * @return {H3Index}          H3 index of parent, or null for invalid input
 */
function h3ToParent(h3Index, res) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Index(H3.h3ToParent(lower, upper, res));
}

/**
 * Get the children/descendents of the given hexagon at a particular resolution
 * @static
 * @param  {H3Index} h3Index  H3 index to get children for
 * @param  {Number} res       Resolution of hexagons to return
 * @return {H3Index[]}        H3 indexes of children, or empty array for invalid input
 */
function h3ToChildren(h3Index, res) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxH3ToChildrenSize(lower, upper, res);
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    H3.h3ToChildren(lower, upper, res, hexagons);
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons in a k-ring around a given center. The order of the hexagons is undefined.
 * @static
 * @param  {H3Index} h3Index  H3 index of center hexagon
 * @param  {Number} ringSize  Radius of k-ring
 * @return {H3Index[]}        H3 indexes for all hexagons in ring
 */
function kRing(h3Index, ringSize) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxKringSize(ringSize);
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    H3.kRing(lower, upper, ringSize, hexagons);
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons in a k-ring around a given center, in an array of arrays
 * ordered by distance from the origin. The order of the hexagons within each ring is undefined.
 * @static
 * @param  {H3Index} h3Index  H3 index of center hexagon
 * @param  {Number} ringSize  Radius of k-ring
 * @return {H3Index[][]}      Array of arrays with H3 indexes for all hexagons each ring
 */
function kRingDistances(h3Index, ringSize) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    var maxCount = H3.maxKringSize(ringSize);
    var kRings = C._calloc(maxCount, SZ_H3INDEX);
    var distances = C._calloc(maxCount, SZ_INT);
    H3.kRingDistances(lower, upper, ringSize, kRings, distances);
    // Create an array of empty arrays to hold the output
    var out = [];
    for (var i = 0; i < ringSize + 1; i++) {
        out.push([]);
    }
    // Read the array of hexagons, putting them into the appropriate rings
    for (var i$1 = 0; i$1 < maxCount * 2; i$1 += 2) {
        var hexLower = C.getValue(kRings + SZ_INT * i$1, 'i32');
        var hexUpper = C.getValue(kRings + SZ_INT * (i$1 + 1), 'i32');
        var index = C.getValue(distances + SZ_INT * (i$1 / 2), 'i32');
        if (hexLower !== 0 || hexUpper !== 0) {
            out[index].push(splitLongToh3Index(hexLower, hexUpper));
        }
    }
    C._free(kRings);
    C._free(distances);
    return out;
}

/**
 * Get all hexagons in a hollow hexagonal ring centered at origin with sides of a given length.
 * Unlike kRing, this function will throw an error if there is a pentagon anywhere in the ring.
 * @static
 * @param  {H3Index} h3Index  H3 index of center hexagon
 * @param  {Number} ringSize  Radius of ring
 * @return {H3Index[]}        H3 indexes for all hexagons in ring
 * @throws {Error}            If the algorithm could not calculate the ring
 */
function hexRing(h3Index, ringSize) {
    var maxCount = ringSize === 0 ? 1 : 6 * ringSize;
    var hexagons = C._calloc(maxCount, SZ_H3INDEX);
    var retVal = H3.hexRing.apply(H3, h3IndexToSplitLong(h3Index).concat( [ringSize], [hexagons] ));
    if (retVal !== 0) {
        C._free(hexagons);
        throw new Error('Failed to get hexRing (encountered a pentagon?)');
    }
    var out = readArrayOfHexagons(hexagons, maxCount);
    C._free(hexagons);
    return out;
}

/**
 * Get all hexagons with centers contained in a given polygon. The polygon
 * is specified with GeoJson semantics as an array of loops. Each loop is
 * an array of [lat, lng] pairs (or [lng, lat] if isGeoJson is specified).
 * The first loop is the perimeter of the polygon, and subsequent loops are
 * expected to be holes.
 * @static
 * @param  {Array[]}  coordinates   Array of loops, or a single loop
 * @param  {Number} res             Resolution of hexagons to return
 * @param  {Boolean} isGeoJson      Whether to expect GeoJson-style [lng, lat]
 *                                  pairs instead of [lat, lng]
 * @return {H3Index[]}              H3 indexes for all hexagons in polygon
 */
function polyfill(coordinates, res, isGeoJson) {
    validateRes(res);
    isGeoJson = Boolean(isGeoJson);
    // Guard against empty input
    if (coordinates.length === 0 || coordinates[0].length === 0) {
        return [];
    }
    // Wrap to expected format if a single loop is provided
    if (typeof coordinates[0][0] === 'number') {
        coordinates = [coordinates];
    }
    var geoPolygon = coordinatesToGeoPolygon(coordinates, isGeoJson);
    var arrayLen = H3.maxPolyfillSize(geoPolygon, res);
    var hexagons = C._calloc(arrayLen, SZ_H3INDEX);
    H3.polyfill(geoPolygon, res, hexagons);
    var out = readArrayOfHexagons(hexagons, arrayLen);
    C._free(hexagons);
    destroyGeoPolygon(geoPolygon);
    return out;
}

/**
 * Get the outlines of a set of H3 hexagons, returned in GeoJSON MultiPolygon
 * format (an array of polygons, each with an array of loops, each an array of
 * coordinates). Coordinates are returned as [lat, lng] pairs unless GeoJSON
 * is requested.
 * @static
 * @param {H3Index[]} h3Indexes       H3 indexes to get outlines for
 * @param {Boolean}   formatAsGeoJson Whether to provide GeoJSON output:
 *                                    [lng, lat], closed loops
 * @return {Array[]}                  MultiPolygon-style output.
 */
function h3SetToMultiPolygon(h3Indexes, formatAsGeoJson) {
    // Early exit on empty input
    if (!h3Indexes || !h3Indexes.length) {
        return [];
    }
    // Set up input set
    var indexCount = h3Indexes.length;
    var set = C._calloc(indexCount, SZ_H3INDEX);
    storeArrayOfHexagons(set, h3Indexes);
    // Allocate memory for output linked polygon
    var polygon = C._calloc(SZ_LINKED_GEOPOLYGON);
    // Store a reference to the first polygon - that's the one we need for
    // memory deallocation
    var originalPolygon = polygon;
    H3.h3SetToLinkedGeo(set, indexCount, polygon);
    var multiPolygon = readMultiPolygon(polygon, formatAsGeoJson);
    // Clean up
    H3.destroyLinkedPolygon(originalPolygon);
    C._free(originalPolygon);
    C._free(set);
    return multiPolygon;
}

/**
 * Compact a set of hexagons of the same resolution into a set of hexagons across
 * multiple levels that represents the same area.
 * @static
 * @param  {H3Index[]} h3Set H3 indexes to compact
 * @return {H3Index[]}       Compacted H3 indexes
 * @throws {Error}           If the input is invalid (e.g. duplicate hexagons)
 */
function compact(h3Set) {
    if (!h3Set || !h3Set.length) {
        return [];
    }
    // Set up input set
    var count = h3Set.length;
    var set = C._calloc(count, SZ_H3INDEX);
    storeArrayOfHexagons(set, h3Set);
    // Allocate memory for compacted hexagons, worst-case is no compaction
    var compactedSet = C._calloc(count, SZ_H3INDEX);
    var retVal = H3.compact(set, compactedSet, count);
    if (retVal !== 0) {
        C._free(set);
        C._free(compactedSet);
        throw new Error('Failed to compact, malformed input data (duplicate hexagons?)');
    }
    var out = readArrayOfHexagons(compactedSet, count);
    C._free(set);
    C._free(compactedSet);
    return out;
}

/**
 * Uncompact a compacted set of hexagons to hexagons of the same resolution
 * @static
 * @param  {H3Index[]} compactedSet H3 indexes to uncompact
 * @param  {Number}    res          The resolution to uncompact to
 * @return {H3Index[]}              The uncompacted H3 indexes
 * @throws {Error}                  If the input is invalid (e.g. invalid resolution)
 */
function uncompact(compactedSet, res) {
    validateRes(res);
    if (!compactedSet || !compactedSet.length) {
        return [];
    }
    // Set up input set
    var count = compactedSet.length;
    var set = C._calloc(count, SZ_H3INDEX);
    storeArrayOfHexagons(set, compactedSet);
    // Estimate how many hexagons we need (always overestimates if in error)
    var maxUncompactedNum = H3.maxUncompactSize(set, count, res);
    // Allocate memory for uncompacted hexagons
    var uncompactedSet = C._calloc(maxUncompactedNum, SZ_H3INDEX);
    var retVal = H3.uncompact(set, count, uncompactedSet, maxUncompactedNum, res);
    if (retVal !== 0) {
        C._free(set);
        C._free(uncompactedSet);
        throw new Error('Failed to uncompact (bad resolution?)');
    }
    var out = readArrayOfHexagons(uncompactedSet, maxUncompactedNum);
    C._free(set);
    C._free(uncompactedSet);
    return out;
}

// ----------------------------------------------------------------------------
// Public API functions: Unidirectional edges

/**
 * Whether two H3 indexes are neighbors (share an edge)
 * @static
 * @param  {H3Index} origin      Origin hexagon index
 * @param  {H3Index} destination Destination hexagon index
 * @return {Boolean}             Whether the hexagons share an edge
 */
function h3IndexesAreNeighbors(origin, destination) {
    var ref = h3IndexToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3IndexToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    return Boolean(H3.h3IndexesAreNeighbors(oLower, oUpper, dLower, dUpper));
}

/**
 * Get an H3 index representing a unidirectional edge for a given origin and destination
 * @static
 * @param  {H3Index} origin      Origin hexagon index
 * @param  {H3Index} destination Destination hexagon index
 * @return {H3Index}             H3 index of the edge, or null if no edge is shared
 */
function getH3UnidirectionalEdge(origin, destination) {
    var ref = h3IndexToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3IndexToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    return readH3Index(H3.getH3UnidirectionalEdge(oLower, oUpper, dLower, dUpper));
}

/**
 * Get the origin hexagon from an H3 index representing a unidirectional edge
 * @static
 * @param  {H3Index} edgeIndex H3 index of the edge
 * @return {H3Index}           H3 index of the edge origin
 */
function getOriginH3IndexFromUnidirectionalEdge(edgeIndex) {
    var ref = h3IndexToSplitLong(edgeIndex);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Index(H3.getOriginH3IndexFromUnidirectionalEdge(lower, upper));
}

/**
 * Get the destination hexagon from an H3 index representing a unidirectional edge
 * @static
 * @param  {H3Index} edgeIndex H3 index of the edge
 * @return {H3Index}           H3 index of the edge destination
 */
function getDestinationH3IndexFromUnidirectionalEdge(edgeIndex) {
    var ref = h3IndexToSplitLong(edgeIndex);
    var lower = ref[0];
    var upper = ref[1];
    return readH3Index(H3.getDestinationH3IndexFromUnidirectionalEdge(lower, upper));
}

/**
 * Whether the input is a valid unidirectional edge
 * @static
 * @param  {H3Index} edgeIndex H3 index of the edge
 * @return {Boolean}           Whether the index is valid
 */
function h3UnidirectionalEdgeIsValid(edgeIndex) {
    var ref = h3IndexToSplitLong(edgeIndex);
    var lower = ref[0];
    var upper = ref[1];
    return Boolean(H3.h3UnidirectionalEdgeIsValid(lower, upper));
}

/**
 * Get the [origin, destination] pair represented by a unidirectional edge
 * @static
 * @param  {H3Index} edgeIndex H3 index of the edge
 * @return {H3Index[]}         [origin, destination] pair as H3 indexes
 */
function getH3IndexesFromUnidirectionalEdge(edgeIndex) {
    var ref = h3IndexToSplitLong(edgeIndex);
    var lower = ref[0];
    var upper = ref[1];
    var count = 2;
    var hexagons = C._calloc(count, SZ_H3INDEX);
    H3.getH3IndexesFromUnidirectionalEdge(lower, upper, hexagons);
    var out = readArrayOfHexagons(hexagons, count);
    C._free(hexagons);
    return out;
}

/**
 * Get all of the unidirectional edges with the given H3 index as the origin (i.e. an edge to
 * every neighbor)
 * @static
 * @param  {H3Index} h3Index   H3 index of the origin hexagon
 * @return {H3Index[]}         List of unidirectional edges
 */
function getH3UnidirectionalEdgesFromHexagon(h3Index) {
    var ref = h3IndexToSplitLong(h3Index);
    var lower = ref[0];
    var upper = ref[1];
    var count = 6;
    var edges = C._calloc(count, SZ_H3INDEX);
    H3.getH3UnidirectionalEdgesFromHexagon(lower, upper, edges);
    var out = readArrayOfHexagons(edges, count);
    C._free(edges);
    return out;
}

/**
 * Get the vertices of a given edge as an array of [lat, lng] points. Note that for edges that
 * cross the edge of an icosahedron face, this may return 3 coordinates.
 * @static
 * @param  {H3Index} edgeIndex      H3 index of the edge
 * @param {Boolean} formatAsGeoJson Whether to provide GeoJSON output: [lng, lat]
 * @return {Array[]}                Array of geo coordinate pairs
 */
function getH3UnidirectionalEdgeBoundary(edgeIndex, formatAsGeoJson) {
    var geoBoundary = C._malloc(SZ_GEOBOUNDARY);
    var ref = h3IndexToSplitLong(edgeIndex);
    var lower = ref[0];
    var upper = ref[1];
    H3.getH3UnidirectionalEdgeBoundary(lower, upper, geoBoundary);
    var out = readGeoBoundary(geoBoundary, formatAsGeoJson);
    C._free(geoBoundary);
    return out;
}

/**
 * Get the grid distance between two hex indexes. This function may fail
 * to find the distance between two indexes if they are very far apart or
 * on opposite sides of a pentagon.
 * @static
 * @param  {H3Index} origin      Origin hexagon index
 * @param  {H3Index} destination Destination hexagon index
 * @return {Number}              Distance between hexagons, or a negative
 *                               number if the distance could not be computed
 */
function h3Distance(origin, destination) {
    var ref = h3IndexToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3IndexToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    return H3.h3Distance(oLower, oUpper, dLower, dUpper);
}

/**
 * Given two H3 indexes, return the line of indexes between them (inclusive).
 *
 * This function may fail to find the line between two indexes, for
 * example if they are very far apart. It may also fail when finding
 * distances for indexes on opposite sides of a pentagon.
 *
 * Notes:
 *
 *  - The specific output of this function should not be considered stable
 *    across library versions. The only guarantees the library provides are
 *    that the line length will be `h3Distance(start, end) + 1` and that
 *    every index in the line will be a neighbor of the preceding index.
 *  - Lines are drawn in grid space, and may not correspond exactly to either
 *    Cartesian lines or great arcs.
 *
 * @static
 * @param  {H3Index} origin      Origin hexagon index
 * @param  {H3Index} destination Destination hexagon index
 * @return {H3Index[]}           H3 indexes connecting origin and destination
 * @throws {Error}               If the line cannot be calculated
 */
function h3Line(origin, destination) {
    var ref = h3IndexToSplitLong(origin);
    var oLower = ref[0];
    var oUpper = ref[1];
    var ref$1 = h3IndexToSplitLong(destination);
    var dLower = ref$1[0];
    var dUpper = ref$1[1];
    var count = H3.h3LineSize(oLower, oUpper, dLower, dUpper);
    if (count < 0) {
        // We can't get the specific error code here - may be any of
        // the errors possible in experimentalH3ToLocalIj
        throw new Error('Line cannot be calculated');
    }
    var hexagons = C._calloc(count, SZ_H3INDEX);
    H3.h3Line(oLower, oUpper, dLower, dUpper, hexagons);
    var out = readArrayOfHexagons(hexagons, count);
    C._free(hexagons);
    return out;
}

/**
 * Produces IJ coordinates for an H3 index anchored by an origin.
 *
 * - The coordinate space used by this function may have deleted
 * regions or warping due to pentagonal distortion.
 * - Coordinates are only comparable if they come from the same
 * origin index.
 * - Failure may occur if the index is too far away from the origin
 * or if the index is on the other side of a pentagon.
 * - This function is experimental, and its output is not guaranteed
 * to be compatible across different versions of H3.
 * @static
 * @param  {H3Index} origin      Origin H3 index
 * @param  {H3Index} destination H3 index for which to find relative coordinates
 * @return {Object}              Coordinates as an `{i, j}` pair
 * @throws {Error}               If the IJ coordinates cannot be calculated
 */
function experimentalH3ToLocalIj(origin, destination) {
    var ij = C._malloc(SZ_COORDIJ);
    var retVal = H3.experimentalH3ToLocalIj.apply(
        H3, h3IndexToSplitLong(origin).concat( h3IndexToSplitLong(destination),
        [ij] )
    );
    var coords = readCoordIJ(ij);
    C._free(ij);
    // Return the pair, or throw if an error code was returned.
    // Switch statement and error codes cribbed from h3-java's implementation.
    switch (retVal) {
        case 0:
            return coords;
        case 1:
            throw new Error('Incompatible origin and index.');
        case 2:
        default:
            throw new Error(
                'Local IJ coordinates undefined for this origin and index pair. ' +
                    'The index may be too far from the origin.'
            );
        case 3:
        case 4:
        case 5:
            throw new Error('Encountered possible pentagon distortion');
    }
}

/**
 * Produces an H3 index for IJ coordinates anchored by an origin.
 *
 * - The coordinate space used by this function may have deleted
 * regions or warping due to pentagonal distortion.
 * - Coordinates are only comparable if they come from the same
 * origin index.
 * - Failure may occur if the index is too far away from the origin
 * or if the index is on the other side of a pentagon.
 * - This function is experimental, and its output is not guaranteed
 * to be compatible across different versions of H3.
 * @static
 * @param  {H3Index} origin     Origin H3 index
 * @param  {Object} coords      Coordinates as an `{i, j}` pair
 * @return {H3Index}            H3 index at the relative coordinates
 * @throws {Error}              If the H3 index cannot be calculated
 */
function experimentalLocalIjToH3(origin, coords) {
    // Validate input coords
    if (!coords || typeof coords.i !== 'number' || typeof coords.j !== 'number') {
        throw new Error('Coordinates must be provided as an {i, j} object');
    }
    // Allocate memory for the CoordIJ struct and an H3 index to hold the return value
    var ij = C._malloc(SZ_COORDIJ);
    var out = C._malloc(SZ_H3INDEX);
    storeCoordIJ(ij, coords);
    var retVal = H3.experimentalLocalIjToH3.apply(H3, h3IndexToSplitLong(origin).concat( [ij], [out] ));
    var h3Index = readH3IndexFromPointer(out);
    C._free(ij);
    C._free(out);
    if (retVal !== 0) {
        throw new Error(
            'Index not defined for this origin and IJ coordinates pair. ' +
                'IJ coordinates may be too far from origin, or ' +
                'a pentagon distortion was encountered.'
        );
    }
    return h3Index;
}

// ----------------------------------------------------------------------------
// Public informational utilities

/**
 * Average hexagon area at a given resolution
 * @static
 * @param  {Number} res  Hexagon resolution
 * @param  {String} unit Area unit (either UNITS.m2 or UNITS.km2)
 * @return {Number}      Average area
 * @throws {Error}       If the unit is invalid
 */
function hexArea(res, unit) {
    validateRes(res);
    switch (unit) {
        case UNITS.m2:
            return H3.hexAreaM2(res);
        case UNITS.km2:
            return H3.hexAreaKm2(res);
        default:
            throw new Error(("Unknown unit: " + unit));
    }
}

/**
 * Average hexagon edge length at a given resolution
 * @static
 * @param  {Number} res  Hexagon resolution
 * @param  {String} unit Area unit (either UNITS.m or UNITS.km)
 * @return {Number}      Average edge length
 * @throws {Error}       If the unit is invalid
 */
function edgeLength(res, unit) {
    validateRes(res);
    switch (unit) {
        case UNITS.m:
            return H3.edgeLengthM(res);
        case UNITS.km:
            return H3.edgeLengthKm(res);
        default:
            throw new Error(("Unknown unit: " + unit));
    }
}

/**
 * The total count of hexagons in the world at a given resolution. Note that above
 * resolution 8 the exact count cannot be represented in a JavaScript 32-bit number,
 * so consumers should use caution when applying further operations to the output.
 * @static
 * @param  {Number} res  Hexagon resolution
 * @return {Number}      Count
 */
function numHexagons(res) {
    validateRes(res);
    // Get number as a long value
    var ref = readLong(H3.numHexagons(res));
    var lower = ref[0];
    var upper = ref[1];
    // If we're using <= 32 bits we can use normal JS numbers
    if (!upper) {
        return lower;
    }
    // Above 32 bit, make a JS number that's correct in order of magnitude
    return upper * Math.pow(2, 32) + lower;
}

/**
 * Get all H3 indexes at resolution 0. As every index at every resolution > 0 is
 * the descendant of a res 0 index, this can be used with h3ToChildren to iterate
 * over H3 indexes at any resolution.
 * @static
 * @return {H3Index[]}  All H3 indexes at res 0
 */
function getRes0Indexes() {
    var count = H3.res0IndexCount();
    var hexagons = C._malloc(SZ_H3INDEX * count);
    H3.getRes0Indexes(hexagons);
    var out = readArrayOfHexagons(hexagons, count);
    C._free(hexagons);
    return out;
}

/**
 * Convert degrees to radians
 * @static
 * @param  {Number} deg Value in degrees
 * @return {Number}     Value in radians
 */
function degsToRads(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @static
 * @param  {Number} rad Value in radians
 * @return {Number}     Value in degrees
 */
function radsToDegs(rad) {
    return (rad * 180) / Math.PI;
}

// ----------------------------------------------------------------------------
// Export

module.exports = {
    h3IsValid: h3IsValid,
    h3IsPentagon: h3IsPentagon,
    h3IsResClassIII: h3IsResClassIII,
    h3GetBaseCell: h3GetBaseCell,
    h3GetResolution: h3GetResolution,
    geoToH3: geoToH3,
    h3ToGeo: h3ToGeo,
    h3ToGeoBoundary: h3ToGeoBoundary,
    h3ToParent: h3ToParent,
    h3ToChildren: h3ToChildren,
    kRing: kRing,
    kRingDistances: kRingDistances,
    hexRing: hexRing,
    polyfill: polyfill,
    h3SetToMultiPolygon: h3SetToMultiPolygon,
    compact: compact,
    uncompact: uncompact,
    h3IndexesAreNeighbors: h3IndexesAreNeighbors,
    getH3UnidirectionalEdge: getH3UnidirectionalEdge,
    getOriginH3IndexFromUnidirectionalEdge: getOriginH3IndexFromUnidirectionalEdge,
    getDestinationH3IndexFromUnidirectionalEdge: getDestinationH3IndexFromUnidirectionalEdge,
    h3UnidirectionalEdgeIsValid: h3UnidirectionalEdgeIsValid,
    getH3IndexesFromUnidirectionalEdge: getH3IndexesFromUnidirectionalEdge,
    getH3UnidirectionalEdgesFromHexagon: getH3UnidirectionalEdgesFromHexagon,
    getH3UnidirectionalEdgeBoundary: getH3UnidirectionalEdgeBoundary,
    h3Distance: h3Distance,
    h3Line: h3Line,
    experimentalH3ToLocalIj: experimentalH3ToLocalIj,
    experimentalLocalIjToH3: experimentalLocalIjToH3,
    hexArea: hexArea,
    edgeLength: edgeLength,
    numHexagons: numHexagons,
    getRes0Indexes: getRes0Indexes,
    degsToRads: degsToRads,
    radsToDegs: radsToDegs,
    UNITS: UNITS
};

},{"../out/libh3":335,"./bindings":333}],335:[function(require,module,exports){
(function (process,Buffer,__dirname){

var libh3 = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(libh3) {
  libh3 = libh3 || {};

var Module=typeof libh3!=="undefined"?libh3:{};var moduleOverrides={};var key;for(key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}Module["arguments"]=[];Module["thisProgram"]="./this.program";Module["quit"]=(function(status,toThrow){throw toThrow});Module["preRun"]=[];Module["postRun"]=[];var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=false;ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_IS_NODE=typeof process==="object"&&typeof require==="function"&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER;var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}else{return scriptDirectory+path}}if(ENVIRONMENT_IS_NODE){scriptDirectory=__dirname+"/";var nodeFS;var nodePath;Module["read"]=function shell_read(filename,binary){var ret;ret=tryParseAsDataURI(filename);if(!ret){if(!nodeFS)nodeFS=require("fs");if(!nodePath)nodePath=require("path");filename=nodePath["normalize"](filename);ret=nodeFS["readFileSync"](filename)}return binary?ret:ret.toString()};Module["readBinary"]=function readBinary(filename){var ret=Module["read"](filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};if(process["argv"].length>1){Module["thisProgram"]=process["argv"][1].replace(/\\/g,"/")}Module["arguments"]=process["argv"].slice(2);process["on"]("unhandledRejection",abort);Module["quit"]=(function(status){process["exit"](status)});Module["inspect"]=(function(){return"[Emscripten Module object]"})}else if(ENVIRONMENT_IS_SHELL){if(typeof read!="undefined"){Module["read"]=function shell_read(f){var data=tryParseAsDataURI(f);if(data){return intArrayToString(data)}return read(f)}}Module["readBinary"]=function readBinary(f){var data;data=tryParseAsDataURI(f);if(data){return data}if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){Module["arguments"]=scriptArgs}else if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof quit==="function"){Module["quit"]=(function(status){quit(status)})}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(document.currentScript){scriptDirectory=document.currentScript.src}if(_scriptDir){scriptDirectory=_scriptDir}if(scriptDirectory.indexOf("blob:")!==0){scriptDirectory=scriptDirectory.substr(0,scriptDirectory.lastIndexOf("/")+1)}else{scriptDirectory=""}Module["read"]=function shell_read(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText}catch(err){var data=tryParseAsDataURI(url);if(data){return intArrayToString(data)}throw err}};if(ENVIRONMENT_IS_WORKER){Module["readBinary"]=function readBinary(url){try{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}catch(err){var data=tryParseAsDataURI(url);if(data){return data}throw err}}}Module["readAsync"]=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response);return}var data=tryParseAsDataURI(url);if(data){onload(data.buffer);return}onerror()};xhr.onerror=onerror;xhr.send(null)};Module["setWindowTitle"]=(function(title){document.title=title})}else{}var out=Module["print"]||(typeof console!=="undefined"?console.log.bind(console):typeof print!=="undefined"?print:null);var err=Module["printErr"]||(typeof printErr!=="undefined"?printErr:typeof console!=="undefined"&&console.warn.bind(console)||out);for(key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=undefined;var STACK_ALIGN=16;function dynamicAlloc(size){var ret=HEAP32[DYNAMICTOP_PTR>>2];var end=ret+size+15&-16;if(end<=_emscripten_get_heap_size()){HEAP32[DYNAMICTOP_PTR>>2]=end}else{var success=_emscripten_resize_heap(end);if(!success)return 0}return ret}function getNativeTypeSize(type){switch(type){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:{if(type[type.length-1]==="*"){return 4}else if(type[0]==="i"){var bits=parseInt(type.substr(1));assert(bits%8===0,"getNativeTypeSize invalid bits "+bits+", type "+type);return bits/8}else{return 0}}}}function warnOnce(text){if(!warnOnce.shown)warnOnce.shown={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;err(text)}}var jsCallStartIndex=1;var functionPointers=new Array(0);var funcWrappers={};function dynCall(sig,ptr,args){if(args&&args.length){return Module["dynCall_"+sig].apply(null,[ptr].concat(args))}else{return Module["dynCall_"+sig].call(null,ptr)}}var tempRet0=0;var setTempRet0=(function(value){tempRet0=value});var getTempRet0=(function(){return tempRet0});var GLOBAL_BASE=8;var ABORT=false;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}function getCFunc(ident){var func=Module["_"+ident];assert(func,"Cannot call unknown function "+ident+", make sure it is exported");return func}var JSfuncs={"stackSave":(function(){stackSave()}),"stackRestore":(function(){stackRestore()}),"arrayToC":(function(arr){var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}),"stringToC":(function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=stackAlloc(len);stringToUTF8(str,ret,len)}return ret})};var toC={"string":JSfuncs["stringToC"],"array":JSfuncs["arrayToC"]};function ccall(ident,returnType,argTypes,args,opts){function convertReturnValue(ret){if(returnType==="string")return Pointer_stringify(ret);if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);ret=convertReturnValue(ret);if(stack!==0)stackRestore(stack);return ret}function cwrap(ident,returnType,argTypes,opts){argTypes=argTypes||[];var numericArgs=argTypes.every((function(type){return type==="number"}));var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(function(){return ccall(ident,returnType,argTypes,arguments,opts)})}function setValue(ptr,value,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":HEAP8[ptr>>0]=value;break;case"i8":HEAP8[ptr>>0]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":tempI64=[value>>>0,(tempDouble=value,+Math_abs(tempDouble)>=+1?tempDouble>+0?(Math_min(+Math_floor(tempDouble/+4294967296),+4294967295)|0)>>>0:~~+Math_ceil((tempDouble- +(~~tempDouble>>>0))/+4294967296)>>>0:0)],HEAP32[ptr>>2]=tempI64[0],HEAP32[ptr+4>>2]=tempI64[1];break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;default:abort("invalid type for setValue: "+type)}}function getValue(ptr,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":return HEAP8[ptr>>0];case"i8":return HEAP8[ptr>>0];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP32[ptr>>2];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];default:abort("invalid type for getValue: "+type)}return null}var ALLOC_NONE=3;function Pointer_stringify(ptr,length){if(length===0||!ptr)return"";var hasUtf=0;var t;var i=0;while(1){t=HEAPU8[ptr+i>>0];hasUtf|=t;if(t==0&&!length)break;i++;if(length&&i==length)break}if(!length)length=i;var ret="";if(hasUtf<128){var MAX_CHUNK=1024;var curr;while(length>0){curr=String.fromCharCode.apply(String,HEAPU8.subarray(ptr,ptr+Math.min(length,MAX_CHUNK)));ret=ret?ret+curr:curr;ptr+=MAX_CHUNK;length-=MAX_CHUNK}return ret}return UTF8ToString(ptr)}var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx){var endPtr=idx;while(u8Array[endPtr])++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else{var str="";while(1){var u0=u8Array[idx++];if(!u0)return str;if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|u8Array[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}}function UTF8ToString(ptr){return UTF8ArrayToString(HEAPU8,ptr)}function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023}if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){++len}else if(u<=2047){len+=2}else if(u<=65535){len+=3}else if(u<=2097151){len+=4}else if(u<=67108863){len+=5}else{len+=6}}return len}var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function demangle(func){return func}function demangleAll(text){var regex=/__Z[\w\d_]+/g;return text.replace(regex,(function(x){var y=demangle(x);return x===y?x:y+" ["+x+"]"}))}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}function alignUp(x,multiple){if(x%multiple>0){x+=multiple-x%multiple}return x}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBuffer(buf){Module["buffer"]=buffer=buf}function updateGlobalBufferViews(){Module["HEAP8"]=HEAP8=new Int8Array(buffer);Module["HEAP16"]=HEAP16=new Int16Array(buffer);Module["HEAP32"]=HEAP32=new Int32Array(buffer);Module["HEAPU8"]=HEAPU8=new Uint8Array(buffer);Module["HEAPU16"]=HEAPU16=new Uint16Array(buffer);Module["HEAPU32"]=HEAPU32=new Uint32Array(buffer);Module["HEAPF32"]=HEAPF32=new Float32Array(buffer);Module["HEAPF64"]=HEAPF64=new Float64Array(buffer)}var STATIC_BASE=8,STACK_BASE=23808,DYNAMIC_BASE=5266688,DYNAMICTOP_PTR=23552;function abortOnCannotGrowMemory(){abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value "+TOTAL_MEMORY+", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")}if(!Module["reallocBuffer"])Module["reallocBuffer"]=(function(size){var ret;try{var oldHEAP8=HEAP8;ret=new ArrayBuffer(size);var temp=new Int8Array(ret);temp.set(oldHEAP8)}catch(e){return false}var success=_emscripten_replace_memory(ret);if(!success)return false;return ret});var byteLength;try{byteLength=Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,"byteLength").get);byteLength(new ArrayBuffer(4))}catch(e){byteLength=(function(buffer){return buffer.byteLength})}var TOTAL_STACK=5242880;var TOTAL_MEMORY=Module["TOTAL_MEMORY"]||33554432;if(TOTAL_MEMORY<TOTAL_STACK)err("TOTAL_MEMORY should be larger than TOTAL_STACK, was "+TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");if(Module["buffer"]){buffer=Module["buffer"]}else{{buffer=new ArrayBuffer(TOTAL_MEMORY)}Module["buffer"]=buffer}updateGlobalBufferViews();HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func)}else{Module["dynCall_vi"](func,callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATEXIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function ensureInitRuntime(){if(runtimeInitialized)return;runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){callRuntimeCallbacks(__ATEXIT__);runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer)}function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}if(!dontAddNull)HEAP8[buffer>>0]=0}var Math_abs=Math.abs;var Math_ceil=Math.ceil;var Math_floor=Math.floor;var Math_min=Math.min;var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["preloadedImages"]={};Module["preloadedAudios"]={};var memoryInitializer=null;var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(filename){return String.prototype.startsWith?filename.startsWith(dataURIPrefix):filename.indexOf(dataURIPrefix)===0}STATIC_BASE=GLOBAL_BASE;memoryInitializer="data:application/octet-stream;base64,AAAAAAAAAAACAAAAAwAAAAEAAAAFAAAABAAAAAYAAAAAAAAAAAAAAAAAAAABAAAAAgAAAAMAAAAEAAAABQAAAAYAAAABAAAABAAAAAMAAAAGAAAABQAAAAIAAAAAAAAAAgAAAAMAAAABAAAABAAAAAYAAAAAAAAABQAAAAMAAAAGAAAABAAAAAUAAAAAAAAAAQAAAAIAAAAEAAAABQAAAAYAAAAAAAAAAgAAAAMAAAABAAAABQAAAAIAAAAAAAAAAQAAAAMAAAAGAAAABAAAAAYAAAAAAAAABQAAAAIAAAABAAAABAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAgAAAAMAAAAAAAAAAAAAAAIAAAAAAAAAAQAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABgAAAAAAAAAFAAAAAAAAAAAAAAAEAAAABQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAABgAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAAAAAACAAAAAwAAAAQAAAAFAAAABgAAAAAAAAABAAAAAwAAAAQAAAAFAAAABgAAAAAAAAABAAAAAgAAAAQAAAAFAAAABgAAAAAAAAABAAAAAgAAAAMAAAAFAAAABgAAAAAAAAABAAAAAgAAAAMAAAAEAAAABgAAAAAAAAABAAAAAgAAAAMAAAAEAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAAAAAAAAAAABgAAAAAAAAADAAAAAgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAUAAAAEAAAAAAAAAAEAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAEAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAUAAAACAAAABAAAAAMAAAAIAAAAAQAAAAcAAAAGAAAACQAAAAAAAAADAAAAAgAAAAIAAAAGAAAACgAAAAsAAAAAAAAAAQAAAAUAAAADAAAADQAAAAEAAAAHAAAABAAAAAwAAAAAAAAABAAAAH8AAAAPAAAACAAAAAMAAAAAAAAADAAAAAUAAAACAAAAEgAAAAoAAAAIAAAAAAAAABAAAAAGAAAADgAAAAsAAAARAAAAAQAAAAkAAAACAAAABwAAABUAAAAJAAAAEwAAAAMAAAANAAAAAQAAAAgAAAAFAAAAFgAAABAAAAAEAAAAAAAAAA8AAAAJAAAAEwAAAA4AAAAUAAAAAQAAAAcAAAAGAAAACgAAAAsAAAAYAAAAFwAAAAUAAAACAAAAEgAAAAsAAAARAAAAFwAAABkAAAACAAAABgAAAAoAAAAMAAAAHAAAAA0AAAAaAAAABAAAAA8AAAADAAAADQAAABoAAAAVAAAAHQAAAAMAAAAMAAAABwAAAA4AAAB/AAAAEQAAABsAAAAJAAAAFAAAAAYAAAAPAAAAFgAAABwAAAAfAAAABAAAAAgAAAAMAAAAEAAAABIAAAAhAAAAHgAAAAgAAAAFAAAAFgAAABEAAAALAAAADgAAAAYAAAAjAAAAGQAAABsAAAASAAAAGAAAAB4AAAAgAAAABQAAAAoAAAAQAAAAEwAAACIAAAAUAAAAJAAAAAcAAAAVAAAACQAAABQAAAAOAAAAEwAAAAkAAAAoAAAAGwAAACQAAAAVAAAAJgAAABMAAAAiAAAADQAAAB0AAAAHAAAAFgAAABAAAAApAAAAIQAAAA8AAAAIAAAAHwAAABcAAAAYAAAACwAAAAoAAAAnAAAAJQAAABkAAAAYAAAAfwAAACAAAAAlAAAACgAAABcAAAASAAAAGQAAABcAAAARAAAACwAAAC0AAAAnAAAAIwAAABoAAAAqAAAAHQAAACsAAAAMAAAAHAAAAA0AAAAbAAAAKAAAACMAAAAuAAAADgAAABQAAAARAAAAHAAAAB8AAAAqAAAALAAAAAwAAAAPAAAAGgAAAB0AAAArAAAAJgAAAC8AAAANAAAAGgAAABUAAAAeAAAAIAAAADAAAAAyAAAAEAAAABIAAAAhAAAAHwAAACkAAAAsAAAANQAAAA8AAAAWAAAAHAAAACAAAAAeAAAAGAAAABIAAAA0AAAAMgAAACUAAAAhAAAAHgAAADEAAAAwAAAAFgAAABAAAAApAAAAIgAAABMAAAAmAAAAFQAAADYAAAAkAAAAMwAAACMAAAAuAAAALQAAADgAAAARAAAAGwAAABkAAAAkAAAAFAAAACIAAAATAAAANwAAACgAAAA2AAAAJQAAACcAAAA0AAAAOQAAABgAAAAXAAAAIAAAACYAAAB/AAAAIgAAADMAAAAdAAAALwAAABUAAAAnAAAAJQAAABkAAAAXAAAAOwAAADkAAAAtAAAAKAAAABsAAAAkAAAAFAAAADwAAAAuAAAANwAAACkAAAAxAAAANQAAAD0AAAAWAAAAIQAAAB8AAAAqAAAAOgAAACsAAAA+AAAAHAAAACwAAAAaAAAAKwAAAD4AAAAvAAAAQAAAABoAAAAqAAAAHQAAACwAAAA1AAAAOgAAAEEAAAAcAAAAHwAAACoAAAAtAAAAJwAAACMAAAAZAAAAPwAAADsAAAA4AAAALgAAADwAAAA4AAAARAAAABsAAAAoAAAAIwAAAC8AAAAmAAAAKwAAAB0AAABFAAAAMwAAAEAAAAAwAAAAMQAAAB4AAAAhAAAAQwAAAEIAAAAyAAAAMQAAAH8AAAA9AAAAQgAAACEAAAAwAAAAKQAAADIAAAAwAAAAIAAAAB4AAABGAAAAQwAAADQAAAAzAAAARQAAADYAAABHAAAAJgAAAC8AAAAiAAAANAAAADkAAABGAAAASgAAACAAAAAlAAAAMgAAADUAAAA9AAAAQQAAAEsAAAAfAAAAKQAAACwAAAA2AAAARwAAADcAAABJAAAAIgAAADMAAAAkAAAANwAAACgAAAA2AAAAJAAAAEgAAAA8AAAASQAAADgAAABEAAAAPwAAAE0AAAAjAAAALgAAAC0AAAA5AAAAOwAAAEoAAABOAAAAJQAAACcAAAA0AAAAOgAAAH8AAAA+AAAATAAAACwAAABBAAAAKgAAADsAAAA/AAAATgAAAE8AAAAnAAAALQAAADkAAAA8AAAASAAAAEQAAABQAAAAKAAAADcAAAAuAAAAPQAAADUAAAAxAAAAKQAAAFEAAABLAAAAQgAAAD4AAAArAAAAOgAAACoAAABSAAAAQAAAAEwAAAA/AAAAfwAAADgAAAAtAAAATwAAADsAAABNAAAAQAAAAC8AAAA+AAAAKwAAAFQAAABFAAAAUgAAAEEAAAA6AAAANQAAACwAAABWAAAATAAAAEsAAABCAAAAQwAAAFEAAABVAAAAMQAAADAAAAA9AAAAQwAAAEIAAAAyAAAAMAAAAFcAAABVAAAARgAAAEQAAAA4AAAAPAAAAC4AAABaAAAATQAAAFAAAABFAAAAMwAAAEAAAAAvAAAAWQAAAEcAAABUAAAARgAAAEMAAAA0AAAAMgAAAFMAAABXAAAASgAAAEcAAABZAAAASQAAAFsAAAAzAAAARQAAADYAAABIAAAAfwAAAEkAAAA3AAAAUAAAADwAAABYAAAASQAAAFsAAABIAAAAWAAAADYAAABHAAAANwAAAEoAAABOAAAAUwAAAFwAAAA0AAAAOQAAAEYAAABLAAAAQQAAAD0AAAA1AAAAXgAAAFYAAABRAAAATAAAAFYAAABSAAAAYAAAADoAAABBAAAAPgAAAE0AAAA/AAAARAAAADgAAABdAAAATwAAAFoAAABOAAAASgAAADsAAAA5AAAAXwAAAFwAAABPAAAATwAAAE4AAAA/AAAAOwAAAF0AAABfAAAATQAAAFAAAABEAAAASAAAADwAAABjAAAAWgAAAFgAAABRAAAAVQAAAF4AAABlAAAAPQAAAEIAAABLAAAAUgAAAGAAAABUAAAAYgAAAD4AAABMAAAAQAAAAFMAAAB/AAAASgAAAEYAAABkAAAAVwAAAFwAAABUAAAARQAAAFIAAABAAAAAYQAAAFkAAABiAAAAVQAAAFcAAABlAAAAZgAAAEIAAABDAAAAUQAAAFYAAABMAAAASwAAAEEAAABoAAAAYAAAAF4AAABXAAAAUwAAAGYAAABkAAAAQwAAAEYAAABVAAAAWAAAAEgAAABbAAAASQAAAGMAAABQAAAAaQAAAFkAAABhAAAAWwAAAGcAAABFAAAAVAAAAEcAAABaAAAATQAAAFAAAABEAAAAagAAAF0AAABjAAAAWwAAAEkAAABZAAAARwAAAGkAAABYAAAAZwAAAFwAAABTAAAATgAAAEoAAABsAAAAZAAAAF8AAABdAAAATwAAAFoAAABNAAAAbQAAAF8AAABqAAAAXgAAAFYAAABRAAAASwAAAGsAAABoAAAAZQAAAF8AAABcAAAATwAAAE4AAABtAAAAbAAAAF0AAABgAAAAaAAAAGIAAABuAAAATAAAAFYAAABSAAAAYQAAAH8AAABiAAAAVAAAAGcAAABZAAAAbwAAAGIAAABuAAAAYQAAAG8AAABSAAAAYAAAAFQAAABjAAAAUAAAAGkAAABYAAAAagAAAFoAAABxAAAAZAAAAGYAAABTAAAAVwAAAGwAAAByAAAAXAAAAGUAAABmAAAAawAAAHAAAABRAAAAVQAAAF4AAABmAAAAZQAAAFcAAABVAAAAcgAAAHAAAABkAAAAZwAAAFsAAABhAAAAWQAAAHQAAABpAAAAbwAAAGgAAABrAAAAbgAAAHMAAABWAAAAXgAAAGAAAABpAAAAWAAAAGcAAABbAAAAcQAAAGMAAAB0AAAAagAAAF0AAABjAAAAWgAAAHUAAABtAAAAcQAAAGsAAAB/AAAAZQAAAF4AAABzAAAAaAAAAHAAAABsAAAAZAAAAF8AAABcAAAAdgAAAHIAAABtAAAAbQAAAGwAAABdAAAAXwAAAHUAAAB2AAAAagAAAG4AAABiAAAAaAAAAGAAAAB3AAAAbwAAAHMAAABvAAAAYQAAAG4AAABiAAAAdAAAAGcAAAB3AAAAcAAAAGsAAABmAAAAZQAAAHgAAABzAAAAcgAAAHEAAABjAAAAdAAAAGkAAAB1AAAAagAAAHkAAAByAAAAcAAAAGQAAABmAAAAdgAAAHgAAABsAAAAcwAAAG4AAABrAAAAaAAAAHgAAAB3AAAAcAAAAHQAAABnAAAAdwAAAG8AAABxAAAAaQAAAHkAAAB1AAAAfwAAAG0AAAB2AAAAcQAAAHkAAABqAAAAdgAAAHgAAABsAAAAcgAAAHUAAAB5AAAAbQAAAHcAAABvAAAAcwAAAG4AAAB5AAAAdAAAAHgAAAB4AAAAcwAAAHIAAABwAAAAeQAAAHcAAAB2AAAAeQAAAHQAAAB4AAAAdwAAAHUAAABxAAAAdgAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAEAAAAFAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAIAAAAFAAAAAQAAAAAAAAD/////AQAAAAAAAAADAAAABAAAAAIAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAUAAAABAAAAAAAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAAFAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAQAAAAFAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAADAAAAAAAAAAAAAAABAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAABAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAADAAAABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAADAAAAAAAAAAAAAAABAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAAAAAADAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAAAAAP////8DAAAAAAAAAAUAAAACAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAADAAAAAQAAAAAAAAABAAAAAAAAAAAAAAADAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAMAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAABQAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAADAAAAAAAAAAAAAAD/////AwAAAAAAAAAFAAAAAgAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAADAAAABQAAAAEAAAAAAAAA/////wMAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAEAAAABQAAAAEAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAgAAAAUAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAMAAAABAAAAAAAAAAEAAAAAAAAABQAAAAAAAAAAAAAABQAAAAUAAAAAAAAAAAAAAP////8BAAAAAAAAAAMAAAAEAAAAAgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAABQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAUAAAAAAAAAAAAAAAUAAAAFAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAABQAAAAEAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAQAAAP//////////AQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAMAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAIAAAAAAAAAAAAAAAEAAAACAAAABgAAAAQAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAoAAAACAAAAAAAAAAAAAAABAAAAAQAAAAUAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAIAAAAAAAAAAAAAAAEAAAADAAAABwAAAAYAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAHAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAABAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAOAAAAAgAAAAAAAAAAAAAAAQAAAAAAAAAJAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAwAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAgAAAAAAAAAAAAAAAQAAAAQAAAAIAAAACgAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAJAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAACAAAAAAAAAAAAAAABAAAACwAAAA8AAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAA4AAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAgAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAACAAAAAAAAAAAAAAABAAAADAAAABAAAAAMAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAIAAAAAAAAAAAAAAAEAAAAKAAAAEwAAAAgAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAJAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAgAAAAAAAAAAAAAAAQAAAA0AAAARAAAADQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABEAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAATAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAARAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAADQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAIAAAAAAAAAAAAAAAEAAAAOAAAAEgAAAA8AAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAPAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAATAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAEQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAABMAAAACAAAAAAAAAAAAAAABAAAA//////////8TAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAASAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABIAAAAAAAAAGAAAAAAAAAAhAAAAAAAAAB4AAAAAAAAAIAAAAAMAAAAxAAAAAQAAADAAAAADAAAAMgAAAAMAAAAIAAAAAAAAAAUAAAAFAAAACgAAAAUAAAAWAAAAAAAAABAAAAAAAAAAEgAAAAAAAAApAAAAAQAAACEAAAAAAAAAHgAAAAAAAAAEAAAAAAAAAAAAAAAFAAAAAgAAAAUAAAAPAAAAAQAAAAgAAAAAAAAABQAAAAUAAAAfAAAAAQAAABYAAAAAAAAAEAAAAAAAAAACAAAAAAAAAAYAAAAAAAAADgAAAAAAAAAKAAAAAAAAAAsAAAAAAAAAEQAAAAMAAAAYAAAAAQAAABcAAAADAAAAGQAAAAMAAAAAAAAAAAAAAAEAAAAFAAAACQAAAAUAAAAFAAAAAAAAAAIAAAAAAAAABgAAAAAAAAASAAAAAQAAAAoAAAAAAAAACwAAAAAAAAAEAAAAAQAAAAMAAAAFAAAABwAAAAUAAAAIAAAAAQAAAAAAAAAAAAAAAQAAAAUAAAAQAAAAAQAAAAUAAAAAAAAAAgAAAAAAAAAHAAAAAAAAABUAAAAAAAAAJgAAAAAAAAAJAAAAAAAAABMAAAAAAAAAIgAAAAMAAAAOAAAAAQAAABQAAAADAAAAJAAAAAMAAAADAAAAAAAAAA0AAAAFAAAAHQAAAAUAAAABAAAAAAAAAAcAAAAAAAAAFQAAAAAAAAAGAAAAAQAAAAkAAAAAAAAAEwAAAAAAAAAEAAAAAgAAAAwAAAAFAAAAGgAAAAUAAAAAAAAAAQAAAAMAAAAAAAAADQAAAAUAAAACAAAAAQAAAAEAAAAAAAAABwAAAAAAAAAaAAAAAAAAACoAAAAAAAAAOgAAAAAAAAAdAAAAAAAAACsAAAAAAAAAPgAAAAMAAAAmAAAAAQAAAC8AAAADAAAAQAAAAAMAAAAMAAAAAAAAABwAAAAFAAAALAAAAAUAAAANAAAAAAAAABoAAAAAAAAAKgAAAAAAAAAVAAAAAQAAAB0AAAAAAAAAKwAAAAAAAAAEAAAAAwAAAA8AAAAFAAAAHwAAAAUAAAADAAAAAQAAAAwAAAAAAAAAHAAAAAUAAAAHAAAAAQAAAA0AAAAAAAAAGgAAAAAAAAAfAAAAAAAAACkAAAAAAAAAMQAAAAAAAAAsAAAAAAAAADUAAAAAAAAAPQAAAAMAAAA6AAAAAQAAAEEAAAADAAAASwAAAAMAAAAPAAAAAAAAABYAAAAFAAAAIQAAAAUAAAAcAAAAAAAAAB8AAAAAAAAAKQAAAAAAAAAqAAAAAQAAACwAAAAAAAAANQAAAAAAAAAEAAAABAAAAAgAAAAFAAAAEAAAAAUAAAAMAAAAAQAAAA8AAAAAAAAAFgAAAAUAAAAaAAAAAQAAABwAAAAAAAAAHwAAAAAAAAAyAAAAAAAAADAAAAAAAAAAMQAAAAMAAAAgAAAAAAAAAB4AAAADAAAAIQAAAAMAAAAYAAAAAwAAABIAAAADAAAAEAAAAAMAAABGAAAAAAAAAEMAAAAAAAAAQgAAAAMAAAA0AAAAAwAAADIAAAAAAAAAMAAAAAAAAAAlAAAAAwAAACAAAAAAAAAAHgAAAAMAAABTAAAAAAAAAFcAAAADAAAAVQAAAAMAAABKAAAAAwAAAEYAAAAAAAAAQwAAAAAAAAA5AAAAAQAAADQAAAADAAAAMgAAAAAAAAAZAAAAAAAAABcAAAAAAAAAGAAAAAMAAAARAAAAAAAAAAsAAAADAAAACgAAAAMAAAAOAAAAAwAAAAYAAAADAAAAAgAAAAMAAAAtAAAAAAAAACcAAAAAAAAAJQAAAAMAAAAjAAAAAwAAABkAAAAAAAAAFwAAAAAAAAAbAAAAAwAAABEAAAAAAAAACwAAAAMAAAA/AAAAAAAAADsAAAADAAAAOQAAAAMAAAA4AAAAAwAAAC0AAAAAAAAAJwAAAAAAAAAuAAAAAwAAACMAAAADAAAAGQAAAAAAAAAkAAAAAAAAABQAAAAAAAAADgAAAAMAAAAiAAAAAAAAABMAAAADAAAACQAAAAMAAAAmAAAAAwAAABUAAAADAAAABwAAAAMAAAA3AAAAAAAAACgAAAAAAAAAGwAAAAMAAAA2AAAAAwAAACQAAAAAAAAAFAAAAAAAAAAzAAAAAwAAACIAAAAAAAAAEwAAAAMAAABIAAAAAAAAADwAAAADAAAALgAAAAMAAABJAAAAAwAAADcAAAAAAAAAKAAAAAAAAABHAAAAAwAAADYAAAADAAAAJAAAAAAAAABAAAAAAAAAAC8AAAAAAAAAJgAAAAMAAAA+AAAAAAAAACsAAAADAAAAHQAAAAMAAAA6AAAAAwAAACoAAAADAAAAGgAAAAMAAABUAAAAAAAAAEUAAAAAAAAAMwAAAAMAAABSAAAAAwAAAEAAAAAAAAAALwAAAAAAAABMAAAAAwAAAD4AAAAAAAAAKwAAAAMAAABhAAAAAAAAAFkAAAADAAAARwAAAAMAAABiAAAAAwAAAFQAAAAAAAAARQAAAAAAAABgAAAAAwAAAFIAAAADAAAAQAAAAAAAAABLAAAAAAAAAEEAAAAAAAAAOgAAAAMAAAA9AAAAAAAAADUAAAADAAAALAAAAAMAAAAxAAAAAwAAACkAAAADAAAAHwAAAAMAAABeAAAAAAAAAFYAAAAAAAAATAAAAAMAAABRAAAAAwAAAEsAAAAAAAAAQQAAAAAAAABCAAAAAwAAAD0AAAAAAAAANQAAAAMAAABrAAAAAAAAAGgAAAADAAAAYAAAAAMAAABlAAAAAwAAAF4AAAAAAAAAVgAAAAAAAABVAAAAAwAAAFEAAAADAAAASwAAAAAAAAA5AAAAAAAAADsAAAAAAAAAPwAAAAMAAABKAAAAAAAAAE4AAAADAAAATwAAAAMAAABTAAAAAwAAAFwAAAADAAAAXwAAAAMAAAAlAAAAAAAAACcAAAADAAAALQAAAAMAAAA0AAAAAAAAADkAAAAAAAAAOwAAAAAAAABGAAAAAwAAAEoAAAAAAAAATgAAAAMAAAAYAAAAAAAAABcAAAADAAAAGQAAAAMAAAAgAAAAAwAAACUAAAAAAAAAJwAAAAMAAAAyAAAAAwAAADQAAAAAAAAAOQAAAAAAAAAuAAAAAAAAADwAAAAAAAAASAAAAAMAAAA4AAAAAAAAAEQAAAADAAAAUAAAAAMAAAA/AAAAAwAAAE0AAAADAAAAWgAAAAMAAAAbAAAAAAAAACgAAAADAAAANwAAAAMAAAAjAAAAAAAAAC4AAAAAAAAAPAAAAAAAAAAtAAAAAwAAADgAAAAAAAAARAAAAAMAAAAOAAAAAAAAABQAAAADAAAAJAAAAAMAAAARAAAAAwAAABsAAAAAAAAAKAAAAAMAAAAZAAAAAwAAACMAAAAAAAAALgAAAAAAAABHAAAAAAAAAFkAAAAAAAAAYQAAAAMAAABJAAAAAAAAAFsAAAADAAAAZwAAAAMAAABIAAAAAwAAAFgAAAADAAAAaQAAAAMAAAAzAAAAAAAAAEUAAAADAAAAVAAAAAMAAAA2AAAAAAAAAEcAAAAAAAAAWQAAAAAAAAA3AAAAAwAAAEkAAAAAAAAAWwAAAAMAAAAmAAAAAAAAAC8AAAADAAAAQAAAAAMAAAAiAAAAAwAAADMAAAAAAAAARQAAAAMAAAAkAAAAAwAAADYAAAAAAAAARwAAAAAAAABgAAAAAAAAAGgAAAAAAAAAawAAAAMAAABiAAAAAAAAAG4AAAADAAAAcwAAAAMAAABhAAAAAwAAAG8AAAADAAAAdwAAAAMAAABMAAAAAAAAAFYAAAADAAAAXgAAAAMAAABSAAAAAAAAAGAAAAAAAAAAaAAAAAAAAABUAAAAAwAAAGIAAAAAAAAAbgAAAAMAAAA6AAAAAAAAAEEAAAADAAAASwAAAAMAAAA+AAAAAwAAAEwAAAAAAAAAVgAAAAMAAABAAAAAAwAAAFIAAAAAAAAAYAAAAAAAAABVAAAAAAAAAFcAAAAAAAAAUwAAAAMAAABlAAAAAAAAAGYAAAADAAAAZAAAAAMAAABrAAAAAwAAAHAAAAADAAAAcgAAAAMAAABCAAAAAAAAAEMAAAADAAAARgAAAAMAAABRAAAAAAAAAFUAAAAAAAAAVwAAAAAAAABeAAAAAwAAAGUAAAAAAAAAZgAAAAMAAAAxAAAAAAAAADAAAAADAAAAMgAAAAMAAAA9AAAAAwAAAEIAAAAAAAAAQwAAAAMAAABLAAAAAwAAAFEAAAAAAAAAVQAAAAAAAABfAAAAAAAAAFwAAAAAAAAAUwAAAAAAAABPAAAAAAAAAE4AAAAAAAAASgAAAAMAAAA/AAAAAQAAADsAAAADAAAAOQAAAAMAAABtAAAAAAAAAGwAAAAAAAAAZAAAAAUAAABdAAAAAQAAAF8AAAAAAAAAXAAAAAAAAABNAAAAAQAAAE8AAAAAAAAATgAAAAAAAAB1AAAABAAAAHYAAAAFAAAAcgAAAAUAAABqAAAAAQAAAG0AAAAAAAAAbAAAAAAAAABaAAAAAQAAAF0AAAABAAAAXwAAAAAAAABaAAAAAAAAAE0AAAAAAAAAPwAAAAAAAABQAAAAAAAAAEQAAAAAAAAAOAAAAAMAAABIAAAAAQAAADwAAAADAAAALgAAAAMAAABqAAAAAAAAAF0AAAAAAAAATwAAAAUAAABjAAAAAQAAAFoAAAAAAAAATQAAAAAAAABYAAAAAQAAAFAAAAAAAAAARAAAAAAAAAB1AAAAAwAAAG0AAAAFAAAAXwAAAAUAAABxAAAAAQAAAGoAAAAAAAAAXQAAAAAAAABpAAAAAQAAAGMAAAABAAAAWgAAAAAAAABpAAAAAAAAAFgAAAAAAAAASAAAAAAAAABnAAAAAAAAAFsAAAAAAAAASQAAAAMAAABhAAAAAQAAAFkAAAADAAAARwAAAAMAAABxAAAAAAAAAGMAAAAAAAAAUAAAAAUAAAB0AAAAAQAAAGkAAAAAAAAAWAAAAAAAAABvAAAAAQAAAGcAAAAAAAAAWwAAAAAAAAB1AAAAAgAAAGoAAAAFAAAAWgAAAAUAAAB5AAAAAQAAAHEAAAAAAAAAYwAAAAAAAAB3AAAAAQAAAHQAAAABAAAAaQAAAAAAAAB3AAAAAAAAAG8AAAAAAAAAYQAAAAAAAABzAAAAAAAAAG4AAAAAAAAAYgAAAAMAAABrAAAAAQAAAGgAAAADAAAAYAAAAAMAAAB5AAAAAAAAAHQAAAAAAAAAZwAAAAUAAAB4AAAAAQAAAHcAAAAAAAAAbwAAAAAAAABwAAAAAQAAAHMAAAAAAAAAbgAAAAAAAAB1AAAAAQAAAHEAAAAFAAAAaQAAAAUAAAB2AAAAAQAAAHkAAAAAAAAAdAAAAAAAAAByAAAAAQAAAHgAAAABAAAAdwAAAAAAAAByAAAAAAAAAHAAAAAAAAAAawAAAAAAAABkAAAAAAAAAGYAAAAAAAAAZQAAAAMAAABTAAAAAQAAAFcAAAADAAAAVQAAAAMAAAB2AAAAAAAAAHgAAAAAAAAAcwAAAAUAAABsAAAAAQAAAHIAAAAAAAAAcAAAAAAAAABcAAAAAQAAAGQAAAAAAAAAZgAAAAAAAAB1AAAAAAAAAHkAAAAFAAAAdwAAAAUAAABtAAAAAQAAAHYAAAAAAAAAeAAAAAAAAABfAAAAAQAAAGwAAAABAAAAcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAAAAAAAAAAABAAAAAAAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAB+ogX28rbpPxqumpJv+fM/165tC4ns9D+XaEnTqUsEQFrOtNlC4PA/3U+0XG6P9b9TdUUBxTTjP4PUp8ex1ty/B1rD/EN43z+lcDi6LLrZP/a45NWEHMY/oJ5ijLDZ+j/xw3rjxWPjP2B8A46ioQdAotff3wla2z+FMSpA1jj+v6b5Y1mtPbS/cIu8K0F457/2esiyJpDNv98k5Ts2NeA/pvljWa09tD88ClUJ60MDQPZ6yLImkM0/4ONKxa0UBcD2uOTVhBzGv5G7JRxGave/8cN648Vj47+HCwtkjAXIv6LX398JWtu/qyheaCAL9D9TdUUBxTTjv4gyTxslhwVAB1rD/EN4378EH/28teoFwH6iBfbytum/F6ztFYdK/r/Xrm0Liez0vwcS6wNGWeO/Ws602ULg8L9TCtRLiLT8P8pi5RexJsw/BlIKPVwR5T95Wyu0/QjnP5PjoT7YYcu/mBhKZ6zrwj8wRYS7NebuP3qW6geh+Ls/SLrixebL3r+pcyymN9XrPwmkNHp7xec/GWNMZVAA17+82s+x2BLiPwn2ytbJ9ek/LgEH1sMS1j8yp/2LhTfeP+SnWwtQBbu/d38gkp5X7z8ytsuHaADGPzUYObdf1+m/7IauECWhwz+cjSACjzniP76Z+wUhN9K/1+GEKzup67+/GYr/04baPw6idWOvsuc/ZedTWsRa5b/EJQOuRzi0v/OncYhHPes/h49PixY53j+i8wWfC03Nvw2idWOvsue/ZedTWsRa5T/EJQOuRzi0P/KncYhHPeu/iY9PixY53r+i8wWfC03NP9anWwtQBbs/d38gkp5X778ytsuHaADGvzUYObdf1+k/74auECWhw7+cjSACjzniv8CZ+wUhN9I/1uGEKzup6z+/GYr/04bavwmkNHp7xee/F2NMZVAA1z+82s+x2BLivwr2ytbJ9em/KwEH1sMS1r8yp/2LhTfev81i5RexJsy/BlIKPVwR5b95Wyu0/Qjnv5DjoT7YYcs/nBhKZ6zrwr8wRYS7Nebuv3OW6geh+Lu/SLrixebL3j+pcyymN9Xrv8rHIFfWehZAMBwUdlo0DECTUc17EOb2PxpVB1SWChdAzjbhb9pTDUDQhmdvECX5P9FlMKCC9+g/IIAzjELgE0DajDngMv8GQFhWDmDPjNs/y1guLh96EkAxPi8k7DIEQJCc4URlhRhA3eLKKLwkEECqpNAyTBD/P6xpjXcDiwVAFtl//cQm4z+Ibt3XKiYTQM7mCLUb3QdAoM1t8yVv7D8aLZv2Nk8UQEAJPV5nQwxAtSsfTCoE9z9TPjXLXIIWQBVanC5W9AtAYM3d7Adm9j++5mQz1FoWQBUThyaVBghAwH5muQsV7T89Q1qv82MUQJoWGOfNuBdAzrkClkmwDkDQjKq77t37Py+g0dtitsE/ZwAMTwVPEUBojepluNwBQGYbtuW+t9w/HNWIJs6MEkDTNuQUSlgEQKxktPP5TcQ/ixbLB8JjEUCwuWjXMQYCQAS/R09FkRdAowpiZjhhDkB7LmlczD/7P01iQmhhsAVAnrtTwDy84z/Z6jfQ2TgTQChOCXMnWwpAhrW3daoz8z/HYJvVPI4VQLT3ik5FcA5Angi7LOZd+z+NNVzDy5gXQBXdvVTFUA1AYNMgOeYe+T8+qHXGCwkXQKQTOKwa5AJA8gFVoEMW0T+FwzJyttIRQAIAAAABAAAAAAAAAAEAAAACAAAAAAAAAAAAAAACAAAAAQAAAAAAAAABAAAAAgAAAAEAAAAAAAAAAgAAAAAAAAAFAAAABAAAAAAAAAABAAAABQAAAAAAAAAAAAAABQAAAAQAAAAAAAAAAQAAAAUAAAAEAAAAAAAAAAUAAAAAAAAAAQAAAP////8HAAAA/////zEAAAD/////VwEAAP////9hCQAA/////6dBAAD/////kcsBAP/////3kAwA/////8H2VwAAAAAAAAAAAAAAAAACAAAA/////w4AAAD/////YgAAAP////+uAgAA/////8ISAAD/////ToMAAP////8ilwMA/////+4hGQD/////gu2vAAAAAAAAAAAAAAAAAAAAAAACAAAA//////////8BAAAAAwAAAP//////////////////////////////////////////////////////////////////////////AQAAAAAAAAACAAAA////////////////AwAAAP//////////////////////////////////////////////////////////////////////////AQAAAAAAAAACAAAA////////////////AwAAAP//////////////////////////////////////////////////////////////////////////AQAAAAAAAAACAAAA////////////////AwAAAP//////////////////////////////////////////////////////////AgAAAP//////////AQAAAAAAAAD/////////////////////AwAAAP////////////////////////////////////////////////////8DAAAA/////////////////////wAAAAD/////////////////////AQAAAP///////////////wIAAAD///////////////////////////////8DAAAA/////////////////////wAAAAD///////////////8CAAAAAQAAAP////////////////////////////////////////////////////8DAAAA/////////////////////wAAAAD///////////////8CAAAAAQAAAP////////////////////////////////////////////////////8DAAAA/////////////////////wAAAAD///////////////8CAAAAAQAAAP////////////////////////////////////////////////////8DAAAA/////////////////////wAAAAD///////////////8CAAAAAQAAAP////////////////////////////////////////////////////8BAAAAAgAAAP///////////////wAAAAD/////////////////////AwAAAP////////////////////////////////////////////////////8BAAAAAgAAAP///////////////wAAAAD/////////////////////AwAAAP////////////////////////////////////////////////////8BAAAAAgAAAP///////////////wAAAAD/////////////////////AwAAAP////////////////////////////////////////////////////8BAAAAAgAAAP///////////////wAAAAD/////////////////////AwAAAP///////////////////////////////wIAAAD///////////////8BAAAA/////////////////////wAAAAD/////////////////////AwAAAP////////////////////////////////////////////////////8DAAAA/////////////////////wAAAAABAAAA//////////8CAAAA//////////////////////////////////////////////////////////8DAAAA////////////////AgAAAAAAAAABAAAA//////////////////////////////////////////////////////////////////////////8DAAAA////////////////AgAAAAAAAAABAAAA//////////////////////////////////////////////////////////////////////////8DAAAA////////////////AgAAAAAAAAABAAAA//////////////////////////////////////////////////////////////////////////8DAAAAAQAAAP//////////AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAACAAAAAAAAAAIAAAABAAAAAQAAAAIAAAACAAAAAAAAAAUAAAAFAAAAAAAAAAIAAAACAAAAAwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAgAAAAEAAAACAAAAAgAAAAIAAAAAAAAABQAAAAYAAAAAAAAAAgAAAAIAAAADAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAgAAAAAAAAACAAAAAQAAAAMAAAACAAAAAgAAAAAAAAAFAAAABwAAAAAAAAACAAAAAgAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAACAAAAAAAAAAIAAAABAAAABAAAAAIAAAACAAAAAAAAAAUAAAAIAAAAAAAAAAIAAAACAAAAAwAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAIAAAAAAAAAAgAAAAEAAAAAAAAAAgAAAAIAAAAAAAAABQAAAAkAAAAAAAAAAgAAAAIAAAADAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAgAAAAIAAAAAAAAAAwAAAA4AAAACAAAAAAAAAAIAAAADAAAAAAAAAAAAAAACAAAAAgAAAAMAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAACAAAAAgAAAAAAAAADAAAACgAAAAIAAAAAAAAAAgAAAAMAAAABAAAAAAAAAAIAAAACAAAAAwAAAAcAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAIAAAACAAAAAAAAAAMAAAALAAAAAgAAAAAAAAACAAAAAwAAAAIAAAAAAAAAAgAAAAIAAAADAAAACAAAAAAAAAAAAAAAAAAAAAAAAAANAAAAAgAAAAIAAAAAAAAAAwAAAAwAAAACAAAAAAAAAAIAAAADAAAAAwAAAAAAAAACAAAAAgAAAAMAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAACAAAAAgAAAAAAAAADAAAADQAAAAIAAAAAAAAAAgAAAAMAAAAEAAAAAAAAAAIAAAACAAAAAwAAAAoAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAIAAAACAAAAAAAAAAMAAAAGAAAAAgAAAAAAAAACAAAAAwAAAA8AAAAAAAAAAgAAAAIAAAADAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAgAAAAIAAAAAAAAAAwAAAAcAAAACAAAAAAAAAAIAAAADAAAAEAAAAAAAAAACAAAAAgAAAAMAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAACAAAAAgAAAAAAAAADAAAACAAAAAIAAAAAAAAAAgAAAAMAAAARAAAAAAAAAAIAAAACAAAAAwAAAA0AAAAAAAAAAAAAAAAAAAAAAAAACAAAAAIAAAACAAAAAAAAAAMAAAAJAAAAAgAAAAAAAAACAAAAAwAAABIAAAAAAAAAAgAAAAIAAAADAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAgAAAAIAAAAAAAAAAwAAAAUAAAACAAAAAAAAAAIAAAADAAAAEwAAAAAAAAACAAAAAgAAAAMAAAAPAAAAAAAAAAAAAAAAAAAAAAAAABAAAAACAAAAAAAAAAIAAAABAAAAEwAAAAIAAAACAAAAAAAAAAUAAAAKAAAAAAAAAAIAAAACAAAAAwAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEQAAAAIAAAAAAAAAAgAAAAEAAAAPAAAAAgAAAAIAAAAAAAAABQAAAAsAAAAAAAAAAgAAAAIAAAADAAAAEQAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAgAAAAAAAAACAAAAAQAAABAAAAACAAAAAgAAAAAAAAAFAAAADAAAAAAAAAACAAAAAgAAAAMAAAASAAAAAAAAAAAAAAAAAAAAAAAAABMAAAACAAAAAAAAAAIAAAABAAAAEQAAAAIAAAACAAAAAAAAAAUAAAANAAAAAAAAAAIAAAACAAAAAwAAABMAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAIAAAAAAAAAAgAAAAEAAAASAAAAAgAAAAIAAAAAAAAABQAAAA4AAAAAAAAAAgAAAAIAAAADAAAAAgAAAAEAAAAAAAAAAQAAAAIAAAAAAAAAAAAAAAIAAAABAAAAAAAAAAEAAAACAAAAAQAAAAAAAAACAAAAAgAAAAAAAAABAAAAAAAAAAAAAAAFAAAABAAAAAAAAAABAAAABQAAAAAAAAAAAAAABQAAAAQAAAAAAAAAAQAAAAUAAAAEAAAAAAAAAAUAAAAFAAAAAAAAAAEAAAAAAAAAAAAAAMuhRbbsNlBBYqHW9OmHIkF9XBuqnS31QAK37uYhNMhAOSo3UUupm0DC+6pc6JxvQHV9eseEEEJAzURsCyqlFEB8BQ4NMJjnPyy3tBoS97o/xawXQznRjj89J2K2CZxhP6vX43RIIDQ/S8isgygEBz+LvFHQkmzaPjFFFO7wMq4+AADMLkTtjkIAAOgkJqxhQgAAU7B0MjRCAADwpBcVB0IAAACYP2HaQQAAAIn/Ja5BzczM4Eg6gUHNzMxMU7BTQTMzMzNfgCZBAAAAAEi3+UAAAAAAwGPNQDMzMzMzy6BAmpmZmZkxc0AzMzMzM/NFQDMzMzMzMxlAzczMzMzM7D+ygXSx2U6RQKimJOvQKnpA23hmONTHY0A/AGcxyudNQNb3K647mzZA+S56rrwWIUAm4kUQ+9UJQKre9hGzh/M/BLvoy9WG3T+LmqMf8VHGP2m3nYNV37A/gbFHcyeCmT+cBPWBckiDP61tZACjKW0/q2RbYVUYVj8uDypVyLNAP6jGS5cA5zBBwcqhBdCNGUEGEhQ/JVEDQT6WPnRbNO1AB/AWSJgT1kDfUWNCNLDAQNk+5C33OqlAchWL34QSk0DKvtDIrNV8QNF0G3kFzGVASSeWhBl6UED+/0mNGuk4QGjA/dm/1CJALPLPMql6DEDSHoDrwpP1P2jouzWST+A/egAAAAAAAABKAwAAAAAAAPoWAAAAAAAAyqAAAAAAAAB6ZQQAAAAAAErGHgAAAAAA+mvXAAAAAADK8+MFAAAAAHqqOykAAAAASqmhIAEAAAD6oGvkBwAAAMpm8T43AAAAes+ZuIIBAABKrDQMkwoAAPq1cFUFSgAAyvkUViUGAgAAAAAAAwAAAAYAAAACAAAABQAAAAEAAAAEAAAAAAAAAAAAAAAFAAAAAwAAAAEAAAAGAAAABAAAAAIAAAAAAAAAAAAAAP////8AAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////////////////////////8AAAAA/////wAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAP////8AAAAAAAAAAAEAAAABAAAAAAAAAAAAAAD/////AAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAA/////wUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////////////////////////AAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////////////////////////wAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAUAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////////////////////////////////////8AAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAQAAAAEAAAAAAAAAAQAAAAAAAAAFAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAEAAAABAAAAAAABAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAAABAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAYWxnb3MuYwBwb2x5ZmlsbABhZGphY2VudEZhY2VEaXJbdG1wRmlqay5mYWNlXVtmaWprLmZhY2VdID09IEtJAGZhY2VpamsuYwBfZmFjZUlqa1BlbnRUb0dlb0JvdW5kYXJ5AGFkamFjZW50RmFjZURpcltjZW50ZXJJSksuZmFjZV1bZmFjZTJdID09IEtJAF9mYWNlSWprVG9HZW9Cb3VuZGFyeQBwb2x5Z29uLT5uZXh0ID09IE5VTEwAbGlua2VkR2VvLmMAYWRkTmV3TGlua2VkUG9seWdvbgBuZXh0ICE9IE5VTEwAbG9vcCAhPSBOVUxMAGFkZE5ld0xpbmtlZExvb3AAcG9seWdvbi0+Zmlyc3QgPT0gTlVMTABhZGRMaW5rZWRMb29wAGNvb3JkICE9IE5VTEwAYWRkTGlua2VkQ29vcmQAbG9vcC0+Zmlyc3QgPT0gTlVMTABpbm5lckxvb3BzICE9IE5VTEwAbm9ybWFsaXplTXVsdGlQb2x5Z29uAGJib3hlcyAhPSBOVUxMAGNhbmRpZGF0ZXMgIT0gTlVMTABmaW5kUG9seWdvbkZvckhvbGUAY2FuZGlkYXRlQkJveGVzICE9IE5VTEwAcmV2RGlyICE9IElOVkFMSURfRElHSVQAbG9jYWxpai5jAGgzVG9Mb2NhbElqawBiYXNlQ2VsbCAhPSBvcmlnaW5CYXNlQ2VsbAAhKG9yaWdpbk9uUGVudCAmJiBpbmRleE9uUGVudCkAcGVudGFnb25Sb3RhdGlvbnMgPj0gMABkaXJlY3Rpb25Sb3RhdGlvbnMgPj0gMABiYXNlQ2VsbCA9PSBvcmlnaW5CYXNlQ2VsbABiYXNlQ2VsbCAhPSBJTlZBTElEX0JBU0VfQ0VMTABsb2NhbElqa1RvSDMAIV9pc0Jhc2VDZWxsUGVudGFnb24oYmFzZUNlbGwpAGJhc2VDZWxsUm90YXRpb25zID49IDAAd2l0aGluUGVudGFnb25Sb3RhdGlvbnMgPj0gMABncmFwaC0+YnVja2V0cyAhPSBOVUxMAHZlcnRleEdyYXBoLmMAaW5pdFZlcnRleEdyYXBoAG5vZGUgIT0gTlVMTABhZGRWZXJ0ZXhOb2Rl";var tempDoublePtr=23792;function ___assert_fail(condition,filename,line,func){abort("Assertion failed: "+UTF8ToString(condition)+", at: "+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"])}function _emscripten_get_heap_size(){return TOTAL_MEMORY}function _emscripten_resize_heap(requestedSize){var oldSize=_emscripten_get_heap_size();var PAGE_MULTIPLE=16777216;var LIMIT=2147483648-PAGE_MULTIPLE;if(requestedSize>LIMIT){return false}var MIN_TOTAL_MEMORY=16777216;var newSize=Math.max(oldSize,MIN_TOTAL_MEMORY);while(newSize<requestedSize){if(newSize<=536870912){newSize=alignUp(2*newSize,PAGE_MULTIPLE)}else{newSize=Math.min(alignUp((3*newSize+2147483648)/4,PAGE_MULTIPLE),LIMIT)}}var replacement=Module["reallocBuffer"](newSize);if(!replacement||replacement.byteLength!=newSize){return false}updateGlobalBuffer(replacement);updateGlobalBufferViews();TOTAL_MEMORY=newSize;HEAPU32[DYNAMICTOP_PTR>>2]=requestedSize;return true}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest)}function ___setErrNo(value){if(Module["___errno_location"])HEAP32[Module["___errno_location"]()>>2]=value;return value}var ASSERTIONS=false;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){if(ASSERTIONS){assert(false,"Character code "+chr+" ("+String.fromCharCode(chr)+")  at offset "+i+" not in 0x00-0xFF.")}chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}var decodeBase64=typeof atob==="function"?atob:(function(input){var keyStr="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var output="";var chr1,chr2,chr3;var enc1,enc2,enc3,enc4;var i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");do{enc1=keyStr.indexOf(input.charAt(i++));enc2=keyStr.indexOf(input.charAt(i++));enc3=keyStr.indexOf(input.charAt(i++));enc4=keyStr.indexOf(input.charAt(i++));chr1=enc1<<2|enc2>>4;chr2=(enc2&15)<<4|enc3>>2;chr3=(enc3&3)<<6|enc4;output=output+String.fromCharCode(chr1);if(enc3!==64){output=output+String.fromCharCode(chr2)}if(enc4!==64){output=output+String.fromCharCode(chr3)}}while(i<input.length);return output});function intArrayFromBase64(s){if(typeof ENVIRONMENT_IS_NODE==="boolean"&&ENVIRONMENT_IS_NODE){var buf;try{buf=Buffer.from(s,"base64")}catch(_){buf=new Buffer(s,"base64")}return new Uint8Array(buf.buffer,buf.byteOffset,buf.byteLength)}try{var decoded=decodeBase64(s);var bytes=new Uint8Array(decoded.length);for(var i=0;i<decoded.length;++i){bytes[i]=decoded.charCodeAt(i)}return bytes}catch(_){throw new Error("Converting base64 string to bytes failed.")}}function tryParseAsDataURI(filename){if(!isDataURI(filename)){return}return intArrayFromBase64(filename.slice(dataURIPrefix.length))}var asmGlobalArg={"Math":Math,"Int8Array":Int8Array,"Int16Array":Int16Array,"Int32Array":Int32Array,"Uint8Array":Uint8Array,"Uint16Array":Uint16Array,"Uint32Array":Uint32Array,"Float32Array":Float32Array,"Float64Array":Float64Array,"NaN":NaN,"Infinity":Infinity,"byteLength":byteLength};Module.asmLibraryArg={"a":abort,"b":assert,"c":setTempRet0,"d":getTempRet0,"e":abortOnCannotGrowMemory,"f":___assert_fail,"g":___setErrNo,"h":_emscripten_get_heap_size,"i":_emscripten_memcpy_big,"j":_emscripten_resize_heap,"k":DYNAMICTOP_PTR,"l":tempDoublePtr};// EMSCRIPTEN_START_ASM
var asm=(/** @suppress {uselessCode} */ function(global,env,buffer) {
"almost asm";var a=global.Int8Array;var b=new a(buffer);var c=global.Int16Array;var d=new c(buffer);var e=global.Int32Array;var f=new e(buffer);var g=global.Uint8Array;var h=new g(buffer);var i=global.Uint16Array;var j=new i(buffer);var k=global.Uint32Array;var l=new k(buffer);var m=global.Float32Array;var n=new m(buffer);var o=global.Float64Array;var p=new o(buffer);var q=global.byteLength;var r=env.k|0;var s=env.l|0;var t=0;var u=0;var v=0;var w=0;var x=global.NaN,y=global.Infinity;var z=0,A=0,B=0,C=0,D=0.0;var E=global.Math.floor;var F=global.Math.abs;var G=global.Math.sqrt;var H=global.Math.pow;var I=global.Math.cos;var J=global.Math.sin;var K=global.Math.tan;var L=global.Math.acos;var M=global.Math.asin;var N=global.Math.atan;var O=global.Math.atan2;var P=global.Math.exp;var Q=global.Math.log;var R=global.Math.ceil;var S=global.Math.imul;var T=global.Math.min;var U=global.Math.max;var V=global.Math.clz32;var W=env.a;var X=env.b;var Y=env.c;var Z=env.d;var _=env.e;var $=env.f;var aa=env.g;var ba=env.h;var ca=env.i;var da=env.j;var ea=23808;var fa=5266688;var ga=0.0;function ha(newBuffer){if(q(newBuffer)&16777215||q(newBuffer)<=16777215||q(newBuffer)>2147483648)return false;b=new a(newBuffer);d=new c(newBuffer);f=new e(newBuffer);h=new g(newBuffer);j=new i(newBuffer);l=new k(newBuffer);n=new m(newBuffer);p=new o(newBuffer);buffer=newBuffer;return true}
// EMSCRIPTEN_START_FUNCS
function ia(a){a=a|0;var b=0;b=ea;ea=ea+a|0;ea=ea+15&-16;return b|0}function ja(){return ea|0}function ka(a){a=a|0;ea=a}function la(a,b){a=a|0;b=b|0;ea=a;fa=b}function ma(a,b){a=a|0;b=b|0;if(!t){t=a;u=b}}function na(a){a=a|0;return (S(a*3|0,a+1|0)|0)+1|0}function oa(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;e=(S(c*3|0,c+1|0)|0)+1|0;f=e<<2;g=Nc(f)|0;if(!(qa(a,b,c,d,g)|0)){Oc(g);return}ad(d|0,0,e<<3|0)|0;ad(g|0,0,f|0)|0;ra(a,b,c,d,g,e,0);Oc(g);return}function pa(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=(S(c*3|0,c+1|0)|0)+1|0;if(!(qa(a,b,c,d,e)|0))return;ad(d|0,0,f<<3|0)|0;ad(e|0,0,f<<2|0)|0;ra(a,b,c,d,e,f,0);return}function qa(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;o=ea;ea=ea+16|0;n=o;g=d;f[g>>2]=a;f[g+4>>2]=b;g=(e|0)!=0;if(g)f[e>>2]=0;if(Gb(a,b)|0){n=1;ea=o;return n|0}f[n>>2]=0;a:do if((c|0)>=1)if(g){k=0;l=1;m=1;h=0;g=a;while(1){if(!(h|k)){g=sa(g,b,4,n)|0;b=Z()|0;if((g|0)==0&(b|0)==0){g=2;break a}if(Gb(g,b)|0){g=1;break a}}g=sa(g,b,f[16+(k<<2)>>2]|0,n)|0;b=Z()|0;if((g|0)==0&(b|0)==0){g=2;break a}a=d+(m<<3)|0;f[a>>2]=g;f[a+4>>2]=b;f[e+(m<<2)>>2]=l;h=h+1|0;a=(h|0)==(l|0);i=k+1|0;j=(i|0)==6;if(Gb(g,b)|0){g=1;break a}l=l+(j&a&1)|0;if((l|0)>(c|0)){g=0;break}else{k=a?(j?0:i):k;m=m+1|0;h=a?0:h}}}else{k=0;l=1;m=1;h=0;g=a;while(1){if(!(h|k)){g=sa(g,b,4,n)|0;b=Z()|0;if((g|0)==0&(b|0)==0){g=2;break a}if(Gb(g,b)|0){g=1;break a}}g=sa(g,b,f[16+(k<<2)>>2]|0,n)|0;b=Z()|0;if((g|0)==0&(b|0)==0){g=2;break a}a=d+(m<<3)|0;f[a>>2]=g;f[a+4>>2]=b;h=h+1|0;a=(h|0)==(l|0);i=k+1|0;j=(i|0)==6;if(Gb(g,b)|0){g=1;break a}l=l+(j&a&1)|0;if((l|0)>(c|0)){g=0;break}else{k=a?(j?0:i):k;m=m+1|0;h=a?0:h}}}else g=0;while(0);n=g;ea=o;return n|0}function ra(a,b,c,d,e,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0;m=ea;ea=ea+16|0;l=m;if((a|0)==0&(b|0)==0){ea=m;return}i=Xc(a|0,b|0,g|0,((g|0)<0)<<31>>31|0)|0;Z()|0;j=d+(i<<3)|0;n=j;o=f[n>>2]|0;n=f[n+4>>2]|0;k=(o|0)==(a|0)&(n|0)==(b|0);if(!((o|0)==0&(n|0)==0|k))do{i=(i+1|0)%(g|0)|0;j=d+(i<<3)|0;o=j;n=f[o>>2]|0;o=f[o+4>>2]|0;k=(n|0)==(a|0)&(o|0)==(b|0)}while(!((n|0)==0&(o|0)==0|k));i=e+(i<<2)|0;if(k?(f[i>>2]|0)<=(h|0):0){ea=m;return}o=j;f[o>>2]=a;f[o+4>>2]=b;f[i>>2]=h;if((h|0)>=(c|0)){ea=m;return}o=h+1|0;f[l>>2]=0;n=sa(a,b,2,l)|0;ra(n,Z()|0,c,d,e,g,o);f[l>>2]=0;n=sa(a,b,3,l)|0;ra(n,Z()|0,c,d,e,g,o);f[l>>2]=0;n=sa(a,b,1,l)|0;ra(n,Z()|0,c,d,e,g,o);f[l>>2]=0;n=sa(a,b,5,l)|0;ra(n,Z()|0,c,d,e,g,o);f[l>>2]=0;n=sa(a,b,4,l)|0;ra(n,Z()|0,c,d,e,g,o);f[l>>2]=0;n=sa(a,b,6,l)|0;ra(n,Z()|0,c,d,e,g,o);ea=m;return}function sa(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;if((f[d>>2]|0)>0){e=0;do{c=_a(c)|0;e=e+1|0}while((e|0)<(f[d>>2]|0))}i=Yc(a|0,b|0,45)|0;Z()|0;j=i&127;g=Lb(a,b)|0;e=Yc(a|0,b|0,52)|0;Z()|0;e=e&15;a:do if(!e)h=6;else while(1){m=(15-e|0)*3|0;n=Yc(a|0,b|0,m|0)|0;Z()|0;n=n&7;o=(Rb(e)|0)==0;e=e+-1|0;l=Zc(7,0,m|0)|0;b=b&~(Z()|0);m=Zc(f[(o?464:48)+(n*28|0)+(c<<2)>>2]|0,0,m|0)|0;k=Z()|0;c=f[(o?672:256)+(n*28|0)+(c<<2)>>2]|0;a=m|a&~l;b=k|b;if(!c){c=0;break a}if(!e){h=6;break}}while(0);if((h|0)==6){o=f[880+(j*28|0)+(c<<2)>>2]|0;n=Zc(o|0,0,45)|0;a=n|a;b=Z()|0|b&-1040385;c=f[4304+(j*28|0)+(c<<2)>>2]|0;if((o&127|0)==127){o=Zc(f[880+(j*28|0)+20>>2]|0,0,45)|0;b=Z()|0|b&-1040385;c=f[4304+(j*28|0)+20>>2]|0;a=Nb(o|a,b)|0;b=Z()|0;f[d>>2]=(f[d>>2]|0)+1}}h=Yc(a|0,b|0,45)|0;Z()|0;h=h&127;b:do if(!(ya(h)|0)){if((c|0)>0){e=0;do{a=Nb(a,b)|0;b=Z()|0;e=e+1|0}while((e|0)!=(c|0))}}else{c:do if((Lb(a,b)|0)==1){if((j|0)!=(h|0))if(Ca(h,f[7728+(j*28|0)>>2]|0)|0){a=Pb(a,b)|0;g=1;b=Z()|0;break}else{a=Nb(a,b)|0;g=1;b=Z()|0;break}switch(g|0){case 5:{a=Pb(a,b)|0;b=Z()|0;f[d>>2]=(f[d>>2]|0)+5;g=0;break c}case 3:{a=Nb(a,b)|0;b=Z()|0;f[d>>2]=(f[d>>2]|0)+1;g=0;break c}default:{n=0;o=0;Y(n|0);return o|0}}}else g=0;while(0);if((c|0)>0){e=0;do{a=Mb(a,b)|0;b=Z()|0;e=e+1|0}while((e|0)!=(c|0))}if((j|0)!=(h|0)){if(!(za(h)|0)){if((g|0)!=0|(Lb(a,b)|0)!=5)break;f[d>>2]=(f[d>>2]|0)+1;break}switch(i&127){case 8:case 118:break b;default:{}}if((Lb(a,b)|0)!=3)f[d>>2]=(f[d>>2]|0)+1}}while(0);f[d>>2]=((f[d>>2]|0)+c|0)%6|0;n=b;o=a;Y(n|0);return o|0}function ta(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;m=ea;ea=ea+16|0;l=m;if(!c){l=d;f[l>>2]=a;f[l+4>>2]=b;l=0;ea=m;return l|0}f[l>>2]=0;a:do if(!(Gb(a,b)|0)){g=(c|0)>0;if(g){e=0;k=a;do{k=sa(k,b,4,l)|0;b=Z()|0;if((k|0)==0&(b|0)==0){a=2;break a}e=e+1|0;if(Gb(k,b)|0){a=1;break a}}while((e|0)<(c|0));j=d;f[j>>2]=k;f[j+4>>2]=b;j=c+-1|0;if(g){g=0;h=1;e=k;a=b;do{e=sa(e,a,2,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}i=d+(h<<3)|0;f[i>>2]=e;f[i+4>>2]=a;h=h+1|0;if(Gb(e,a)|0){a=1;break a}g=g+1|0}while((g|0)<(c|0));i=0;g=h;do{e=sa(e,a,3,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}h=d+(g<<3)|0;f[h>>2]=e;f[h+4>>2]=a;g=g+1|0;if(Gb(e,a)|0){a=1;break a}i=i+1|0}while((i|0)<(c|0));h=0;do{e=sa(e,a,1,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}i=d+(g<<3)|0;f[i>>2]=e;f[i+4>>2]=a;g=g+1|0;if(Gb(e,a)|0){a=1;break a}h=h+1|0}while((h|0)<(c|0));h=0;do{e=sa(e,a,5,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}i=d+(g<<3)|0;f[i>>2]=e;f[i+4>>2]=a;g=g+1|0;if(Gb(e,a)|0){a=1;break a}h=h+1|0}while((h|0)<(c|0));h=0;do{e=sa(e,a,4,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}i=d+(g<<3)|0;f[i>>2]=e;f[i+4>>2]=a;g=g+1|0;if(Gb(e,a)|0){a=1;break a}h=h+1|0}while((h|0)<(c|0));h=0;while(1){e=sa(e,a,6,l)|0;a=Z()|0;if((e|0)==0&(a|0)==0){a=2;break a}if((h|0)!=(j|0)){i=d+(g<<3)|0;f[i>>2]=e;f[i+4>>2]=a;if(!(Gb(e,a)|0))g=g+1|0;else{a=1;break a}}h=h+1|0;if((h|0)>=(c|0)){h=k;g=b;break}}}else{h=k;e=k;g=b;a=b}}else{h=d;f[h>>2]=a;f[h+4>>2]=b;h=a;e=a;g=b;a=b}a=((h|0)!=(e|0)|(g|0)!=(a|0))&1}else a=1;while(0);l=a;ea=m;return l|0}function ua(a,b){a=a|0;b=b|0;var c=0,d=0;c=ea;ea=ea+32|0;d=c;rc(a,d);b=Ka(d,b)|0;b=(S(b*3|0,b+1|0)|0)+1|0;ea=c;return b|0}function va(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0.0;m=ea;ea=ea+32|0;d=m+16|0;k=m;l=Nc((f[a+8>>2]<<5)+32|0)|0;if(!l)$(22551,22160,672,22168);sc(a,l);h=Ka(l,b)|0;i=S(h*3|0,h+1|0)|0;j=i+1|0;Ia(l,d);b=Sb(d,b)|0;d=Z()|0;e=j<<2;g=Nc(e)|0;if(qa(b,d,h,c,g)|0){ad(c|0,0,j<<3|0)|0;ad(g|0,0,e|0)|0;ra(b,d,h,c,g,j,0)}Oc(g);if((i|0)<0){Oc(l);ea=m;return}d=k+8|0;b=0;do{e=c+(b<<3)|0;h=e;g=f[h>>2]|0;h=f[h+4>>2]|0;if(!((g|0)==0&(h|0)==0)?(Vb(g,h,k),n=+rb(+p[k>>3]),p[k>>3]=n,n=+sb(+p[d>>3]),p[d>>3]=n,!(tc(a,l,k)|0)):0){i=e;f[i>>2]=0;f[i+4>>2]=0}b=b+1|0}while((b|0)!=(j|0));Oc(l);ea=m;return}function wa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0;k=ea;ea=ea+176|0;j=k;if((b|0)<1){Gc(c,0,0);ea=k;return}h=a;h=Yc(f[h>>2]|0,f[h+4>>2]|0,52)|0;Z()|0;Gc(c,(b|0)>6?b:6,h&15);h=0;do{d=a+(h<<3)|0;Wb(f[d>>2]|0,f[d+4>>2]|0,j);d=f[j>>2]|0;if((d|0)>0){i=0;do{g=j+8+(i<<4)|0;i=i+1|0;d=j+8+(((i|0)%(d|0)|0)<<4)|0;e=Lc(c,d,g)|0;if(!e)Kc(c,g,d)|0;else Jc(c,e)|0;d=f[j>>2]|0}while((i|0)<(d|0))}h=h+1|0}while((h|0)!=(b|0));ea=k;return}function xa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;g=ea;ea=ea+32|0;d=g;e=g+16|0;wa(a,b,e);f[c>>2]=0;f[c+4>>2]=0;f[c+8>>2]=0;a=Ic(e)|0;if(!a){gc(c)|0;Hc(e);ea=g;return}do{b=dc(c)|0;do{ec(b,a)|0;h=a+16|0;f[d>>2]=f[h>>2];f[d+4>>2]=f[h+4>>2];f[d+8>>2]=f[h+8>>2];f[d+12>>2]=f[h+12>>2];Jc(e,a)|0;a=Mc(e,d)|0}while((a|0)!=0);a=Ic(e)|0}while((a|0)!=0);gc(c)|0;Hc(e);ea=g;return}function ya(a){a=a|0;return f[7728+(a*28|0)+16>>2]|0}function za(a){a=a|0;return (a|0)==4|(a|0)==117|0}function Aa(a){a=a|0;return f[11152+((f[a>>2]|0)*216|0)+((f[a+4>>2]|0)*72|0)+((f[a+8>>2]|0)*24|0)+(f[a+12>>2]<<3)>>2]|0}function Ba(a){a=a|0;return f[11152+((f[a>>2]|0)*216|0)+((f[a+4>>2]|0)*72|0)+((f[a+8>>2]|0)*24|0)+(f[a+12>>2]<<3)+4>>2]|0}function Ca(a,b){a=a|0;b=b|0;if((f[7728+(a*28|0)+20>>2]|0)==(b|0)){b=1;return b|0}b=(f[7728+(a*28|0)+24>>2]|0)==(b|0);return b|0}function Da(a,b){a=a|0;b=b|0;return f[880+(a*28|0)+(b<<2)>>2]|0}function Ea(a,b){a=a|0;b=b|0;if((f[880+(a*28|0)>>2]|0)==(b|0)){b=0;return b|0}if((f[880+(a*28|0)+4>>2]|0)==(b|0)){b=1;return b|0}if((f[880+(a*28|0)+8>>2]|0)==(b|0)){b=2;return b|0}if((f[880+(a*28|0)+12>>2]|0)==(b|0)){b=3;return b|0}if((f[880+(a*28|0)+16>>2]|0)==(b|0)){b=4;return b|0}if((f[880+(a*28|0)+20>>2]|0)==(b|0)){b=5;return b|0}else return ((f[880+(a*28|0)+24>>2]|0)==(b|0)?6:7)|0;return 0}function Fa(){return 122}function Ga(a){a=a|0;var b=0,c=0,d=0;b=0;do{Zc(b|0,0,45)|0;d=Z()|0|134225919;c=a+(b<<3)|0;f[c>>2]=-1;f[c+4>>2]=d;b=b+1|0}while((b|0)!=122);return}function Ha(a){a=a|0;return +p[a+16>>3]<+p[a+24>>3]|0}function Ia(a,b){a=a|0;b=b|0;var c=0.0,d=0.0;p[b>>3]=(+p[a>>3]+ +p[a+8>>3])*.5;c=+p[a+16>>3];d=+p[a+24>>3];c=+sb((d+(c<d?c+6.283185307179586:c))*.5);p[b+8>>3]=c;return}function Ja(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;c=+p[b>>3];if(!(c>=+p[a+8>>3])){b=0;return b|0}if(!(c<=+p[a>>3])){b=0;return b|0}d=+p[a+16>>3];c=+p[a+24>>3];e=+p[b+8>>3];b=e>=c;a=e<=d&1;if(d<c){if(b)a=1}else if(!b)a=0;b=(a|0)!=0;return b|0}function Ka(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0.0,g=0,h=0,i=0,j=0.0,k=0.0,l=0;c=ea;ea=ea+224|0;e=c+200|0;d=c+32|0;g=c+16|0;h=c;l=a+8|0;p[g>>3]=(+p[a>>3]+ +p[l>>3])*.5;i=a+16|0;f=+p[i>>3];k=+p[a+24>>3];f=+sb((k+(f<k?f+6.283185307179586:f))*.5);p[g+8>>3]=f;f=+p[a>>3];k=+F(+f);j=+p[l>>3];a=k>+F(+j);p[h>>3]=a?j:f;p[h+8>>3]=+p[i>>3];f=+tb(g,h);a=Sb(g,b)|0;b=Z()|0;Vb(a,b,e);Wb(a,b,d);b=~~+R(+(f/(+tb(e,d+8|0)*1.5)));ea=c;return b|0}function La(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;f[a>>2]=b;f[a+4>>2]=c;f[a+8>>2]=d;return}function Ma(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0.0,i=0.0,j=0.0,k=0.0,l=0,m=0,n=0.0;m=b+8|0;f[m>>2]=0;j=+p[a>>3];h=+F(+j);k=+p[a+8>>3];i=+F(+k)/.8660254037844386;h=h+i*.5;c=~~h;a=~~i;h=h-+(c|0);i=i-+(a|0);do if(h<.5)if(h<.3333333333333333){f[b>>2]=c;if(i<(h+1.0)*.5){f[b+4>>2]=a;break}else{a=a+1|0;f[b+4>>2]=a;break}}else{n=1.0-h;a=(!(i<n)&1)+a|0;f[b+4>>2]=a;if(n<=i&i<h*2.0){c=c+1|0;f[b>>2]=c;break}else{f[b>>2]=c;break}}else{if(!(h<.6666666666666666)){c=c+1|0;f[b>>2]=c;if(i<h*.5){f[b+4>>2]=a;break}else{a=a+1|0;f[b+4>>2]=a;break}}if(i<1.0-h){f[b+4>>2]=a;if(h*2.0+-1.0<i){f[b>>2]=c;break}}else{a=a+1|0;f[b+4>>2]=a}c=c+1|0;f[b>>2]=c}while(0);do if(j<0.0)if(!(a&1)){l=(a|0)/2|0;l=Uc(c|0,((c|0)<0)<<31>>31|0,l|0,((l|0)<0)<<31>>31|0)|0;c=~~(+(c|0)-(+(l>>>0)+4294967296.0*+(Z()|0))*2.0);f[b>>2]=c;break}else{l=(a+1|0)/2|0;l=Uc(c|0,((c|0)<0)<<31>>31|0,l|0,((l|0)<0)<<31>>31|0)|0;c=~~(+(c|0)-((+(l>>>0)+4294967296.0*+(Z()|0))*2.0+1.0));f[b>>2]=c;break}while(0);l=b+4|0;if(k<0.0){c=c-((a<<1|1|0)/2|0)|0;f[b>>2]=c;a=0-a|0;f[l>>2]=a}d=a-c|0;if((c|0)<0){e=0-c|0;f[l>>2]=d;f[m>>2]=e;f[b>>2]=0;a=d;c=0}else e=0;if((a|0)<0){c=c-a|0;f[b>>2]=c;e=e-a|0;f[m>>2]=e;f[l>>2]=0;a=0}g=c-e|0;d=a-e|0;if((e|0)<0){f[b>>2]=g;f[l>>2]=d;f[m>>2]=0;a=d;c=g;e=0}d=(a|0)<(c|0)?a:c;d=(e|0)<(d|0)?e:d;if((d|0)<=0)return;f[b>>2]=c-d;f[l>>2]=a-d;f[m>>2]=e-d;return}function Na(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0;b=f[a>>2]|0;h=a+4|0;c=f[h>>2]|0;if((b|0)<0){c=c-b|0;f[h>>2]=c;g=a+8|0;f[g>>2]=(f[g>>2]|0)-b;f[a>>2]=0;b=0}if((c|0)<0){b=b-c|0;f[a>>2]=b;g=a+8|0;e=(f[g>>2]|0)-c|0;f[g>>2]=e;f[h>>2]=0;c=0}else{e=a+8|0;g=e;e=f[e>>2]|0}if((e|0)<0){b=b-e|0;f[a>>2]=b;c=c-e|0;f[h>>2]=c;f[g>>2]=0;e=0}d=(c|0)<(b|0)?c:b;d=(e|0)<(d|0)?e:d;if((d|0)<=0)return;f[a>>2]=b-d;f[h>>2]=c-d;f[g>>2]=e-d;return}function Oa(a,b){a=a|0;b=b|0;var c=0.0,d=0;d=f[a+8>>2]|0;c=+((f[a+4>>2]|0)-d|0);p[b>>3]=+((f[a>>2]|0)-d|0)-c*.5;p[b+8>>3]=c*.8660254037844386;return}function Pa(a,b,c){a=a|0;b=b|0;c=c|0;f[c>>2]=(f[b>>2]|0)+(f[a>>2]|0);f[c+4>>2]=(f[b+4>>2]|0)+(f[a+4>>2]|0);f[c+8>>2]=(f[b+8>>2]|0)+(f[a+8>>2]|0);return}function Qa(a,b,c){a=a|0;b=b|0;c=c|0;f[c>>2]=(f[a>>2]|0)-(f[b>>2]|0);f[c+4>>2]=(f[a+4>>2]|0)-(f[b+4>>2]|0);f[c+8>>2]=(f[a+8>>2]|0)-(f[b+8>>2]|0);return}function Ra(a,b){a=a|0;b=b|0;var c=0,d=0;c=S(f[a>>2]|0,b)|0;f[a>>2]=c;c=a+4|0;d=S(f[c>>2]|0,b)|0;f[c>>2]=d;a=a+8|0;b=S(f[a>>2]|0,b)|0;f[a>>2]=b;return}function Sa(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=f[a>>2]|0;i=(h|0)<0;d=(f[a+4>>2]|0)-(i?h:0)|0;g=(d|0)<0;e=(g?0-d|0:0)+((f[a+8>>2]|0)-(i?h:0))|0;c=(e|0)<0;a=c?0:e;b=(g?0:d)-(c?e:0)|0;e=(i?0:h)-(g?d:0)-(c?e:0)|0;c=(b|0)<(e|0)?b:e;c=(a|0)<(c|0)?a:c;d=(c|0)>0;a=a-(d?c:0)|0;b=b-(d?c:0)|0;a:do switch(e-(d?c:0)|0){case 0:switch(b|0){case 0:{i=(a|0)==0?0:(a|0)==1?1:7;return i|0}case 1:{i=(a|0)==0?2:(a|0)==1?3:7;return i|0}default:break a}case 1:switch(b|0){case 0:{i=(a|0)==0?4:(a|0)==1?5:7;return i|0}case 1:{if(!a)a=6;else break a;return a|0}default:break a}default:{}}while(0);i=7;return i|0}function Ta(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=a+8|0;c=f[h>>2]|0;b=(f[a>>2]|0)-c|0;i=a+4|0;c=(f[i>>2]|0)-c|0;d=Sc(+((b*3|0)-c|0)/7.0)|0;f[a>>2]=d;b=Sc(+((c<<1)+b|0)/7.0)|0;f[i>>2]=b;f[h>>2]=0;c=b-d|0;if((d|0)<0){g=0-d|0;f[i>>2]=c;f[h>>2]=g;f[a>>2]=0;b=c;d=0;c=g}else c=0;if((b|0)<0){d=d-b|0;f[a>>2]=d;c=c-b|0;f[h>>2]=c;f[i>>2]=0;b=0}g=d-c|0;e=b-c|0;if((c|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;b=e;e=g;c=0}else e=d;d=(b|0)<(e|0)?b:e;d=(c|0)<(d|0)?c:d;if((d|0)<=0)return;f[a>>2]=e-d;f[i>>2]=b-d;f[h>>2]=c-d;return}function Ua(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;h=a+8|0;c=f[h>>2]|0;b=(f[a>>2]|0)-c|0;i=a+4|0;c=(f[i>>2]|0)-c|0;d=Sc(+((b<<1)+c|0)/7.0)|0;f[a>>2]=d;b=Sc(+((c*3|0)-b|0)/7.0)|0;f[i>>2]=b;f[h>>2]=0;c=b-d|0;if((d|0)<0){g=0-d|0;f[i>>2]=c;f[h>>2]=g;f[a>>2]=0;b=c;d=0;c=g}else c=0;if((b|0)<0){d=d-b|0;f[a>>2]=d;c=c-b|0;f[h>>2]=c;f[i>>2]=0;b=0}g=d-c|0;e=b-c|0;if((c|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;b=e;e=g;c=0}else e=d;d=(b|0)<(e|0)?b:e;d=(c|0)<(d|0)?c:d;if((d|0)<=0)return;f[a>>2]=e-d;f[i>>2]=b-d;f[h>>2]=c-d;return}function Va(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;b=f[a>>2]|0;h=a+4|0;c=f[h>>2]|0;i=a+8|0;d=f[i>>2]|0;e=c+(b*3|0)|0;f[a>>2]=e;c=d+(c*3|0)|0;f[h>>2]=c;b=(d*3|0)+b|0;f[i>>2]=b;d=c-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=d;f[i>>2]=b;f[a>>2]=0;c=d;d=0}else d=e;if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[h>>2]=e-c;f[i>>2]=b-c;return}function Wa(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;e=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;c=f[i>>2]|0;d=(b*3|0)+e|0;e=c+(e*3|0)|0;f[a>>2]=e;f[h>>2]=d;b=(c*3|0)+b|0;f[i>>2]=b;c=d-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=c;f[i>>2]=b;f[a>>2]=0;e=0}else c=d;if((c|0)<0){e=e-c|0;f[a>>2]=e;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=e-b|0;d=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=d;f[i>>2]=0;e=g;b=0}else d=c;c=(d|0)<(e|0)?d:e;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=e-c;f[h>>2]=d-c;f[i>>2]=b-c;return}function Xa(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0;if((b+-1|0)>>>0>=6)return;e=(f[15472+(b*12|0)>>2]|0)+(f[a>>2]|0)|0;f[a>>2]=e;i=a+4|0;d=(f[15472+(b*12|0)+4>>2]|0)+(f[i>>2]|0)|0;f[i>>2]=d;h=a+8|0;b=(f[15472+(b*12|0)+8>>2]|0)+(f[h>>2]|0)|0;f[h>>2]=b;c=d-e|0;if((e|0)<0){b=b-e|0;f[i>>2]=c;f[h>>2]=b;f[a>>2]=0;d=0}else{c=d;d=e}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[h>>2]=b;f[i>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[i>>2]=e;f[h>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[i>>2]=e-c;f[h>>2]=b-c;return}function Ya(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;e=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;c=f[i>>2]|0;d=b+e|0;e=c+e|0;f[a>>2]=e;f[h>>2]=d;b=c+b|0;f[i>>2]=b;c=d-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=c;f[i>>2]=b;f[a>>2]=0;d=0}else{c=d;d=e}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[h>>2]=e-c;f[i>>2]=b-c;return}function Za(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;b=f[a>>2]|0;h=a+4|0;d=f[h>>2]|0;i=a+8|0;c=f[i>>2]|0;e=d+b|0;f[a>>2]=e;d=c+d|0;f[h>>2]=d;b=c+b|0;f[i>>2]=b;c=d-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=c;f[i>>2]=b;f[a>>2]=0;d=0}else{c=d;d=e}if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[h>>2]=e-c;f[i>>2]=b-c;return}function _a(a){a=a|0;switch(a|0){case 1:{a=5;break}case 5:{a=4;break}case 4:{a=6;break}case 6:{a=2;break}case 2:{a=3;break}case 3:{a=1;break}default:{}}return a|0}function $a(a){a=a|0;switch(a|0){case 1:{a=3;break}case 3:{a=2;break}case 2:{a=6;break}case 6:{a=4;break}case 4:{a=5;break}case 5:{a=1;break}default:{}}return a|0}function ab(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;b=f[a>>2]|0;h=a+4|0;c=f[h>>2]|0;i=a+8|0;d=f[i>>2]|0;e=c+(b<<1)|0;f[a>>2]=e;c=d+(c<<1)|0;f[h>>2]=c;b=(d<<1)+b|0;f[i>>2]=b;d=c-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=d;f[i>>2]=b;f[a>>2]=0;c=d;d=0}else d=e;if((c|0)<0){d=d-c|0;f[a>>2]=d;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=d-b|0;e=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=e;f[i>>2]=0;d=g;b=0}else e=c;c=(e|0)<(d|0)?e:d;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=d-c;f[h>>2]=e-c;f[i>>2]=b-c;return}function bb(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;e=f[a>>2]|0;h=a+4|0;b=f[h>>2]|0;i=a+8|0;c=f[i>>2]|0;d=(b<<1)+e|0;e=c+(e<<1)|0;f[a>>2]=e;f[h>>2]=d;b=(c<<1)+b|0;f[i>>2]=b;c=d-e|0;if((e|0)<0){b=b-e|0;f[h>>2]=c;f[i>>2]=b;f[a>>2]=0;e=0}else c=d;if((c|0)<0){e=e-c|0;f[a>>2]=e;b=b-c|0;f[i>>2]=b;f[h>>2]=0;c=0}g=e-b|0;d=c-b|0;if((b|0)<0){f[a>>2]=g;f[h>>2]=d;f[i>>2]=0;e=g;b=0}else d=c;c=(d|0)<(e|0)?d:e;c=(b|0)<(c|0)?b:c;if((c|0)<=0)return;f[a>>2]=e-c;f[h>>2]=d-c;f[i>>2]=b-c;return}function cb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0;h=(f[a>>2]|0)-(f[b>>2]|0)|0;i=(h|0)<0;d=(f[a+4>>2]|0)-(f[b+4>>2]|0)-(i?h:0)|0;g=(d|0)<0;e=(i?0-h|0:0)+(f[a+8>>2]|0)-(f[b+8>>2]|0)+(g?0-d|0:0)|0;a=(e|0)<0;b=a?0:e;c=(g?0:d)-(a?e:0)|0;e=(i?0:h)-(g?d:0)-(a?e:0)|0;a=(c|0)<(e|0)?c:e;a=(b|0)<(a|0)?b:a;d=(a|0)>0;b=b-(d?a:0)|0;c=c-(d?a:0)|0;a=e-(d?a:0)|0;a=(a|0)>-1?a:0-a|0;c=(c|0)>-1?c:0-c|0;b=(b|0)>-1?b:0-b|0;b=(c|0)>(b|0)?c:b;return ((a|0)>(b|0)?a:b)|0}function db(a,b){a=a|0;b=b|0;var c=0;c=f[a+8>>2]|0;f[b>>2]=(f[a>>2]|0)-c;f[b+4>>2]=(f[a+4>>2]|0)-c;return}function eb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0;d=f[a>>2]|0;f[b>>2]=d;a=f[a+4>>2]|0;h=b+4|0;f[h>>2]=a;i=b+8|0;f[i>>2]=0;c=a-d|0;if((d|0)<0){a=0-d|0;f[h>>2]=c;f[i>>2]=a;f[b>>2]=0;d=0}else{c=a;a=0}if((c|0)<0){d=d-c|0;f[b>>2]=d;a=a-c|0;f[i>>2]=a;f[h>>2]=0;c=0}g=d-a|0;e=c-a|0;if((a|0)<0){f[b>>2]=g;f[h>>2]=e;f[i>>2]=0;c=e;e=g;a=0}else e=d;d=(c|0)<(e|0)?c:e;d=(a|0)<(d|0)?a:d;if((d|0)<=0)return;f[b>>2]=e-d;f[h>>2]=c-d;f[i>>2]=a-d;return}function fb(a){a=a|0;var b=0,c=0,d=0,e=0;b=a+8|0;e=f[b>>2]|0;c=e-(f[a>>2]|0)|0;f[a>>2]=c;d=a+4|0;a=(f[d>>2]|0)-e|0;f[d>>2]=a;f[b>>2]=0-(a+c);return}function gb(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;c=f[a>>2]|0;b=0-c|0;f[a>>2]=b;h=a+8|0;f[h>>2]=0;i=a+4|0;d=f[i>>2]|0;e=d+c|0;if((c|0)>0){f[i>>2]=e;f[h>>2]=c;f[a>>2]=0;b=0;d=e}else c=0;if((d|0)<0){g=b-d|0;f[a>>2]=g;c=c-d|0;f[h>>2]=c;f[i>>2]=0;e=g-c|0;b=0-c|0;if((c|0)<0){f[a>>2]=e;f[i>>2]=b;f[h>>2]=0;d=b;c=0}else{d=0;e=g}}else e=b;b=(d|0)<(e|0)?d:e;b=(c|0)<(b|0)?c:b;if((b|0)<=0)return;f[a>>2]=e-b;f[i>>2]=d-b;f[h>>2]=c-b;return}function hb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=ea;ea=ea+16|0;e=d;ib(a,b,c,e);Ma(e,c+4|0);ea=d;return}function ib(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0.0,g=0,h=0.0,i=0.0,j=0;j=ea;ea=ea+32|0;g=j;Fc(a,g);f[c>>2]=0;e=+Ec(15888,g);h=+Ec(15912,g);if(h<e){f[c>>2]=1;e=h}h=+Ec(15936,g);if(h<e){f[c>>2]=2;e=h}h=+Ec(15960,g);if(h<e){f[c>>2]=3;e=h}h=+Ec(15984,g);if(h<e){f[c>>2]=4;e=h}h=+Ec(16008,g);if(h<e){f[c>>2]=5;e=h}h=+Ec(16032,g);if(h<e){f[c>>2]=6;e=h}h=+Ec(16056,g);if(h<e){f[c>>2]=7;e=h}h=+Ec(16080,g);if(h<e){f[c>>2]=8;e=h}h=+Ec(16104,g);if(h<e){f[c>>2]=9;e=h}h=+Ec(16128,g);if(h<e){f[c>>2]=10;e=h}h=+Ec(16152,g);if(h<e){f[c>>2]=11;e=h}h=+Ec(16176,g);if(h<e){f[c>>2]=12;e=h}h=+Ec(16200,g);if(h<e){f[c>>2]=13;e=h}h=+Ec(16224,g);if(h<e){f[c>>2]=14;e=h}h=+Ec(16248,g);if(h<e){f[c>>2]=15;e=h}h=+Ec(16272,g);if(h<e){f[c>>2]=16;e=h}h=+Ec(16296,g);if(h<e){f[c>>2]=17;e=h}h=+Ec(16320,g);if(h<e){f[c>>2]=18;e=h}h=+Ec(16344,g);if(h<e){f[c>>2]=19;e=h}h=+L(+(1.0-e*.5));if(h<1.0e-16){f[d>>2]=0;f[d+4>>2]=0;f[d+8>>2]=0;f[d+12>>2]=0;ea=j;return}c=f[c>>2]|0;e=+p[16368+(c*24|0)>>3];e=+ob(e-+ob(+ub(15568+(c<<4)|0,a)));if(!(Rb(b)|0))i=e;else i=+ob(e+-.3334731722518321);e=+K(+h)/.381966011250105;if((b|0)>0){g=0;do{e=e*2.6457513110645907;g=g+1|0}while((g|0)!=(b|0))}h=+I(+i)*e;p[d>>3]=h;i=+J(+i)*e;p[d+8>>3]=i;ea=j;return}function jb(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0.0,h=0.0;g=+Bc(a);if(g<1.0e-16){b=15568+(b<<4)|0;f[e>>2]=f[b>>2];f[e+4>>2]=f[b+4>>2];f[e+8>>2]=f[b+8>>2];f[e+12>>2]=f[b+12>>2];return}h=+O(+(+p[a+8>>3]),+(+p[a>>3]));if((c|0)>0){a=0;do{g=g/2.6457513110645907;a=a+1|0}while((a|0)!=(c|0))}if(!d){g=+N(+(g*.381966011250105));if(Rb(c)|0)h=+ob(h+.3334731722518321)}else{g=g/3.0;c=(Rb(c)|0)==0;g=+N(+((c?g:g/2.6457513110645907)*.381966011250105))}vb(15568+(b<<4)|0,+ob(+p[16368+(b*24|0)>>3]-h),g,e);return}function kb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=ea;ea=ea+16|0;e=d;Oa(a+4|0,e);jb(e,f[a>>2]|0,b,0,c);ea=d;return}function lb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0.0,F=0.0;D=ea;ea=ea+384|0;d=D+144|0;e=D+80|0;j=D+368|0;z=D;A=D+352|0;B=D+336|0;C=D+304|0;s=D+288|0;t=D+320|0;u=D+272|0;v=D+256|0;w=D+240|0;x=D+224|0;y=D+208|0;g=d;h=16848;i=g+60|0;do{f[g>>2]=f[h>>2];g=g+4|0;h=h+4|0}while((g|0)<(i|0));g=e;h=16912;i=g+60|0;do{f[g>>2]=f[h>>2];g=g+4|0;h=h+4|0}while((g|0)<(i|0));r=(Rb(b)|0)==0;e=r?d:e;f[j>>2]=f[a>>2];f[j+4>>2]=f[a+4>>2];f[j+8>>2]=f[a+8>>2];f[j+12>>2]=f[a+12>>2];d=j+4|0;ab(d);bb(d);if(!(Rb(b)|0))r=b;else{Wa(d);r=b+1|0}f[z>>2]=f[j>>2];a=z+4|0;Pa(d,e,a);Na(a);f[z+16>>2]=f[j>>2];a=z+20|0;Pa(d,e+12|0,a);Na(a);f[z+32>>2]=f[j>>2];a=z+36|0;Pa(d,e+24|0,a);Na(a);f[z+48>>2]=f[j>>2];a=z+52|0;Pa(d,e+36|0,a);Na(a);f[z+64>>2]=f[j>>2];a=z+68|0;Pa(d,e+48|0,a);Na(a);f[c>>2]=0;a=A+4|0;j=C+4|0;k=16976+(r<<2)|0;l=17056+(r<<2)|0;m=v+8|0;n=w+8|0;o=x+8|0;q=B+4|0;i=0;a:while(1){h=z+(((i>>>0)%5|0)<<4)|0;f[B>>2]=f[h>>2];f[B+4>>2]=f[h+4>>2];f[B+8>>2]=f[h+8>>2];f[B+12>>2]=f[h+12>>2];if((mb(B,r,0,1)|0)==2)do{}while((mb(B,r,0,1)|0)==2);if((i|0)!=0&(Rb(b)|0)!=0){f[C>>2]=f[B>>2];f[C+4>>2]=f[B+4>>2];f[C+8>>2]=f[B+8>>2];f[C+12>>2]=f[B+12>>2];Oa(a,s);e=f[C>>2]|0;g=f[17136+(e*80|0)+(f[A>>2]<<2)>>2]|0;f[C>>2]=f[18736+(e*80|0)+(g*20|0)>>2];h=f[18736+(e*80|0)+(g*20|0)+16>>2]|0;if((h|0)>0){d=0;do{Ya(j);d=d+1|0}while((d|0)<(h|0))}h=18736+(e*80|0)+(g*20|0)+4|0;f[t>>2]=f[h>>2];f[t+4>>2]=f[h+4>>2];f[t+8>>2]=f[h+8>>2];Ra(t,(f[k>>2]|0)*3|0);Pa(j,t,j);Na(j);Oa(j,u);E=+(f[l>>2]|0);p[v>>3]=E*3.0;p[m>>3]=0.0;F=E*-1.5;p[w>>3]=F;p[n>>3]=E*2.598076211353316;p[x>>3]=F;p[o>>3]=E*-2.598076211353316;switch(f[17136+((f[C>>2]|0)*80|0)+(f[B>>2]<<2)>>2]|0){case 1:{d=w;e=v;break}case 3:{d=x;e=w;break}case 2:{d=v;e=x;break}default:{d=14;break a}}Cc(s,u,e,d,y);jb(y,f[C>>2]|0,r,1,c+8+(f[c>>2]<<4)|0);f[c>>2]=(f[c>>2]|0)+1}if(i>>>0<5){Oa(q,C);jb(C,f[B>>2]|0,r,1,c+8+(f[c>>2]<<4)|0);f[c>>2]=(f[c>>2]|0)+1};f[A>>2]=f[B>>2];f[A+4>>2]=f[B+4>>2];f[A+8>>2]=f[B+8>>2];f[A+12>>2]=f[B+12>>2];i=i+1|0;if(i>>>0>=6){d=4;break}}if((d|0)==4){ea=D;return}else if((d|0)==14)$(22177,22224,630,22234)}function mb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;p=ea;ea=ea+32|0;n=p+12|0;i=p;o=a+4|0;m=f[17056+(b<<2)>>2]|0;l=(d|0)!=0;m=l?m*3|0:m;e=f[o>>2]|0;k=a+8|0;h=f[k>>2]|0;if(l){g=a+12|0;d=f[g>>2]|0;e=h+e+d|0;if((e|0)==(m|0)){o=1;ea=p;return o|0}else j=g}else{j=a+12|0;d=f[j>>2]|0;e=h+e+d|0}if((e|0)<=(m|0)){o=0;ea=p;return o|0}do if((d|0)>0){d=f[a>>2]|0;if((h|0)>0){g=18736+(d*80|0)+60|0;d=a;break}d=18736+(d*80|0)+40|0;if(!c){g=d;d=a}else{La(n,m,0,0);Qa(o,n,i);Za(i);Pa(i,n,o);g=d;d=a}}else{g=18736+((f[a>>2]|0)*80|0)+20|0;d=a}while(0);f[d>>2]=f[g>>2];e=g+16|0;if((f[e>>2]|0)>0){d=0;do{Ya(o);d=d+1|0}while((d|0)<(f[e>>2]|0))}a=g+4|0;f[n>>2]=f[a>>2];f[n+4>>2]=f[a+4>>2];f[n+8>>2]=f[a+8>>2];b=f[16976+(b<<2)>>2]|0;Ra(n,l?b*3|0:b);Pa(o,n,o);Na(o);if(l)d=((f[k>>2]|0)+(f[o>>2]|0)+(f[j>>2]|0)|0)==(m|0)?1:2;else d=2;o=d;ea=p;return o|0}function nb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0.0,B=0.0;z=ea;ea=ea+384|0;h=z+176|0;i=z+96|0;u=z+360|0;v=z;w=z+344|0;x=z+328|0;o=z+312|0;q=z+296|0;r=z+280|0;s=z+264|0;t=z+248|0;if(c|0){lb(a,b,d);ea=z;return}c=h;e=20336;g=c+72|0;do{f[c>>2]=f[e>>2];c=c+4|0;e=e+4|0}while((c|0)<(g|0));c=i;e=20416;g=c+72|0;do{f[c>>2]=f[e>>2];c=c+4|0;e=e+4|0}while((c|0)<(g|0));e=(Rb(b)|0)==0;e=e?h:i;f[u>>2]=f[a>>2];f[u+4>>2]=f[a+4>>2];f[u+8>>2]=f[a+8>>2];f[u+12>>2]=f[a+12>>2];c=u+4|0;ab(c);bb(c);if(!(Rb(b)|0))n=b;else{Wa(c);n=b+1|0}f[v>>2]=f[u>>2];a=v+4|0;Pa(c,e,a);Na(a);f[v+16>>2]=f[u>>2];a=v+20|0;Pa(c,e+12|0,a);Na(a);f[v+32>>2]=f[u>>2];a=v+36|0;Pa(c,e+24|0,a);Na(a);f[v+48>>2]=f[u>>2];a=v+52|0;Pa(c,e+36|0,a);Na(a);f[v+64>>2]=f[u>>2];a=v+68|0;Pa(c,e+48|0,a);Na(a);f[v+80>>2]=f[u>>2];a=v+84|0;Pa(c,e+60|0,a);Na(a);f[d>>2]=0;a=17056+(n<<2)|0;j=q+8|0;k=r+8|0;l=s+8|0;m=w+4|0;c=-1;h=0;i=0;a:while(1){g=(i>>>0)%6|0;e=v+(g<<4)|0;f[w>>2]=f[e>>2];f[w+4>>2]=f[e+4>>2];f[w+8>>2]=f[e+8>>2];f[w+12>>2]=f[e+12>>2];e=h;h=mb(w,n,0,1)|0;if((i|0)!=0&(Rb(b)|0)!=0?((e|0)!=1?(f[w>>2]|0)!=(c|0):0):0){Oa(v+((((g+5|0)>>>0)%6|0)<<4)+4|0,x);Oa(v+(g<<4)+4|0,o);A=+(f[a>>2]|0);p[q>>3]=A*3.0;p[j>>3]=0.0;B=A*-1.5;p[r>>3]=B;p[k>>3]=A*2.598076211353316;p[s>>3]=B;p[l>>3]=A*-2.598076211353316;g=f[u>>2]|0;switch(f[17136+(g*80|0)+(((c|0)==(g|0)?f[w>>2]|0:c)<<2)>>2]|0){case 1:{c=r;e=q;break}case 3:{c=s;e=r;break}case 2:{c=q;e=s;break}default:{y=11;break a}}Cc(x,o,e,c,t);if(!(Dc(x,t)|0)?!(Dc(o,t)|0):0){jb(t,f[u>>2]|0,n,1,d+8+(f[d>>2]<<4)|0);f[d>>2]=(f[d>>2]|0)+1}}if(i>>>0<6){Oa(m,x);jb(x,f[w>>2]|0,n,1,d+8+(f[d>>2]<<4)|0);f[d>>2]=(f[d>>2]|0)+1}i=i+1|0;if(i>>>0>=7)break;else c=f[w>>2]|0}if((y|0)==11)$(22260,22224,784,22305);ea=z;return}function ob(a){a=+a;var b=0.0;b=a<0.0?a+6.283185307179586:a;return +(!(a>=6.283185307179586)?b:b+-6.283185307179586)}function pb(a,b,c){a=a|0;b=b|0;c=+c;if(!(+F(+(+p[a>>3]-+p[b>>3]))<c)){b=0;return b|0}b=+F(+(+p[a+8>>3]-+p[b+8>>3]))<c;return b|0}function qb(a,b){a=a|0;b=b|0;if(!(+F(+(+p[a>>3]-+p[b>>3]))<1.7453292519943298e-11)){b=0;return b|0}b=+F(+(+p[a+8>>3]-+p[b+8>>3]))<1.7453292519943298e-11;return b|0}function rb(a){a=+a;if(!(a>1.5707963267948966))return +a;do a=a+-3.141592653589793;while(a>1.5707963267948966);return +a}function sb(a){a=+a;if(a>3.141592653589793)do a=a+-6.283185307179586;while(a>3.141592653589793);if(!(a<-3.141592653589793))return +a;do a=a+6.283185307179586;while(a<-3.141592653589793);return +a}function tb(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;d=+p[b+8>>3];e=+p[a+8>>3];c=+F(+(d-e));if(c>3.141592653589793)c=+F(+((d<0.0?d+6.283185307179586:d)-(e<0.0?e+6.283185307179586:e)));d=1.5707963267948966-+p[a>>3];e=1.5707963267948966-+p[b>>3];e=+I(+d)*+I(+e)+ +I(+c)*(+J(+d)*+J(+e));e=e>1.0?1.0:e;return +(+L(+(e<-1.0?-1.0:e))*6371.007180918475)}function ub(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0,f=0.0,g=0.0;f=+p[b>>3];d=+I(+f);e=+p[b+8>>3]-+p[a+8>>3];g=d*+J(+e);c=+p[a>>3];return +(+O(+g,+(+J(+f)*+I(+c)-+I(+e)*(d*+J(+c)))))}function vb(a,b,c,d){a=a|0;b=+b;c=+c;d=d|0;var e=0,g=0.0,h=0.0,i=0.0;if(c<1.0e-16){f[d>>2]=f[a>>2];f[d+4>>2]=f[a+4>>2];f[d+8>>2]=f[a+8>>2];f[d+12>>2]=f[a+12>>2];return}g=b<0.0?b+6.283185307179586:b;g=!(b>=6.283185307179586)?g:g+-6.283185307179586;do if(g<1.0e-16){b=+p[a>>3]+c;p[d>>3]=b;e=d}else{e=+F(+(g+-3.141592653589793))<1.0e-16;b=+p[a>>3];if(e){b=b-c;p[d>>3]=b;e=d;break}h=+I(+c);c=+J(+c);b=h*+J(+b)+ +I(+g)*(c*+I(+b));b=b>1.0?1.0:b;b=+M(+(b<-1.0?-1.0:b));p[d>>3]=b;if(+F(+(b+-1.5707963267948966))<1.0e-16){p[d>>3]=1.5707963267948966;p[d+8>>3]=0.0;return}if(+F(+(b+1.5707963267948966))<1.0e-16){p[d>>3]=-1.5707963267948966;p[d+8>>3]=0.0;return}i=+I(+b);g=c*+J(+g)/i;c=+p[a>>3];b=(h-+J(+b)*+J(+c))/+I(+c)/i;h=g>1.0?1.0:g;b=+p[a+8>>3]+ +O(+(b<-1.0?-1.0:b>1.0?1.0:h<-1.0?-1.0:h),+b);if(b>3.141592653589793)do b=b+-6.283185307179586;while(b>3.141592653589793);if(b<-3.141592653589793)do b=b+6.283185307179586;while(b<-3.141592653589793);p[d+8>>3]=b;return}while(0);if(+F(+(b+-1.5707963267948966))<1.0e-16){p[e>>3]=1.5707963267948966;p[d+8>>3]=0.0;return}if(+F(+(b+1.5707963267948966))<1.0e-16){p[e>>3]=-1.5707963267948966;p[d+8>>3]=0.0;return}b=+p[a+8>>3];if(b>3.141592653589793)do b=b+-6.283185307179586;while(b>3.141592653589793);if(b<-3.141592653589793)do b=b+6.283185307179586;while(b<-3.141592653589793);p[d+8>>3]=b;return}function wb(a){a=a|0;return +(+p[20496+(a<<3)>>3])}function xb(a){a=a|0;return +(+p[20624+(a<<3)>>3])}function yb(a){a=a|0;return +(+p[20752+(a<<3)>>3])}function zb(a){a=a|0;return +(+p[20880+(a<<3)>>3])}function Ab(a){a=a|0;var b=0;b=21008+(a<<3)|0;a=f[b>>2]|0;Y(f[b+4>>2]|0);return a|0}function Bb(a,b){a=a|0;b=b|0;b=Yc(a|0,b|0,45)|0;Z()|0;return b&127|0}function Cb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;if(!(0==0&(b&2013265920|0)==134217728)){b=0;return b|0}g=Yc(a|0,b|0,45)|0;Z()|0;g=g&127;if(g>>>0>121){b=0;return b|0}c=Yc(a|0,b|0,52)|0;Z()|0;c=c&15;do if(c|0){e=1;d=0;while(1){f=Yc(a|0,b|0,(15-e|0)*3|0)|0;Z()|0;f=f&7;if((f|0)!=0&(d^1))if((f|0)==1&(ya(g)|0)!=0){h=0;d=13;break}else d=1;if((f|0)==7){h=0;d=13;break}if(e>>>0<c>>>0)e=e+1|0;else{d=9;break}}if((d|0)==9){if((c|0)==15)h=1;else break;return h|0}else if((d|0)==13)return h|0}while(0);while(1){h=Yc(a|0,b|0,(14-c|0)*3|0)|0;Z()|0;if(!((h&7|0)==7&0==0)){h=0;d=13;break}if(c>>>0<14)c=c+1|0;else{h=1;d=13;break}}if((d|0)==13)return h|0;return 0}function Db(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=Yc(a|0,b|0,52)|0;Z()|0;d=d&15;if((d|0)>=(c|0)){if((d|0)!=(c|0))if(c>>>0<=15){e=Zc(c|0,0,52)|0;a=e|a;b=Z()|0|b&-15728641;if((d|0)>(c|0))do{e=Zc(7,0,(14-c|0)*3|0)|0;c=c+1|0;a=e|a;b=Z()|0|b}while((c|0)<(d|0))}else{b=0;a=0}}else{b=0;a=0}Y(b|0);return a|0}function Eb(a,b,c){a=a|0;b=b|0;c=c|0;a=Yc(a|0,b|0,52)|0;Z()|0;a=a&15;if((a|0)>(c|0)){c=0;return c|0}c=pc(7,c-a|0)|0;return c|0}function Fb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0;h=Yc(a|0,b|0,52)|0;Z()|0;h=h&15;if((h|0)>(c|0))return;if((h|0)==(c|0)){c=d;f[c>>2]=a;f[c+4>>2]=b;return}j=pc(7,c-h|0)|0;k=(j|0)/7|0;i=Yc(a|0,b|0,45)|0;Z()|0;if(!(ya(i&127)|0))g=0;else{a:do if(!h)e=0;else{g=1;while(1){e=Yc(a|0,b|0,(15-g|0)*3|0)|0;Z()|0;e=e&7;if(e|0)break a;if(g>>>0<h>>>0)g=g+1|0;else{e=0;break}}}while(0);g=(e|0)==0}l=Zc(h+1|0,0,52)|0;e=Z()|0|b&-15728641;i=(14-h|0)*3|0;b=Zc(7,0,i|0)|0;b=(l|a)&~b;h=e&~(Z()|0);Fb(b,h,c,d);e=d+(k<<3)|0;if(!g){l=Zc(1,0,i|0)|0;Fb(l|b,Z()|0|h,c,e);l=e+(k<<3)|0;j=Zc(2,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);l=l+(k<<3)|0;j=Zc(3,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);l=l+(k<<3)|0;j=Zc(4,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);l=l+(k<<3)|0;j=Zc(5,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);j=Zc(6,0,i|0)|0;Fb(j|b,Z()|0|h,c,l+(k<<3)|0);return}g=e+(k<<3)|0;if((j|0)>6){j=e+8|0;l=(g>>>0>j>>>0?g:j)+-1+(0-e)|0;ad(e|0,0,l+8&-8|0)|0;e=j+(l>>>3<<3)|0}l=Zc(2,0,i|0)|0;Fb(l|b,Z()|0|h,c,e);l=e+(k<<3)|0;j=Zc(3,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);l=l+(k<<3)|0;j=Zc(4,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);l=l+(k<<3)|0;j=Zc(5,0,i|0)|0;Fb(j|b,Z()|0|h,c,l);j=Zc(6,0,i|0)|0;Fb(j|b,Z()|0|h,c,l+(k<<3)|0);return}function Gb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;e=Yc(a|0,b|0,45)|0;Z()|0;if(!(ya(e&127)|0)){e=0;return e|0}e=Yc(a|0,b|0,52)|0;Z()|0;e=e&15;a:do if(!e)c=0;else{d=1;while(1){c=Yc(a|0,b|0,(15-d|0)*3|0)|0;Z()|0;c=c&7;if(c|0)break a;if(d>>>0<e>>>0)d=d+1|0;else{c=0;break}}}while(0);e=(c|0)==0&1;return e|0}function Hb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;e=a;d=f[e>>2]|0;e=f[e+4>>2]|0;if(0==0&(e&15728640|0)==0){if((c|0)<=0){x=0;return x|0}x=b;f[x>>2]=d;f[x+4>>2]=e;if((c|0)==1){x=0;return x|0}d=1;do{v=a+(d<<3)|0;w=f[v+4>>2]|0;x=b+(d<<3)|0;f[x>>2]=f[v>>2];f[x+4>>2]=w;d=d+1|0}while((d|0)!=(c|0));d=0;return d|0}v=c<<3;w=Nc(v)|0;$c(w|0,a|0,v|0)|0;u=Pc(c,8)|0;a:do if(c|0){d=c;b:while(1){h=w;l=f[h>>2]|0;h=f[h+4>>2]|0;s=Yc(l|0,h|0,52)|0;Z()|0;s=s&15;t=s+-1|0;r=(d|0)>0;c:do if(r){q=((d|0)<0)<<31>>31;o=Zc(t|0,0,52)|0;p=Z()|0;if(t>>>0>15){e=0;a=l;c=h;while(1){if(!((a|0)==0&(c|0)==0)){g=Yc(a|0,c|0,52)|0;Z()|0;g=g&15;i=(g|0)<(t|0);g=(g|0)==(t|0);k=i?0:g?a:0;a=i?0:g?c:0;c=Xc(k|0,a|0,d|0,q|0)|0;Z()|0;g=u+(c<<3)|0;i=g;j=f[i>>2]|0;i=f[i+4>>2]|0;if((j|0)==0&(i|0)==0)c=k;else{o=0;n=c;m=j;c=k;j=g;while(1){if((o|0)>(d|0)){x=33;break b}if((m|0)==(c|0)&(i&-117440513|0)==(a|0)){g=Yc(m|0,i|0,56)|0;Z()|0;g=g&7;if((g|0)==7){x=38;break b}p=Zc(g+1|0,0,56)|0;a=Z()|0|a&-117440513;f[j>>2]=0;f[j+4>>2]=0;j=n;c=p|c}else j=(n+1|0)%(d|0)|0;g=u+(j<<3)|0;i=g;m=f[i>>2]|0;i=f[i+4>>2]|0;if((m|0)==0&(i|0)==0)break;else{o=o+1|0;n=j;j=g}}}p=g;f[p>>2]=c;f[p+4>>2]=a}e=e+1|0;if((e|0)>=(d|0))break c;c=w+(e<<3)|0;a=f[c>>2]|0;c=f[c+4>>2]|0}}e=0;a=l;c=h;while(1){if(!((a|0)==0&(c|0)==0)){i=Yc(a|0,c|0,52)|0;Z()|0;i=i&15;if((i|0)>=(t|0)){if((i|0)!=(t|0)){a=a|o;c=c&-15728641|p;if(i>>>0>=s>>>0){g=t;do{n=Zc(7,0,(14-g|0)*3|0)|0;g=g+1|0;a=n|a;c=Z()|0|c}while(g>>>0<i>>>0)}}}else{a=0;c=0}i=Xc(a|0,c|0,d|0,q|0)|0;Z()|0;g=u+(i<<3)|0;j=g;k=f[j>>2]|0;j=f[j+4>>2]|0;if(!((k|0)==0&(j|0)==0)){n=0;m=k;k=g;while(1){if((n|0)>(d|0)){x=33;break b}if((m|0)==(a|0)&(j&-117440513|0)==(c|0)){g=Yc(m|0,j|0,56)|0;Z()|0;g=g&7;if((g|0)==7){x=38;break b}m=Zc(g+1|0,0,56)|0;c=Z()|0|c&-117440513;f[k>>2]=0;f[k+4>>2]=0;a=m|a}else i=(i+1|0)%(d|0)|0;g=u+(i<<3)|0;j=g;m=f[j>>2]|0;j=f[j+4>>2]|0;if((m|0)==0&(j|0)==0)break;else{n=n+1|0;k=g}}}n=g;f[n>>2]=a;f[n+4>>2]=c}e=e+1|0;if((e|0)>=(d|0))break c;c=w+(e<<3)|0;a=f[c>>2]|0;c=f[c+4>>2]|0}}while(0);if((d+5|0)>>>0<11){x=84;break}q=Nc(((d|0)/6|0)<<3)|0;d:do if(r){o=0;n=0;do{i=u+(o<<3)|0;a=i;e=f[a>>2]|0;a=f[a+4>>2]|0;if(!((e|0)==0&(a|0)==0)){j=Yc(e|0,a|0,56)|0;Z()|0;j=j&7;c=j+1|0;k=a&-117440513;p=Yc(e|0,a|0,45)|0;Z()|0;e:do if(ya(p&127)|0){m=Yc(e|0,a|0,52)|0;Z()|0;m=m&15;if(m|0){g=1;while(1){p=Zc(7,0,(15-g|0)*3|0)|0;if(!((e&p|0)==0&(k&(Z()|0)|0)==0))break e;if(g>>>0<m>>>0)g=g+1|0;else break}}a=Zc(c|0,0,56)|0;e=a|e;a=Z()|0|k;c=i;f[c>>2]=e;f[c+4>>2]=a;c=j+2|0}while(0);if((c|0)==7){p=q+(n<<3)|0;f[p>>2]=e;f[p+4>>2]=a&-117440513;n=n+1|0}}o=o+1|0}while((o|0)!=(d|0));if(r){p=((d|0)<0)<<31>>31;m=Zc(t|0,0,52)|0;o=Z()|0;if(t>>>0>15){a=0;e=0;while(1){do if(!((l|0)==0&(h|0)==0)){j=Yc(l|0,h|0,52)|0;Z()|0;j=j&15;g=(j|0)<(t|0);j=(j|0)==(t|0);i=g?0:j?l:0;j=g?0:j?h:0;g=Xc(i|0,j|0,d|0,p|0)|0;Z()|0;c=0;while(1){if((c|0)>(d|0)){x=83;break b}s=u+(g<<3)|0;k=f[s+4>>2]|0;if((k&-117440513|0)==(j|0)?(f[s>>2]|0)==(i|0):0){x=55;break}g=(g+1|0)%(d|0)|0;s=u+(g<<3)|0;if((f[s>>2]|0)==(i|0)?(f[s+4>>2]|0)==(j|0):0)break;else c=c+1|0}if((x|0)==55?(x=0,0==0&(k&117440512|0)==100663296):0)break;s=b+(e<<3)|0;f[s>>2]=l;f[s+4>>2]=h;e=e+1|0}while(0);a=a+1|0;if((a|0)>=(d|0)){d=n;break d}h=w+(a<<3)|0;l=f[h>>2]|0;h=f[h+4>>2]|0}}a=0;e=0;while(1){do if(!((l|0)==0&(h|0)==0)){j=Yc(l|0,h|0,52)|0;Z()|0;j=j&15;if((j|0)>=(t|0))if((j|0)!=(t|0)){c=l|m;g=h&-15728641|o;if(j>>>0<s>>>0)j=g;else{i=t;do{r=Zc(7,0,(14-i|0)*3|0)|0;i=i+1|0;c=r|c;g=Z()|0|g}while(i>>>0<j>>>0);j=g}}else{c=l;j=h}else{c=0;j=0}i=Xc(c|0,j|0,d|0,p|0)|0;Z()|0;g=0;while(1){if((g|0)>(d|0)){x=83;break b}r=u+(i<<3)|0;k=f[r+4>>2]|0;if((k&-117440513|0)==(j|0)?(f[r>>2]|0)==(c|0):0){x=78;break}i=(i+1|0)%(d|0)|0;r=u+(i<<3)|0;if((f[r>>2]|0)==(c|0)?(f[r+4>>2]|0)==(j|0):0)break;else g=g+1|0}if((x|0)==78?(x=0,0==0&(k&117440512|0)==100663296):0)break;r=b+(e<<3)|0;f[r>>2]=l;f[r+4>>2]=h;e=e+1|0}while(0);a=a+1|0;if((a|0)>=(d|0)){d=n;break d}h=w+(a<<3)|0;l=f[h>>2]|0;h=f[h+4>>2]|0}}else{e=0;d=n}}else{e=0;d=0}while(0);ad(u|0,0,v|0)|0;$c(w|0,q|0,d<<3|0)|0;Oc(q);if(!d)break a;else b=b+(e<<3)|0}if((x|0)==33){Oc(w);Oc(u);x=-1;return x|0}else if((x|0)==38){Oc(w);Oc(u);x=-2;return x|0}else if((x|0)==83){Oc(q);Oc(w);Oc(u);x=-1;return x|0}else if((x|0)==84){$c(b|0,w|0,d<<3|0)|0;break}}while(0);Oc(w);Oc(u);x=0;return x|0}function Ib(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0;if((b|0)<=0){e=0;return e|0}g=0;l=0;a:while(1){if((g|0)>=(d|0)){g=-1;h=11;break}k=a+(l<<3)|0;i=k;h=f[i>>2]|0;i=f[i+4>>2]|0;do if(!((h|0)==0&(i|0)==0)){j=Yc(h|0,i|0,52)|0;Z()|0;j=j&15;if((j|0)>(e|0)){g=-2;h=11;break a}if((j|0)==(e|0)){k=c+(g<<3)|0;f[k>>2]=h;f[k+4>>2]=i;g=g+1|0;break}h=(pc(7,e-j|0)|0)+g|0;if((h|0)>(d|0)){g=-1;h=11;break a}Fb(f[k>>2]|0,f[k+4>>2]|0,e,c+(g<<3)|0);g=h}while(0);l=l+1|0;if((l|0)>=(b|0)){g=0;h=11;break}}if((h|0)==11)return g|0;return 0}function Jb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;if((b|0)<=0){c=0;return c|0}d=0;h=0;a:while(1){e=a+(h<<3)|0;g=f[e>>2]|0;e=f[e+4>>2]|0;do if(!((g|0)==0&(e|0)==0)){e=Yc(g|0,e|0,52)|0;Z()|0;e=e&15;if((e|0)>(c|0)){d=-1;e=9;break a}if((e|0)==(c|0)){d=d+1|0;break}else{d=(pc(7,c-e|0)|0)+d|0;break}}while(0);h=h+1|0;if((h|0)>=(b|0)){e=9;break}}if((e|0)==9)return d|0;return 0}function Kb(a,b){a=a|0;b=b|0;b=Yc(a|0,b|0,52)|0;Z()|0;return b&1|0}function Lb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;e=Yc(a|0,b|0,52)|0;Z()|0;e=e&15;if(!e){e=0;return e|0}d=1;while(1){c=Yc(a|0,b|0,(15-d|0)*3|0)|0;Z()|0;c=c&7;if(c|0){d=5;break}if(d>>>0<e>>>0)d=d+1|0;else{c=0;d=5;break}}if((d|0)==5)return c|0;return 0}function Mb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;i=Yc(a|0,b|0,52)|0;Z()|0;i=i&15;if(!i){h=b;i=a;Y(h|0);return i|0}h=1;c=0;while(1){f=(15-h|0)*3|0;d=Zc(7,0,f|0)|0;e=Z()|0;g=Yc(a|0,b|0,f|0)|0;Z()|0;f=Zc(_a(g&7)|0,0,f|0)|0;g=Z()|0;a=f|a&~d;b=g|b&~e;a:do if(!c)if(!((f&d|0)==0&(g&e|0)==0)){d=Yc(a|0,b|0,52)|0;Z()|0;d=d&15;if(!d)c=1;else{c=1;b:while(1){g=Yc(a|0,b|0,(15-c|0)*3|0)|0;Z()|0;switch(g&7){case 1:break b;case 0:break;default:{c=1;break a}}if(c>>>0<d>>>0)c=c+1|0;else{c=1;break a}}c=1;while(1){g=(15-c|0)*3|0;e=Yc(a|0,b|0,g|0)|0;Z()|0;f=Zc(7,0,g|0)|0;b=b&~(Z()|0);g=Zc(_a(e&7)|0,0,g|0)|0;a=a&~f|g;b=b|(Z()|0);if(c>>>0<d>>>0)c=c+1|0;else{c=1;break}}}}else c=0;while(0);if(h>>>0<i>>>0)h=h+1|0;else break}Y(b|0);return a|0}function Nb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;d=Yc(a|0,b|0,52)|0;Z()|0;d=d&15;if(!d){c=b;d=a;Y(c|0);return d|0}c=1;while(1){f=(15-c|0)*3|0;g=Yc(a|0,b|0,f|0)|0;Z()|0;e=Zc(7,0,f|0)|0;b=b&~(Z()|0);f=Zc(_a(g&7)|0,0,f|0)|0;a=f|a&~e;b=Z()|0|b;if(c>>>0<d>>>0)c=c+1|0;else break}Y(b|0);return a|0}function Ob(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;i=Yc(a|0,b|0,52)|0;Z()|0;i=i&15;if(!i){h=b;i=a;Y(h|0);return i|0}h=1;c=0;while(1){f=(15-h|0)*3|0;d=Zc(7,0,f|0)|0;e=Z()|0;g=Yc(a|0,b|0,f|0)|0;Z()|0;f=Zc($a(g&7)|0,0,f|0)|0;g=Z()|0;a=f|a&~d;b=g|b&~e;a:do if(!c)if(!((f&d|0)==0&(g&e|0)==0)){d=Yc(a|0,b|0,52)|0;Z()|0;d=d&15;if(!d)c=1;else{c=1;b:while(1){g=Yc(a|0,b|0,(15-c|0)*3|0)|0;Z()|0;switch(g&7){case 1:break b;case 0:break;default:{c=1;break a}}if(c>>>0<d>>>0)c=c+1|0;else{c=1;break a}}c=1;while(1){e=(15-c|0)*3|0;f=Zc(7,0,e|0)|0;g=b&~(Z()|0);b=Yc(a|0,b|0,e|0)|0;Z()|0;b=Zc($a(b&7)|0,0,e|0)|0;a=a&~f|b;b=g|(Z()|0);if(c>>>0<d>>>0)c=c+1|0;else{c=1;break}}}}else c=0;while(0);if(h>>>0<i>>>0)h=h+1|0;else break}Y(b|0);return a|0}function Pb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;d=Yc(a|0,b|0,52)|0;Z()|0;d=d&15;if(!d){c=b;d=a;Y(c|0);return d|0}c=1;while(1){g=(15-c|0)*3|0;f=Zc(7,0,g|0)|0;e=b&~(Z()|0);b=Yc(a|0,b|0,g|0)|0;Z()|0;b=Zc($a(b&7)|0,0,g|0)|0;a=b|a&~f;b=Z()|0|e;if(c>>>0<d>>>0)c=c+1|0;else break}Y(b|0);return a|0}function Qb(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0;j=ea;ea=ea+64|0;i=j+40|0;d=j+24|0;e=j+12|0;g=j;Zc(b|0,0,52)|0;c=Z()|0|134225919;if(!b){if((f[a+4>>2]|0)>2){h=0;i=0;Y(h|0);ea=j;return i|0}if((f[a+8>>2]|0)>2){h=0;i=0;Y(h|0);ea=j;return i|0}if((f[a+12>>2]|0)>2){h=0;i=0;Y(h|0);ea=j;return i|0}Zc(Aa(a)|0,0,45)|0;h=Z()|0|c;i=-1;Y(h|0);ea=j;return i|0};f[i>>2]=f[a>>2];f[i+4>>2]=f[a+4>>2];f[i+8>>2]=f[a+8>>2];f[i+12>>2]=f[a+12>>2];h=i+4|0;if((b|0)>0){a=-1;while(1){f[d>>2]=f[h>>2];f[d+4>>2]=f[h+4>>2];f[d+8>>2]=f[h+8>>2];if(!(b&1)){Ua(h);f[e>>2]=f[h>>2];f[e+4>>2]=f[h+4>>2];f[e+8>>2]=f[h+8>>2];Wa(e)}else{Ta(h);f[e>>2]=f[h>>2];f[e+4>>2]=f[h+4>>2];f[e+8>>2]=f[h+8>>2];Va(e)}Qa(d,e,g);Na(g);l=(15-b|0)*3|0;k=Zc(7,0,l|0)|0;c=c&~(Z()|0);l=Zc(Sa(g)|0,0,l|0)|0;a=l|a&~k;c=Z()|0|c;if((b|0)>1)b=b+-1|0;else break}}else a=-1;a:do if(((f[h>>2]|0)<=2?(f[i+8>>2]|0)<=2:0)?(f[i+12>>2]|0)<=2:0){d=Aa(i)|0;b=Zc(d|0,0,45)|0;b=b|a;a=Z()|0|c&-1040385;g=Ba(i)|0;if(!(ya(d)|0)){if((g|0)<=0)break;e=0;while(1){d=Yc(b|0,a|0,52)|0;Z()|0;d=d&15;if(d){c=1;while(1){l=(15-c|0)*3|0;i=Yc(b|0,a|0,l|0)|0;Z()|0;k=Zc(7,0,l|0)|0;a=a&~(Z()|0);l=Zc(_a(i&7)|0,0,l|0)|0;b=b&~k|l;a=a|(Z()|0);if(c>>>0<d>>>0)c=c+1|0;else break}}e=e+1|0;if((e|0)==(g|0))break a}}e=Yc(b|0,a|0,52)|0;Z()|0;e=e&15;b:do if(e){c=1;c:while(1){l=Yc(b|0,a|0,(15-c|0)*3|0)|0;Z()|0;switch(l&7){case 1:break c;case 0:break;default:break b}if(c>>>0<e>>>0)c=c+1|0;else break b}if(Ca(d,f[i>>2]|0)|0){c=1;while(1){i=(15-c|0)*3|0;k=Zc(7,0,i|0)|0;l=a&~(Z()|0);a=Yc(b|0,a|0,i|0)|0;Z()|0;a=Zc($a(a&7)|0,0,i|0)|0;b=b&~k|a;a=l|(Z()|0);if(c>>>0<e>>>0)c=c+1|0;else break}}else{c=1;while(1){l=(15-c|0)*3|0;i=Yc(b|0,a|0,l|0)|0;Z()|0;k=Zc(7,0,l|0)|0;a=a&~(Z()|0);l=Zc(_a(i&7)|0,0,l|0)|0;b=b&~k|l;a=a|(Z()|0);if(c>>>0<e>>>0)c=c+1|0;else break}}}while(0);if((g|0)>0){c=0;do{b=Mb(b,a)|0;a=Z()|0;c=c+1|0}while((c|0)!=(g|0))}}else{b=0;a=0}while(0);k=a;l=b;Y(k|0);ea=j;return l|0}function Rb(a){a=a|0;return (a|0)%2|0|0}function Sb(a,b){a=a|0;b=b|0;var c=0,d=0;d=ea;ea=ea+16|0;c=d;if((b>>>0<=15?!(0==0?(f[a+4>>2]&2146435072|0)==2146435072:0):0)?!(0==0?(f[a+8+4>>2]&2146435072|0)==2146435072:0):0){hb(a,b,c);b=Qb(c,b)|0;a=Z()|0}else{a=0;b=0}Y(a|0);ea=d;return b|0}function Tb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;e=c+4|0;g=Yc(a|0,b|0,52)|0;Z()|0;g=g&15;h=Yc(a|0,b|0,45)|0;Z()|0;d=(g|0)==0;if(!(ya(h&127)|0)){if(d){h=0;return h|0}if((f[e>>2]|0)==0?(f[c+8>>2]|0)==0:0)d=(f[c+12>>2]|0)!=0&1;else d=1}else if(d){h=1;return h|0}else d=1;c=1;while(1){if(!(c&1))Wa(e);else Va(e);h=Yc(a|0,b|0,(15-c|0)*3|0)|0;Z()|0;Xa(e,h&7);if(c>>>0<g>>>0)c=c+1|0;else break}return d|0}function Ub(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0;l=ea;ea=ea+16|0;j=l;k=Yc(a|0,b|0,45)|0;Z()|0;k=k&127;a:do if((ya(k)|0)!=0?(g=Yc(a|0,b|0,52)|0,Z()|0,g=g&15,(g|0)!=0):0){d=1;b:while(1){i=Yc(a|0,b|0,(15-d|0)*3|0)|0;Z()|0;switch(i&7){case 5:break b;case 0:break;default:{d=b;break a}}if(d>>>0<g>>>0)d=d+1|0;else{d=b;break a}}e=1;d=b;while(1){b=(15-e|0)*3|0;h=Zc(7,0,b|0)|0;i=d&~(Z()|0);d=Yc(a|0,d|0,b|0)|0;Z()|0;d=Zc($a(d&7)|0,0,b|0)|0;a=a&~h|d;d=i|(Z()|0);if(e>>>0<g>>>0)e=e+1|0;else break}}else d=b;while(0);i=7728+(k*28|0)|0;f[c>>2]=f[i>>2];f[c+4>>2]=f[i+4>>2];f[c+8>>2]=f[i+8>>2];f[c+12>>2]=f[i+12>>2];if(!(Tb(a,d,c)|0)){ea=l;return}h=c+4|0;f[j>>2]=f[h>>2];f[j+4>>2]=f[h+4>>2];f[j+8>>2]=f[h+8>>2];g=Yc(a|0,d|0,52)|0;Z()|0;i=g&15;if(!(g&1))g=i;else{Wa(h);g=i+1|0}if(!(ya(k)|0))d=0;else{c:do if(!i)d=0;else{b=1;while(1){e=Yc(a|0,d|0,(15-b|0)*3|0)|0;Z()|0;e=e&7;if(e|0){d=e;break c}if(b>>>0<i>>>0)b=b+1|0;else{d=0;break}}}while(0);d=(d|0)==4&1}if(!(mb(c,g,d,0)|0)){if((g|0)!=(i|0)){f[h>>2]=f[j>>2];f[h+4>>2]=f[j+4>>2];f[h+8>>2]=f[j+8>>2]}}else{if(ya(k)|0)do{}while((mb(c,g,0,0)|0)!=0);if((g|0)!=(i|0))Ua(h)}ea=l;return}function Vb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=ea;ea=ea+16|0;e=d;Ub(a,b,e);b=Yc(a|0,b|0,52)|0;Z()|0;kb(e,b&15,c);ea=d;return}function Wb(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;h=ea;ea=ea+16|0;f=h;Ub(a,b,f);g=Yc(a|0,b|0,52)|0;Z()|0;g=g&15;e=Yc(a|0,b|0,45)|0;Z()|0;if(!(ya(e&127)|0)){b=0;nb(f,g,b,c);ea=h;return}a:do if(!g)d=0;else{e=1;while(1){d=Yc(a|0,b|0,(15-e|0)*3|0)|0;Z()|0;d=d&7;if(d|0)break a;if(e>>>0<g>>>0)e=e+1|0;else{d=0;break}}}while(0);b=(d|0)==0&1;nb(f,g,b,c);ea=h;return}function Xb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0;i=ea;ea=ea+64|0;h=i;if((a|0)==(c|0)&(b|0)==(d|0)|(0!=0|(b&2013265920|0)!=134217728|(0!=0|(d&2013265920|0)!=134217728))){h=0;ea=i;return h|0}e=Yc(a|0,b|0,52)|0;Z()|0;e=e&15;g=Yc(c|0,d|0,52)|0;Z()|0;if((e|0)!=(g&15|0)){h=0;ea=i;return h|0}g=e+-1|0;if(e>>>0>1?(k=Db(a,b,g)|0,j=Z()|0,g=Db(c,d,g)|0,(k|0)==(g|0)&(j|0)==(Z()|0)):0){g=(e^15)*3|0;e=Yc(a|0,b|0,g|0)|0;Z()|0;e=e&7;g=Yc(c|0,d|0,g|0)|0;Z()|0;g=g&7;if((e|0)==0|(g|0)==0){k=1;ea=i;return k|0}if((f[21136+(e<<2)>>2]|0)==(g|0)){k=1;ea=i;return k|0}if((f[21168+(e<<2)>>2]|0)==(g|0)){k=1;ea=i;return k|0}}e=h;g=e+56|0;do{f[e>>2]=0;e=e+4|0}while((e|0)<(g|0));oa(a,b,1,h);k=h;if(((((!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)?(k=h+8|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+16|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+24|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+32|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0)?(k=h+40|0,!((f[k>>2]|0)==(c|0)?(f[k+4>>2]|0)==(d|0):0)):0){e=h+48|0;e=((f[e>>2]|0)==(c|0)?(f[e+4>>2]|0)==(d|0):0)&1}else e=1;k=e;ea=i;return k|0}function Yb(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0;h=ea;ea=ea+16|0;e=h;if(!(Xb(a,b,c,d)|0)){a=0;g=0;Y(a|0);ea=h;return g|0}g=b&-2130706433;f[e>>2]=0;i=sa(a,b,1,e)|0;if(!((i|0)==(c|0)&(Z()|0)==(d|0))){f[e>>2]=0;i=sa(a,b,2,e)|0;if(!((i|0)==(c|0)&(Z()|0)==(d|0))){f[e>>2]=0;i=sa(a,b,3,e)|0;if(!((i|0)==(c|0)&(Z()|0)==(d|0))){f[e>>2]=0;i=sa(a,b,4,e)|0;if(!((i|0)==(c|0)&(Z()|0)==(d|0))){f[e>>2]=0;i=sa(a,b,5,e)|0;if(!((i|0)==(c|0)&(Z()|0)==(d|0))){f[e>>2]=0;i=sa(a,b,6,e)|0;if((i|0)==(c|0)&(Z()|0)==(d|0)){b=0;c=100663296}else{g=0;i=0;Y(g|0);ea=h;return i|0}}else{b=0;c=83886080}}else{b=0;c=67108864}}else{b=0;c=50331648}}else{b=0;c=33554432}}else{b=0;c=16777216}g=g|c|268435456;i=a|b;Y(g|0);ea=h;return i|0}function Zb(a,b){a=a|0;b=b|0;var c=0;c=0==0&(b&2013265920|0)==268435456;Y((c?b&-2130706433|134217728:0)|0);return (c?a:0)|0}function _b(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;d=ea;ea=ea+16|0;c=d;if(!(0==0&(b&2013265920|0)==268435456)){b=0;c=0;Y(b|0);ea=d;return c|0}e=Yc(a|0,b|0,56)|0;Z()|0;f[c>>2]=0;c=sa(a,b&-2130706433|134217728,e&7,c)|0;b=Z()|0;Y(b|0);ea=d;return c|0}function $b(a,b){a=a|0;b=b|0;var c=0;if(!(0==0&(b&2013265920|0)==268435456)){c=0;return c|0}c=Yc(a|0,b|0,56)|0;Z()|0;switch(c&7){case 0:case 7:{c=0;return c|0}default:{}}c=b&-2130706433|134217728;if(0==0&(b&117440512|0)==16777216&(Gb(a,c)|0)!=0){c=0;return c|0}c=Cb(a,c)|0;return c|0}function ac(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0;g=ea;ea=ea+16|0;d=g;h=0==0&(b&2013265920|0)==268435456;e=b&-2130706433|134217728;i=c;f[i>>2]=h?a:0;f[i+4>>2]=h?e:0;if(h){b=Yc(a|0,b|0,56)|0;Z()|0;f[d>>2]=0;a=sa(a,e,b&7,d)|0;b=Z()|0}else{a=0;b=0}i=c+8|0;f[i>>2]=a;f[i+4>>2]=b;ea=g;return}function bc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=(Gb(a,b)|0)==0;b=b&-2130706433;d=c;f[d>>2]=e?a:0;f[d+4>>2]=e?b|285212672:0;d=c+8|0;f[d>>2]=a;f[d+4>>2]=b|301989888;d=c+16|0;f[d>>2]=a;f[d+4>>2]=b|318767104;d=c+24|0;f[d>>2]=a;f[d+4>>2]=b|335544320;d=c+32|0;f[d>>2]=a;f[d+4>>2]=b|352321536;c=c+40|0;f[c>>2]=a;f[c+4>>2]=b|369098752;return}function cc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0;l=ea;ea=ea+368|0;e=l+352|0;i=l+184|0;j=l+16|0;k=l;ad(i|0,0,168)|0;ad(j|0,0,168)|0;f[k>>2]=0;f[k+4>>2]=0;f[k+8>>2]=0;f[k+12>>2]=0;h=0==0&(b&2013265920|0)==268435456;d=b&-2130706433|134217728;Wb(h?a:0,h?d:0,i);if(h){b=Yc(a|0,b|0,56)|0;Z()|0;f[e>>2]=0;a=sa(a,d,b&7,e)|0;b=Z()|0}else{a=0;b=0}Wb(a,b,j);if((f[i>>2]|0)<=0){k=0;f[c>>2]=k;ea=l;return}h=i+24|0;a=0;b=0;g=0;do{e=i+8+(g<<4)|0;a:do if((f[j>>2]|0)>0){d=0;while(1){if(pb(e,j+8+(d<<4)|0,1.0e-06)|0)break;d=d+1|0;if((d|0)>=(f[j>>2]|0))break a}b:do if(!g){if((f[j>>2]|0)>0){d=0;do{if(pb(h,j+8+(d<<4)|0,1.0e-06)|0)break b;d=d+1|0}while((d|0)<(f[j>>2]|0))};f[k>>2]=f[e>>2];f[k+4>>2]=f[e+4>>2];f[k+8>>2]=f[e+8>>2];f[k+12>>2]=f[e+12>>2];b=1;break a}while(0);d=c+8+(a<<4)|0;f[d>>2]=f[e>>2];f[d+4>>2]=f[e+4>>2];f[d+8>>2]=f[e+8>>2];f[d+12>>2]=f[e+12>>2];a=a+1|0}while(0);g=g+1|0}while((g|0)<(f[i>>2]|0));if(!b){k=a;f[c>>2]=k;ea=l;return}j=c+8+(a<<4)|0;f[j>>2]=f[k>>2];f[j+4>>2]=f[k+4>>2];f[j+8>>2]=f[k+8>>2];f[j+12>>2]=f[k+12>>2];k=a+1|0;f[c>>2]=k;ea=l;return}function dc(a){a=a|0;var b=0,c=0,d=0;b=Pc(1,12)|0;if(!b)$(22394,22349,46,22407);c=a+4|0;d=f[c>>2]|0;if(d|0){d=d+8|0;f[d>>2]=b;f[c>>2]=b;return b|0}if(f[a>>2]|0)$(22424,22349,58,22447);d=a;f[d>>2]=b;f[c>>2]=b;return b|0}function ec(a,b){a=a|0;b=b|0;var c=0,d=0;d=Nc(24)|0;if(!d)$(22461,22349,75,22475);f[d>>2]=f[b>>2];f[d+4>>2]=f[b+4>>2];f[d+8>>2]=f[b+8>>2];f[d+12>>2]=f[b+12>>2];f[d+16>>2]=0;b=a+4|0;c=f[b>>2]|0;if(c|0){f[c+16>>2]=d;f[b>>2]=d;return d|0}if(f[a>>2]|0)$(22490,22349,79,22475);f[a>>2]=d;f[b>>2]=d;return d|0}function fc(a){a=a|0;var b=0,c=0,d=0,e=0;if(!a)return;d=1;while(1){b=f[a>>2]|0;if(b|0)do{c=f[b>>2]|0;if(c|0)do{e=c;c=f[c+16>>2]|0;Oc(e)}while((c|0)!=0);e=b;b=f[b+8>>2]|0;Oc(e)}while((b|0)!=0);b=a;a=f[a+8>>2]|0;if(!d)Oc(b);if(!a)break;else d=0}return}function gc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0.0,h=0,i=0.0,j=0.0,k=0,l=0,m=0,n=0,o=0,q=0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,G=0,H=0,I=0,J=0;e=a+8|0;if(f[e>>2]|0){J=1;return J|0}d=f[a>>2]|0;if(!d){J=0;return J|0}b=d;c=0;do{c=c+1|0;b=f[b+8>>2]|0}while((b|0)!=0);if(c>>>0<2){J=0;return J|0}H=Nc(c<<2)|0;if(!H)$(22510,22349,312,22529);G=Nc(c<<5)|0;if(!G)$(22551,22349,316,22529);f[a>>2]=0;y=a+4|0;f[y>>2]=0;f[e>>2]=0;c=0;E=0;x=0;m=0;a:while(1){l=f[d>>2]|0;if(l){g=0.0;h=l;do{j=+p[h+8>>3];b=h;h=f[h+16>>2]|0;k=(h|0)==0;e=k?l:h;i=+p[e+8>>3];if(+F(+(j-i))>3.141592653589793){J=14;break}g=g+(i-j)*(+p[b>>3]+ +p[e>>3])}while(!k);if((J|0)==14){J=0;g=0.0;b=l;do{w=+p[b+8>>3];D=b+16|0;C=f[D>>2]|0;C=(C|0)==0?l:C;v=+p[C+8>>3];g=g+(+p[b>>3]+ +p[C>>3])*((v<0.0?v+6.283185307179586:v)-(w<0.0?w+6.283185307179586:w));b=f[((b|0)==0?d:D)>>2]|0}while((b|0)!=0)}if(g>0.0){f[H+(E<<2)>>2]=d;E=E+1|0;e=x;b=m}else J=19}else J=19;if((J|0)==19){J=0;do if(!c)if(!m)if(!(f[a>>2]|0)){e=y;h=a;b=d;c=a;break}else{J=27;break a}else{e=y;h=m+8|0;b=d;c=a;break}else{b=c+8|0;if(f[b>>2]|0){J=21;break a}c=Pc(1,12)|0;if(!c){J=23;break a}f[b>>2]=c;e=c+4|0;h=c;b=m}while(0);f[h>>2]=d;f[e>>2]=d;h=G+(x<<5)|0;k=f[d>>2]|0;if(k){l=G+(x<<5)+8|0;p[l>>3]=1797693134862315708145274.0e284;m=G+(x<<5)+24|0;p[m>>3]=1797693134862315708145274.0e284;p[h>>3]=-1797693134862315708145274.0e284;n=G+(x<<5)+16|0;p[n>>3]=-1797693134862315708145274.0e284;t=1797693134862315708145274.0e284;u=-1797693134862315708145274.0e284;e=0;o=k;j=1797693134862315708145274.0e284;r=1797693134862315708145274.0e284;s=-1797693134862315708145274.0e284;i=-1797693134862315708145274.0e284;while(1){g=+p[o>>3];w=+p[o+8>>3];o=f[o+16>>2]|0;q=(o|0)==0;v=+p[(q?k:o)+8>>3];if(g<j){p[l>>3]=g;j=g}if(w<r){p[m>>3]=w;r=w}if(g>s)p[h>>3]=g;else g=s;if(w>i){p[n>>3]=w;i=w}t=w>0.0&w<t?w:t;u=w<0.0&w>u?w:u;e=e|+F(+(w-v))>3.141592653589793;if(q)break;else s=g}if(e){p[n>>3]=u;p[m>>3]=t}}else{f[h>>2]=0;f[h+4>>2]=0;f[h+8>>2]=0;f[h+12>>2]=0;f[h+16>>2]=0;f[h+20>>2]=0;f[h+24>>2]=0;f[h+28>>2]=0}e=x+1|0}D=d+8|0;d=f[D>>2]|0;f[D>>2]=0;if(!d){J=45;break}else{x=e;m=b}}if((J|0)==21)$(22327,22349,32,22361);else if((J|0)==23)$(22381,22349,34,22361);else if((J|0)==27)$(22424,22349,58,22447);else if((J|0)==45){b:do if((E|0)>0){D=(e|0)==0;B=e<<2;C=(a|0)==0;A=0;b=0;while(1){z=f[H+(A<<2)>>2]|0;if(!D){x=Nc(B)|0;if(!x){J=50;break}y=Nc(B)|0;if(!y){J=52;break}c:do if(!C){e=0;c=0;h=a;while(1){d=G+(e<<5)|0;if(hc(f[h>>2]|0,d,f[z>>2]|0)|0){f[x+(c<<2)>>2]=h;f[y+(c<<2)>>2]=d;q=c+1|0}else q=c;h=f[h+8>>2]|0;if(!h)break;else{e=e+1|0;c=q}}if((q|0)>0){d=f[x>>2]|0;if((q|0)==1)c=d;else{n=0;o=-1;c=d;m=d;while(1){k=f[m>>2]|0;d=0;h=0;while(1){e=f[f[x+(h<<2)>>2]>>2]|0;if((e|0)==(k|0))l=d;else l=d+((hc(e,f[y+(h<<2)>>2]|0,f[k>>2]|0)|0)&1)|0;h=h+1|0;if((h|0)==(q|0))break;else d=l}e=(l|0)>(o|0);c=e?m:c;d=n+1|0;if((d|0)==(q|0))break c;n=d;o=e?l:o;m=f[x+(d<<2)>>2]|0}}}else c=0}else c=0;while(0);Oc(x);Oc(y);if(c){e=c+4|0;d=f[e>>2]|0;if(!d){if(f[c>>2]|0){J=70;break}}else c=d+8|0;f[c>>2]=z;f[e>>2]=z}else J=73}else J=73;if((J|0)==73){J=0;b=f[z>>2]|0;if(b|0)do{y=b;b=f[b+16>>2]|0;Oc(y)}while((b|0)!=0);Oc(z);b=2}A=A+1|0;if((A|0)>=(E|0)){I=b;break b}}if((J|0)==50)$(22566,22349,246,22585);else if((J|0)==52)$(22604,22349,248,22585);else if((J|0)==70)$(22424,22349,58,22447)}else I=0;while(0);Oc(H);Oc(G);J=I;return J|0}return 0}function hc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0.0,e=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0.0,l=0;if(!(Ja(b,c)|0)){a=0;return a|0}b=Ha(b)|0;k=+p[c>>3];d=+p[c+8>>3];d=b&d<0.0?d+6.283185307179586:d;a=f[a>>2]|0;if(!a){a=0;return a|0}if(b){b=0;c=a;a:while(1){while(1){h=+p[c>>3];j=+p[c+8>>3];c=c+16|0;l=f[c>>2]|0;l=(l|0)==0?a:l;g=+p[l>>3];e=+p[l+8>>3];if(h>g){i=h;h=j}else{i=g;g=h;h=e;e=j}if(!(k<g|k>i))break;c=f[c>>2]|0;if(!c){c=22;break a}}j=e<0.0?e+6.283185307179586:e;h=h<0.0?h+6.283185307179586:h;d=h==d|j==d?d+-2.220446049250313e-16:d;j=j+(k-g)/(i-g)*(h-j);if((j<0.0?j+6.283185307179586:j)>d)b=b^1;c=f[c>>2]|0;if(!c){c=22;break}}if((c|0)==22)return b|0}else{b=0;c=a;b:while(1){while(1){h=+p[c>>3];j=+p[c+8>>3];c=c+16|0;l=f[c>>2]|0;l=(l|0)==0?a:l;g=+p[l>>3];e=+p[l+8>>3];if(h>g){i=h;h=j}else{i=g;g=h;h=e;e=j}if(!(k<g|k>i))break;c=f[c>>2]|0;if(!c){c=22;break b}}d=h==d|e==d?d+-2.220446049250313e-16:d;if(e+(k-g)/(i-g)*(h-e)>d)b=b^1;c=f[c>>2]|0;if(!c){c=22;break}}if((c|0)==22)return b|0}return 0}function ic(a,c,d,e,g){a=a|0;c=c|0;d=d|0;e=e|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;u=ea;ea=ea+32|0;t=u+16|0;s=u;h=Yc(a|0,c|0,52)|0;Z()|0;h=h&15;p=Yc(d|0,e|0,52)|0;Z()|0;if((h|0)!=(p&15|0)){t=1;ea=u;return t|0}l=Yc(a|0,c|0,45)|0;Z()|0;l=l&127;m=Yc(d|0,e|0,45)|0;Z()|0;m=m&127;p=(l|0)!=(m|0);if(p){j=Ea(l,m)|0;if((j|0)==7){t=2;ea=u;return t|0}k=Ea(m,l)|0;if((k|0)==7)$(22628,22652,147,22662);else{q=j;i=k}}else{q=0;i=0}n=ya(l)|0;o=ya(m)|0;f[t>>2]=0;f[t+4>>2]=0;f[t+8>>2]=0;f[t+12>>2]=0;do if(!q){Tb(d,e,t)|0;if((n|0)!=0&(o|0)!=0){if((m|0)!=(l|0))$(22780,22652,246,22662);i=Lb(a,c)|0;h=Lb(d,e)|0;if((b[22096+(i*7|0)+h>>0]|0)==0?(b[22032+(i*7|0)+h>>0]|0)==0:0){i=f[21200+(i*28|0)+(h<<2)>>2]|0;if((i|0)>0){j=t+4|0;h=0;do{Za(j);h=h+1|0}while((h|0)!=(i|0));r=55}else r=55}else h=5}else r=55}else{m=f[4304+(l*28|0)+(q<<2)>>2]|0;j=(m|0)>0;if(!o)if(j){l=0;k=d;j=e;do{k=Pb(k,j)|0;j=Z()|0;i=$a(i)|0;l=l+1|0}while((l|0)!=(m|0));m=i;l=k;k=j}else{m=i;l=d;k=e}else if(j){l=0;k=d;j=e;do{k=Ob(k,j)|0;j=Z()|0;i=$a(i)|0;if((i|0)==1)i=$a(1)|0;l=l+1|0}while((l|0)!=(m|0));m=i;l=k;k=j}else{m=i;l=d;k=e}Tb(l,k,t)|0;if(!p)$(22675,22652,177,22662);j=(n|0)!=0;i=(o|0)!=0;if(j&i)$(22702,22652,178,22662);if(!j)if(i){i=Lb(l,k)|0;if(Rb(h)|0?b[22096+(i*7|0)+m>>0]|0:0){h=4;break}if((Rb(h)|0)==0?b[22032+(i*7|0)+m>>0]|0:0){h=4;break}l=0;k=f[21200+(m*28|0)+(i<<2)>>2]|0;r=30}else i=0;else{i=Lb(a,c)|0;if(b[22096+(i*7|0)+q>>0]|0){h=3;break}if(b[22032+(i*7|0)+q>>0]|0){h=3;break}k=f[21200+(i*28|0)+(q<<2)>>2]|0;l=k;r=30}if((r|0)==30){if((k|0)<=-1)$(22733,22652,215,22662);if((l|0)<=-1)$(22756,22652,216,22662);if((k|0)>0){j=t+4|0;i=0;do{Za(j);i=i+1|0}while((i|0)!=(k|0));i=l}else i=l};f[s>>2]=0;f[s+4>>2]=0;f[s+8>>2]=0;Xa(s,q);if(h|0)while(1){if(!(Rb(h)|0))Wa(s);else Va(s);if((h|0)>1)h=h+-1|0;else break}if((i|0)>0){h=0;do{Za(s);h=h+1|0}while((h|0)!=(i|0))}r=t+4|0;Pa(r,s,r);Na(r);r=55}while(0);if((r|0)==55){h=t+4|0;f[g>>2]=f[h>>2];f[g+4>>2]=f[h+4>>2];f[g+8>>2]=f[h+8>>2];h=0}t=h;ea=u;return t|0}function jc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;p=ea;ea=ea+48|0;h=p+36|0;i=p+24|0;j=p+12|0;k=p;g=Yc(a|0,b|0,52)|0;Z()|0;g=g&15;n=Yc(a|0,b|0,45)|0;Z()|0;n=n&127;l=ya(n)|0;Zc(g|0,0,52)|0;r=Z()|0|134225919;q=d;f[q>>2]=-1;f[q+4>>2]=r;if(!g){if((f[c>>2]|0)>1){r=1;ea=p;return r|0}e=Da(n,Sa(c)|0)|0;if((e|0)==127){r=1;ea=p;return r|0}o=Zc(e|0,0,45)|0;q=Z()|0;n=d;q=f[n+4>>2]&-1040385|q;r=d;f[r>>2]=f[n>>2]|o;f[r+4>>2]=q;r=0;ea=p;return r|0};f[h>>2]=f[c>>2];f[h+4>>2]=f[c+4>>2];f[h+8>>2]=f[c+8>>2];while(1){f[i>>2]=f[h>>2];f[i+4>>2]=f[h+4>>2];f[i+8>>2]=f[h+8>>2];if(!(Rb(g)|0)){Ua(h);f[j>>2]=f[h>>2];f[j+4>>2]=f[h+4>>2];f[j+8>>2]=f[h+8>>2];Wa(j)}else{Ta(h);f[j>>2]=f[h>>2];f[j+4>>2]=f[h+4>>2];f[j+8>>2]=f[h+8>>2];Va(j)}Qa(i,j,k);Na(k);q=d;s=f[q>>2]|0;q=f[q+4>>2]|0;t=(15-g|0)*3|0;c=Zc(7,0,t|0)|0;q=q&~(Z()|0);t=Zc(Sa(k)|0,0,t|0)|0;q=Z()|0|q;r=d;f[r>>2]=t|s&~c;f[r+4>>2]=q;if((g|0)>1)g=g+-1|0;else break}a:do if(((f[h>>2]|0)<=1?(f[h+4>>2]|0)<=1:0)?(f[h+8>>2]|0)<=1:0){g=Sa(h)|0;i=Da(n,g)|0;if((i|0)==127)k=0;else k=ya(i)|0;b:do if(!g)if((l|0)!=0&(k|0)!=0){t=Lb(a,b)|0;g=d;g=21408+(t*28|0)+((Lb(f[g>>2]|0,f[g+4>>2]|0)|0)<<2)|0;g=f[g>>2]|0;if((g|0)<=-1)$(22904,22652,437,22837);if(!g){e=i;g=53}else{h=d;e=0;c=f[h>>2]|0;h=f[h+4>>2]|0;do{c=Nb(c,h)|0;h=Z()|0;t=d;f[t>>2]=c;f[t+4>>2]=h;e=e+1|0}while((e|0)<(g|0));e=i;g=52}}else{e=i;g=52}else{if(l){h=21408+((Lb(a,b)|0)*28|0)+(g<<2)|0;h=f[h>>2]|0;if((h|0)>0){c=0;do{g=_a(g)|0;c=c+1|0}while((c|0)!=(h|0))}if((g|0)==1){e=3;break a}c=Da(n,g)|0;if((c|0)==127)$(22807,22652,380,22837);if(!(ya(c)|0)){o=h;m=g;e=c}else $(22850,22652,381,22837)}else{o=0;m=g;e=i}j=f[4304+(n*28|0)+(m<<2)>>2]|0;if((j|0)<=-1)$(22881,22652,388,22837);if(!k){if((o|0)<=-1)$(22733,22652,421,22837);if(o|0){h=d;g=0;c=f[h>>2]|0;h=f[h+4>>2]|0;do{c=Nb(c,h)|0;h=Z()|0;t=d;f[t>>2]=c;f[t+4>>2]=h;g=g+1|0}while((g|0)<(o|0))}if((j|0)<=0){g=52;break}h=d;g=0;c=f[h>>2]|0;h=f[h+4>>2]|0;while(1){c=Nb(c,h)|0;h=Z()|0;t=d;f[t>>2]=c;f[t+4>>2]=h;g=g+1|0;if((g|0)==(j|0)){g=52;break b}}}i=Ea(e,n)|0;if((i|0)==7)$(22628,22652,397,22837);g=d;c=f[g>>2]|0;g=f[g+4>>2]|0;if((j|0)>0){h=0;do{c=Nb(c,g)|0;g=Z()|0;t=d;f[t>>2]=c;f[t+4>>2]=g;h=h+1|0}while((h|0)!=(j|0))}c=Lb(c,g)|0;t=za(e)|0;c=f[(t?21824:21616)+(i*28|0)+(c<<2)>>2]|0;if((c|0)<=-1)$(22733,22652,416,22837);if(!c)g=52;else{i=d;g=0;h=f[i>>2]|0;i=f[i+4>>2]|0;do{h=Mb(h,i)|0;i=Z()|0;t=d;f[t>>2]=h;f[t+4>>2]=i;g=g+1|0}while((g|0)<(c|0));g=52}}while(0);if((g|0)==52)if(k)g=53;if((g|0)==53){t=d;if((Lb(f[t>>2]|0,f[t+4>>2]|0)|0)==1){e=4;break}}t=d;r=f[t>>2]|0;t=f[t+4>>2]&-1040385;s=Zc(e|0,0,45)|0;t=t|(Z()|0);e=d;f[e>>2]=r|s;f[e+4>>2]=t;e=0}else e=2;while(0);t=e;ea=p;return t|0}function kc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;g=ea;ea=ea+16|0;f=g;a=ic(a,b,c,d,f)|0;if(!a){db(f,e);a=0}ea=g;return a|0}function lc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=ea;ea=ea+16|0;f=e;eb(c,f);d=jc(a,b,f,d)|0;ea=e;return d|0}function mc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;g=ea;ea=ea+32|0;e=g+12|0;f=g;if((ic(a,b,a,b,e)|0)==0?(ic(a,b,c,d,f)|0)==0:0)a=cb(e,f)|0;else a=-1;ea=g;return a|0}function nc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;g=ea;ea=ea+32|0;e=g+12|0;f=g;if((ic(a,b,a,b,e)|0)==0?(ic(a,b,c,d,f)|0)==0:0)a=cb(e,f)|0;else a=-1;ea=g;return (a>>>31^1)+a|0}function oc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0.0,j=0.0,k=0,l=0,m=0,n=0,o=0.0,p=0.0,q=0.0,r=0,s=0,t=0,u=0,v=0,w=0,x=0.0;w=ea;ea=ea+48|0;g=w+24|0;h=w+12|0;v=w;if((ic(a,b,a,b,g)|0)==0?(ic(a,b,c,d,h)|0)==0:0){u=cb(g,h)|0;if((u|0)<0){v=u;ea=w;return v|0};f[g>>2]=0;f[g+4>>2]=0;f[g+8>>2]=0;f[h>>2]=0;f[h+4>>2]=0;f[h+8>>2]=0;ic(a,b,a,b,g)|0;ic(a,b,c,d,h)|0;fb(g);fb(h);if(!u){d=g+4|0;n=g+8|0;r=d;s=n;t=g;c=f[g>>2]|0;d=f[d>>2]|0;g=f[n>>2]|0;p=0.0;q=0.0;o=0.0}else{l=f[g>>2]|0;o=+(u|0);r=g+4|0;m=f[r>>2]|0;s=g+8|0;n=f[s>>2]|0;t=g;c=l;d=m;g=n;p=+((f[h>>2]|0)-l|0)/o;q=+((f[h+4>>2]|0)-m|0)/o;o=+((f[h+8>>2]|0)-n|0)/o}f[v>>2]=c;n=v+4|0;f[n>>2]=d;m=v+8|0;f[m>>2]=g;l=0;while(1){j=+(l|0);x=p*j+ +(c|0);i=q*j+ +(f[r>>2]|0);j=o*j+ +(f[s>>2]|0);d=~~+_c(+x);h=~~+_c(+i);c=~~+_c(+j);x=+F(+(+(d|0)-x));i=+F(+(+(h|0)-i));j=+F(+(+(c|0)-j));do if(!(x>i&x>j)){k=0-d|0;if(i>j){g=k-c|0;break}else{g=h;c=k-h|0;break}}else{d=0-(h+c)|0;g=h}while(0);f[v>>2]=d;f[n>>2]=g;f[m>>2]=c;gb(v);jc(a,b,v,e+(l<<3)|0)|0;if((l|0)==(u|0))break;l=l+1|0;c=f[t>>2]|0}v=0;ea=w;return v|0}v=-1;ea=w;return v|0}function pc(a,b){a=a|0;b=b|0;var c=0;if(!b){c=1;return c|0}c=a;a=1;do{a=S((b&1|0)==0?1:c,a)|0;b=b>>1;c=S(c,c)|0}while((b|0)!=0);return a|0}function qc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0.0,e=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0,l=0,m=0,n=0.0;if(!(Ja(b,c)|0)){m=0;return m|0}b=Ha(b)|0;n=+p[c>>3];d=+p[c+8>>3];d=b&d<0.0?d+6.283185307179586:d;m=f[a>>2]|0;if((m|0)<=0){m=0;return m|0}l=f[a+4>>2]|0;if(b){b=0;c=-1;a=0;a:while(1){k=a;while(1){h=+p[l+(k<<4)>>3];j=+p[l+(k<<4)+8>>3];a=(c+2|0)%(m|0)|0;g=+p[l+(a<<4)>>3];e=+p[l+(a<<4)+8>>3];if(h>g){i=h;h=j}else{i=g;g=h;h=e;e=j}if(!(n<g|n>i))break;c=k+1|0;if((c|0)<(m|0)){a=k;k=c;c=a}else{c=22;break a}}j=e<0.0?e+6.283185307179586:e;h=h<0.0?h+6.283185307179586:h;d=h==d|j==d?d+-2.220446049250313e-16:d;j=j+(n-g)/(i-g)*(h-j);if((j<0.0?j+6.283185307179586:j)>d)b=b^1;a=k+1|0;if((a|0)>=(m|0)){c=22;break}else c=k}if((c|0)==22)return b|0}else{b=0;c=-1;a=0;b:while(1){k=a;while(1){h=+p[l+(k<<4)>>3];j=+p[l+(k<<4)+8>>3];a=(c+2|0)%(m|0)|0;g=+p[l+(a<<4)>>3];e=+p[l+(a<<4)+8>>3];if(h>g){i=h;h=j}else{i=g;g=h;h=e;e=j}if(!(n<g|n>i))break;c=k+1|0;if((c|0)<(m|0)){a=k;k=c;c=a}else{c=22;break b}}d=h==d|e==d?d+-2.220446049250313e-16:d;if(e+(n-g)/(i-g)*(h-e)>d)b=b^1;a=k+1|0;if((a|0)>=(m|0)){c=22;break}else c=k}if((c|0)==22)return b|0}return 0}function rc(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0.0,l=0.0,m=0,n=0,o=0,q=0,r=0,s=0,t=0,u=0;q=f[a>>2]|0;if(!q){f[b>>2]=0;f[b+4>>2]=0;f[b+8>>2]=0;f[b+12>>2]=0;f[b+16>>2]=0;f[b+20>>2]=0;f[b+24>>2]=0;f[b+28>>2]=0;return}r=b+8|0;p[r>>3]=1797693134862315708145274.0e284;s=b+24|0;p[s>>3]=1797693134862315708145274.0e284;p[b>>3]=-1797693134862315708145274.0e284;t=b+16|0;p[t>>3]=-1797693134862315708145274.0e284;if((q|0)<=0)return;n=f[a+4>>2]|0;k=1797693134862315708145274.0e284;l=-1797693134862315708145274.0e284;m=0;a=-1;g=1797693134862315708145274.0e284;h=1797693134862315708145274.0e284;j=-1797693134862315708145274.0e284;d=-1797693134862315708145274.0e284;o=0;while(1){c=+p[n+(o<<4)>>3];i=+p[n+(o<<4)+8>>3];a=a+2|0;e=+p[n+(((a|0)==(q|0)?0:a)<<4)+8>>3];if(c<g){p[r>>3]=c;g=c}if(i<h){p[s>>3]=i;h=i}if(c>j)p[b>>3]=c;else c=j;if(i>d){p[t>>3]=i;d=i}k=i>0.0&i<k?i:k;l=i<0.0&i>l?i:l;m=m|+F(+(i-e))>3.141592653589793;a=o+1|0;if((a|0)==(q|0))break;else{u=o;j=c;o=a;a=u}}if(!m)return;p[t>>3]=l;p[s>>3]=k;return}function sc(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0.0,h=0.0,i=0.0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;q=f[a>>2]|0;if(q){r=b+8|0;p[r>>3]=1797693134862315708145274.0e284;s=b+24|0;p[s>>3]=1797693134862315708145274.0e284;p[b>>3]=-1797693134862315708145274.0e284;t=b+16|0;p[t>>3]=-1797693134862315708145274.0e284;if((q|0)>0){e=f[a+4>>2]|0;n=1797693134862315708145274.0e284;o=-1797693134862315708145274.0e284;d=0;c=-1;j=1797693134862315708145274.0e284;k=1797693134862315708145274.0e284;m=-1797693134862315708145274.0e284;h=-1797693134862315708145274.0e284;u=0;while(1){g=+p[e+(u<<4)>>3];l=+p[e+(u<<4)+8>>3];y=c+2|0;i=+p[e+(((y|0)==(q|0)?0:y)<<4)+8>>3];if(g<j){p[r>>3]=g;j=g}if(l<k){p[s>>3]=l;k=l}if(g>m)p[b>>3]=g;else g=m;if(l>h){p[t>>3]=l;h=l}n=l>0.0&l<n?l:n;o=l<0.0&l>o?l:o;d=d|+F(+(l-i))>3.141592653589793;c=u+1|0;if((c|0)==(q|0))break;else{y=u;m=g;u=c;c=y}}if(d){p[t>>3]=o;p[s>>3]=n}}}else{f[b>>2]=0;f[b+4>>2]=0;f[b+8>>2]=0;f[b+12>>2]=0;f[b+16>>2]=0;f[b+20>>2]=0;f[b+24>>2]=0;f[b+28>>2]=0}y=a+8|0;c=f[y>>2]|0;if((c|0)<=0)return;x=a+12|0;w=0;do{e=f[x>>2]|0;d=w;w=w+1|0;s=b+(w<<5)|0;t=f[e+(d<<3)>>2]|0;if(t){u=b+(w<<5)+8|0;p[u>>3]=1797693134862315708145274.0e284;a=b+(w<<5)+24|0;p[a>>3]=1797693134862315708145274.0e284;p[s>>3]=-1797693134862315708145274.0e284;v=b+(w<<5)+16|0;p[v>>3]=-1797693134862315708145274.0e284;if((t|0)>0){q=f[e+(d<<3)+4>>2]|0;n=1797693134862315708145274.0e284;o=-1797693134862315708145274.0e284;e=0;d=-1;r=0;j=1797693134862315708145274.0e284;k=1797693134862315708145274.0e284;l=-1797693134862315708145274.0e284;h=-1797693134862315708145274.0e284;while(1){g=+p[q+(r<<4)>>3];m=+p[q+(r<<4)+8>>3];d=d+2|0;i=+p[q+(((d|0)==(t|0)?0:d)<<4)+8>>3];if(g<j){p[u>>3]=g;j=g}if(m<k){p[a>>3]=m;k=m}if(g>l)p[s>>3]=g;else g=l;if(m>h){p[v>>3]=m;h=m}n=m>0.0&m<n?m:n;o=m<0.0&m>o?m:o;e=e|+F(+(m-i))>3.141592653589793;d=r+1|0;if((d|0)==(t|0))break;else{z=r;r=d;l=g;d=z}}if(e){p[v>>3]=o;p[a>>3]=n}}}else{f[s>>2]=0;f[s+4>>2]=0;f[s+8>>2]=0;f[s+12>>2]=0;f[s+16>>2]=0;f[s+20>>2]=0;f[s+24>>2]=0;f[s+28>>2]=0;c=f[y>>2]|0}}while((w|0)<(c|0));return}function tc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0;if(!(qc(a,b,c)|0)){e=0;return e|0}e=a+8|0;if((f[e>>2]|0)<=0){e=1;return e|0}d=a+12|0;a=0;while(1){g=a;a=a+1|0;if(qc((f[d>>2]|0)+(g<<3)|0,b+(a<<5)|0,c)|0){a=0;d=6;break}if((a|0)>=(f[e>>2]|0)){a=1;d=6;break}}if((d|0)==6)return a|0;return 0}function uc(){return 8}function vc(){return 16}function wc(){return 168}function xc(){return 8}function yc(){return 16}function zc(){return 12}function Ac(){return 8}function Bc(a){a=a|0;var b=0.0,c=0.0;c=+p[a>>3];b=+p[a+8>>3];return +(+G(+(c*c+b*b)))}function Cc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0.0,g=0.0,h=0.0,i=0.0,j=0.0,k=0.0,l=0.0,m=0.0;j=+p[a>>3];i=+p[b>>3]-j;h=+p[a+8>>3];g=+p[b+8>>3]-h;l=+p[c>>3];f=+p[d>>3]-l;m=+p[c+8>>3];k=+p[d+8>>3]-m;f=(f*(h-m)-(j-l)*k)/(i*k-g*f);p[e>>3]=j+i*f;p[e+8>>3]=h+g*f;return}function Dc(a,b){a=a|0;b=b|0;if(!(+p[a>>3]==+p[b>>3])){b=0;return b|0}b=+p[a+8>>3]==+p[b+8>>3];return b|0}function Ec(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;e=+p[a>>3]-+p[b>>3];d=+p[a+8>>3]-+p[b+8>>3];c=+p[a+16>>3]-+p[b+16>>3];return +(e*e+d*d+c*c)}function Fc(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0;c=+p[a>>3];d=+I(+c);c=+J(+c);p[b+16>>3]=c;c=+p[a+8>>3];e=d*+I(+c);p[b>>3]=e;c=d*+J(+c);p[b+8>>3]=c;return}function Gc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if((b|0)>0){d=Pc(b,4)|0;f[a>>2]=d;if(!d)$(22933,22956,37,22970)}else f[a>>2]=0;f[a+4>>2]=b;f[a+8>>2]=0;f[a+12>>2]=c;return}function Hc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0;e=a+4|0;g=a+12|0;h=a+8|0;a:while(1){c=f[e>>2]|0;b=0;while(1){if((b|0)>=(c|0))break a;d=f[a>>2]|0;i=f[d+(b<<2)>>2]|0;if(!i)b=b+1|0;else break}b=d+(~~(+F(+(+H(10.0,+(+(15-(f[g>>2]|0)|0)))*(+p[i>>3]+ +p[i+8>>3])))%+(c|0))>>>0<<2)|0;c=f[b>>2]|0;b:do if(c|0){d=i+32|0;if((c|0)==(i|0))f[b>>2]=f[d>>2];else{c=c+32|0;b=f[c>>2]|0;if(!b)break;while(1){if((b|0)==(i|0))break;c=b+32|0;b=f[c>>2]|0;if(!b)break b}f[c>>2]=f[d>>2]}Oc(i);f[h>>2]=(f[h>>2]|0)+-1}while(0)}Oc(f[a>>2]|0);return}function Ic(a){a=a|0;var b=0,c=0,d=0;d=f[a+4>>2]|0;c=0;while(1){if((c|0)>=(d|0)){b=0;c=4;break}b=f[(f[a>>2]|0)+(c<<2)>>2]|0;if(!b)c=c+1|0;else{c=4;break}}if((c|0)==4)return b|0;return 0}function Jc(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,g=0;c=~~(+F(+(+H(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3])))%+(f[a+4>>2]|0))>>>0;c=(f[a>>2]|0)+(c<<2)|0;d=f[c>>2]|0;if(!d){g=1;return g|0}g=b+32|0;do if((d|0)!=(b|0)){c=f[d+32>>2]|0;if(!c){g=1;return g|0}e=c;while(1){if((e|0)==(b|0)){e=8;break}c=f[e+32>>2]|0;if(!c){c=1;e=10;break}else{d=e;e=c}}if((e|0)==8){f[d+32>>2]=f[g>>2];break}else if((e|0)==10)return c|0}else f[c>>2]=f[g>>2];while(0);Oc(b);g=a+8|0;f[g>>2]=(f[g>>2]|0)+-1;g=0;return g|0}function Kc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,g=0,h=0;g=Nc(40)|0;if(!g)$(22986,22956,95,22999);f[g>>2]=f[b>>2];f[g+4>>2]=f[b+4>>2];f[g+8>>2]=f[b+8>>2];f[g+12>>2]=f[b+12>>2];e=g+16|0;f[e>>2]=f[c>>2];f[e+4>>2]=f[c+4>>2];f[e+8>>2]=f[c+8>>2];f[e+12>>2]=f[c+12>>2];f[g+32>>2]=0;e=~~(+F(+(+H(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3])))%+(f[a+4>>2]|0))>>>0;e=(f[a>>2]|0)+(e<<2)|0;d=f[e>>2]|0;do if(!d)f[e>>2]=g;else{while(1){if(qb(d,b)|0?qb(d+16|0,c)|0:0)break;e=f[d+32>>2]|0;d=(e|0)==0?d:e;if(!(f[d+32>>2]|0)){h=10;break}}if((h|0)==10){f[d+32>>2]=g;break}Oc(g);h=d;return h|0}while(0);h=a+8|0;f[h>>2]=(f[h>>2]|0)+1;h=g;return h|0}function Lc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=~~(+F(+(+H(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3])))%+(f[a+4>>2]|0))>>>0;e=f[(f[a>>2]|0)+(e<<2)>>2]|0;if(!e){c=0;return c|0}if(!c){a=e;while(1){if(qb(a,b)|0){d=10;break}a=f[a+32>>2]|0;if(!a){a=0;d=10;break}}if((d|0)==10)return a|0}a=e;while(1){if(qb(a,b)|0?qb(a+16|0,c)|0:0){d=10;break}a=f[a+32>>2]|0;if(!a){a=0;d=10;break}}if((d|0)==10)return a|0;return 0}function Mc(a,b){a=a|0;b=b|0;var c=0;c=~~(+F(+(+H(10.0,+(+(15-(f[a+12>>2]|0)|0)))*(+p[b>>3]+ +p[b+8>>3])))%+(f[a+4>>2]|0))>>>0;a=f[(f[a>>2]|0)+(c<<2)>>2]|0;if(!a){c=0;return c|0}while(1){if(qb(a,b)|0){b=5;break}a=f[a+32>>2]|0;if(!a){a=0;b=5;break}}if((b|0)==5)return a|0;return 0}function Nc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;w=ea;ea=ea+16|0;n=w;do if(a>>>0<245){k=a>>>0<11?16:a+11&-8;a=k>>>3;m=f[5756]|0;c=m>>>a;if(c&3|0){b=(c&1^1)+a|0;a=23064+(b<<1<<2)|0;c=a+8|0;d=f[c>>2]|0;e=d+8|0;g=f[e>>2]|0;if((g|0)==(a|0))f[5756]=m&~(1<<b);else{f[g+12>>2]=a;f[c>>2]=g}v=b<<3;f[d+4>>2]=v|3;v=d+v+4|0;f[v>>2]=f[v>>2]|1;v=e;ea=w;return v|0}l=f[5758]|0;if(k>>>0>l>>>0){if(c|0){b=2<<a;b=c<<a&(b|0-b);b=(b&0-b)+-1|0;i=b>>>12&16;b=b>>>i;c=b>>>5&8;b=b>>>c;g=b>>>2&4;b=b>>>g;a=b>>>1&2;b=b>>>a;d=b>>>1&1;d=(c|i|g|a|d)+(b>>>d)|0;b=23064+(d<<1<<2)|0;a=b+8|0;g=f[a>>2]|0;i=g+8|0;c=f[i>>2]|0;if((c|0)==(b|0)){a=m&~(1<<d);f[5756]=a}else{f[c+12>>2]=b;f[a>>2]=c;a=m}v=d<<3;h=v-k|0;f[g+4>>2]=k|3;e=g+k|0;f[e+4>>2]=h|1;f[g+v>>2]=h;if(l|0){d=f[5761]|0;b=l>>>3;c=23064+(b<<1<<2)|0;b=1<<b;if(!(a&b)){f[5756]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=d;f[b+12>>2]=d;f[d+8>>2]=b;f[d+12>>2]=c}f[5758]=h;f[5761]=e;v=i;ea=w;return v|0}g=f[5757]|0;if(g){c=(g&0-g)+-1|0;e=c>>>12&16;c=c>>>e;d=c>>>5&8;c=c>>>d;h=c>>>2&4;c=c>>>h;i=c>>>1&2;c=c>>>i;j=c>>>1&1;j=f[23328+((d|e|h|i|j)+(c>>>j)<<2)>>2]|0;c=j;i=j;j=(f[j+4>>2]&-8)-k|0;while(1){a=f[c+16>>2]|0;if(!a){a=f[c+20>>2]|0;if(!a)break}h=(f[a+4>>2]&-8)-k|0;e=h>>>0<j>>>0;c=a;i=e?a:i;j=e?h:j}h=i+k|0;if(h>>>0>i>>>0){e=f[i+24>>2]|0;b=f[i+12>>2]|0;do if((b|0)==(i|0)){a=i+20|0;b=f[a>>2]|0;if(!b){a=i+16|0;b=f[a>>2]|0;if(!b){c=0;break}}while(1){d=b+20|0;c=f[d>>2]|0;if(!c){d=b+16|0;c=f[d>>2]|0;if(!c)break;else{b=c;a=d}}else{b=c;a=d}}f[a>>2]=0;c=b}else{c=f[i+8>>2]|0;f[c+12>>2]=b;f[b+8>>2]=c;c=b}while(0);do if(e|0){b=f[i+28>>2]|0;a=23328+(b<<2)|0;if((i|0)==(f[a>>2]|0)){f[a>>2]=c;if(!c){f[5757]=g&~(1<<b);break}}else{v=e+16|0;f[((f[v>>2]|0)==(i|0)?v:e+20|0)>>2]=c;if(!c)break}f[c+24>>2]=e;b=f[i+16>>2]|0;if(b|0){f[c+16>>2]=b;f[b+24>>2]=c}b=f[i+20>>2]|0;if(b|0){f[c+20>>2]=b;f[b+24>>2]=c}}while(0);if(j>>>0<16){v=j+k|0;f[i+4>>2]=v|3;v=i+v+4|0;f[v>>2]=f[v>>2]|1}else{f[i+4>>2]=k|3;f[h+4>>2]=j|1;f[h+j>>2]=j;if(l|0){d=f[5761]|0;b=l>>>3;c=23064+(b<<1<<2)|0;b=1<<b;if(!(b&m)){f[5756]=b|m;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=d;f[b+12>>2]=d;f[d+8>>2]=b;f[d+12>>2]=c}f[5758]=j;f[5761]=h}v=i+8|0;ea=w;return v|0}else m=k}else m=k}else m=k}else if(a>>>0<=4294967231){a=a+11|0;k=a&-8;d=f[5757]|0;if(d){e=0-k|0;a=a>>>8;if(a)if(k>>>0>16777215)j=31;else{m=(a+1048320|0)>>>16&8;q=a<<m;i=(q+520192|0)>>>16&4;q=q<<i;j=(q+245760|0)>>>16&2;j=14-(i|m|j)+(q<<j>>>15)|0;j=k>>>(j+7|0)&1|j<<1}else j=0;c=f[23328+(j<<2)>>2]|0;a:do if(!c){c=0;a=0;q=61}else{a=0;i=k<<((j|0)==31?0:25-(j>>>1)|0);g=0;while(1){h=(f[c+4>>2]&-8)-k|0;if(h>>>0<e>>>0)if(!h){a=c;e=0;q=65;break a}else{a=c;e=h}q=f[c+20>>2]|0;c=f[c+16+(i>>>31<<2)>>2]|0;g=(q|0)==0|(q|0)==(c|0)?g:q;if(!c){c=g;q=61;break}else i=i<<1}}while(0);if((q|0)==61){if((c|0)==0&(a|0)==0){a=2<<j;a=(a|0-a)&d;if(!a){m=k;break}m=(a&0-a)+-1|0;h=m>>>12&16;m=m>>>h;g=m>>>5&8;m=m>>>g;i=m>>>2&4;m=m>>>i;j=m>>>1&2;m=m>>>j;c=m>>>1&1;a=0;c=f[23328+((g|h|i|j|c)+(m>>>c)<<2)>>2]|0}if(!c){i=a;h=e}else q=65}if((q|0)==65){g=c;while(1){m=(f[g+4>>2]&-8)-k|0;c=m>>>0<e>>>0;e=c?m:e;a=c?g:a;c=f[g+16>>2]|0;if(!c)c=f[g+20>>2]|0;if(!c){i=a;h=e;break}else g=c}}if(((i|0)!=0?h>>>0<((f[5758]|0)-k|0)>>>0:0)?(l=i+k|0,l>>>0>i>>>0):0){g=f[i+24>>2]|0;b=f[i+12>>2]|0;do if((b|0)==(i|0)){a=i+20|0;b=f[a>>2]|0;if(!b){a=i+16|0;b=f[a>>2]|0;if(!b){b=0;break}}while(1){e=b+20|0;c=f[e>>2]|0;if(!c){e=b+16|0;c=f[e>>2]|0;if(!c)break;else{b=c;a=e}}else{b=c;a=e}}f[a>>2]=0}else{v=f[i+8>>2]|0;f[v+12>>2]=b;f[b+8>>2]=v}while(0);do if(g){a=f[i+28>>2]|0;c=23328+(a<<2)|0;if((i|0)==(f[c>>2]|0)){f[c>>2]=b;if(!b){d=d&~(1<<a);f[5757]=d;break}}else{v=g+16|0;f[((f[v>>2]|0)==(i|0)?v:g+20|0)>>2]=b;if(!b)break}f[b+24>>2]=g;a=f[i+16>>2]|0;if(a|0){f[b+16>>2]=a;f[a+24>>2]=b}a=f[i+20>>2]|0;if(a){f[b+20>>2]=a;f[a+24>>2]=b}}while(0);b:do if(h>>>0<16){v=h+k|0;f[i+4>>2]=v|3;v=i+v+4|0;f[v>>2]=f[v>>2]|1}else{f[i+4>>2]=k|3;f[l+4>>2]=h|1;f[l+h>>2]=h;b=h>>>3;if(h>>>0<256){c=23064+(b<<1<<2)|0;a=f[5756]|0;b=1<<b;if(!(a&b)){f[5756]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=l;f[b+12>>2]=l;f[l+8>>2]=b;f[l+12>>2]=c;break}b=h>>>8;if(b)if(h>>>0>16777215)c=31;else{u=(b+1048320|0)>>>16&8;v=b<<u;t=(v+520192|0)>>>16&4;v=v<<t;c=(v+245760|0)>>>16&2;c=14-(t|u|c)+(v<<c>>>15)|0;c=h>>>(c+7|0)&1|c<<1}else c=0;b=23328+(c<<2)|0;f[l+28>>2]=c;a=l+16|0;f[a+4>>2]=0;f[a>>2]=0;a=1<<c;if(!(d&a)){f[5757]=d|a;f[b>>2]=l;f[l+24>>2]=b;f[l+12>>2]=l;f[l+8>>2]=l;break}b=f[b>>2]|0;c:do if((f[b+4>>2]&-8|0)!=(h|0)){d=h<<((c|0)==31?0:25-(c>>>1)|0);while(1){c=b+16+(d>>>31<<2)|0;a=f[c>>2]|0;if(!a)break;if((f[a+4>>2]&-8|0)==(h|0)){b=a;break c}else{d=d<<1;b=a}}f[c>>2]=l;f[l+24>>2]=b;f[l+12>>2]=l;f[l+8>>2]=l;break b}while(0);u=b+8|0;v=f[u>>2]|0;f[v+12>>2]=l;f[u>>2]=l;f[l+8>>2]=v;f[l+12>>2]=b;f[l+24>>2]=0}while(0);v=i+8|0;ea=w;return v|0}else m=k}else m=k}else m=-1;while(0);c=f[5758]|0;if(c>>>0>=m>>>0){b=c-m|0;a=f[5761]|0;if(b>>>0>15){v=a+m|0;f[5761]=v;f[5758]=b;f[v+4>>2]=b|1;f[a+c>>2]=b;f[a+4>>2]=m|3}else{f[5758]=0;f[5761]=0;f[a+4>>2]=c|3;v=a+c+4|0;f[v>>2]=f[v>>2]|1}v=a+8|0;ea=w;return v|0}h=f[5759]|0;if(h>>>0>m>>>0){t=h-m|0;f[5759]=t;v=f[5762]|0;u=v+m|0;f[5762]=u;f[u+4>>2]=t|1;f[v+4>>2]=m|3;v=v+8|0;ea=w;return v|0}if(!(f[5874]|0)){f[5876]=4096;f[5875]=4096;f[5877]=-1;f[5878]=-1;f[5879]=0;f[5867]=0;f[5874]=n&-16^1431655768;a=4096}else a=f[5876]|0;i=m+48|0;j=m+47|0;g=a+j|0;e=0-a|0;k=g&e;if(k>>>0<=m>>>0){v=0;ea=w;return v|0}a=f[5866]|0;if(a|0?(l=f[5864]|0,n=l+k|0,n>>>0<=l>>>0|n>>>0>a>>>0):0){v=0;ea=w;return v|0}d:do if(!(f[5867]&4)){c=f[5762]|0;e:do if(c){d=23472;while(1){n=f[d>>2]|0;if(n>>>0<=c>>>0?(n+(f[d+4>>2]|0)|0)>>>0>c>>>0:0)break;a=f[d+8>>2]|0;if(!a){q=128;break e}else d=a}b=g-h&e;if(b>>>0<2147483647){a=cd(b|0)|0;if((a|0)==((f[d>>2]|0)+(f[d+4>>2]|0)|0)){if((a|0)!=(-1|0)){h=b;g=a;q=145;break d}}else{d=a;q=136}}else b=0}else q=128;while(0);do if((q|0)==128){c=cd(0)|0;if((c|0)!=(-1|0)?(b=c,o=f[5875]|0,p=o+-1|0,b=((p&b|0)==0?0:(p+b&0-o)-b|0)+k|0,o=f[5864]|0,p=b+o|0,b>>>0>m>>>0&b>>>0<2147483647):0){n=f[5866]|0;if(n|0?p>>>0<=o>>>0|p>>>0>n>>>0:0){b=0;break}a=cd(b|0)|0;if((a|0)==(c|0)){h=b;g=c;q=145;break d}else{d=a;q=136}}else b=0}while(0);do if((q|0)==136){c=0-b|0;if(!(i>>>0>b>>>0&(b>>>0<2147483647&(d|0)!=(-1|0))))if((d|0)==(-1|0)){b=0;break}else{h=b;g=d;q=145;break d}a=f[5876]|0;a=j-b+a&0-a;if(a>>>0>=2147483647){h=b;g=d;q=145;break d}if((cd(a|0)|0)==(-1|0)){cd(c|0)|0;b=0;break}else{h=a+b|0;g=d;q=145;break d}}while(0);f[5867]=f[5867]|4;q=143}else{b=0;q=143}while(0);if(((q|0)==143?k>>>0<2147483647:0)?(t=cd(k|0)|0,p=cd(0)|0,r=p-t|0,s=r>>>0>(m+40|0)>>>0,!((t|0)==(-1|0)|s^1|t>>>0<p>>>0&((t|0)!=(-1|0)&(p|0)!=(-1|0))^1)):0){h=s?r:b;g=t;q=145}if((q|0)==145){b=(f[5864]|0)+h|0;f[5864]=b;if(b>>>0>(f[5865]|0)>>>0)f[5865]=b;j=f[5762]|0;f:do if(j){b=23472;while(1){a=f[b>>2]|0;c=f[b+4>>2]|0;if((g|0)==(a+c|0)){q=154;break}d=f[b+8>>2]|0;if(!d)break;else b=d}if(((q|0)==154?(u=b+4|0,(f[b+12>>2]&8|0)==0):0)?g>>>0>j>>>0&a>>>0<=j>>>0:0){f[u>>2]=c+h;v=(f[5759]|0)+h|0;t=j+8|0;t=(t&7|0)==0?0:0-t&7;u=j+t|0;t=v-t|0;f[5762]=u;f[5759]=t;f[u+4>>2]=t|1;f[j+v+4>>2]=40;f[5763]=f[5878];break}if(g>>>0<(f[5760]|0)>>>0)f[5760]=g;c=g+h|0;b=23472;while(1){if((f[b>>2]|0)==(c|0)){q=162;break}a=f[b+8>>2]|0;if(!a)break;else b=a}if((q|0)==162?(f[b+12>>2]&8|0)==0:0){f[b>>2]=g;l=b+4|0;f[l>>2]=(f[l>>2]|0)+h;l=g+8|0;l=g+((l&7|0)==0?0:0-l&7)|0;b=c+8|0;b=c+((b&7|0)==0?0:0-b&7)|0;k=l+m|0;i=b-l-m|0;f[l+4>>2]=m|3;g:do if((j|0)==(b|0)){v=(f[5759]|0)+i|0;f[5759]=v;f[5762]=k;f[k+4>>2]=v|1}else{if((f[5761]|0)==(b|0)){v=(f[5758]|0)+i|0;f[5758]=v;f[5761]=k;f[k+4>>2]=v|1;f[k+v>>2]=v;break}a=f[b+4>>2]|0;if((a&3|0)==1){h=a&-8;d=a>>>3;h:do if(a>>>0<256){a=f[b+8>>2]|0;c=f[b+12>>2]|0;if((c|0)==(a|0)){f[5756]=f[5756]&~(1<<d);break}else{f[a+12>>2]=c;f[c+8>>2]=a;break}}else{g=f[b+24>>2]|0;a=f[b+12>>2]|0;do if((a|0)==(b|0)){c=b+16|0;d=c+4|0;a=f[d>>2]|0;if(!a){a=f[c>>2]|0;if(!a){a=0;break}}else c=d;while(1){e=a+20|0;d=f[e>>2]|0;if(!d){e=a+16|0;d=f[e>>2]|0;if(!d)break;else{a=d;c=e}}else{a=d;c=e}}f[c>>2]=0}else{v=f[b+8>>2]|0;f[v+12>>2]=a;f[a+8>>2]=v}while(0);if(!g)break;c=f[b+28>>2]|0;d=23328+(c<<2)|0;do if((f[d>>2]|0)!=(b|0)){v=g+16|0;f[((f[v>>2]|0)==(b|0)?v:g+20|0)>>2]=a;if(!a)break h}else{f[d>>2]=a;if(a|0)break;f[5757]=f[5757]&~(1<<c);break h}while(0);f[a+24>>2]=g;c=b+16|0;d=f[c>>2]|0;if(d|0){f[a+16>>2]=d;f[d+24>>2]=a}c=f[c+4>>2]|0;if(!c)break;f[a+20>>2]=c;f[c+24>>2]=a}while(0);b=b+h|0;e=h+i|0}else e=i;b=b+4|0;f[b>>2]=f[b>>2]&-2;f[k+4>>2]=e|1;f[k+e>>2]=e;b=e>>>3;if(e>>>0<256){c=23064+(b<<1<<2)|0;a=f[5756]|0;b=1<<b;if(!(a&b)){f[5756]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=k;f[b+12>>2]=k;f[k+8>>2]=b;f[k+12>>2]=c;break}b=e>>>8;do if(!b)d=0;else{if(e>>>0>16777215){d=31;break}u=(b+1048320|0)>>>16&8;v=b<<u;t=(v+520192|0)>>>16&4;v=v<<t;d=(v+245760|0)>>>16&2;d=14-(t|u|d)+(v<<d>>>15)|0;d=e>>>(d+7|0)&1|d<<1}while(0);b=23328+(d<<2)|0;f[k+28>>2]=d;a=k+16|0;f[a+4>>2]=0;f[a>>2]=0;a=f[5757]|0;c=1<<d;if(!(a&c)){f[5757]=a|c;f[b>>2]=k;f[k+24>>2]=b;f[k+12>>2]=k;f[k+8>>2]=k;break}b=f[b>>2]|0;i:do if((f[b+4>>2]&-8|0)!=(e|0)){d=e<<((d|0)==31?0:25-(d>>>1)|0);while(1){c=b+16+(d>>>31<<2)|0;a=f[c>>2]|0;if(!a)break;if((f[a+4>>2]&-8|0)==(e|0)){b=a;break i}else{d=d<<1;b=a}}f[c>>2]=k;f[k+24>>2]=b;f[k+12>>2]=k;f[k+8>>2]=k;break g}while(0);u=b+8|0;v=f[u>>2]|0;f[v+12>>2]=k;f[u>>2]=k;f[k+8>>2]=v;f[k+12>>2]=b;f[k+24>>2]=0}while(0);v=l+8|0;ea=w;return v|0}b=23472;while(1){a=f[b>>2]|0;if(a>>>0<=j>>>0?(v=a+(f[b+4>>2]|0)|0,v>>>0>j>>>0):0)break;b=f[b+8>>2]|0}e=v+-47|0;a=e+8|0;a=e+((a&7|0)==0?0:0-a&7)|0;e=j+16|0;a=a>>>0<e>>>0?j:a;b=a+8|0;c=h+-40|0;t=g+8|0;t=(t&7|0)==0?0:0-t&7;u=g+t|0;t=c-t|0;f[5762]=u;f[5759]=t;f[u+4>>2]=t|1;f[g+c+4>>2]=40;f[5763]=f[5878];c=a+4|0;f[c>>2]=27;f[b>>2]=f[5868];f[b+4>>2]=f[5869];f[b+8>>2]=f[5870];f[b+12>>2]=f[5871];f[5868]=g;f[5869]=h;f[5871]=0;f[5870]=b;b=a+24|0;do{u=b;b=b+4|0;f[b>>2]=7}while((u+8|0)>>>0<v>>>0);if((a|0)!=(j|0)){g=a-j|0;f[c>>2]=f[c>>2]&-2;f[j+4>>2]=g|1;f[a>>2]=g;b=g>>>3;if(g>>>0<256){c=23064+(b<<1<<2)|0;a=f[5756]|0;b=1<<b;if(!(a&b)){f[5756]=a|b;b=c;a=c+8|0}else{a=c+8|0;b=f[a>>2]|0}f[a>>2]=j;f[b+12>>2]=j;f[j+8>>2]=b;f[j+12>>2]=c;break}b=g>>>8;if(b)if(g>>>0>16777215)d=31;else{u=(b+1048320|0)>>>16&8;v=b<<u;t=(v+520192|0)>>>16&4;v=v<<t;d=(v+245760|0)>>>16&2;d=14-(t|u|d)+(v<<d>>>15)|0;d=g>>>(d+7|0)&1|d<<1}else d=0;c=23328+(d<<2)|0;f[j+28>>2]=d;f[j+20>>2]=0;f[e>>2]=0;b=f[5757]|0;a=1<<d;if(!(b&a)){f[5757]=b|a;f[c>>2]=j;f[j+24>>2]=c;f[j+12>>2]=j;f[j+8>>2]=j;break}b=f[c>>2]|0;j:do if((f[b+4>>2]&-8|0)!=(g|0)){d=g<<((d|0)==31?0:25-(d>>>1)|0);while(1){c=b+16+(d>>>31<<2)|0;a=f[c>>2]|0;if(!a)break;if((f[a+4>>2]&-8|0)==(g|0)){b=a;break j}else{d=d<<1;b=a}}f[c>>2]=j;f[j+24>>2]=b;f[j+12>>2]=j;f[j+8>>2]=j;break f}while(0);u=b+8|0;v=f[u>>2]|0;f[v+12>>2]=j;f[u>>2]=j;f[j+8>>2]=v;f[j+12>>2]=b;f[j+24>>2]=0}}else{v=f[5760]|0;if((v|0)==0|g>>>0<v>>>0)f[5760]=g;f[5868]=g;f[5869]=h;f[5871]=0;f[5765]=f[5874];f[5764]=-1;f[5769]=23064;f[5768]=23064;f[5771]=23072;f[5770]=23072;f[5773]=23080;f[5772]=23080;f[5775]=23088;f[5774]=23088;f[5777]=23096;f[5776]=23096;f[5779]=23104;f[5778]=23104;f[5781]=23112;f[5780]=23112;f[5783]=23120;f[5782]=23120;f[5785]=23128;f[5784]=23128;f[5787]=23136;f[5786]=23136;f[5789]=23144;f[5788]=23144;f[5791]=23152;f[5790]=23152;f[5793]=23160;f[5792]=23160;f[5795]=23168;f[5794]=23168;f[5797]=23176;f[5796]=23176;f[5799]=23184;f[5798]=23184;f[5801]=23192;f[5800]=23192;f[5803]=23200;f[5802]=23200;f[5805]=23208;f[5804]=23208;f[5807]=23216;f[5806]=23216;f[5809]=23224;f[5808]=23224;f[5811]=23232;f[5810]=23232;f[5813]=23240;f[5812]=23240;f[5815]=23248;f[5814]=23248;f[5817]=23256;f[5816]=23256;f[5819]=23264;f[5818]=23264;f[5821]=23272;f[5820]=23272;f[5823]=23280;f[5822]=23280;f[5825]=23288;f[5824]=23288;f[5827]=23296;f[5826]=23296;f[5829]=23304;f[5828]=23304;f[5831]=23312;f[5830]=23312;v=h+-40|0;t=g+8|0;t=(t&7|0)==0?0:0-t&7;u=g+t|0;t=v-t|0;f[5762]=u;f[5759]=t;f[u+4>>2]=t|1;f[g+v+4>>2]=40;f[5763]=f[5878]}while(0);b=f[5759]|0;if(b>>>0>m>>>0){t=b-m|0;f[5759]=t;v=f[5762]|0;u=v+m|0;f[5762]=u;f[u+4>>2]=t|1;f[v+4>>2]=m|3;v=v+8|0;ea=w;return v|0}}v=Qc()|0;f[v>>2]=12;v=0;ea=w;return v|0}function Oc(a){a=a|0;var b=0,c=0,d=0,e=0,g=0,h=0,i=0,j=0;if(!a)return;c=a+-8|0;e=f[5760]|0;a=f[a+-4>>2]|0;b=a&-8;j=c+b|0;do if(!(a&1)){d=f[c>>2]|0;if(!(a&3))return;h=c+(0-d)|0;g=d+b|0;if(h>>>0<e>>>0)return;if((f[5761]|0)==(h|0)){a=j+4|0;b=f[a>>2]|0;if((b&3|0)!=3){i=h;b=g;break}f[5758]=g;f[a>>2]=b&-2;f[h+4>>2]=g|1;f[h+g>>2]=g;return}c=d>>>3;if(d>>>0<256){a=f[h+8>>2]|0;b=f[h+12>>2]|0;if((b|0)==(a|0)){f[5756]=f[5756]&~(1<<c);i=h;b=g;break}else{f[a+12>>2]=b;f[b+8>>2]=a;i=h;b=g;break}}e=f[h+24>>2]|0;a=f[h+12>>2]|0;do if((a|0)==(h|0)){b=h+16|0;c=b+4|0;a=f[c>>2]|0;if(!a){a=f[b>>2]|0;if(!a){a=0;break}}else b=c;while(1){d=a+20|0;c=f[d>>2]|0;if(!c){d=a+16|0;c=f[d>>2]|0;if(!c)break;else{a=c;b=d}}else{a=c;b=d}}f[b>>2]=0}else{i=f[h+8>>2]|0;f[i+12>>2]=a;f[a+8>>2]=i}while(0);if(e){b=f[h+28>>2]|0;c=23328+(b<<2)|0;if((f[c>>2]|0)==(h|0)){f[c>>2]=a;if(!a){f[5757]=f[5757]&~(1<<b);i=h;b=g;break}}else{i=e+16|0;f[((f[i>>2]|0)==(h|0)?i:e+20|0)>>2]=a;if(!a){i=h;b=g;break}}f[a+24>>2]=e;b=h+16|0;c=f[b>>2]|0;if(c|0){f[a+16>>2]=c;f[c+24>>2]=a}b=f[b+4>>2]|0;if(b){f[a+20>>2]=b;f[b+24>>2]=a;i=h;b=g}else{i=h;b=g}}else{i=h;b=g}}else{i=c;h=c}while(0);if(h>>>0>=j>>>0)return;a=j+4|0;d=f[a>>2]|0;if(!(d&1))return;if(!(d&2)){if((f[5762]|0)==(j|0)){j=(f[5759]|0)+b|0;f[5759]=j;f[5762]=i;f[i+4>>2]=j|1;if((i|0)!=(f[5761]|0))return;f[5761]=0;f[5758]=0;return}if((f[5761]|0)==(j|0)){j=(f[5758]|0)+b|0;f[5758]=j;f[5761]=h;f[i+4>>2]=j|1;f[h+j>>2]=j;return}e=(d&-8)+b|0;c=d>>>3;do if(d>>>0<256){b=f[j+8>>2]|0;a=f[j+12>>2]|0;if((a|0)==(b|0)){f[5756]=f[5756]&~(1<<c);break}else{f[b+12>>2]=a;f[a+8>>2]=b;break}}else{g=f[j+24>>2]|0;a=f[j+12>>2]|0;do if((a|0)==(j|0)){b=j+16|0;c=b+4|0;a=f[c>>2]|0;if(!a){a=f[b>>2]|0;if(!a){c=0;break}}else b=c;while(1){d=a+20|0;c=f[d>>2]|0;if(!c){d=a+16|0;c=f[d>>2]|0;if(!c)break;else{a=c;b=d}}else{a=c;b=d}}f[b>>2]=0;c=a}else{c=f[j+8>>2]|0;f[c+12>>2]=a;f[a+8>>2]=c;c=a}while(0);if(g|0){a=f[j+28>>2]|0;b=23328+(a<<2)|0;if((f[b>>2]|0)==(j|0)){f[b>>2]=c;if(!c){f[5757]=f[5757]&~(1<<a);break}}else{d=g+16|0;f[((f[d>>2]|0)==(j|0)?d:g+20|0)>>2]=c;if(!c)break}f[c+24>>2]=g;a=j+16|0;b=f[a>>2]|0;if(b|0){f[c+16>>2]=b;f[b+24>>2]=c}a=f[a+4>>2]|0;if(a|0){f[c+20>>2]=a;f[a+24>>2]=c}}}while(0);f[i+4>>2]=e|1;f[h+e>>2]=e;if((i|0)==(f[5761]|0)){f[5758]=e;return}}else{f[a>>2]=d&-2;f[i+4>>2]=b|1;f[h+b>>2]=b;e=b}a=e>>>3;if(e>>>0<256){c=23064+(a<<1<<2)|0;b=f[5756]|0;a=1<<a;if(!(b&a)){f[5756]=b|a;a=c;b=c+8|0}else{b=c+8|0;a=f[b>>2]|0}f[b>>2]=i;f[a+12>>2]=i;f[i+8>>2]=a;f[i+12>>2]=c;return}a=e>>>8;if(a)if(e>>>0>16777215)d=31;else{h=(a+1048320|0)>>>16&8;j=a<<h;g=(j+520192|0)>>>16&4;j=j<<g;d=(j+245760|0)>>>16&2;d=14-(g|h|d)+(j<<d>>>15)|0;d=e>>>(d+7|0)&1|d<<1}else d=0;a=23328+(d<<2)|0;f[i+28>>2]=d;f[i+20>>2]=0;f[i+16>>2]=0;b=f[5757]|0;c=1<<d;a:do if(!(b&c)){f[5757]=b|c;f[a>>2]=i;f[i+24>>2]=a;f[i+12>>2]=i;f[i+8>>2]=i}else{a=f[a>>2]|0;b:do if((f[a+4>>2]&-8|0)!=(e|0)){d=e<<((d|0)==31?0:25-(d>>>1)|0);while(1){c=a+16+(d>>>31<<2)|0;b=f[c>>2]|0;if(!b)break;if((f[b+4>>2]&-8|0)==(e|0)){a=b;break b}else{d=d<<1;a=b}}f[c>>2]=i;f[i+24>>2]=a;f[i+12>>2]=i;f[i+8>>2]=i;break a}while(0);h=a+8|0;j=f[h>>2]|0;f[j+12>>2]=i;f[h>>2]=i;f[i+8>>2]=j;f[i+12>>2]=a;f[i+24>>2]=0}while(0);j=(f[5764]|0)+-1|0;f[5764]=j;if(j|0)return;a=23480;while(1){a=f[a>>2]|0;if(!a)break;else a=a+8|0}f[5764]=-1;return}function Pc(a,b){a=a|0;b=b|0;var c=0;if(a){c=S(b,a)|0;if((b|a)>>>0>65535)c=((c>>>0)/(a>>>0)|0|0)==(b|0)?c:-1}else c=0;a=Nc(c)|0;if(!a)return a|0;if(!(f[a+-4>>2]&3))return a|0;ad(a|0,0,c|0)|0;return a|0}function Qc(){return 23520}function Rc(a){a=+a;return +(+bd(+a))}function Sc(a){a=+a;return ~~+Rc(a)|0}function Tc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=a+c>>>0;return (Y(b+d+(c>>>0<a>>>0|0)>>>0|0),c|0)|0}function Uc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=b-d-(c>>>0>a>>>0|0)>>>0;return (Y(d|0),a-c>>>0|0)|0}function Vc(a){a=a|0;return (a?31-(V(a^a-1)|0)|0:32)|0}function Wc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;l=a;j=b;k=j;h=c;n=d;i=n;if(!k){g=(e|0)!=0;if(!i){if(g){f[e>>2]=(l>>>0)%(h>>>0);f[e+4>>2]=0}n=0;e=(l>>>0)/(h>>>0)>>>0;return (Y(n|0),e)|0}else{if(!g){n=0;e=0;return (Y(n|0),e)|0}f[e>>2]=a|0;f[e+4>>2]=b&0;n=0;e=0;return (Y(n|0),e)|0}}g=(i|0)==0;do if(h){if(!g){g=(V(i|0)|0)-(V(k|0)|0)|0;if(g>>>0<=31){m=g+1|0;i=31-g|0;b=g-31>>31;h=m;a=l>>>(m>>>0)&b|k<<i;b=k>>>(m>>>0)&b;g=0;i=l<<i;break}if(!e){n=0;e=0;return (Y(n|0),e)|0}f[e>>2]=a|0;f[e+4>>2]=j|b&0;n=0;e=0;return (Y(n|0),e)|0}g=h-1|0;if(g&h|0){i=(V(h|0)|0)+33-(V(k|0)|0)|0;p=64-i|0;m=32-i|0;j=m>>31;o=i-32|0;b=o>>31;h=i;a=m-1>>31&k>>>(o>>>0)|(k<<m|l>>>(i>>>0))&b;b=b&k>>>(i>>>0);g=l<<p&j;i=(k<<p|l>>>(o>>>0))&j|l<<m&i-33>>31;break}if(e|0){f[e>>2]=g&l;f[e+4>>2]=0}if((h|0)==1){o=j|b&0;p=a|0|0;return (Y(o|0),p)|0}else{p=Vc(h|0)|0;o=k>>>(p>>>0)|0;p=k<<32-p|l>>>(p>>>0)|0;return (Y(o|0),p)|0}}else{if(g){if(e|0){f[e>>2]=(k>>>0)%(h>>>0);f[e+4>>2]=0}o=0;p=(k>>>0)/(h>>>0)>>>0;return (Y(o|0),p)|0}if(!l){if(e|0){f[e>>2]=0;f[e+4>>2]=(k>>>0)%(i>>>0)}o=0;p=(k>>>0)/(i>>>0)>>>0;return (Y(o|0),p)|0}g=i-1|0;if(!(g&i)){if(e|0){f[e>>2]=a|0;f[e+4>>2]=g&k|b&0}o=0;p=k>>>((Vc(i|0)|0)>>>0);return (Y(o|0),p)|0}g=(V(i|0)|0)-(V(k|0)|0)|0;if(g>>>0<=30){b=g+1|0;i=31-g|0;h=b;a=k<<i|l>>>(b>>>0);b=k>>>(b>>>0);g=0;i=l<<i;break}if(!e){o=0;p=0;return (Y(o|0),p)|0}f[e>>2]=a|0;f[e+4>>2]=j|b&0;o=0;p=0;return (Y(o|0),p)|0}while(0);if(!h){k=i;j=0;i=0}else{m=c|0|0;l=n|d&0;k=Tc(m|0,l|0,-1,-1)|0;c=Z()|0;j=i;i=0;do{d=j;j=g>>>31|j<<1;g=i|g<<1;d=a<<1|d>>>31|0;n=a>>>31|b<<1|0;Uc(k|0,c|0,d|0,n|0)|0;p=Z()|0;o=p>>31|((p|0)<0?-1:0)<<1;i=o&1;a=Uc(d|0,n|0,o&m|0,(((p|0)<0?-1:0)>>31|((p|0)<0?-1:0)<<1)&l|0)|0;b=Z()|0;h=h-1|0}while((h|0)!=0);k=j;j=0}h=0;if(e|0){f[e>>2]=a;f[e+4>>2]=b}o=(g|0)>>>31|(k|h)<<1|(h<<1|g>>>31)&0|j;p=(g<<1|0>>>31)&-2|i;return (Y(o|0),p)|0}function Xc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,g=0;g=ea;ea=ea+16|0;e=g|0;Wc(a,b,c,d,e)|0;ea=g;return (Y(f[e+4>>2]|0),f[e>>2]|0)|0}function Yc(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){Y(b>>>c|0);return a>>>c|(b&(1<<c)-1)<<32-c}Y(0);return b>>>c-32|0}function Zc(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){Y(b<<c|(a&(1<<c)-1<<32-c)>>>32-c|0);return a<<c}Y(a<<c-32|0);return 0}function _c(a){a=+a;return a>=0.0?+E(a+.5):+R(a-.5)}function $c(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,g=0,h=0;if((d|0)>=8192){ca(a|0,c|0,d|0)|0;return a|0}h=a|0;g=a+d|0;if((a&3)==(c&3)){while(a&3){if(!d)return h|0;b[a>>0]=b[c>>0]|0;a=a+1|0;c=c+1|0;d=d-1|0}d=g&-4|0;e=d-64|0;while((a|0)<=(e|0)){f[a>>2]=f[c>>2];f[a+4>>2]=f[c+4>>2];f[a+8>>2]=f[c+8>>2];f[a+12>>2]=f[c+12>>2];f[a+16>>2]=f[c+16>>2];f[a+20>>2]=f[c+20>>2];f[a+24>>2]=f[c+24>>2];f[a+28>>2]=f[c+28>>2];f[a+32>>2]=f[c+32>>2];f[a+36>>2]=f[c+36>>2];f[a+40>>2]=f[c+40>>2];f[a+44>>2]=f[c+44>>2];f[a+48>>2]=f[c+48>>2];f[a+52>>2]=f[c+52>>2];f[a+56>>2]=f[c+56>>2];f[a+60>>2]=f[c+60>>2];a=a+64|0;c=c+64|0}while((a|0)<(d|0)){f[a>>2]=f[c>>2];a=a+4|0;c=c+4|0}}else{d=g-4|0;while((a|0)<(d|0)){b[a>>0]=b[c>>0]|0;b[a+1>>0]=b[c+1>>0]|0;b[a+2>>0]=b[c+2>>0]|0;b[a+3>>0]=b[c+3>>0]|0;a=a+4|0;c=c+4|0}}while((a|0)<(g|0)){b[a>>0]=b[c>>0]|0;a=a+1|0;c=c+1|0}return h|0}function ad(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,g=0,h=0,i=0;h=a+d|0;c=c&255;if((d|0)>=67){while(a&3){b[a>>0]=c;a=a+1|0}e=h&-4|0;g=e-64|0;i=c|c<<8|c<<16|c<<24;while((a|0)<=(g|0)){f[a>>2]=i;f[a+4>>2]=i;f[a+8>>2]=i;f[a+12>>2]=i;f[a+16>>2]=i;f[a+20>>2]=i;f[a+24>>2]=i;f[a+28>>2]=i;f[a+32>>2]=i;f[a+36>>2]=i;f[a+40>>2]=i;f[a+44>>2]=i;f[a+48>>2]=i;f[a+52>>2]=i;f[a+56>>2]=i;f[a+60>>2]=i;a=a+64|0}while((a|0)<(e|0)){f[a>>2]=i;a=a+4|0}}while((a|0)<(h|0)){b[a>>0]=c;a=a+1|0}return h-d|0}function bd(a){a=+a;return a>=0.0?+E(a+.5):+R(a-.5)}function cd(a){a=a|0;var b=0,c=0;c=f[r>>2]|0;b=c+a|0;if((a|0)>0&(b|0)<(c|0)|(b|0)<0){_()|0;aa(12);return -1}if((b|0)>(ba()|0)){if(!(da(b|0)|0)){aa(12);return -1}}else f[r>>2]=b;return c|0}

// EMSCRIPTEN_END_FUNCS
return{___uremdi3:Xc,_bitshift64Lshr:Yc,_bitshift64Shl:Zc,_calloc:Pc,_compact:Hb,_destroyLinkedPolygon:fc,_edgeLengthKm:yb,_edgeLengthM:zb,_emscripten_replace_memory:ha,_experimentalH3ToLocalIj:kc,_experimentalLocalIjToH3:lc,_free:Oc,_geoToH3:Sb,_getDestinationH3IndexFromUnidirectionalEdge:_b,_getH3IndexesFromUnidirectionalEdge:ac,_getH3UnidirectionalEdge:Yb,_getH3UnidirectionalEdgeBoundary:cc,_getH3UnidirectionalEdgesFromHexagon:bc,_getOriginH3IndexFromUnidirectionalEdge:Zb,_getRes0Indexes:Ga,_h3Distance:mc,_h3GetBaseCell:Bb,_h3IndexesAreNeighbors:Xb,_h3IsPentagon:Gb,_h3IsResClassIII:Kb,_h3IsValid:Cb,_h3Line:oc,_h3LineSize:nc,_h3SetToLinkedGeo:xa,_h3ToChildren:Fb,_h3ToGeo:Vb,_h3ToGeoBoundary:Wb,_h3ToParent:Db,_h3UnidirectionalEdgeIsValid:$b,_hexAreaKm2:wb,_hexAreaM2:xb,_hexRing:ta,_i64Subtract:Uc,_kRing:oa,_kRingDistances:pa,_llvm_round_f64:_c,_malloc:Nc,_maxH3ToChildrenSize:Eb,_maxKringSize:na,_maxPolyfillSize:ua,_maxUncompactSize:Jb,_memcpy:$c,_memset:ad,_numHexagons:Ab,_polyfill:va,_res0IndexCount:Fa,_round:bd,_sbrk:cd,_sizeOfCoordIJ:Ac,_sizeOfGeoBoundary:wc,_sizeOfGeoCoord:vc,_sizeOfGeoPolygon:yc,_sizeOfGeofence:xc,_sizeOfH3Index:uc,_sizeOfLinkedGeoPolygon:zc,_uncompact:Ib,establishStackSpace:la,setThrew:ma,stackAlloc:ia,stackRestore:ka,stackSave:ja}})


// EMSCRIPTEN_END_ASM
(asmGlobalArg,Module.asmLibraryArg,buffer);var ___uremdi3=Module["___uremdi3"]=asm["___uremdi3"];var _bitshift64Lshr=Module["_bitshift64Lshr"]=asm["_bitshift64Lshr"];var _bitshift64Shl=Module["_bitshift64Shl"]=asm["_bitshift64Shl"];var _calloc=Module["_calloc"]=asm["_calloc"];var _compact=Module["_compact"]=asm["_compact"];var _destroyLinkedPolygon=Module["_destroyLinkedPolygon"]=asm["_destroyLinkedPolygon"];var _edgeLengthKm=Module["_edgeLengthKm"]=asm["_edgeLengthKm"];var _edgeLengthM=Module["_edgeLengthM"]=asm["_edgeLengthM"];var _emscripten_replace_memory=Module["_emscripten_replace_memory"]=asm["_emscripten_replace_memory"];var _experimentalH3ToLocalIj=Module["_experimentalH3ToLocalIj"]=asm["_experimentalH3ToLocalIj"];var _experimentalLocalIjToH3=Module["_experimentalLocalIjToH3"]=asm["_experimentalLocalIjToH3"];var _free=Module["_free"]=asm["_free"];var _geoToH3=Module["_geoToH3"]=asm["_geoToH3"];var _getDestinationH3IndexFromUnidirectionalEdge=Module["_getDestinationH3IndexFromUnidirectionalEdge"]=asm["_getDestinationH3IndexFromUnidirectionalEdge"];var _getH3IndexesFromUnidirectionalEdge=Module["_getH3IndexesFromUnidirectionalEdge"]=asm["_getH3IndexesFromUnidirectionalEdge"];var _getH3UnidirectionalEdge=Module["_getH3UnidirectionalEdge"]=asm["_getH3UnidirectionalEdge"];var _getH3UnidirectionalEdgeBoundary=Module["_getH3UnidirectionalEdgeBoundary"]=asm["_getH3UnidirectionalEdgeBoundary"];var _getH3UnidirectionalEdgesFromHexagon=Module["_getH3UnidirectionalEdgesFromHexagon"]=asm["_getH3UnidirectionalEdgesFromHexagon"];var _getOriginH3IndexFromUnidirectionalEdge=Module["_getOriginH3IndexFromUnidirectionalEdge"]=asm["_getOriginH3IndexFromUnidirectionalEdge"];var _getRes0Indexes=Module["_getRes0Indexes"]=asm["_getRes0Indexes"];var _h3Distance=Module["_h3Distance"]=asm["_h3Distance"];var _h3GetBaseCell=Module["_h3GetBaseCell"]=asm["_h3GetBaseCell"];var _h3IndexesAreNeighbors=Module["_h3IndexesAreNeighbors"]=asm["_h3IndexesAreNeighbors"];var _h3IsPentagon=Module["_h3IsPentagon"]=asm["_h3IsPentagon"];var _h3IsResClassIII=Module["_h3IsResClassIII"]=asm["_h3IsResClassIII"];var _h3IsValid=Module["_h3IsValid"]=asm["_h3IsValid"];var _h3Line=Module["_h3Line"]=asm["_h3Line"];var _h3LineSize=Module["_h3LineSize"]=asm["_h3LineSize"];var _h3SetToLinkedGeo=Module["_h3SetToLinkedGeo"]=asm["_h3SetToLinkedGeo"];var _h3ToChildren=Module["_h3ToChildren"]=asm["_h3ToChildren"];var _h3ToGeo=Module["_h3ToGeo"]=asm["_h3ToGeo"];var _h3ToGeoBoundary=Module["_h3ToGeoBoundary"]=asm["_h3ToGeoBoundary"];var _h3ToParent=Module["_h3ToParent"]=asm["_h3ToParent"];var _h3UnidirectionalEdgeIsValid=Module["_h3UnidirectionalEdgeIsValid"]=asm["_h3UnidirectionalEdgeIsValid"];var _hexAreaKm2=Module["_hexAreaKm2"]=asm["_hexAreaKm2"];var _hexAreaM2=Module["_hexAreaM2"]=asm["_hexAreaM2"];var _hexRing=Module["_hexRing"]=asm["_hexRing"];var _i64Subtract=Module["_i64Subtract"]=asm["_i64Subtract"];var _kRing=Module["_kRing"]=asm["_kRing"];var _kRingDistances=Module["_kRingDistances"]=asm["_kRingDistances"];var _llvm_round_f64=Module["_llvm_round_f64"]=asm["_llvm_round_f64"];var _malloc=Module["_malloc"]=asm["_malloc"];var _maxH3ToChildrenSize=Module["_maxH3ToChildrenSize"]=asm["_maxH3ToChildrenSize"];var _maxKringSize=Module["_maxKringSize"]=asm["_maxKringSize"];var _maxPolyfillSize=Module["_maxPolyfillSize"]=asm["_maxPolyfillSize"];var _maxUncompactSize=Module["_maxUncompactSize"]=asm["_maxUncompactSize"];var _memcpy=Module["_memcpy"]=asm["_memcpy"];var _memset=Module["_memset"]=asm["_memset"];var _numHexagons=Module["_numHexagons"]=asm["_numHexagons"];var _polyfill=Module["_polyfill"]=asm["_polyfill"];var _res0IndexCount=Module["_res0IndexCount"]=asm["_res0IndexCount"];var _round=Module["_round"]=asm["_round"];var _sbrk=Module["_sbrk"]=asm["_sbrk"];var _sizeOfCoordIJ=Module["_sizeOfCoordIJ"]=asm["_sizeOfCoordIJ"];var _sizeOfGeoBoundary=Module["_sizeOfGeoBoundary"]=asm["_sizeOfGeoBoundary"];var _sizeOfGeoCoord=Module["_sizeOfGeoCoord"]=asm["_sizeOfGeoCoord"];var _sizeOfGeoPolygon=Module["_sizeOfGeoPolygon"]=asm["_sizeOfGeoPolygon"];var _sizeOfGeofence=Module["_sizeOfGeofence"]=asm["_sizeOfGeofence"];var _sizeOfH3Index=Module["_sizeOfH3Index"]=asm["_sizeOfH3Index"];var _sizeOfLinkedGeoPolygon=Module["_sizeOfLinkedGeoPolygon"]=asm["_sizeOfLinkedGeoPolygon"];var _uncompact=Module["_uncompact"]=asm["_uncompact"];var establishStackSpace=Module["establishStackSpace"]=asm["establishStackSpace"];var setThrew=Module["setThrew"]=asm["setThrew"];var stackAlloc=Module["stackAlloc"]=asm["stackAlloc"];var stackRestore=Module["stackRestore"]=asm["stackRestore"];var stackSave=Module["stackSave"]=asm["stackSave"];Module["asm"]=asm;Module["cwrap"]=cwrap;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["getTempRet0"]=getTempRet0;if(memoryInitializer){if(!isDataURI(memoryInitializer)){memoryInitializer=locateFile(memoryInitializer)}if(ENVIRONMENT_IS_NODE||ENVIRONMENT_IS_SHELL){var data=Module["readBinary"](memoryInitializer);HEAPU8.set(data,GLOBAL_BASE)}else{addRunDependency("memory initializer");var applyMemoryInitializer=(function(data){if(data.byteLength)data=new Uint8Array(data);HEAPU8.set(data,GLOBAL_BASE);if(Module["memoryInitializerRequest"])delete Module["memoryInitializerRequest"].response;removeRunDependency("memory initializer")});var doBrowserLoad=(function(){Module["readAsync"](memoryInitializer,applyMemoryInitializer,(function(){throw"could not load memory initializer "+memoryInitializer}))});var memoryInitializerBytes=tryParseAsDataURI(memoryInitializer);if(memoryInitializerBytes){applyMemoryInitializer(memoryInitializerBytes.buffer)}else if(Module["memoryInitializerRequest"]){var useRequest=(function(){var request=Module["memoryInitializerRequest"];var response=request.response;if(request.status!==200&&request.status!==0){var data=tryParseAsDataURI(Module["memoryInitializerRequestURL"]);if(data){response=data.buffer}else{console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: "+request.status+", retrying "+memoryInitializer);doBrowserLoad();return}}applyMemoryInitializer(response)});if(Module["memoryInitializerRequest"].response){setTimeout(useRequest,0)}else{Module["memoryInitializerRequest"].addEventListener("load",useRequest)}}else{doBrowserLoad()}}}Module["then"]=(function(func){if(Module["calledRun"]){func(Module)}else{var old=Module["onRuntimeInitialized"];Module["onRuntimeInitialized"]=(function(){if(old)old();func(Module)})}return Module});function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}ExitStatus.prototype=new Error;ExitStatus.prototype.constructor=ExitStatus;dependenciesFulfilled=function runCaller(){if(!Module["calledRun"])run();if(!Module["calledRun"])dependenciesFulfilled=runCaller};function run(args){args=args||Module["arguments"];if(runDependencies>0){return}preRun();if(runDependencies>0)return;if(Module["calledRun"])return;function doRun(){if(Module["calledRun"])return;Module["calledRun"]=true;if(ABORT)return;ensureInitRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout((function(){setTimeout((function(){Module["setStatus"]("")}),1);doRun()}),1)}else{doRun()}}Module["run"]=run;function abort(what){if(Module["onAbort"]){Module["onAbort"](what)}if(what!==undefined){out(what);err(what);what=JSON.stringify(what)}else{what=""}ABORT=true;EXITSTATUS=1;throw"abort("+what+"). Build with -s ASSERTIONS=1 for more info."}Module["abort"]=abort;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}Module["noExitRuntime"]=true;run()






  return libh3;
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = libh3;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return libh3; });
    else if (typeof exports === 'object')
      exports["libh3"] = libh3;
    var h3 = libh3();
module.exports = h3;

}).call(this,require('_process'),require("buffer").Buffer,"/node_modules/h3-js/dist/out")
},{"_process":6,"buffer":3,"fs":1,"path":5}],336:[function(require,module,exports){
/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = require('./dist/lib/h3core');

},{"./dist/lib/h3core":334}],337:[function(require,module,exports){
(function (global){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  runtime.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if (typeof global.process === "object" && global.process.domain) {
      invoke = global.process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  runtime.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        if (delegate.iterator.return) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[7]);
