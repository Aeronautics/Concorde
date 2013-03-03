/*global Concorde */
var Concorde = Concorde || require('../../src/concorde.js');
var expect = expect || require('chai').expect;
var sinon = sinon || require('sinon');
var Q = Q || require('q');
Concorde(Q);
'use strict';
(function () {
    describe('Concorde.Router', function () {
        it('Is created using new Concorde.Router()', function () {
            var myRouter = new Concorde.Router();
            
            expect(myRouter).to.be.an.instanceof(Concorde.Router);
        });
        it('Can aim at windows using router.aimWindow(window)', function () {
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
        it('When aimed with router.aimWindow(window), binds to click and submit events', function () {
            var windowSpy = {},
                myRouter = new Concorde.Router();
                
            windowSpy.location = {href: ''};
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
        it('Can push back route states when configured with router.pushesState()', function () {
            var windowSpy = {},
                myRouter = new Concorde.Router();
                
            windowSpy.location = {href: ''};
            windowSpy.history = {};
            windowSpy.document = {};
            windowSpy.addEventListener = sinon.spy();
            windowSpy.document.addEventListener = sinon.spy();
            windowSpy.history.replaceState = sinon.spy();
            windowSpy.history.pushState = sinon.spy();
            
            myRouter.aimWindow(windowSpy).pushesState();
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
        it('Dispatches routes in background with router.background({method: "", href: ""})', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                route     = myRouter.on('GET', '/users/', routeStub);
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/users/'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Dispatches routes for patterns of URLs like /foo/*/bar when "*" is a parameter', function (testDone) {
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
        it('Dispatches routes for catch-all patterns that match until the end of the url with /something/** (two asterisks)', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/**', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/notusers/alganet'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(response.params).to.be.deep.equal(["/notusers/alganet"]);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Does not get interference between catch-all routes and normal ones', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/family/**', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/family/alganet/something'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(response.params).to.be.deep.equal(["/alganet/something"]);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Dispatches routes with mixed normal and catch-all parameters like /*/something/**', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/*/**', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/hello/alganet/something'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(response.params).to.be.deep.equal(["hello", "/alganet/something"]);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Dispatches routes on hash changes, including patterns like #something/*', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '#foo/*', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '#foo/bar'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(response.params).to.be.deep.equal(["bar"]);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Dispatches routes with mixed normal parameters and hash like /something/*#foo', function (testDone) {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(42),
                noRoute   = myRouter.on('GET', '/family/*#foo', routeStub);
                route     = myRouter.on('GET', '/users/*', routeStub),
                
            expect(myRouter.routes).to.contain(route);
                
            myRouter.background({method: 'GET', href: '/family/alganet#foo'}).then(function (response) {
                expect(response.result).to.be.equal(42);
                expect(response.params).to.be.deep.equal(["alganet"]);
                expect(routeStub.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
        it('Returns false when a dispatched route does not match', function () {
            var myRouter  = new Concorde.Router(),
                routeStub = sinon.stub().returns(false),
                noRoute   = myRouter.on('GET', '/family/*', routeStub);
                
            expect(myRouter.background({method: 'GET', href: '/users/alganet'})).to.be.equal(false);
        });
        it('Start to handle logic routing areas when defined using router.area()', function () {
            var myRouter = new Concorde.Router(),
                handler  = function () {},
                area     = myRouter.area("#foo", handler);
                
            expect(myRouter.areas).to.include.key('#foo');
            expect(myRouter.areas['#foo']).to.be.equal(area);
            expect(myRouter.areas['#foo'].whenLoading).to.be.equal(handler);
        });
        it('Receives a function as the second parameter of router.area() to be called when that area is in loading process', function () {
            var myRouter = new Concorde.Router(),
                area     = myRouter.area("#foo");
                
            expect(myRouter.areas).to.include.key('#foo');
            expect(myRouter.areas['#foo']).to.be.equal(area);
            expect(myRouter.areas['#foo'].whenLoading).to.be.a("function");
        });
        it('Stores the reference to an area provider given by router.areasFrom()', function () {
            var myRouter = new Concorde.Router(),
                providerSpy = sinon.spy();
                
            myRouter.areasFrom(providerSpy);
            
            expect(myRouter.areasProvider).to.be.equal(providerSpy);
        });
        it('Uses reference objects for areas that are provided by a function passed to router.areasFrom()', function (testDone) {
            var myRouter = new Concorde.Router(),
                providerSpy = sinon.spy();
                
            myRouter.areasFrom(providerSpy);
            myRouter.area("#foo");
            myRouter.get('/foo', function (){ return 'fooresponse'; });
            myRouter.background({method: 'GET', href: '/foo', area: '#foo'}).then(function (response) {
                expect(myRouter.areasProvider).to.be.equal(providerSpy);
                expect(providerSpy.calledOnce).to.be.equal(true);
                expect(providerSpy.calledWithMatch('#foo')).to.be.equal(true);
            }).done(testDone);
        });
        it('Brings a response.area object when some request contains an area: "identifier" key in background', function (testDone) {
            var myRouter = new Concorde.Router(),
                providerStub = sinon.stub().returns('areaelement'),
                route,
                query = {method: 'GET', href: '/foo/Bar', area: '#foo'};
                
            myRouter.areasFrom(providerStub);
            myRouter.area("#foo");
            myRouter.get('/foo/*', function (bar) { return 'fooresponse'; });
            myRouter.background(query).then(function (response) {
                expect(response.area).to.be.equal('areaelement');
                expect(response.result).to.be.equal('fooresponse');
                expect(response.params).to.contain("Bar");
                expect(response.element).to.be.deep.equal(query);
            }).done(testDone);
        });
        it('Brings a response.area object when some request contains an area: "identifier" key in background off course', function (testDone) {
            var myRouter = new Concorde.Router(),
                providerStub = sinon.stub().returns('areaelement'),
                route,
                query = {method: 'GET', href: '/foo/Bar', area: '#foo'},
                myWindow = {
                    addEventListener: sinon.spy(),
                    document: {
                        addEventListener: sinon.spy()
                    },
                    history: {
                        pushState: sinon.spy()
                    }
                };
            
            myRouter.aimWindow(myWindow).pushesState();
            myRouter.areasFrom(providerStub);
            myRouter.area("#foo");
            myRouter.get('/foo/*', function (bar) { return 'fooresponse'; });
            myRouter.foreground(query).then(function (response) {
                expect(response.area).to.be.equal('areaelement');
                expect(response.result).to.be.equal('fooresponse');
                expect(response.params).to.contain("Bar");
                expect(response.element).to.be.deep.equal(query);
                expect(myWindow.history.pushState.calledOnce).to.be.equal(true);
            }).done(testDone);
        });
    });
})();
