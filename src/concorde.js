(function (concordeFn) {

    // Inspired by https://github.com/kriskowal/q
    if (typeof exports === "object") {
        module.exports = concordeFn(require('q'));
    } else if (typeof define === "function") {
        define(concordeFn);
    } else if (typeof Q === "object") {
        Concorde = concordeFn(Q);
    }

})(function(Q) {

    "use strict";
    
    // Concorde class

    var concordeLib = this;

    function Concorde() {
        return concordeLib;
    }
    
    
    // HTTP class
    
    function HTTP(input) {
        var xhr,
            spec = Router.parseSpec(input),
            response = Q.defer();
        
        if (this.xhrProto) {
            xhr = new this.xhrProto;
        } else if (XMLHttpRequest) {
            xhr = new XMLHttpRequest;
        }
              
        xhr.withCredentials    = true;  
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4 || "number" !== typeof(xhr.status)) {
                return;
            }
            return '2' === String.substring(xhr.status, 0, 1)
                 ? response.resolve(xhr.response, xhr)
                 : response.reject(xhr.responseText.substr(4), xhr);
            
        };
        xhr.open(spec.relation, spec.uri, true);
        xhr.send();
        return response.promise;     
    };
    Concorde.HTTP = HTTP;

    
    // Concorde.Router class

    function Router(virtualHost) {
        var lastPiece;
        
        if (virtualHost) {
            lastPiece = virtualHost.lastIndexOf("#");
            if (-1 !== lastPiece) {
                virtualHost = virtualHost.substr(0, lastPiece);
            }
            lastPiece = virtualHost.lastIndexOf("/");
            if (-1 !== lastPiece) {
                virtualHost = virtualHost.substr(0, lastPiece);
            }
        }
        
        this.virtualHost     = virtualHost;
        this.routes          = new Array;
        this.areas           = {};
        this.pushCallback    = function () {};
        this.replaceCallback = function () {};
    }
    Concorde.Router = Router;
    Router.compareRoutePatterns = function (a, b, sub) {
        return Router.comparePatternSimilarity(a, b)
            || Router.compareOcurrences(a, b, sub);
    };
    Router.comparePatternSimilarity = function(a, b) {
        return 0 === a.indexOf(b) || a === Route.CATCH_ALL_IDENTIFIER;
    };
    Router.compareOcurrences = function (a, b, sub) {
        return a.match(sub) < b.match(sub);
    };
    Router.prototype.areasFrom = function (areasProvider) {
        this.areasProvider = areasProvider;
        return this;
    };
    Router.prototype.area = function (name, whenLoading) {
        return this.areas[name] = {
            whenLoading: whenLoading || function () {}
        };
    };
    Router.prototype.progressive = function (input) {
        return this.foreground(input, true);
    };
    Router.prototype.graceful = function (input) {
        return this.background(input, true);
    };
    Router.prototype.background = function (input, graceful) {
        var spec     = Router.parseSpec(input),
            matched  = this.matchRoutes(spec.relation, spec.uri),
            route    = matched[0],
            params   = matched[1],
            area     = null,
            areas    = this.areas,
            provider = this.areasProvider,
            useArea  = spec.areaName && provider && areas[spec.areaName],
            request;
            
            if (matched) {
                request = Q.fcall(
                   this.callRouteCallback.bind(this), 
                   route,
                   spec.element,
                   params
                );
            } else {
                if (graceful) {
                    request = router.request(input);
                } else {
                    return false;
                }
            }
            
        return request.then(function (result) {
            if (useArea) {
                areas[spec.areaName].whenLoading(spec.areaName);
                area = provider(spec.areaName);
            }
            return {
                element: spec.element, 
                params: params, 
                result: result || '', 
                area: area
            };
        });
    };
    
    Router.parseSpec = function (input) {
        var spec     = input.target || input;
        return {
            uri:      spec.href || spec.action,
            relation: spec.href && spec.rel || spec.method || 'GET',
            element:  spec.element || spec,
            title:    spec.title || null,
            areaName: spec.area
        };
    };
    
    Router.prototype.request = function (input) {
        var spec = Router.parseSpec(input);
        
        input.href = this.virtualHost + spec.uri;
        return Concorde.HTTP(input);
    };
    
    Router.prototype.foreground = function (input, graceful) {
        var spec         = Router.parseSpec(input),
            targetWindow = this.targetWindow,
            pushCallback = this.pushCallback,
            virtualHost  = this.virtualHost,
            dispatched;
            
        if (!spec.uri) {
            return;
        }
        dispatched = this.background({
            method: spec.relation.toUpperCase(), 
            href: spec.uri, 
            element: spec.element,
            area: spec.areaName
        }, graceful);
        
        if (dispatched) {
            if (input.preventDefault) {
                input.preventDefault();
            }
            return dispatched.then(function (response) {
                spec.uri = virtualHost + (spec.uri.replace(virtualHost, ''));
                pushCallback({routed: true}, spec.title, spec.uri);
                return response;
            });
        }
    };
    Router.prototype.aimWindow = function (someWindow) {
        var router = this,
            doc;
        
        this.targetWindow = someWindow;
        doc = someWindow.document;
        doc.addEventListener('click', this.foreground.bind(this));
        doc.addEventListener('submit', this.foreground.bind(this));
        return this;
    };
    Router.prototype.pushesState = function () {
        var targetWindow = this.targetWindow;
        
        targetWindow.addEventListener('popstate', function (event) {
            if (event.state) {
                router.foreground({
                    method: 'GET', 
                    href: targetWindow.location.href
                }).done();
            }
        });
        this.pushCallback = function (state, title, uri) {
            targetWindow.history.pushState(state, title, uri);
        };
        this.replaceCallback = function (state, title, uri) {
            targetWindow.history.replaceState(state, title, uri);
        };
        return this;
    };
    Router.prototype.hashesState = function (state, title, uri) {
        var targetWindow = this.targetWindow,
            virtualHost  = this.virtualHost,
            hashFunction = function (state, title, uri) {
                var newHash = uri.replace(virtualHost, '').replace(/^\/+/, ''),
                    hash,
                    element;
                
                if (newHash) {
                    hash = ("!/" + newHash).replace('!/#', '');
                    targetWindow.location.hash = hash.split('#').length > 1 
                        ? hash.substr(hash.lastIndexOf('#') + 1)
                        : hash;
                }
            };
            
        this.pushCallback = hashFunction;
        this.replaceCallback = hashFunction;
        return this;
    };
    Router.prototype.get = function (pattern, callback) {
        return this.on('GET', pattern, callback);
    };
    Router.prototype.post = function (pattern, callback) {
        return this.on('POST', pattern, callback);
    };
    Router.prototype.on = function (relation, pattern, callback) {
        var route = new Concorde.Route(relation.toUpperCase(), pattern, callback);
        route.router = this;
        this.routes.push(route);
        return route;
    };
    
    Router.prototype.matchRoutes = function (relation, uri) {
        var howManyRoutes = this.routes.length,
            i,
            route,
            path,
            matches;
            
        this.routes.sort(function (a, b) {
            var pi = Route.PARAM_IDENTIFIER,
            a = a.pattern;
            b = b.pattern;
            
            if (Router.compareRoutePatterns(a, b, '/')) {
                return 1;
            } else if (Router.compareRoutePatterns(a, b, pi)) {
                return -1;
            } else {
                return 1;
            }
        });
        
        path = uri.replace(this.virtualHost, '');
        
        for (i = 0; i <= howManyRoutes; i++) {
            route = this.routes[i];
            if (route) {
                matches = route.match(relation, path);
                if (matches) {
                    return [route, matches];
                }
            }
        }
        
        return false;
    };
    
    Router.prototype.callRouteCallback = function (route, element, params) {
        var callPromise = Q.fcall(route.callback, element, params);
        if (route.parent) {
            callPromise = this.callRouteCallback(
                route.parent, 
                element, 
                params
            ).then(callPromise);
        }
        return callPromise;
    };
    
    Router.prototype.writeBase = function () {
        this.targetWindow.document.write("<BASE href='" + this.virtualHost + "/' />");
        return this;
    };
    
    Router.prototype.here = function (currentLocation) {
        var hash = this.targetWindow.location.hash,
            uri = !!currentLocation
                    ? this.virtualHost + "/" + currentLocation
                    : hash.replace(this.virtualHost, '').replace('#!/', ''),
            replaceCallback = this.replaceCallback,
            dispatched;
            
        if (!this.targetWindow.history.state) {
            replaceCallback({routed: true}, null, uri);
            dispatched = this.foreground({method: 'GET', href: uri});
            if (dispatched) {
                dispatched.done();
            }
        }
        return this;
    };
    // Concorde.Route class
    
    function Route(relation, pattern, callback) {
        this.relation       = relation;
        this.pattern        = pattern;
        this.callback       = callback;
        this.matchPattern   = pattern;
        this.replacePattern = pattern;
        this.createRegexPatterns(pattern);
    }
    Concorde.Route = Route;
    Route.CATCHALL_IDENTIFIER = '/**';
    Route.PARAM_IDENTIFIER = '/*';
    Route.QUOTED_PARAM_IDENTIFIER = '/\*';
    Route.REGEX_CATCHALL = '(/.*)?';
    Route.REGEX_SINGLE_PARAM = '/([^/]+)';
    Route.REGEX_ENDING_PARAM = '/\(\[\^/\]\+\)';
    Route.REGEX_OPTIONAL_PARAM = '(?:/([^/]+))?';
    Route.REGEX_INVALID_OPTIONAL_PARAM = '\(\?\:/\(\[\^/\]\+\)\)\?/';
    Route.prototype.match = function (relation, uri) {
        var paramsMatch;
        if (relation !== this.relation) {
            return false;
        }
        
        if (uri === this.pattern) {
            return true;
        }
        paramsMatch = new RegExp(this.matchRegex);
        paramsMatch = paramsMatch.exec(uri);
        if (paramsMatch) {
            return paramsMatch.splice(1);
        }
    };
    Route.prototype.rel = function (relation, callback) {
        var route = this.router.on(relation.toUpperCase(), this.pattern, callback);
        route.parent = this;
        return this;
    };
    Route.prototype.extractParams = function (uri) {
        var matches = new RegExp(this.matchPattern).match(uri);
        return matches;
    };
    Route.prototype.extractCatchAllPattern = function (pattern) {
        var extra       = Route.REGEX_CATCHALL,
            catchAllPos = pattern.indexOf(Route.CATCHALL_IDENTIFIER);
        
        if (catchAllPos === pattern.length - Route.CATCHALL_IDENTIFIER.length) {
            pattern = pattern.substr(0, catchAllPos);
        } else {
            extra = '';
        }
        
        pattern = pattern.replace(
            Route.CATCHALL_IDENTIFIER,
            Route.PARAM_IDENTIFIER
        );
        
        return [pattern, extra];
    };
    Route.prototype.fixOptionalParams = function (matchPattern) {
        if (matchPattern.indexOf(Route.REGEX_SINGLE_PARAM) ===
            matchPattern.length - Route.REGEX_SINGLE_PARAM.length
        ) {
            matchPattern = matchPattern.replace(
                new RegExp(Route.REGEX_ENDING_PARAM),
                Route.REGEX_OPTIONAL_PARAM
            );
        }
        
        matchPattern = matchPattern.replace(
            new RegExp(Route.REGEX_INVALID_OPTIONAL_PARAM),
            Route.REGEX_SINGLE_PARAM + '/'
        );
        
        return matchPattern;
    };
    Route.prototype.createRegexPatterns = function (pattern) {
        var matchPattern,
            replacePattern,
            extracted,
            extra;
            
        pattern        = pattern.replace(/[ /]$/, '');
        extracted      = this.extractCatchAllPattern(pattern);
        extra          = extracted[1];
        pattern        = extracted[0];
        matchPattern   = pattern.replace(
            Route.QUOTED_PARAM_IDENTIFIER, 
            Route.REGEX_SINGLE_PARAM
        ).replace(
            Route.PARAM_IDENTIFIER, 
            Route.REGEX_SINGLE_PARAM
        );
        replacePattern    = pattern.replace(Route.PARAM_IDENTIFIER, '%s');
        this.matchRegex   = new RegExp("^" + matchPattern + extra + "$");
        this.matchPattern = this.fixOptionalParams(matchPattern); 
    };

    return Concorde;
    
});
