var request = require('request');
var assert = require('assert');
var Promise = require('bluebird');
var expectRejection = require('./../helpers').expectRejection;

describe("Promised requests", function() {
  var app = require('./../test-app/test-app')();
  var req = require('../../lib/promised-request')(request.defaults({timeout: 500}));

  before(function(done) {
    app.startListening().then(done).catch(done);
  });
  after(function(done) {
    app.stopListening().then(done).catch(done);
  });

  it("should return the body on success", function(done) {
    req(app.url("/return-body/hello")).then(function(result) {
      assert.equal(result.httpVersion, "1.1");
      assert.equal(result.statusCode, 200);
      assert.equal(result.body, "hello");
      done();
    }).catch(done);
  });

  it("should reject on 4xx HTTP status without the possibility of retrying", function(done) {
    expectRejection(req(app.url("/return-status/404"))).then(function(err) {
      assert.equal(err.code, "EHTTP");
      assert.equal(err.message, "HTTP error: status code 404");
      assert.equal(err.statusCode, 404);
      assert.ok(err.unretriable);
      done();
    }).catch(done);
  });

  it("should reject on 5xx HTTP status with possibility of retrying", function(done) {
    expectRejection(req(app.url("/return-status/500"))).then(function(err) {
      assert.equal(err.code, "EHTTP");
      assert.equal(err.message, "HTTP error: status code 500");
      assert.equal(err.statusCode, 500);
      assert.ok(!err.unretriable);
      done();
    }).catch(done);
  });

  it("should reject when the request times out", function(done) {
    expectRejection(req({
      url: app.url("/delay-for-ms/2000"),
      timeout: 10
    })).then(function(err) {
      assert(err.code == "ETIMEDOUT" || err.code == "ESOCKETTIMEDOUT");
      done();
    }).catch(done);
  });

  it("should reject when connection fails", function(done) {
    expectRejection(req(app.url("http://127.0.0.1:1"))).then(function(err) {
      assert.equal(err.code, "ECONNREFUSED");
      done();
    }).catch(done);
  });

  it("should include the request and response in HTTP errors", function(done) {
    expectRejection(req(app.url("/return-status/500"))).then(function(err) {
      assert(err.response);
      assert(err.request);
      assert.equal(err.request, app.url('/return-status/500'));
    }).then(done).catch(done);
  });

  it("should include the request in connectivity errors", function(done) {
    expectRejection(req('http://127.0.0.1:1')).then(function(err) {
      assert(err.request);
      assert.equal(err.request, 'http://127.0.0.1:1');
    }).then(done).catch(done);
  });
});


/**
 * Inverts a promise: rejections turns into successes (with error as the value),
 * while successes turn into rejections.
 */
function expectRejection(promise) {
  return new Promise(function(resolve, reject) {
    promise.then(function() {
      reject(new Error("The promise wasn't rejected."));
    }).catch(function(err) {
      resolve(err);
    });
  });
}
