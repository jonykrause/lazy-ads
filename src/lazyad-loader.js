(function (root, factory) {
  if (typeof exports === 'object' && typeof require === 'function') {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define(factory);
  } else {
    factory();
  }
}(this, function() {


    var debug = false;

    var config = {
        containerElement: 'div',
        containerClass: 'ad'
    };

    var startTime;


    /**
     * Utility functions
     *
     */
    ''.trim || (String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
    });

    function log() {
        if (debug === true && window.console) {
            // Only run on the first time through - reset this function to the appropriate console.log helper
            if (Function.prototype.bind) {
                log = Function.prototype.bind.call(console.log, console);
            } else {
                log = function() {
                    Function.prototype.apply.call(console.log, console, arguments);
                };
            }

            log.apply(this, arguments);
        }
    }



    // Internals
    var find = function(tagName, className, context) {
        var results = [],
            selector, node, i, isLazyAd, classListSupported, querySelectorSupported,
            context = context || document;

        classListSupported = 'classList' in document.createElement("_"),
        querySelectorSupported = 'querySelectorAll' in document;

        if (querySelectorSupported) {
            selector = tagName;
            selector += className ? '.' + className : '';
            results = context.querySelectorAll(selector);

        } else {
            q = context.getElementsByTagName(tagName);

            for (i = 0; i < q.length; i++) {
                node = q[i];
                if (className === false) {
                    results.push(node);
                } else {
                    if (classListSupported) {
                        if (node.classList.contains(className)) {
                            results.push(node);
                        }
                    } else {
                        if (node.className && node.className.split(/\s/).indexOf(className) !== -1) {
                            results.push(node);
                        }
                    }
                }
            }
        }

        return results;
    };

    var findAdContainers = function(root) {
        var containers = find(config.containerElement, config.containerClass),
            node,
            isLazyAd = false,
            results = [];

        for (var i = 0; i < containers.length; i++) {
            node = containers[i];
            isLazyAd = (node.getAttribute('data-lazyad') !== null);

            if (isLazyAd === true) {
                results.push(node);
            }
        }

        return results;
    };

    var findAdScripts = function(root) {
        var ads = find('script', false, root),
            node,
            type,
            results = [];

        for (var i = 0; i < ads.length; i++) {
            node = ads[i];
            type = node.getAttribute('type');
            if (type && type === 'text/lazyad') {
                results.push(node);
            }
        }

        return results;
    };

    var stripCommentBlock = function(str) {
        // trim whitespace
        str = str.replace(/^\s+|\s+$/g, '');
        return str.replace('<!--', '').replace('-->', '').trim();
    };

    var adReplace = function(el, text, options) {
        var node, target;
        text = stripCommentBlock(text);

        log('Injecting lazy-loaded Ad', el);

        function done() {
          el.setAttribute('data-lazyad-loaded', true);
          if (options.onAdReplaced &&
            typeof options.onAdReplaced === 'function') {
            return options.onAdReplaced(el);
          }
        }

        return setTimeout(function() {
            return postscribe(el, text, {
              done: done
            });
        }, 0);

    };


    var processAll = function(adContainers, options) {

        var counter = 0,
            el,
            adScripts,
            lazyAdEl,
            lazyAdElType,
            elWidth,
            elHeight,
            reqAdWidth,
            reqAdHeight,
            mq,
            sizeReqFulfilled,
            isLoaded;

        for (var x = 0; x < adContainers.length; x++) {

            el = adContainers[x];
            mq = el.getAttribute('data-matchmedia') || false;
            reqAdWidth = parseInt(el.getAttribute('data-adwidth'), 0) || false;
            reqAdHeight = parseInt(el.getAttribute('data-adheight'), 0) || false;
            adScripts = findAdScripts(el);

            for (var i = 0; i < adScripts.length; i++) {
                lazyAdEl = adScripts[i];

                isLoaded = (el.getAttribute('data-lazyad-loaded') === "true");


                if (reqAdWidth || reqAdHeight) {
                    elWidth = el.offsetWidth;
                    elHeight = el.offsetHeight;
                    sizeReqFulfilled = true;

                    if (reqAdWidth && (reqAdWidth > elWidth)) sizeReqFulfilled = false;
                    if (reqAdHeight && (reqAdHeight > elHeight)) sizeReqFulfilled = false;

                    if (sizeReqFulfilled === false) {
                        // log('Lazy-loaded container dimensions fulfilment not met.', reqAdWidth, reqAdHeight, elWidth, elHeight, el, lazyAdEl);
                        if (isLoaded) {
                            unloadAds(el, options);
                        }
                        break;
                    }
                }

                if (mq !== false && matchMedia(mq).matches === false) {
                    // log('Lazy-loaded Ad media-query fulfilment not met.', el, lazyAdEl);
                    if (isLoaded) {
                        unloadAds(el);
                    }
                    break;
                }

                if (!isLoaded) {
                    adReplace(el, lazyAdEl.innerHTML, options);
                    counter++;
                }

            }

        }

        return counter;
    };

    var unloadAds = function(el, options) {

        function done() {
          el.setAttribute('data-lazyad-loaded', false);
          if (options.onAdUnloaded &&
            typeof options.onAdUnloaded === 'function') {
            return options.onAdUnloaded(el);
          }
        }

        log('Unloading Ad:', el);
        var childNodes = el.getElementsByTagName('*');

        while (childNodes) {
            var child = childNodes[childNodes.length - 1];
            if (child.nodeName.toLowerCase() === 'script' && child.type === 'text/lazyad') {
                // dont want to remove the lazy-loaded script
                break;
            } else {
                child.parentNode.removeChild(child);
            }
        }

        return done();
    }

    // Expose init method
    var init = function(options) {
        var adContainers,
            // timeToComplete,
            counter = 0;

        options = options || {};

        // reset timer
        // startTime = new Date().getTime();

        // find all lazyads
        adContainers = findAdContainers();

        // process/replace/unload
        if (adContainers && adContainers.length > 0) {
            counter = processAll(adContainers, options);
        }

        // stop the clock…
        // timeToComplete = (new Date().getTime() - startTime);
        // timeToComplete = '~' + timeToComplete + 'ms';

        // finished
        // log('Lazy-loaded count: ', counter, timeToComplete);
    };


    return {
      init: init
    };

}));