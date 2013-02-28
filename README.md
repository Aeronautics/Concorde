Aeronautics.Concorde
====================

The Ultra-RESTful Microrouter for the Browser.

[![Build Status](https://travis-ci.org/Aeronautics/Concorde.png)](https://travis-ci.org/Aeronautics/Concorde)

Feature Guide
-------------

### Configuration

```js
var router = new Concorde.Router(location.href);
router.aimWindow(window).writeBase();
```

### Routes

Concorde can create routes for any link in your page to execute any code you
want:

```js
router.get('/hello', function () {
    alert('Hello');
});
```

In the sample above, if any user clicks something `href=/hello`, this route will
be executed instead. 

### States and Hashes

Routes by default don't change the URL. You can easily enable reporting
routes using two different configurations:

Dispatching to the window pushState and understanding its state when appropriate:

```js
router.pushesState();
```

Dispatching to #!hashbang urls.

```js
router.hashesState();
```

Both approaches maintain URL states and history. `hashesState` is experimental.

### Advanced Routing

But there is more! You can create routes for _patterns_ of URIs:

```js
router.get('/hello/*/*', function (eventElement, params) {
    alert('Hello ' + params[0] + ', welcome to ' + params[1]);
});
```

Sample above will match clicks on `href=/hello/Alexandre/Hotel` for example and
display an alert with "Hello Alexandre, welcome to Hotel". URLs can have any
number of parameters and if they are in the end of the url they're by default
optional for matching.

#### Routing POST and form submissions

Routes for the POST method will be dispatched when a user submits the matching
form:

```js
router.post('/lorem', function () {
    alert('Ipsum');
});
```

The sample above will dispatch if an user submits a `<form action=/lorem method=post>`.

#### Routing only hashes

You can create routes for hashes starting with # instead of /

```js
router.get('#bla', function () {
    alert('I am shown when the user sees #bla in the end of the URL');
});
```

If some user clicks a `#bla` url when `router.hashesState()` is available, it
runs the matched route whatever it is but the URL is preserved so the
browser still scrolls to it and allows using of CSS `:target` pseudo-selector
which is hard to polyfill.

Hash-only routes does not interfere with #!hash/bang states.

### Relations

You can also leverage semantics of the `rel=""` attribute using Concorde
routes. The following route performs additional processing when a route
is matched with a click on a link that has a relation type:

```js
router.get('/hello', function () {
    alert('Hello');
}).rel('next', function () {
    alert('Next Hello');
});
```

If you click on `href=/hello` it will display the first alert. But if you click
on any `href=/hello rel=next`, it will display both alerts, since both the
main route and the sub-relation route matches.

### Background and Foreground requests

A modern application is often composed of several background HTTP requests
forked from the main page. This is why a browser router must be able to dispatch
routes in background and foreground:

```js
// Dispatches a synthetic foreground request to /foo
router.foreground({href: '/foo', method: 'GET'}).then(function(response) {
   // Foreground dispatches change the browser current state via pushState
});
```

```js
// Dispatches a synthetic background request to /foo
router.background({href: '/foo', method: 'GET'}).then(function(response) {
   // Background dispatches do the same as foreground, except for the
   // URL change
});
```

### Routing Logic

In order to make Concorde more efficient, it can divide routing in logic areas:

```js
var areas = {analytics: {}};
router.areasFrom(function (areaName) {
    return areas[areaName];
});
router.area("analytics", function loading() {
    // This is run when some analytics route is loading
});
```

Routes can be attached to any function, so you can attach routing areas to visual
areas:

```js
router.areasFrom(document.querySelector);
router.area("profile", function loading() {
    // This is run when the profile is loading for some reason
});
```

Visual areas play nice with route dispatches:

```js
// Creates an "API" route for internal use
router.get('/api', function () {
    return Math.random();
});

// Dispatches a synthetic background request to /foo
router.background({href: '/api', method: 'GET', area: '#profile'}).then(function(response) {
   response.area.innerHTML = response.result;
});
```

The sample above loads the random number `/api` returns into the `#profile` 
element. It calls the `loading()` function defined for that area and passes the 
control to you on the `then` handler. Both the target area and the background 
result are now available for being processed!

### Roadmap

  - `.request()` and `.graceful()` for handling external XHR requests (similar to `.background()`)
  - `router.area(/*...*/).media(" (some media: query) ")` support
  - Connection pool for fixed areas

### Current Limitations and Bugs:

  - Serious testing is only taking place on Firefox.
  - You'll need pushState. No polyfills have been tested.
  - You'll need querySelector. Any polyfill can be used.
  - Right-clicks on forms have been submitting them. Easy pick, but we didn't
    pay to much attention to it.
    
