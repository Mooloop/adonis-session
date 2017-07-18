'use strict'

/*
 * adonis-server
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const http = require('http')
const supertest = require('supertest')
const { Config } = require('@adonisjs/sink')
const helpers = require('./helpers')

const Session = require('../src/Session')
const Store = require('../src/Session/Store')
const { Cookie } = require('../src/Session/Drivers')

test.group('Session', () => {
  test('create session id', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        assert.isTrue(session._isNewSessionId)
        res.end()
      })
    })

    const { headers } = await supertest(server).get('/').expect(200)
    assert.property(headers, 'set-cookie')
    assert.include(headers['set-cookie'][0], 'adonis-session=')
  })

  test('re-use existing session id if exists', async (assert) => {
    const server = http.createServer((req, res) => {
      const config = new Config()
      const cookie = new Cookie(config)
      cookie.setRequest(helpers.getRequest(req), helpers.getResponse(res))
      const session = new Session(helpers.getRequest(req), helpers.getResponse(res), cookie, config)
      session
      .instantiate()
      .then(() => {
        assert.isFalse(session._isNewSessionId)
        res.end()
      })
    })

    const { headers } = await supertest(server).get('/').set('Cookie', ['adonis-session=20']).expect(200)
    assert.property(headers, 'set-cookie')
    assert.equal(headers['set-cookie'][0], 'adonis-session=20')
  })
})

test.group('Session Store', () => {
  test('initiate empty store', (assert) => {
    const store = new Store()
    assert.deepEqual(store._values, {})
  })

  test('initiate store with values', (assert) => {
    const values = { age: { d: 22, t: 'Number' } }
    const store = new Store(JSON.stringify(values))
    assert.deepEqual(store._values, { age: 22 })
  })

  test('guard number', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue(22), { d: '22', t: 'Number' })
  })

  test('guard object', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue({ age: 22 }), { d: JSON.stringify({ age: 22 }), t: 'Object' })
  })

  test('guard boolean', (assert) => {
    const store = new Store()
    assert.deepEqual(store._guardValue(true), { d: 'true', t: 'Boolean' })
  })

  test('guard date', (assert) => {
    const store = new Store()
    const date = new Date()
    assert.deepEqual(store._guardValue(date), { d: date.toString(), t: 'Date' })
  })

  test('throw error when trying to guard function', (assert) => {
    const store = new Store()
    const fn = () => store._guardValue(function () {})
    assert.throw(fn, 'Cannot store Function data type to session store')
  })

  test('add value to store', (assert) => {
    const store = new Store()
    store.put('age', 22)
    assert.deepEqual(store._values, { age: 22 })
  })

  test('add nested values to store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store._values, { user: { age: 22 } })
  })

  test('get value from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store.get('user.age'), 22)
  })

  test('get value from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    assert.deepEqual(store.get('user.age'), 22)
  })

  test('incr number value in store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.increment('user.age')
    assert.deepEqual(store.get('user.age'), 23)
  })

  test('incr number with more than 1', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.increment('user.age', 2)
    assert.deepEqual(store.get('user.age'), 24)
  })

  test('decrement number', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.decrement('user.age')
    assert.deepEqual(store.get('user.age'), 21)
  })

  test('throw exception when increment value is not a number', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    const fn = () => store.increment('username')
    assert.throw(fn, 'Cannot increment username with value as virk')
  })

  test('throw exception when decrement value is not a number', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    const fn = () => store.decrement('username')
    assert.throw(fn, 'Cannot decrement username with value as virk')
  })

  test('remove value from store', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.forget('username')
    assert.deepEqual(store._values, {})
  })

  test('remove nested values from store', (assert) => {
    const store = new Store()
    store.put('user.age', 22)
    store.forget('user.age')
    assert.deepEqual(store._values, { user: {} })
  })

  test('pull values from store', (assert) => {
    const store = new Store()
    store.put('user.profile.age', 22)
    const age = store.pull('user.profile')
    assert.deepEqual(age, { age: 22 })
    assert.deepEqual(store._values, { user: {} })
  })

  test('get cloned copy of store values', (assert) => {
    const store = new Store()
    store.put('user.profile.age', 22)
    const all = store.all()
    all.user.profile = { age: 24 }
    assert.deepEqual(all, { user: { profile: { age: 24 } } })
    assert.deepEqual(store._values, { user: { profile: { age: 22 } } })
  })

  test('pack values to json', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    assert.deepEqual(store.toJSON(), {
      username: { d: 'virk', t: 'String' },
      user: { d: JSON.stringify({ profile: {age: 22, name: 'virk'} }), t: 'Object' }
    })
  })

  test('unpack packed values', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    const store1 = new Store(JSON.stringify(store.toJSON()))
    assert.deepEqual(store1._values, store._values)
  })

  test('clear store', (assert) => {
    const store = new Store()
    store.put('username', 'virk')
    store.put('user.profile.age', 22)
    store.put('user.profile.name', 'virk')
    store.clear()
    assert.deepEqual(store._values, {})
  })
})
