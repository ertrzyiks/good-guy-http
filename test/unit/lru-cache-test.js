var assert = require('assert');
var Promise = require('bluebird');
var LRUCache = require('../../lib/caching/lru-cache');

describe('LRUCache', function(){

  it('should be able to store and retrieve elements', function(done) {
    var lru = new LRUCache(2);
    lru.store('hitchhiker', {answer: 42}).then(function() {
      return lru.retrieve('hitchhiker');
    }).then(function(object) {
      assert.deepEqual(object, {answer: 42});
    }).then(done).catch(done);
  });

  it('should throw away oldest element when nothing is retrieved', function(done) {
    var lru = new LRUCache(3);

    // normally, we should wait for promises to resolve - but we know those things are synchronous so we'll
    // spare us some boilerplate
    lru.store('1', 1);
    lru.store('2', 2);
    lru.store('3', 3);
    lru.store('4', 4);

    Promise.all(['1', '2', '3', '4'].map(lru.retrieve.bind(lru))).then(function(values) {
      assert.deepEqual(values, [undefined, 2, 3, 4]);
    }).then(done).catch(done);
  });

  it('should throw away least recently used element when out of space', function(done) {
    var lru = new LRUCache(4);

    // store 4 values
    Promise.all(['1', '2', '3', '4'].map(function(value) {
      lru.store(value, value);
    })).then(function() {
      // request them in reverse order
      return Promise.all(['4', '3', '2', '1'].map(lru.retrieve.bind(lru)));
    }).then(function() {
      // run out of space
      return lru.store('new', 'new');
    }).then(function() {
      // request everything again
      return Promise.all(['1', '2', '3', '4', 'new'].map(lru.retrieve.bind(lru)));
    }).then(function(values) {
      // '4' should be missing
      assert.deepEqual(values, ['1', '2', '3', undefined, 'new']);
    }).then(done).catch(done);
  });
});
