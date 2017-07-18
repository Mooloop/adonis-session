'use strict'

/*
 * adonis-session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const Type = require('type-of-is')

const toString = {
  'Number' (value) {
    return String(value)
  },
  'Boolean' (value) {
    return String(value)
  },
  'Object' (value) {
    return JSON.stringify(value)
  },
  'Array' (value) {
    return JSON.stringify(value)
  },
  'Date' (value) {
    return String(value)
  },
  'String' (value) {
    return value
  }
}

const toOriginalType = {
  'Number' (value) {
    return Number(value)
  },
  'Object' (value) {
    try {
      return JSON.parse(value)
    } catch (error) {
      return null
    }
  },
  'Array' (value) {
    try {
      return JSON.parse(value)
    } catch (error) {
      return null
    }
  },
  'Boolean' (value) {
    return (value === 'true' || value === '1')
  },
  'Date' (value) {
    return new Date(value)
  },
  'String' (value) {
    return value
  }
}

class Store {
  constructor (values = null) {
    this._initiate()
    this._values = {}
    this._initiate(values)
  }

  /**
   * Initiates the store by parsing stringied json
   *
   * @method _initiate
   *
   * @param  {String}  values
   *
   * @return {void}
   */
  _initiate (values) {
    if (values) {
      try {
        this._values = _.transform(JSON.parse(values), (result, value, key) => {
          result[key] = this._unGuardValue(value)
          return result
        }, {})
      } catch (error) {
        throw new Error(`Cannot initiate session store since unable to parse ${values}`)
      }
    }
  }

  /**
   * Returns an object with stringified value
   * and it's type.
   *
   * @method _guardValue
   *
   * @param  {Mixed}  value
   *
   * @return {Object}
   *
   * @private
   */
  _guardValue (value) {
    const type = Type.string(value)
    if (!toString[type]) {
      throw new Error(`Cannot store ${type} data type to session store`)
    }
    return { d: toString[type](value), t: type }
  }

  /**
   * Unguards the pair and returns it's original
   * value
   *
   * @method _unGuardValue
   *
   * @param  {Object}     pair
   *
   * @return {Mixed}
   *
   * @private
   */
  _unGuardValue (pair) {
    if (!pair || !pair.d || !pair.t || !toOriginalType[pair.t]) {
      throw new Error('Cannot unguard unrecognized pair type')
    }
    return toOriginalType[pair.t](pair.d)
  }

  /**
   * Put value to the existing key/value pairs
   *
   * @method put
   *
   * @param  {String} key
   * @param  {Mixed} value
   *
   * @return {void}
   */
  put (key, value) {
    return _.set(this._values, key, value)
  }

  /**
   * Returns value for a given key
   *
   * @method get
   *
   * @param  {String} key
   * @param  {Mixed} [defaultValue]
   *
   * @return {Mixed}
   */
  get (key, defaultValue = null) {
    return _.get(this._values, key, defaultValue)
  }

  /**
   * Increment value of a key.
   *
   * @method increment
   *
   * @param  {String}  key
   * @param  {Number}  [steps = 1]
   *
   * @return {void}
   */
  increment (key, steps = 1) {
    const value = this.get(key)
    if (typeof (value) !== 'number') {
      throw new Error(`Cannot increment ${key} with value as ${value}`)
    }
    this.put(key, value + steps)
  }

  /**
   * Decrement value of a key
   *
   * @method decrement
   *
   * @param  {String}  key
   * @param  {Number}  [steps = 1]
   *
   * @return {void}
   */
  decrement (key, steps = 1) {
    const value = this.get(key)
    if (typeof (value) !== 'number') {
      throw new Error(`Cannot decrement ${key} with value as ${value}`)
    }
    this.put(key, value - steps)
  }

  /**
   * Remove key/value pair from store
   *
   * @method forget
   *
   * @param  {String} key
   *
   * @return {void}
   */
  forget (key) {
    _.unset(this._values, key)
  }

  /**
   * Returns a cloned copy of existing values
   *
   * @method all
   *
   * @return {Object}
   */
  all () {
    return _.cloneDeep(this._values)
  }

  /**
   * Returns value for a given key and removes
   * it from the store at the same time
   *
   * @method pull
   *
   * @param  {String} key
   * @param  {Mixed} [defaultValue]
   *
   * @return {Mixed}
   */
  pull (key, defaultValue) {
    return ((value) => {
      this.forget(key)
      return value
    })(this.get(key, defaultValue))
  }

  /**
   * Clears the existing values from store
   *
   * @method clear
   *
   * @return {void}
   */
  clear () {
    this._values = {}
  }

  /**
   * Returns json representation of object with
   * properly stringfied values
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return _.transform(this._values, (result, value, key) => {
      /**
       * Do not store null, undefined, empty arrays or empty
       * objects to the store
       */
      if (!_.size(value)) {
        return result
      }

      result[key] = this._guardValue(value)
      return result
    }, {})
  }
}

module.exports = Store
