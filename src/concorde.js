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

    // Concorde.Router class

    function Router(virtualHost) {
        var lastSlash;
        
        if (virtualHost) {
            lastSlash = virtualHost.lastIndexOf("/");
            if (virtualHost.length !== lastSlash) {
                virtualHost = virtualHost.substr(0, lastSlash);
            }
        }
        
        this.virtualHost = virtualHost;
        this.routes      = new Array;
        this.areas       = {};
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
    Router.prototype.background = function (input) {
        var spec     = input.target || input,
            uri      = spec.href || spec.action,
            relation = spec.method || spec.rel || 'GET',
            element  = spec.element || spec,
            areaName = spec.area,
            matched  = this.matchRoutes(relation, uri),
            route    = matched[0],
            params   = matched[1],
            area     = null,
            areas    = this.areas,
            provider = this.areasProvider,
            useArea  = areaName && provider && areas[areaName];
        
        if (false === matched) {
            return false;
        } else {
            return Q.fcall(
                this.callRouteCallback.bind(this), 
                route,
                element,
                params
            ).then(function (result) {
                if (useArea) {
                    areas[areaName].whenLoading(areaName);
                    area = provider(areaName);
                }
                return {
                    element: element, 
                    params: params, 
                    result: result, 
                    area: area
                };
            });
        }
    };
    
    Router.prototype.foreground = function (input) {
        var spec         = input.target || input,
            uri          = spec.href || spec.action || spec.src,
            relation     = spec.method || spec.rel || 'GET',
            element      = spec.element || spec,
            title        = spec.title || null,
            areaName     = spec.area || null,
            targetWindow = this.targetWindow,
            dispatched;
            
        if (!uri) {
            return;
        }
        
        dispatched = this.background({
            method: relation.toUpperCase(), 
            href: uri, 
            element: element,
            area: areaName
        });
        
        if (dispatched) {
            if (input.preventDefault) {
                input.preventDefault();
            }
            return dispatched.then(function (response) {
                targetWindow.history.pushState({routed: true}, title, uri);
                return response;
            });
        }
    };
    Router.prototype.aimWindow = function (someWindow) {
        var router = this;
        
        this.targetWindow = someWindow;
        someWindow.addEventListener('popstate', function (event) {
            var dispatched;
            if (event.state) {
                router.foreground({method: 'GET', href: someWindow.location.href}).done();
            }
        });
        someWindow.document.addEventListener('click', this.foreground.bind(this));
        someWindow.document.addEventListener('submit', this.foreground.bind(this));
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
        var uri = !!currentLocation
                    ? this.virtualHost + "/" + currentLocation
                    : this.virtualHost + "/",
            dispatched;

        if (!this.targetWindow.history.state) {
            this.targetWindow.history.replaceState({routed: true}, null, uri);
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
        var extra = Route.REGEX_CATCHALL;
        
        if (pattern.indexOf(Route.CATCHALL_IDENTIFIER) ===
            pattern.length - Route.CATCHALL_IDENTIFIER.length
        ) {
            pattern = pattern.substr(0, -3);
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
