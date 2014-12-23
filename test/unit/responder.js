var fs = require('fs-extra');
var expect = require('chai').expect;
var request = require('supertest');
var connect = require('connect');

var dfs = require('../../lib/dfs');
var responder = require('../../lib/responder');

describe('responder', function () {
  
  var provider = dfs({
    root: '.tmp'
  });
  var app;
  
  beforeEach(function () {
    
    fs.outputFileSync('.tmp/index.html', 'index file content', 'utf8');
    fs.outputFileSync('.tmp/style.css', 'body{}', 'utf8');
    fs.outputFileSync('.tmp/app.js', 'console.log("app")', 'utf8');
    
    app = connect()
      .use(function (req, res, next) {
        
        responder({
          res: res,
          provider: provider
        });
        next();
      });
  });
  
  afterEach(function () {
    
    fs.removeSync('.tmp');
  });
  
  it('throws error when no response object is given', function (done) {
    
    expect(function () {
      responder();
    }).to.throw(TypeError);
    
    done();
  });
  
  it('throws error when no provider is given', function (done) {
    
    expect(function () {
      responder({res: {}});
    }).to.throw(TypeError);
    
    done();
  });
  
  describe('send()', function () {
    
    it('sets content length', function (done) {
      
      app.use(function (req, res) {
        
        res.send('some text');
      });
      
      request(app)
        .get('/')
        .expect('Content-Length', 9)
        .end(done);
    });
    
    it('text defaults as html', function (done) {
      
      app.use(function (req, res) {
        
        res.send('some text');
      });
      
      request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .end(done);
    });
    
    it('sends object as json', function (done) {
      
      app.use(function (req, res) {
        
        res.send({
          key: 'value',
          key2: function () {}
        });
      });
      
      request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .end(done);
    });
  });
  
  describe('sendFile()', function () {
    
    it('html', function (done) {
      
      app.use(function (req, res) {
        
        res.sendFile(req.url);
      });
      
      request(app)
        .get('/index.html')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect('Content-Length', 18)
        .expect('index file content')
        .end(done);
    });
    
    it('css', function (done) {
      
      app.use(function (req, res) {
        
        res.sendFile(req.url);
      });
      
      request(app)
        .get('/style.css')
        .expect('Content-Type', 'text/css; charset=utf-8')
        .expect('Content-Length', 6)
        .expect('body{}')
        .end(done);
    });
    
    it('js', function (done) {
      
      app.use(function (req, res) {
        
        res.sendFile(req.url);
      });
      
      request(app)
        .get('/app.js')
        .expect('Content-Type', 'application/javascript; charset=utf-8')
        .expect('Content-Length', 18)
        .expect('console.log("app")')
        .end(done);
    });
    
    it('missing directory index', function (done) {
      
      var provider = dfs({
        root: './'
      });
      
      app = connect()
        .use(function (req, res, next) {
          
          responder({
            res: res,
            provider: provider
          });
          next();
        })
        .use(function (req, res, next) {
          
          res.sendFile(req.url)
            .on('error', function () {
              
              next();
            });
        });
      
      request(app)
        .get('/')
        .expect(404)
        .end(done);
    });
    
    it('emits error event', function (done) {
      
      var errorCalled = false;
      
      app.use(function (req, res) {
        
        res.sendFile(req.url)
          .on('error', function (err) {
            
            errorCalled = true;
            res.end();
          });
      });
      
      request(app)
        .get('/does-not-exist.html')
        .expect(function () {
          
          expect(errorCalled).to.equal(true);
        })
        .end(done);
    });
    
    it('emits headers event', function (done) {
      
      var headersEventCalled = false;
      
      app.use(function (req, res) {
        
        res.sendFile(req.url)
          .on('headers', function (err) {
            
            headersEventCalled = true;
          });
      });
      
      request(app)
        .get('/index.html')
        .expect(function () {
          
          expect(headersEventCalled).to.equal(true);
        })
        .end(done);
    });
  });
  
  describe('ext()', function () {
    
    it('sets content type by extension name', function (done) {
      
      app.use(function (req, res) {
        
        res
          .ext('js')
          .send('console.log("js")');
      });
      
      request(app)
        .get('/')
        .expect('Content-Type', 'application/javascript; charset=utf-8')
        .end(done);
    });
    
    it('sets content type by file name with extension', function (done) {
      
      app.use(function (req, res) {
        
        res
          .send('console.log("js")')
          .ext('app.js');
      });
      
      request(app)
        .get('/')
        .expect('Content-Type', 'application/javascript; charset=utf-8')
        .end(done);
    });
  });
  
  it('status()', function (done) {
    
    app.use(function (req, res) {
      
      res
        .status(301)
        .end();
    });
    
    request(app)
      .get('/')
      .expect(301)
      .end(done);
  });
  
  describe('redirect()', function () {
    
    it('301', function (done) {
      
      app.use(function (req, res) {
        
        res.redirect('/test');
      });
      
      request(app)
        .get('/')
        .expect(301)
        .expect('Location', '/test')
        .expect('Redirecting to /test ...')
        .end(done);
    });
    
    it('custom status', function (done) {
      
      app.use(function (req, res) {
        
        res.redirect('/test', 302);
      });
      
      request(app)
        .get('/')
        .expect(302)
        .expect('Location', '/test')
        .end(done);
    });
  });
});