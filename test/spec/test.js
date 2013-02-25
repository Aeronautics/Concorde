/*global Concorde */
var Concorde = Concorde || require('../../src/concorde.js');
var expect = expect || require('chai').expect;
var sinon = sinon || require('sinon');
var Q = Q || require('q');
Concorde(Q);
'use strict';
(function () {
    describe('Concorde.Router', function () {
        it('should be created using the new keyword', function () {
            var myRouter = new Concorde.Router();
            
            expect(myRouter).to.be.an.instanceof(Concorde.Router);
        });
        it('should aim to windows and understand its events', function () {
            var windowSpy = {},
                myRouter = new Concorde.Router();
                
            windowSpy.history = {};
            windowSpy.document = {};
            windowSpy.addEventListener = sinon.spy();
            windowSpy.document.addEventListener = sinon.spy();
            windowSpy.history.replaceState = sinon.spy();
            windowSpy.history.pushState = sinon.spy();
            
            myRouter.aimWindow(windowSpy);
            
        });
        it('should understand window clicks and form submissions', function () {
            var windowSpy = {},
                myRouter = new Concorde.Router();
                
            windowSpy.history = {};
            windowSpy.document = {};
            windowSpy.addEventListener = sinon.spy();
            windowSpy.document.addEventListener = sinon.spy();
            windowSpy.history.replaceState = sinon.spy();
            windowSpy.history.pushState = sinon.spy();
            
            myRouter.aimWindow(windowSpy);
            myRouter.here("/bar");
            myRouter.on("GET", "/foo", function () {});
            myRouter.foreground({href: "/foo"}).done(function () {
                expect(windowSpy.document.addEventListener.calledTwice).to.be.equal(true);
                expect(windowSpy.document.addEventListener.calledWithMatch('click')).to.be.equal(true);
                expect(windowSpy.document.addEventListener.calledWithMatch('submit')).to.be.equal(true);
            });
            
        });
        it('should understand window push states', function () {
            var windowSpy = {},
                myRouter = new Concorde.Router();
                
            windowSpy.history = {};
            windowSpy.document = {};
            windowSpy.addEventListener = sinon.spy();
            windowSpy.document.addEventListener = sinon.spy();
            windowSpy.history.replaceState = sinon.spy();
            windowSpy.history.pushState = sinon.spy();
            
            myRouter.aimWindow(windowSpy);
            myRouter.here("/bar");
            myRouter.on("GET", "/foo", function () {});
            myRouter.foreground({href: "/foo"}).done(function () {
                expect(windowSpy.addEventListener.calledOnce).to.be.equal(true);
                expect(windowSpy.addEventListener.calledWithMatch('popstate')).to.be.equal(true);
                expect(windowSpy.history.replaceState.calledOnce).to.be.equal(true);
                expect(windowSpy.history.replaceState.calledWithMatch({}, null, '/bar')).to.be.equal(true);
                expect(windowSpy.history.pushState.calledOnce).to.be.equal(true);
                expect(windowSpy.history.pushState.calledWithMatch({routed: true}, null, '/foo')).to.be.equal(true);
            });
            
        });
        it('should be able to route GET requests', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                route     = myRouter.on('GET', '/users/', routeStub);
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/users/'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('should be able to route pattern-based GET requests', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/family/*', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/users/alganet'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('should return false when is impossible to match', function () {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/family/*', routeStub)
            
                
            expect(myRouter.background({method: 'GET', href: '/users/alganet'})).to.be.equal(false);
        });
        it('should receive a provider for areas', function () {
            var myRouter  = new Concorde.Router();
            
            myRouter.area("#foo");
        });
    });
})();
