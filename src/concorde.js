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
            spec = Router.spec(input),
            response = Q.defer();
        
        if (HTTP.xhrProto) {
            xhr = new HTTP.xhrProto;
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

    function Router(base) {
        var lastPiece;
        
        if (base) {
            lastPiece = base.lastIndexOf("#");
            if (-1 !== lastPiece) {
                base = base.substr(0, lastPiece);
            }
            lastPiece = base.lastIndexOf("/");
            if (-1 !== lastPiece) {
                base = base.substr(0, lastPiece);
            }
        }
        
        this.base      = base;
        this.routes    = new Array;
        this.areas     = {};
        this.onPush    = function () {};
        this.onReplace = function () {};
    }
    Concorde.Router = Router;
    Router.howSpecific = function (a, b, sub) {
        return 0 === a.indexOf(b) || a === T_CA
            || a.match(sub) < b.match(sub);
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
    Router.prototype.background = function (input, graceful, graceForeground) {
        var spec     = Router.spec(input),
            matched  = this.find(spec.relation, spec.uri),
            route    = matched[0],
            params   = matched[1],
            area     = null,
            areas    = this.areas,
            provider = this.areasProvider,
            useArea  = spec.areaName && provider && areas[spec.areaName],
            request;
            
            if (matched) {
                request = Q.fcall(
                   this.dispatch.bind(this), 
                   route,
                   spec.element,
                   params
                );
            } else {
                if (graceful) {
                    request = router.request(input, graceForeground);
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
    
    Router.spec = function (input) {
        var spec     = input.target || input;
        return {
            uri:      spec.href || spec.action,
            relation: spec.href && spec.rel || spec.method || 'GET',
            element:  spec.element || spec,
            title:    spec.title || null,
            areaName: spec.area
        };
    };
    
    Router.prototype.request = function (input, foreground) {
        var spec = Router.spec(input);
        
        input.href = this.base + spec.uri;
        return Concorde.HTTP(
            input, 
            spec.areaName || (foreground && 'foreground')
        );
    };
    
    Router.prototype.foreground = function (input, graceful) {
        var spec   = Router.spec(input),
            win    = this.win,
            onPush = this.onPush,
            base   = this.base,
            dispatched;
            
        if (!spec.uri) {
            return;
        } else {
            spec.uri = spec.uri.replace(this.base + '/', '');
        }
        dispatched = this.background({
            method: spec.relation.toUpperCase(), 
            href: spec.uri, 
            element: spec.element,
            area: spec.areaName
        }, graceful, true);
        
        if (dispatched) {
            if (input.preventDefault) {
                input.preventDefault();
            }
            return dispatched.then(function (response) {
                spec.uri = base + spec.uri;
                onPush({routed: true}, spec.title, spec.uri);
                return response;
            });
        }
    };
    Router.prototype.aimWindow = function (someWindow) {
        var router = this,
            doc;
        
        this.win = someWindow;
        doc = someWindow.document;
        doc.addEventListener('click', this.foreground.bind(this));
        doc.addEventListener('submit', this.foreground.bind(this));
        return this;
    };
    Router.prototype.pushesState = function () {
        var win = this.win;
        
        win.addEventListener('popstate', function (event) {
            if (event.state) {
                router.foreground({
                    method: 'GET', 
                    href: win.location.href
                }).done();
            }
        });
        this.onPush = function (state, title, uri) {
            win.history.pushState(state, title, uri);
        };
        this.onReplace = function (state, title, uri) {
            win.history.replaceState(state, title, uri);
        };
        return this;
    };
    Router.prototype.hashesState = function (state, title, uri) {
        var win = this.win,
            base  = this.base,
            hashFunction = function (state, title, uri) {
                var newHash = uri.replace(base, '').replace(/^\/+/, ''),
                    hash,
                    element;
                
                if (newHash) {
                    hash = ("!/" + newHash).replace('!/#', '');
                    win.location.hash = hash.split('#').length > 1 
                        ? hash.substr(hash.lastIndexOf('#') + 1)
                        : hash;
                }
            };
            
        this.onPush = hashFunction;
        this.onReplace = hashFunction;
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
        this.routes.sort(function (a, b) {
            var pi = T_P,
            a = a.pattern;
            b = b.pattern;
            
            if (Router.howSpecific(a, b, '/')) {
                return 1;
            } else if (Router.howSpecific(a, b, pi)) {
                return -1;
            } else {
                return 1;
            }
        });
        return route;
    };
    
    Router.prototype.find = function (relation, uri) {
        var howManyRoutes = this.routes.length,
            i,
            route,
            path,
            matches;
            
        path = uri.replace(this.base, '');
        
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
    
    Router.prototype.dispatch = function (route, element, params) {
        var callPromise = Q.fcall(route.callback, element, params);
        if (route.parent) {
            callPromise = this.dispatch(
                route.parent, 
                element, 
                params
            ).then(callPromise);
        }
        return callPromise;
    };
    
    Router.prototype.writeBase = function () {
        this.win.document.write("<BASE href='" + this.base + "/' />");
        return this;
    };
    
    Router.prototype.here = function (currentLocation) {
        var hash = this.win.location.hash,
            uri = !!currentLocation
                    ? this.base + "/" + currentLocation
                    : hash.replace(this.base, '').replace('#!', ''),
            onReplace = this.onReplace,
            dispatched;
            
        uri = uri || '/';
        if (!this.win.history.state) {
            onReplace({routed: true}, null, uri);
            dispatched = this.foreground({method: 'GET', href: uri});
            if (dispatched) {
                dispatched.done();
            }
        }
        return this;
    };
    // Concorde.Route class
    
    function Route(relation, pattern, callback) {
        this.relation = relation;
        this.pattern  = pattern;
        this.callback = callback;
        this.replacer = pattern;
        this.matcher  = fixOptional(pattern);
        this.expr     = createRegex(pattern);
    }
    Concorde.Route = Route;
    var T_CA = '/**'; // Catch-all
    var T_P = '/*';   // Param 
    var T_HL = '#';   // Hash Locator
    var T_HP = '-*';  // Hash Param 
    var T_QP = '/\*'; // Quoted Param
    var T_RCA = '(/.*)?';   // Regex for Catch-all
    var T_RP = '/([^/]+)';  // Regex for Param
    var T_RHP = '-([^/]+)'; // Regex for Hash Param
    var T_RPE = '/\(\[\^/\]\+\)'; // Regex for Ending Param
    var T_RPO = '(?:/([^/]+))?';  // Regex for Optional Param
    var T_RPI = '\(\?\:/\(\[\^/\]\+\)\)\?/'; // Regex for Optional Ending
    Route.prototype.match = function (relation, uri) {
        var paramsMatch;
        if (relation !== this.relation) {
            return false;
        }
        
        if (uri === this.pattern) {
            return true;
        }
        paramsMatch = new RegExp(this.expr);
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
    function fixOptional (matchPattern) {
        if (matchPattern.indexOf(T_RP) ===
            matchPattern.length - T_RP.length
        ) {
            matchPattern = matchPattern.replace(
                new RegExp(T_RPE),
                T_RPO
            );
        }
        
        matchPattern = matchPattern.replace(
            new RegExp(T_RPI),
            T_RP + '/'
        );
        
        return matchPattern;
    };
    function extractCatchAll(pattern) {
        var extra       = T_RCA,
            catchAllPos = pattern.indexOf(T_CA);
        
        if (catchAllPos === pattern.length - T_CA.length) {
            pattern = pattern.substr(0, catchAllPos);
        } else {
            extra = '';
        }
        
        pattern = pattern.replace(T_CA, T_P);
        
        return [pattern, extra];
    };
    function createRegex(pattern) {
        var matchPattern,
            replacePattern,
            extracted,
            extra,
            hashLocator;
            
        pattern           = pattern.replace(/[ /]$/, '');
        extracted         = extractCatchAll(pattern);
        extra             = extracted[1];
        pattern           = extracted[0];
        hashLocator       = pattern.lastIndexOf(T_HL);
        if (-1 !== hashLocator) {
            matchPattern  = pattern.substr(0, hashLocator)
                                   .replace(T_QP, T_RP)
                                   .replace(T_P, T_RP);
            matchPattern += pattern.substr(hashLocator)
                                   .replace(T_QP, T_RP)
                                   .replace(T_P, T_RP)
                                   .replace(T_HP, T_RHP);
        } else {
            matchPattern = pattern.replace(T_QP, T_RP)
                                   .replace(T_P, T_RP);
        }
        replacePattern   = pattern.replace(T_P, '%s');
        return new RegExp("^" + matchPattern + extra + "$");
    };

    return Concorde;
    
});
