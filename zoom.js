(function() {

// Type Vector is [ x, y ]
// Type Matrix is [ Vector, Vector ]
// Type Transform is [ Matrix, Vector ]

/**
 * Multiply Scalar with Vector returns a Vector.
 * 
 * @param {number} l scalar to multiply with
 * @param {Array<number>} x 2D vector.
 * @return {Array<number>}
 */
var scmult = function(l, x) {
    return [ l * x[0], l * x[1] ];
};

/**
 * Adding two vectors is another vector.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<number>} Sum vector.
 */
var vcadd = function(a, b) {
    return [ a[0] + b[0], a[1] + b[1] ];
};

/**
 * Subtracting two vectors is another vector.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<number>} Difference vector.
 */
var minus = function(a, b) {
    return [ a[0] - b[0], a[1] - b[1] ];
};

/**
 * Dot product of two vectors is scalar.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {number} scalar inner product.
 */
var dot = function(a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Exterior Product of two vectors is a pseudoscalar.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {number} psuedo-scalar exterior product.
 */
var wedge = function(a, b) {
    return a[0] * b[1] - a[1] * b[0];
};

/**
 * Apply Matrix on Vector returns a Vector.
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix
 * @param {Array<number>} x 2D vector.
 * @return {Array<number>} 2D vector linear product.
 */
var apply = function(A, x) {
    return vcadd(scmult(x[0], A[0]), scmult(x[1], A[1]));
};

/**
 * Multiply two matrices.
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix
 * @param {Array<Array<number>>} B 2x2 Matrix
 * @return {Array<Array<number>>} A 2x2 Matrix
 */
var mult = function(A, B) {
    return [ apply(A, B[0]), apply(A, B[1]) ];
};

/**
 * Represents a transform operation, Ax + b
 * 
 * @constructor
 * 
 * @param {Array<Array<number>>} A 2x2 Matrix.
 * @param {Array<number>} b 2D scalar.
 */
function Transform(A, b) {
    this.A = A;
    this.b = b;
}

/**
 * Given CSS Transform representation of the class.
 * @return {string} CSS 2D Transform. 
 */
Transform.prototype.css = function() {
    var A = this.A;
    var b = this.b;

    // `matrix(elX, elDeg, elDeg, elY, scaleX, scaleY)`
    return 'matrix(' + A[0][0] + ',' + A[0][1] + ',' + A[1][0] + ',' + A[1][1] +
            ',' + b[0] + ',' + b[1] + ')';
};

/**
 * Multiply two transforms. 
 * Defined as 
 *  (T o U) (x) = T(U(x))
 * 
 * Derivation:
 *  T(U(x)) 
 *   = T(U.A(x) + U.b) 
 *   = T.A(U.A(x) + U.b)) + T.b
 *   = T.A(U.A(x)) + T.A(U.b) + T.b 
 * 
 * @param {Transform} T 
 * @param {Transform} U 
 * @return {Transform} T o U
 */
var cascade = function(T, U) {
    return new Transform(mult(T.A, U.A), vcadd(apply(T.A, U.b), T.b));
};

/**
 * Creates the default rotation matrix
 * 
 * @param {number} c x-projection (r cos(theta))
 * @param {number} s y-projection (r sin(theta))
 * @return {Array<Array<number>>} Rotation matrix.
 */
var rotate = function(c, s) {
    return [ [ c, s], [-s, c] ];
};

/**
 * Returns matrix that transforms vector a to vector b.
 * 
 * @param {Array<number>} a 2D vector.
 * @param {Array<number>} b 2D vector.
 * @return {Array<Array<number>>} Rotation + Scale matrix
 */
var rotscale = function(a, b) {
    var alen = dot(a, a);
    var sig = dot(a, b);
    var del = wedge(a, b);
    return rotate( sig / alen, del / alen);
};

var justscale = function(a, b) {
    var alen = Math.sqrt(dot(a, a));
    var blen = Math.sqrt(dot(b, b));
    var scale = blen / alen;
    return rotate(scale, 0);
};

/**
 * Zoom is a similarity preserving transform from a pair of source
 * points to a new pair of destination points. If rotate it is false
 * then it won't be maintaining the transfer precisely, but will only
 * do scaling part of it.
 * 
 * @param {Array<Array<number>>} s two source points.
 * @param {Array<Array<number>>} d two destination points.
 * @param {Boolean} rotate true - rotate; else scale.
 * 
 * @return {Transform} that moves point 's' to point 'd' 
 */ 
var zoom = function(s, d, rotate) {
    // Source vector.
    var a = minus(s[1], s[0]);
    // Destination vector.
    var b = minus(d[1], d[0]);
    // Rotation needed for source to dest vector.
    var rs = rotate ? rotscale(a, b) : justscale(a, b);

    // Position of s[0] if rotation is applied.
    var rs0 = apply(rs, s[0]);
    // Since d[0] = rs0 + t
    var t = minus(d[0], rs0);

    return new Transform(rs, t);
};

/**
 * Weighted average of two vectors.
 * 
 * @param {Array<number>} u 2D vector.
 * @param {Array<number>} v 2D vector.
 * @param {number} progress (from 0 to 1)
 * @return {Array<number>} (1-p) u + (p) v 
 */
var avgVector = function(u, v, progress) {
    var u1 = scmult(1 - progress, u);
    var v1 = scmult(progress, v);
    return vcadd(u1, v1);
};

/**
 * Weighted average of two vectors.
 * 
 * @return {Array<Array<number>>} A 2D matrix.
 * @return {Array<Array<number>>} B 2D matrix.
 * @param {number} progress (from 0 to 1)
 * @return {Array<Array<number>>} (1-p) A + (p) B 
 */
var avgMatrix = function(A, B, progress) {
    return [ avgVector(A[0], B[0], progress),  avgVector(A[1], B[1], progress) ];
};


/**
 * Weighted average of two transforms.
 * @param {Transform} Z Source Transform
 * @param {Transform} I Destination Transform
 * @param {number} progress (from 0 to 1)
 * @return {Transform} (1-p) Z + (p) I 
 */
Transform.avg = function(Z, I, progress) {
    return new Transform(avgMatrix(Z.A, I.A, progress), avgVector(Z.b, I.b, progress));
};

var identity = new Transform([[1, 0], [0, 1]], [0, 0]);

/**
 * Gives a default value for an input object.
 * 
 * @param {Object} param input parameter, may be undefined
 * @param {Object} val returned if param is undefined.
 * @return {Object}
 */
var defaults = function(param, val) {
    return (param === undefined) ? val : param;
};

/**
 * Method to override json config objects with default
 * values. If undefined in cfg corresponding value from
 * cfg_def will be picked.
 * 
 * @param {Object} cfg input parameter config.
 * @param {Object} cfg_def default fallbacks.
 * @return {Object} new config
 */
var default_config = function(cfg, cfg_def) {
    var new_cfg = defaults(cfg, {});
    for (var k in cfg_def) {
        new_cfg[k] = defaults(new_cfg[k], cfg_def[k]);
    }
    return new_cfg;
};


/**
 * @constructor
 * @export
 * @param {Element} elem to attach zoom handler.
 * @param {Object} config to specify additiona features.
 */
function Zoom(elem, config, wnd) {
    this.mayBeDoubleTap = null;
    this.isAnimationRunning = false;
    // SingleFinger = 1, DoubleFinger = 2, NoTouch = 0
    this.curTouch = 0;
    this.elem = elem;
    this.activeZoom = identity;
    this.resultantZoom = identity;

    this.srcCoords = [0, 0];
    this.destCoords = [0, 0];
    var me = this;
    
    this.config = default_config(config, {
        'pan' : false,
        'rotate' : true,
        'minScale': null,
        'maxScale': null
    });

    this.wnd = wnd || window;

    elem.style['transform-origin'] = '0 0';

    var getCoordsDouble = function(t) {
        var oX = elem.offsetLeft;
        var oY = elem.offsetTop; 
        return [ 
            [t[0].pageX - oX, t[0].pageY - oY],
            [t[1].pageX - oX, t[1].pageY - oY] 
        ];
    };

    var getCoordsSingle = function(t) {
        var oX = elem.offsetLeft;
        var oY = elem.offsetTop; 
        var x = t[0].pageX - oX;
        var y = t[0].pageY - oY;
        return [ 
            [x, y],
            [x + 1, y + 1] 
        ];
    };

    var getCoords = function(t) {
        return t.length > 1 ? getCoordsDouble(t) : getCoordsSingle(t);
    };

    var setSrcAndDest = function(touches){
        me.srcCoords = getCoords(touches);
        me.destCoords = me.srcCoords;
    };

    var setDest = function(touches){
        me.destCoords = getCoords(touches);
    };

    var handleTouchEvent = function(cb) {
        return function(evt) {
            evt.preventDefault();

            if (me.isAnimationRunning){
                return false;
            }            
            var touches = evt.touches;
            if (!touches) {
                return false;
            }
            cb(touches);
        };
    };

    var handleZoom = handleTouchEvent(function(touches) {
        var numOfFingers = touches.length;
        if (numOfFingers !== me.curTouch){
            me.curTouch = numOfFingers;
            me.finalize();
            if (numOfFingers !== 0) {
                setSrcAndDest(touches);
            }
        } else if (numOfFingers !== 0) {
            setDest(touches);
            me.previewZoom();
        }
    });
    
    var handleTouchStart = handleTouchEvent(function(touches) {
        if (touches.length === 1) {

            if (me.mayBeDoubleTap !== null) {
                clearTimeout(me.mayBeDoubleTap);
                me.reset();
                me.mayBeDoubleTap = null;
            } else {
                me.mayBeDoubleTap = setTimeout(function() {
                    me.mayBeDoubleTap = null;                    
                }, 300);
            }
        }
    });

    this.pixelSize = elem.getBoundingClientRect();

    elem.parentNode.addEventListener('touchstart', handleTouchStart);
    elem.parentNode.addEventListener('touchstart', handleZoom);
    elem.parentNode.addEventListener('touchmove', handleZoom);
    elem.parentNode.addEventListener('touchend', handleZoom);

    this.destroy = function() {
        elem.style.removeProperty('transform');
        elem.style.removeProperty('transform-origin');

        elem.parentNode.removeEventListener('touchstart', handleTouchStart);
        elem.parentNode.removeEventListener('touchstart', handleZoom);
        elem.parentNode.removeEventListener('touchmove', handleZoom);
        elem.parentNode.removeEventListener('touchend', handleZoom);

        /**
         * Remove elem references so gardbage collector can clean this up
         */
        Object.keys(this).forEach(function(key) {
            delete this[key];
        }.bind(this));
    }.bind(this);
}

Zoom.prototype.previewZoom = function() {
    var additionalZoom = zoom(this.srcCoords, this.destCoords, this.config.rotate);
    var resultantZoom = cascade(additionalZoom, this.activeZoom);

    /**
     * Prevent panning if scaling is greater than min/max
     */
    if (this.checkPan(resultantZoom) === false) { return; }

    /**
     * Prevent panning if reaching the boundary of the image
     */
    resultantZoom = this.checkBoundaries(resultantZoom);

    this.resultantZoom = resultantZoom;
    this.repaint();
};

Zoom.prototype.setZoom = function(newZoom) {
    this.resultantZoom = newZoom;
    this.repaint();
};

Zoom.prototype.finalize = function() {
    this.activeZoom = this.resultantZoom;
};

Zoom.prototype.repaint = function() {
    this.elem.style.transform = this.resultantZoom.css();
};

/**
 * Toggle zoom-out/zoom-on 
 * 
 * @param {Boolean} useOriginalIdentity If triggering reset manually and want to reset scale to 1
 */
Zoom.prototype.reset = function(useOriginalIdentity) {
    var newIdentity = identity;

    if (this.wnd.requestAnimationFrame) {
        this.isAnimationRunning = true;

        var Z = this.activeZoom;
        var startTime = null;

        /**
         * Enable doubletap to zoom image
         */
        if (this.config.maxScale) {
            if (!useOriginalIdentity && Z.A[0][0] === 1 && Z.A[1][1] === 1) {
                var windowSize = {
                    height: (document.documentElement.clientHeight || window.innerHeight),
                    width: (document.documentElement.clientWidth || window.innerWidth)
                };

                var max     = this.config.maxScale;

                var middleX = ((this.pixelSize.width  * this.config.maxScale) - windowSize.width) / 2;
                    middleX = middleX + (this.elem.offsetLeft);
                    middleX = middleX * -1;

                var middleY = ((windowSize.height / 2) - (this.pixelSize.height / 2));
                    middleY = middleY + (((this.pixelSize.height * this.config.maxScale) - windowSize.height) / 2);
                    middleY = middleY * -1;

                newIdentity = new Transform([[max, 0], [0, max]], [middleX, middleY]);
            }
        }

        var me = this;

        var step = function(time) {
            if (!startTime) { 
                startTime =  time;
            }
            var progress = (time - startTime)/100;

            if (progress >= 1) {
                me.setZoom(newIdentity);
                /**
                 * Grace period to prevent animation glitches
                 */
                setTimeout(function() {
                    me.isAnimationRunning = false;
                }, 100);
            } else {
                me.setZoom(Transform.avg(Z, newIdentity, progress));
                me.wnd.requestAnimationFrame(step);
            }
        };
        this.wnd.requestAnimationFrame(step);
    } else {
        this.setZoom(newIdentity);
    }
};

Zoom.prototype.checkPan = function(resultantZoom) {

   var proceed = true;

    var A = resultantZoom.A;

    /**
     * If scale is less than `minScale`
     */
    var minScale = this.config.minScale;
    if (minScale) {
        if (A[0][0] <= minScale && A[1][1] <= minScale) {
            proceed = false;
            this.finalize();
            this.reset(true);
        }
    }

    /**
     * If scale is more than `maxScale`
     */
    var maxScale = this.config.maxScale;
    if (maxScale && (A[0][0] > maxScale && A[1][1] > maxScale)) {
        proceed = false;
    }

    return proceed;
};


Zoom.prototype.checkBoundaries = function(resultantZoom) {

    var A = resultantZoom.A;
    var b = resultantZoom.b;

    var boundaries = this.config.boundaries;
    if (boundaries === true) {
        var width = this.pixelSize.width * A[0][0];
        var height = this.pixelSize.height * A[1][1];

        var windowSize = {
            height: (document.documentElement.clientHeight || window.innerHeight),
            width: (document.documentElement.clientWidth || window.innerWidth)
        };

        var xLeft, xRight;
        var yTop, yBottom;

        /**
         * Portrait viewport
         */
        if (windowSize.height > windowSize.width) {
            /**
             * Prevent image going further right
             */
            if (b[0] >= 0) {
                b[0] = 0;
            }

            /**
             * Prevent image going further left
             */
            if (Math.abs(b[0]) >= (width - windowSize.width)) {
                b[0] = (width - windowSize.width) * -1;
            }

            /**
             * Prevent image going further up
             */
            var yTopFormula = ((windowSize.height - this.pixelSize.height) / 2) * -1;

            if (b[1] <= yTopFormula) {
                yTop = yTopFormula;
            }

            /**
             * Prevent image going further down
             */
            var yBottomFormula = ((windowSize.height - this.pixelSize.height) / 2) - (height - this.pixelSize.height);

            if (b[1] > yBottomFormula) {
                yBottom = yBottomFormula;
            }

            if (height < windowSize.height) {
                if (yTop && !yBottom) {
                    b[1] = yTop;
                } else if (yBottom && !yTop) {
                    b[1] = yBottom;
                }
            } else {
                if (yTop && !yBottom) {
                    b[1] = yBottomFormula;
                } else if (yBottom && !yTop) {
                    b[1] = yTopFormula;
                }
            }
        } else {
            /**
             * Landscape viewport
             */

            /**
             * X Axis
             */

            /**
             * Prevent image going further right
             */
            var xRightFormula =  this.elem.offsetLeft * -1;
            if (b[0] >= xRightFormula) {
                xRight = xRightFormula;
            }

            /**
             * Prevent image going further left
             */
            var xLeftFormula = ((windowSize.width - this.pixelSize.width) / 2) - (width - this.pixelSize.width);
            if (b[0] <= xLeftFormula) {
                xLeft = xLeftFormula;
            }


            /**
             * Prevent glitching on images whose width is smaller than the viewport
             */
            var widerImage = (width > windowSize.width);

            if (xRight && !xLeft) {
                b[0] = (widerImage) ? xRight : xLeftFormula;
            } else if (xLeft && !xRight) {
                b[0] = (widerImage) ? xLeft : xRightFormula;
            }


            /**
             * Y Axis
             */

            if (b[1] >= 0) {
                yTop = 0;
            } else if (Math.abs(b[1]) >= (height - windowSize.height)) {
                yBottom = (height - windowSize.height) * -1;
            }

            if (yTop >= 0 && !yBottom) {
                b[1] = yTop;
            } else if (yBottom && !yTop) {
                b[1] = yBottom;
            }
        }

        resultantZoom.A = A;
        resultantZoom.b = b;
    }

    return resultantZoom;
};

window.Zoom = Zoom;

})();