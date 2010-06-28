// browser-specific hooks and definitions
var sys = {};

sys.print = function(str) {
	var s = str.toString().replace(new RegExp('\n', 'g'), '<br />');
	document.write(s);
};

sys.error = function(str) {
	if (console && console.log) {
		console.log("Error: " + str);
	}
	else {
		var s = str.toString().replace(new RegExp('\n', 'g'), '<br />');
		s = "<br />Error: " + s + "<br />";
		document.write(s);
	}
};


sys.inspect = function(x) {
    // FIXME: add more helpful inspect function that'll show
    // us what's really inside.  Perhaps use toString()?
    return x + '';
};


var DEBUG_ON = false;

var setDebug = function(v) {
    DEBUG_ON = v;
}

var debug = function(s) {
    if (DEBUG_ON) {
	sys.print(s);
    }
}

var debugF = function(f_s) {
    if (DEBUG_ON) {
	sys.print(f_s());
    }
}


var deepEqual = function (obj1, obj2) {
	if (obj1 === obj2) {
		return true;
	}

	for (var i in obj1) {
		if ( obj1.hasOwnProperty(i) ) {
			if ( !(obj2.hasOwnProperty(i) && deepEqual(obj1[i], obj2[i])) )
				return false;
		}
	}
	for (var i in obj2) {
		if ( obj2.hasOwnProperty(i) ) {
			if ( !(obj1.hasOwnProperty(i) && deepEqual(obj1[i], obj2[i])) )
				return false;
		}
	}
	return true;
}


var assert = {};

assert.equal = function(x, y) {
	if (x !== y) {
		alert('AssertError: ' + x + ' equal ' + y);
		throw new Error('AssertError: ' + x + ' equal ' + y);
	}
}

assert.deepEqual = function(x, y) {
	if ( !deepEqual(x, y) ) {
		alert('AssertError: ' + x + ' deepEqual ' + y);
		throw new Error('AssertError: ' + x + ' deepEqual ' + y);
	}
}


assert.ok = function(x) {
	if (!x) {
		alert('AssertError: not ok: ' + x);
		throw new Error('AssertError: not ok: ' + x );
	}
}


assert.throws = function(f) {
	try {
		f.apply(null, []);
	} catch (e) {
		return;
	}
	throw new Error('AssertError: Throw expected, none received.');
}



//////////////////////////////////////////////////////////////

// File of helper functions for primitives and world.

var helpers = {};

(function() {

	var format = function(formatStr, args) {
		var pattern = new RegExp("~[sSaAn%~]", "g");
		var buffer = args;
		function f(s) {
			if (s == "~~") {
				return "~";
			} else if (s == '~n' || s == '~%') {
				return "\n";
			} else if (s == '~s' || s == "~S") {
				if (buffer.length == 0) {
					//TODO Throw some sort of error here!!
				}
				return types.toWrittenString(buffer.shift());
			} else if (s == '~a' || s == "~A") {
				if (buffer.length == 0) {
					//TODO Throw some sort of error here!!
				}
				return types.toDisplayedString(buffer.shift());
			} else {
				//TODO Throw some sort of error here!!
			}
		}
		var result = formatStr.replace(pattern, f);
		if (buffer.length > 0) {
			//TODO Throw some sort of error here!!
		}
		return result;
	};


	// forEachK: CPS( array CPS(array -> void) (error -> void) -> void )
	// Iterates through an array and applies f to each element using CPS
	// If an error is thrown, it catches the error and calls f_error on it
	var forEachK = function(a, f, f_error, k) {
		var forEachHelp = function(i) {
			if( i >= a.length ) {
				if (k) { k(); }
				return;
			}

			try {
				f(a[i], function() { forEachHelp(i+1); });
			} catch (e) {
				f_error(e);
			}
		};
		forEachHelp(0);
	};


	// reportError: (or exception string) -> void
	// Reports an error to the user, either at the console
	// if the console exists, or as alerts otherwise.
	var reportError = function(e) {
		var reporter;
		if (typeof(console) != 'undefined' && 
			typeof(console.log) != 'undefined') {
			reporter = (function(x) { console.log(x); });
		} else {
			reporter = (function(x) { alert(x); });
		}
		if (typeof e == 'string') {
			reporter(e);
		} else if ( types.isSchemeError(e) ) {
			if ( types.isExn(e.val) ) {
				reporter( types.exnMessage(e.val) );
			}
			else {
				reporter(e.val);
			}
		} else if (e.message) {
			reporter(e.message);
		} else {
			reporter(e.toString());
		}
//		if (plt.Kernel.lastLoc) {
//			var loc = plt.Kernel.lastLoc;
//			if (typeof(loc) === 'string') {
//			reporter("Error was raised around " + loc);
//			} else if (typeof(loc) !== 'undefined' &&
//				   typeof(loc.line) !== 'undefined') {
//			reporter("Error was raised around: "
//				 + plt.Kernel.locToString(loc));
//			}
//		}
	};


//	// remove: array any -> array
//	// removes the first instance of v in a
//	// or returns a copy of a if v does not exist
//	var remove = function(a, v) {
//		for (var i = 0; i < a.length; i++) {
//			if (a[i] === v) {
//				return a.slice(0, i).concat( a.slice(i+1, a.length) );
//			}
//		}
//		return a.slice(0);
//	};

	// map: array (any -> any) -> array
	// applies f to each element of a and returns the result
	// as a new array
	var map = function(a, f) {
		var b = new Array(a.length);
		for (var i = 0; i < a.length; i++) {
			b[i] = f(a[i]);
		}
		return b;
	};


	// deepListToArray: any -> any
	// Converts list structure to array structure.
	var deepListToArray = function(x) {
		var thing = x;
		if (thing === types.EMPTY) {
			return [];
		} else if (types.isPair(thing)) {
			var result = [];
			while (!thing.isEmpty()) {
				result.push(deepListToArray(thing.first()));
				thing = thing.rest();
			}
			return result;
		} else {
			return x;
		}
	}


	// assocListToHash: (listof (list X Y)) -> (hashof X Y)
	var assocListToHash = function(lst) {
		var result = {};
		while ( !lst.isEmpty() ) {
			var key = lst.first().first();
			var val = lst.first().rest().first();
			result[key] = val;
			lst = lst.rest();
		}
		return result;
	};


	var ordinalize = function(n) {
		var res = n;
		switch( n % 10 ) {
			case 1: res += 'st'; break;
			case 2: res += 'nd'; break;
			case 3: res += 'rd'; break;
			default: res += 'th'; break;
		}
		return res;
	}





	////////////////////////////////////////////////

	helpers.format = format;
	helpers.forEachK = forEachK;
	helpers.reportError = reportError;
	
//	helpers.remove = remove;
	helpers.map = map;
	helpers.deepListToArray = deepListToArray;
	helpers.assocListToHash = assocListToHash;

	helpers.ordinalize = ordinalize;

})();

/////////////////////////////////////////////////////////////////

// Scheme numbers.

/**
var __PLTNUMBERS_TOP__;
if (typeof(exports) !== 'undefined') {
    __PLTNUMBERS_TOP__ = exports;
} else {
    if (! this['jsnums']) {
	this['jsnums'] = {};
    }
    __PLTNUMBERS_TOP__  = this['jsnums'];
}

*/

var jsnums = {};



// The numeric tower has the following levels:
//     integers
//     rationals
//     floats
//     complex numbers
//
// with the representations:
//     integers: fixnum or BigInteger [level=0]
//     rationals: Rational [level=1]
//     floats: FloatPoint [level=2]
//     complex numbers: Complex [level=3]

// We try to stick with the unboxed fixnum representation for
// integers, since that's what scheme programs commonly deal with, and
// we want that common type to be lightweight.


// A boxed-scheme-number is either BigInteger, Rational, FloatPoint, or Complex.
// An integer-scheme-number is either fixnum or BigInteger.


(function() {
    // Abbreviation
    //    var Numbers = __PLTNUMBERS_TOP__;

    var Numbers = jsnums;

    // makeNumericBinop: (fixnum fixnum -> any) (scheme-number scheme-number -> any) -> (scheme-number scheme-number) X
    // Creates a binary function that works either on fixnums or boxnums.
    // Applies the appropriate binary function, ensuring that both scheme numbers are
    // lifted to the same level.
    var makeNumericBinop = function(onFixnums, onBoxednums, options) {
	options = options || {};
	return function(x, y) {
	    if (options.isXSpecialCase && options.isXSpecialCase(x))
		return options.onXSpecialCase(x, y);
	    if (options.isYSpecialCase && options.isYSpecialCase(y))
		return options.onYSpecialCase(x, y);

	    if (typeof(x) === 'number' &&
		typeof(y) === 'number') {
		return onFixnums(x, y);
	    }
	    if (typeof(x) === 'number') {
		x = liftFixnumInteger(x, y);
	    }
	    if (typeof(y) === 'number') {
		y = liftFixnumInteger(y, x);
	    }

	    if (x.level < y.level) x = x.liftTo(y);
	    if (y.level < x.level) y = y.liftTo(x);
	    return onBoxednums(x, y);
	};
    }
    
    
    // fromFixnum: fixnum -> scheme-number
    var fromFixnum = function(x) {
	if (isNaN(x) || (! isFinite(x))) {
	    return FloatPoint.makeInstance(x);
	}
	var nf = Math.floor(x);
	if (nf === x) {
	    if (isOverflow(nf)) {
		return makeBignum(x);
	    } else {
		return nf;
	    }
	} else {
	    return FloatPoint.makeInstance(x);
	}
    };
    

    
    // liftFixnumInteger: fixnum-integer boxed-scheme-number -> boxed-scheme-number
    // Lifts up fixnum integers to a boxed type.
    var liftFixnumInteger = function(x, other) {
	switch(other.level) {
	case 0: // BigInteger
	    return makeBignum(x);
	case 1: // Rational
	    return new Rational(x, 1);
	case 2: // FloatPoint
	    return new FloatPoint(x);
	case 3: // Complex
	    return new Complex(x, 0);
	default:
	    return throwRuntimeError("IMPOSSIBLE: cannot lift fixnum integer to " + other.toString(), x, other);
	}
    };
    
    
    // throwRuntimeError: string (scheme-number | undefined) (scheme-number | undefined) -> void
    // Throws a runtime error with the given message string.
    var throwRuntimeError = function(msg, x, y) {
	Numbers['onThrowRuntimeError'](msg, x, y);
    };



    // onThrowRuntimeError: string (scheme-number | undefined) (scheme-number | undefined) -> void
    // By default, will throw a new Error with the given message.
    // Override Numbers['onThrowRuntimeError'] if you need to do something special.
    var onThrowRuntimeError = function(msg, x, y) {
	throw new Error(msg);
    };


    // isSchemeNumber: any -> boolean
    // Returns true if the thing is a scheme number.
    var isSchemeNumber = function(thing) {
	return (typeof(thing) === 'number'
		|| (thing instanceof Rational ||
		    thing instanceof FloatPoint ||
		    thing instanceof Complex ||
		    thing instanceof BigInteger));
    };


    // isRational: scheme-number -> boolean
    var isRational = function(n) {
	return (typeof(n) === 'number' ||
		(isSchemeNumber(n) && n.isRational()));
    };

    // isReal: scheme-number -> boolean
    var isReal = function(n) {
	return (typeof(n) === 'number' ||
		(isSchemeNumber(n) && n.isReal()));
    };

    // isExact: scheme-number -> boolean
    var isExact = function(n) {
	return (typeof(n) === 'number' || 
		(isSchemeNumber(n) && n.isExact()));
    };

    // isInteger: scheme-number -> boolean
    var isInteger = function(n) {
	return (typeof(n) === 'number' ||
		(isSchemeNumber(n) && n.isInteger()));
    };

    // isExactInteger: scheme-number -> boolean
    var isExactInteger = function(n) {
	return (typeof(n) === 'number' ||
		(isSchemeNumber(n) && 
		 n.isInteger() && 
		 n.isExact()));
    }



    // toFixnum: scheme-number -> javascript-number
    var toFixnum = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.toFixnum();
    };

    // toExact: scheme-number -> scheme-number
    var toExact = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.toExact();
    };


    //////////////////////////////////////////////////////////////////////


    // add: scheme-number scheme-number -> scheme-number
    var add = makeNumericBinop(
	function(x, y) {
	    var sum = x + y;
	    if (isOverflow(sum)) {
		return (makeBignum(x)).add(makeBignum(y));
	    } else {
		return sum;
	    }
	},
	function(x, y) {
	    return x.add(y);
	},
	{isXSpecialCase: function(x) { 
	    return isExactInteger(x) && _integerIsZero(x) },
	 onXSpecialCase: function(x, y) { return y; },
	 isYSpecialCase: function(y) { 
	     return isExactInteger(y) && _integerIsZero(y) },
	 onYSpecialCase: function(x, y) { return x; }
	});


    // subtract: scheme-number scheme-number -> scheme-number
    var subtract = makeNumericBinop(
	function(x, y) {
	    var diff = x - y;
	    if (isOverflow(diff)) {
		return (makeBignum(x)).subtract(makeBignum(y));
	    } else {
		return diff;
	    }
	},
	function(x, y) {
	    return x.subtract(y);
	},
	{isXSpecialCase: function(x) { 
	    return isExactInteger(x) && _integerIsZero(x) },
	 onXSpecialCase: function(x, y) { return negate(y); },
	 isYSpecialCase: function(y) { 
	     return isExactInteger(y) && _integerIsZero(y) },
	 onYSpecialCase: function(x, y) { return x; }
	});


    // mulitply: scheme-number scheme-number -> scheme-number
    var multiply = makeNumericBinop(
	function(x, y) {
	    var prod = x * y;
	    if (isOverflow(prod)) {
		return (makeBignum(x)).multiply(makeBignum(y));
	    } else {
		return prod;
	    }
	},
	function(x, y) {
	    return x.multiply(y);
	},
	{isXSpecialCase: function(x) { 
	    return (isExactInteger(x) && 
		    (_integerIsZero(x) || _integerIsOne(x) || _integerIsNegativeOne(x))) },
	 onXSpecialCase: function(x, y) { 
	     if (_integerIsZero(x))
		 return 0;
	     if (_integerIsOne(x))
		 return y;
	     if (_integerIsNegativeOne(x))
		 return negate(y);
	 },
	 isYSpecialCase: function(y) { 
	     return (isExactInteger(y) && 
		     (_integerIsZero(y) || _integerIsOne(y) || _integerIsNegativeOne(y)))},
	 onYSpecialCase: function(x, y) { 
	     if (_integerIsZero(y))
		 return 0;
	     if (_integerIsOne(y))
		 return x;
	     if (_integerIsNegativeOne(y)) 
		 return negate(x);
	 }
	});

    
    // divide: scheme-number scheme-number -> scheme-number
    var divide = makeNumericBinop(
	function(x, y) {
	    if (_integerIsZero(y))
		throwRuntimeError("division by zero", x, y);
	    var div = x / y;
	    if (isOverflow(div)) {
		return (makeBignum(x)).divide(makeBignum(y));
	    } else if (Math.floor(div) !== div) {
		return Rational.makeInstance(x, y);
	    } else {
		return div;
	    }
	},
	function(x, y) {
	    return x.divide(y);
	});
    
    
    // equals: scheme-number scheme-number -> boolean
    var equals = makeNumericBinop(
	function(x, y) {
	    return x === y;
	},
	function(x, y) {
	    return x.equals(y);
	});


    // eqv: scheme-number scheme-number -> boolean
    var eqv = function(x, y) {
	if (x === y)
	    return true;
	if (typeof(x) === 'number' && typeof(y) === 'number')
	    return x === y;
	if (x === NEGATIVE_ZERO || y === NEGATIVE_ZERO)
	    return x === y;
	if (x instanceof Complex || y instanceof Complex) {
	    return (eqv(realPart(x), realPart(y)) &&
		    eqv(imaginaryPart(x), imaginaryPart(y)));
	}
	var ex = isExact(x), ey = isExact(y);
	return (((ex && ey) || (!ex && !ey)) && equals(x, y));
    };

    // approxEqual: scheme-number scheme-number scheme-number -> boolean
    var approxEquals = function(x, y, delta) {
	return lessThan(abs(subtract(x, y)),
                        delta);
    };

    // greaterThanOrEqual: scheme-number scheme-number -> boolean
    var greaterThanOrEqual = makeNumericBinop(
	function(x, y) {
	    return x >= y;
	},
	function(x, y) {
	    if (!(isReal(x) && isReal(y)))
		throwRuntimeError(
		    "greaterThanOrEqual: couldn't be applied to complex number", x, y);
	    return x.greaterThanOrEqual(y);
	});


    // lessThanOrEqual: scheme-number scheme-number -> boolean
    var lessThanOrEqual = makeNumericBinop(
	function(x, y){

	    return x <= y;
	},
	function(x, y) {
	    if (!(isReal(x) && isReal(y)))
		throwRuntimeError("lessThanOrEqual: couldn't be applied to complex number", x, y);
	    return x.lessThanOrEqual(y);
	});


    // greaterThan: scheme-number scheme-number -> boolean
    var greaterThan = makeNumericBinop(
	function(x, y){
	    return x > y;
	},
	function(x, y) {
	    if (!(isReal(x) && isReal(y)))
		throwRuntimeError("greaterThan: couldn't be applied to complex number", x, y);
	    return x.greaterThan(y);
	});


    // lessThan: scheme-number scheme-number -> boolean
    var lessThan = makeNumericBinop(
	function(x, y){

	    return x < y;
	},
	function(x, y) {
	    if (!(isReal(x) && isReal(y)))
		throwRuntimeError("lessThan: couldn't be applied to complex number", x, y);
	    return x.lessThan(y);
	});



    // expt: scheme-number scheme-number -> scheme-number
    var expt = (function() {
	var _expt = makeNumericBinop(
	    function(x, y){
		var pow = Math.pow(x, y);
		if (isOverflow(pow)) {
		    return (makeBignum(x)).expt(makeBignum(y));
		} else {
		    return pow;
		}
	    },
	    function(x, y) {
		if (equals(y, 0)) {
		    return add(y, 1);
		} else {
		    return x.expt(y);
		}
	    });
	return function(x, y) {
	    if (equals(y, 0)) 
		return add(y, 1);
	    if (isReal(y) && lessThan(y, 0)) {
		return _expt(divide(1, x), negate(y));
	    }
	    return _expt(x, y);
	};
    })();


    // exp: scheme-number -> scheme-number
    var exp = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.exp(n));
	}
	return n.exp();
    };


    // modulo: scheme-number scheme-number -> scheme-number
    var modulo = function(m, n) {
	if (! isInteger(m)) {
	    throwRuntimeError('modulo: the first argument '
			      + m + " is not an integer.", m, n);
	}
	if (! isInteger(n)) {
	    throwRuntimeError('modulo: the second argument '
			      + n + " is not an integer.", m, n);
	}
	var result;
	if (typeof(m) === 'number') {
	    result = m % n;
	    if (n < 0) {
		if (result <= 0)
		    return result;
		else
		    return result + n;
	    } else {
		if (result < 0)
		    return result + n;
		else
		    return result;
	    }
	}
	result = _integerModulo(floor(m), floor(n));
	// The sign of the result should match the sign of n.
	if (lessThan(n, 0)) {
	    if (lessThanOrEqual(result, 0)) {
		return result;
	    }
	    return add(result, n);

	} else {
	    if (lessThan(result, 0)) {
		return add(result, n);
	    }
	    return result;
	}
    };



    // numerator: scheme-number -> scheme-number
    var numerator = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.numerator();
    };


    // denominator: scheme-number -> scheme-number
    var denominator = function(n) {
	if (typeof(n) === 'number')
	    return 1;
	return n.denominator();
    };

    // sqrt: scheme-number -> scheme-number
    var sqrt = function(n) {
	if (typeof(n) === 'number') {
	    if (n >= 0) {
		var result = Math.sqrt(n);
		if (Math.floor(result) === result) {
		    return result;
		} else {
		    return FloatPoint.makeInstance(result);
		}
	    } else {
		return (Complex.makeInstance(0, sqrt(-n)));
	    }
	}
	return n.sqrt();
    };

    // abs: scheme-number -> scheme-number
    var abs = function(n) {
	if (typeof(n) === 'number') {
	    return Math.abs(n);
	}
	return n.abs();
    };

    // floor: scheme-number -> scheme-number
    var floor = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.floor();
    };

    // ceiling: scheme-number -> scheme-number
    var ceiling = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.ceiling();
    };

    // conjugate: scheme-number -> scheme-number
    var conjugate = function(n) {
	if (typeof(n) === 'number')
	    return n;
	return n.conjugate();
    };

    // magnitude: scheme-number -> scheme-number
    var magnitude = function(n) {
	if (typeof(n) === 'number')
	    return Math.abs(n);
	return n.magnitude();
    };


    // log: scheme-number -> scheme-number
    var log = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.log(n));
	}
	return n.log();
    };

    // angle: scheme-number -> scheme-number
    var angle = function(n) {
	if (typeof(n) === 'number') {
	    if (n > 0)
		return 0;
	    else
		return FloatPoint.pi;
	}
	return n.angle();
    };

    // tan: scheme-number -> scheme-number
    var tan = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.tan(n));
	}
	return n.tan();
    };

    // atan: scheme-number -> scheme-number
    var atan = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.atan(n));
	}
	return n.atan();
    };

    // cos: scheme-number -> scheme-number
    var cos = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.cos(n));
	}
	return n.cos();
    };

    // sin: scheme-number -> scheme-number
    var sin = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.sin(n));
	}
	return n.sin();
    };

    // acos: scheme-number -> scheme-number
    var acos = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.acos(n));
	}
	return n.acos();
    };

    // asin: scheme-number -> scheme-number
    var asin = function(n) {
	if (typeof(n) === 'number') {
	    return FloatPoint.makeInstance(Math.asin(n));
	}
	return n.asin();
    };

    // imaginaryPart: scheme-number -> scheme-number
    var imaginaryPart = function(n) {
	if (typeof(n) === 'number') {
	    return 0;
	}
	return n.imaginaryPart();
    };

    // realPart: scheme-number -> scheme-number
    var realPart = function(n) {
	if (typeof(n) === 'number') {
	    return n;
	}
	return n.realPart();
    };

    // round: scheme-number -> scheme-number
    var round = function(n) {
	if (typeof(n) === 'number') {
	    return n;
	}
	return n.round();
    };



    // sqr: scheme-number -> scheme-number
    var sqr = function(x) {
	return multiply(x, x);
    };


    // integerSqrt: scheme-number -> scheme-number
    var integerSqrt = function(x) {
	if (typeof (x) === 'number') {
	    if(x < 0) {
	        return Complex.makeInstance(0,
					    Math.floor(Math.sqrt(-x)))
	    } else {
		return Math.floor(Math.sqrt(x));
	    }
	}

	return x.integerSqrt();
    };


    // gcd: scheme-number [scheme-number ...] -> scheme-number
    var gcd = function(first, rest) {
	if (! isInteger(first)) {
	    throwRuntimeError('gcd: the argument ' + first.toString() +
			      " is not an integer.", first);
	}
	var a = abs(first), t, b;
	for(var i = 0; i < rest.length; i++) {
	    b = abs(rest[i]);	
	    if (! isInteger(b)) {
		throwRuntimeError('gcd: the argument ' + b.toString() +
				  " is not an integer.", b);
	    }
	    while (! _integerIsZero(b)) {
		t = a;
		a = b;
		b = integerModulo(t, b);
	    }
	}
	return a;
    };

    // lcm: scheme-number [scheme-number ...] -> scheme-number
    var lcm = function(first, rest) {
	if (! isInteger(first)) {
	    throwRuntimeError('lcm: the argument ' + first.toString() +
			      " is not an integer.", first);
	}
	var result = abs(first);
	if (_integerIsZero(result)) { return 0; }
	for (var i = 0; i < rest.length; i++) {
	    if (! isInteger(rest[i])) {
		throwRuntimeError('lcm: the argument ' + rest[i].toString() +
				  " is not an integer.", rest[i]);
	    }
	    var divisor = gcd(result, rest[i]);
	    if (_integerIsZero(divisor)) {
		return 0;
	    }
	    result = divide(multiply(result, rest[i]), divisor);
	}
	return result;
    };
    

    var quotient = function(x, y) {
 	if (! isInteger(x)) {
	    throwRuntimeError('quotient: the first argument ' + x.toString() +
			      " is not an integer.", x);
	}
	if (! isInteger(y)) {
	    throwRuntimeError('quotient: the second argument ' + y.toString() +
			      " is not an integer.", y);
	}
	return _integerQuotient(x, y);
    };

    
    var remainder = function(x, y) {
	if (! isInteger(x)) {
	    throwRuntimeError('remainder: the first argument ' + x.toString() +
			      " is not an integer.", x);
	}
	if (! isInteger(y)) {
	    throwRuntimeError('remainder: the second argument ' + y.toString() +
			      " is not an integer.", y);
	}
	return _integerRemainder(x, y);
    };


    // Implementation of the hyperbolic functions
    // http://en.wikipedia.org/wiki/Hyperbolic_cosine
    var cosh = function(x) {
	return divide(add(exp(x), exp(negate(x))),
		      2);
    };
	
    var sinh = function(x) {
	return divide(subtract(exp(x), exp(negate(x))),
		      2);
    };


        
    var makeComplexPolar = function(r, theta) {
	// special case: if theta is zero, just return
	// the scalar.
	if (equals(theta, 0)) {
	    return r;
	}
	return Complex.makeInstance(multiply(r, cos(theta)),
				    multiply(r, sin(theta)));
    };



    //////////////////////////////////////////////////////////////////////

    // Helpers


    // IsFinite: scheme-number -> boolean
    // Returns true if the scheme number is finite or not.
    var isSchemeNumberFinite = function(n) {
	if (typeof(n) === 'number') {
	    return isFinite(n);
	} else {
	    return n.isFinite();
	}
    };

    // isOverflow: javascript-number -> boolean
    // Returns true if we consider the number an overflow.
    var MIN_FIXNUM = -(9e15);
    var MAX_FIXNUM = (9e15);
    var isOverflow = function(n) {
	return (n < MIN_FIXNUM ||  MAX_FIXNUM < n);
    };


    // negate: scheme-number -> scheme-number
    // multiplies a number times -1.
    var negate = function(n) {
	if (typeof(n) === 'number') {
	    return -n;
	}
	return n.negate();
    };


    // halve: scheme-number -> scheme-number
    // Divide a number by 2.
    var halve = function(n) {
	return divide(n, 2);
    };


    // timesI: scheme-number scheme-number
    // multiplies a number times i.
    var timesI = function(x) {
	return multiply(x, plusI);
    };


    // fastExpt: computes n^k by squaring.
    // n^k = (n^2)^(k/2)
    // Assumes k is non-negative integer.
    var fastExpt = function(n, k) {
	var acc = 1;
	while (true) {
	    if (_integerIsZero(k)) {
		return acc;
	    }
	    if (equals(modulo(k, 2), 0)) {
		n = multiply(n, n);
		k = divide(k, 2);
	    } else {
		acc = multiply(acc, n);
		k = subtract(k, 1);
	    }
	}
    };



    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////


    // Integer operations
    // Integers are either represented as fixnums or as BigIntegers.

    // makeIntegerBinop: (fixnum fixnum -> X) (BigInteger BigInteger -> X) -> X
    // Helper to collect the common logic for coersing integer fixnums or bignums to a
    // common type before doing an operation.
    var makeIntegerBinop = function(onFixnums, onBignums, options) {
	options = options || {};
	return (function(m, n) {
	    if (m instanceof Rational) {
		m = numerator(m);
	    } else if (m instanceof Complex) {
		m = realPart(m);
	    }

	    if (n instanceof Rational) {
		n = numerator(n);
	    }else if (n instanceof Complex) {
		n = realPart(n);
	    }

	    if (typeof(m) === 'number' && typeof(n) === 'number') {
		var result = onFixnums(m, n);
		if (! isOverflow(result) ||
		    (options.ignoreOverflow)) {
		    return result;
		}
	    }
	    if (m instanceof FloatPoint || n instanceof FloatPoint) {
		if (options.doNotCoerseToFloating) {
		    return onFixnums(toFixnum(m), toFixnum(n));
		}
		else {
		    return FloatPoint.makeInstance(
			onFixnums(toFixnum(m), toFixnum(n)));
		}
	    }
	    if (typeof(m) === 'number') {
		m = makeBignum(m);
	    }
	    if (typeof(n) === 'number') {
		n = makeBignum(n);
	    }
	    return onBignums(m, n);
	});
    };


    var makeIntegerUnOp = function(onFixnums, onBignums, options) {
	options = options || {};
	return (function(m) {
	    if (m instanceof Rational) {
		m = numerator(m);
	    } else if (m instanceof Complex) {
		m = realPart(m);
	    }

	    if (typeof(m) === 'number') {
		var result = onFixnums(m);
		if (! isOverflow(result) ||
		    (options.ignoreOverflow)) {
		    return result;
		}
	    }
	    if (m instanceof FloatPoint) {
		return onFixnums(toFixnum(m));
	    }
	    if (typeof(m) === 'number') {
		m = makeBignum(m);
	    }
	    return onBignums(m);
	});
    };



    // _integerModulo: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerModulo = makeIntegerBinop(
	function(m, n) {
	    return m % n;
	},
	function(m, n) {
	    return bnMod.call(m, n);
	});


    // _integerGcd: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerGcd = makeIntegerBinop(
	function(a, b) {
	    var t;
	    while (b !== 0) {
		t = a;
		a = b;
		b = t % b;
	    }
	    return a;
	},
	function(m, n) {
	    return bnGCD.call(m, n);
	});


    // _integerIsZero: integer-scheme-number -> boolean
    // Returns true if the number is zero.
    var _integerIsZero = makeIntegerUnOp(
	function(n){
	    return n === 0;
	},
	function(n) {
	    return bnEquals.call(n, BigInteger.ZERO);
	}
    );


    // _integerIsOne: integer-scheme-number -> boolean
    var _integerIsOne = makeIntegerUnOp(
	function(n) {
	    return n === 1;
	},
	function(n) {
	    return bnEquals.call(n, BigInteger.ONE);
	});
    

 
    // _integerIsNegativeOne: integer-scheme-number -> boolean
    var _integerIsNegativeOne = makeIntegerUnOp(
	function(n) {
	    return n === -1;
	},
	function(n) {
	    return bnEquals.call(n, BigInteger.NEGATIVE_ONE);
	});
    


    // _integerAdd: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerAdd = makeIntegerBinop(
	function(m, n) {
	    return m + n;
	},
	function(m, n) {
	    return bnAdd.call(m, n);
	});

    // _integerSubtract: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerSubtract = makeIntegerBinop(
	function(m, n) {
	    return m - n;
	},
	function(m, n) {
	    return bnSubtract.call(m, n);
	});

    // _integerMultiply: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerMultiply = makeIntegerBinop(
	function(m, n) {
	    return m * n;
	},
	function(m, n) {
	    return bnMultiply.call(m, n);
	});

    //_integerQuotient: integer-scheme-number integer-scheme-number -> integer-scheme-number
    var _integerQuotient = makeIntegerBinop(
	function(m, n) {
	    return ((m / n) - ((m % n) / n));
	},
	function(m, n) {
            return bnDivide.call(m, n);
	});

    var _integerRemainder = makeIntegerBinop(
	function(m, n) {
	    return m % n;
	},
	function(m, n) {
	    return bnRemainder.call(m, n);
	});


    // _integerDivideToFixnum: integer-scheme-number integer-scheme-number -> fixnum
    var _integerDivideToFixnum = makeIntegerBinop(
	function(m, n) {
	    return m / n;
	},
	function(m, n) {
	    return toFixnum(m) / toFixnum(n);
	},
	{ignoreOverflow: true,
	 doNotCoerseToFloating: true});


    // _integerEquals: integer-scheme-number integer-scheme-number -> boolean
    var _integerEquals = makeIntegerBinop(
	function(m, n) {
	    return m === n;
	},
	function(m, n) {
	    return bnEquals.call(m, n);
	},
	{doNotCoerseToFloating: true});

    // _integerGreaterThan: integer-scheme-number integer-scheme-number -> boolean
    var _integerGreaterThan = makeIntegerBinop(
	function(m, n) {
	    return m > n;
	},
	function(m, n) {
	    return bnCompareTo.call(m, n) > 0;
	},
	{doNotCoerseToFloating: true});

    // _integerLessThan: integer-scheme-number integer-scheme-number -> boolean
    var _integerLessThan = makeIntegerBinop(
	function(m, n) {
	    return m < n;
	},
	function(m, n) {
	    return bnCompareTo.call(m, n) < 0;
	},
	{doNotCoerseToFloating: true});

    // _integerGreaterThanOrEqual: integer-scheme-number integer-scheme-number -> boolean
    var _integerGreaterThanOrEqual = makeIntegerBinop(
	function(m, n) {
	    return m >= n;
	},
	function(m, n) {
	    return bnCompareTo.call(m, n) >= 0;
	},
	{doNotCoerseToFloating: true});

    // _integerLessThanOrEqual: integer-scheme-number integer-scheme-number -> boolean
    var _integerLessThanOrEqual = makeIntegerBinop(
	function(m, n) {
	    return m <= n;
	},
	function(m, n) {
	    return bnCompareTo.call(m, n) <= 0;
	},
	{doNotCoerseToFloating: true});



    //////////////////////////////////////////////////////////////////////
    // The boxed number types are expected to implement the following
    // interface.
    //
    // toString: -> string

    // level: number

    // liftTo: scheme-number -> scheme-number

    // isFinite: -> boolean

    // isInteger: -> boolean
    // Produce true if this number can be coersed into an integer.

    // isRational: -> boolean
    // Produce true if the number is rational.

    // isReal: -> boolean
    // Produce true if the number is real.

    // isExact: -> boolean
    // Produce true if the number is exact

    // toExact: -> scheme-number
    // Produce an exact number.

    // toFixnum: -> javascript-number
    // Produce a javascript number.

    // greaterThan: scheme-number -> boolean
    // Compare against instance of the same type.

    // greaterThanOrEqual: scheme-number -> boolean
    // Compare against instance of the same type.

    // lessThan: scheme-number -> boolean
    // Compare against instance of the same type.

    // lessThanOrEqual: scheme-number -> boolean
    // Compare against instance of the same type.

    // add: scheme-number -> scheme-number
    // Add with an instance of the same type.

    // subtract: scheme-number -> scheme-number
    // Subtract with an instance of the same type.

    // multiply: scheme-number -> scheme-number
    // Multiply with an instance of the same type.

    // divide: scheme-number -> scheme-number
    // Divide with an instance of the same type.

    // numerator: -> scheme-number
    // Return the numerator.

    // denominator: -> scheme-number
    // Return the denominator.

    // integerSqrt: -> scheme-number
    // Produce the integer square root.

    // sqrt: -> scheme-number
    // Produce the square root.

    // abs: -> scheme-number
    // Produce the absolute value.

    // floor: -> scheme-number
    // Produce the floor.

    // ceiling: -> scheme-number
    // Produce the ceiling.

    // conjugate: -> scheme-number
    // Produce the conjugate.

    // magnitude: -> scheme-number
    // Produce the magnitude.

    // log: -> scheme-number
    // Produce the log.

    // angle: -> scheme-number
    // Produce the angle.

    // atan: -> scheme-number
    // Produce the arc tangent.

    // cos: -> scheme-number
    // Produce the cosine.

    // sin: -> scheme-number
    // Produce the sine.

    // expt: scheme-number -> scheme-number
    // Produce the power to the input.

    // exp: -> scheme-number
    // Produce e raised to the given power.

    // acos: -> scheme-number
    // Produce the arc cosine.

    // asin: -> scheme-number
    // Produce the arc sine.

    // imaginaryPart: -> scheme-number
    // Produce the imaginary part

    // realPart: -> scheme-number
    // Produce the real part.

    // round: -> scheme-number
    // Round to the nearest integer.

    // equals: scheme-number -> boolean
    // Produce true if the given number of the same type is equal.



    //////////////////////////////////////////////////////////////////////

    // Rationals


    var Rational = function(n, d) {
	this.n = n;
	this.d = d;
    };


    Rational.prototype.toString = function() {
	if (_integerIsOne(this.d)) {
	    return this.n.toString() + "";
	} else {
	    return this.n.toString() + "/" + this.d.toString();
	}
    };


    Rational.prototype.level = 1;


    Rational.prototype.liftTo = function(target) {
	if (target.level === 2)
	    return new FloatPoint(
		_integerDivideToFixnum(this.n, this.d));
	if (target.level === 3)
	    return new Complex(this, 0);
	return throwRuntimeError("invalid level of Number", this, target);
    };

    Rational.prototype.isFinite = function() {
	return true;
    };

    Rational.prototype.equals = function(other) {
	return (other instanceof Rational &&
		_integerEquals(this.n, other.n) &&
		_integerEquals(this.d, other.d));
    };



    Rational.prototype.isInteger = function() {
	return _integerIsOne(this.d);
    };

    Rational.prototype.isRational = function() {
        return true;
    };

    Rational.prototype.isReal = function() {
	return true;
    };


    Rational.prototype.add = function(other) {
	return Rational.makeInstance(_integerAdd(_integerMultiply(this.n, other.d),
						 _integerMultiply(this.d, other.n)),
				     _integerMultiply(this.d, other.d));
    };

    Rational.prototype.subtract = function(other) {
	return Rational.makeInstance(_integerSubtract(_integerMultiply(this.n, other.d),
						      _integerMultiply(this.d, other.n)),
				     _integerMultiply(this.d, other.d));
    };

    Rational.prototype.negate = function() { 
	return Rational.makeInstance(-this.n, d) 
    };

    Rational.prototype.multiply = function(other) {
	return Rational.makeInstance(_integerMultiply(this.n, other.n),
				     _integerMultiply(this.d, other.d));
    };

    Rational.prototype.divide = function(other) {
	if (_integerIsZero(this.d) || _integerIsZero(other.n)) {
	    throwRuntimeError("division by zero", this, other);
	}
	return Rational.makeInstance(_integerMultiply(this.n, other.d),
				     _integerMultiply(this.d, other.n));
    };


    Rational.prototype.toExact = function() {
	return this;
    };

    Rational.prototype.isExact = function() {
        return true;
    };

    Rational.prototype.toFixnum = function() {
	return _integerDivideToFixnum(this.n, this.d);
    };

    Rational.prototype.numerator = function() {
	return this.n;
    };

    Rational.prototype.denominator = function() {
	return this.d;
    };

    // FIXME: up to this point I've modified Rational to use the _integer functions.
    // I need to fix up the rest of Rational.
    Rational.prototype.greaterThan = function(other) {
	return _integerGreaterThan(_integerMultiply(this.n, other.d),
				   _integerMultiply(this.d, other.n));
    };

    Rational.prototype.greaterThanOrEqual = function(other) {
	return _integerGreaterThanOrEqual(_integerMultiply(this.n, other.d),
					  _integerMultiply(this.d, other.n));
    };

    Rational.prototype.lessThan = function(other) {
	return _integerLessThan(_integerMultiply(this.n, other.d),
				_integerMultiply(this.d, other.n));
    };

    Rational.prototype.lessThanOrEqual = function(other) {
	return _integerLessThanOrEqual(_integerMultiply(this.n, other.d),
				       _integerMultiply(this.d, other.n));
    };

    Rational.prototype.integerSqrt = function() {
	var result = sqrt(this);
	if (isRational(result)) {
	    return toExact(floor(result));
	} else if (isReal(result)) {
	    return toExact(floor(result));
	} else {
	    return Complex.makeInstance(toExact(floor(realPart(result))),
					toExact(floor(imaginaryPart(result))));
	}
    };


    Rational.prototype.sqrt = function() {
	if (_integerGreaterThanOrEqual(this.n,  0)) {
	    var newN = sqrt(this.n);
	    var newD = sqrt(this.d);
	    if (equals(floor(newN), newN) &&
		equals(floor(newD), newD)) {
		return Rational.makeInstance(newN, newD);
	    } else {
		return FloatPoint.makeInstance(_integerDivideToFixnum(newN, newD));
	    }
	} else {
	    var newN = sqrt(negate(this.n));
	    var newD = sqrt(this.d);
	    if (equals(floor(newN), newN) &&
		equals(floor(newD), newD)) {
		return Complex.makeInstance(
		    0,
		    Rational.makeInstance(newN, newD));
	    } else {
		return Complex.makeInstance(
		    0,
		    FloatPoint.makeInstance(_integerDivideToFixnum(newN, newD)));
	    }
	}
    };

    Rational.prototype.abs = function() {
	return Rational.makeInstance(abs(this.n),
				     this.d);
    };


    Rational.prototype.floor = function() {
	var quotient = _integerQuotient(this.n, this.d);
	if (_integerLessThan(this.n, 0)) {
	    return subtract(quotient, 1);
	} else {
	    return quotient;
	}
    };


    Rational.prototype.ceiling = function() {
	var quotient = _integerQuotient(this.n, this.d);
	if (_integerLessThan(this.n, 0)) {
	    return quotient;
	} else {
	    return add(quotient, 1);
	}
    };

    Rational.prototype.conjugate = function() {
	return this;
    };

    Rational.prototype.magnitude = Rational.prototype.abs;

    Rational.prototype.log = function(){
	return FloatPoint.makeInstance(Math.log(this.n / this.d));
    };

    Rational.prototype.angle = function(){
	if (_integerIsZero(this.n))
	    return 0;
	if (_integerGreaterThan(this.n, 0))
	    return 0;
	else
	    return FloatPoint.pi;
    };

    Rational.prototype.tan = function(){
	return FloatPoint.makeInstance(Math.tan(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.atan = function(){
	return FloatPoint.makeInstance(Math.atan(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.cos = function(){
	return FloatPoint.makeInstance(Math.cos(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.sin = function(){
	return FloatPoint.makeInstance(Math.sin(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.expt = function(a){
	if (isExactInteger(a) && greaterThanOrEqual(a, 0)) {
	    return fastExpt(this, a);
	}
	return FloatPoint.makeInstance(Math.pow(_integerDivideToFixnum(this.n, this.d),
						_integerDivideToFixnum(a.n, a.d)));
    };

    Rational.prototype.exp = function(){
	return FloatPoint.makeInstance(Math.exp(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.acos = function(){
	return FloatPoint.makeInstance(Math.acos(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.asin = function(){
	return FloatPoint.makeInstance(Math.asin(_integerDivideToFixnum(this.n, this.d)));
    };

    Rational.prototype.imaginaryPart = function(){
	return 0;
    };

    Rational.prototype.realPart = function(){
	return this;
    };


    Rational.prototype.round = function() {
	// FIXME: not correct when values are bignums
	if (equals(this.d, 2)) {
	    // Round to even if it's a n/2
	    var v = _integerDivideToFixnum(this.n, this.d);
	    var fl = Math.floor(v);
	    var ce = Math.ceil(v);
	    if (_integerIsZero(fl % 2)) {
		return fromFixnum(fl);
	    }
	    else {
		return fromFixnum(ce);
	    }
	} else {
	    return fromFixnum(Math.round(this.n / this.d));
	}
    };



    Rational.makeInstance = function(n, d) {
	if (n === undefined)
	    throwRuntimeError("n undefined", n, d);

	if (d === undefined) { d = 1; }

	if (_integerLessThan(d, 0)) {
	    n = negate(n);
	    d = negate(d);
	}

	var divisor = _integerGcd(abs(n), abs(d));
	n = _integerQuotient(n, divisor);
	d = _integerQuotient(d, divisor);

	// Optimization: if we can get around construction the rational
	// in favor of just returning n, do it:
	if (_integerIsOne(d) || _integerIsZero(n)) {
	    return n;
	}

	return new Rational(n, d);
    };



    // Floating Point numbers
    var FloatPoint = function(n) {
	this.n = n;
    };
    FloatPoint = FloatPoint;


    var NaN = new FloatPoint(Number.NaN);
    var inf = new FloatPoint(Number.POSITIVE_INFINITY);
    var neginf = new FloatPoint(Number.NEGATIVE_INFINITY);

    // We use these two constants to represent the floating-point coersion
    // of bignums that can't be represented with fidelity.
    var TOO_POSITIVE_TO_REPRESENT = new FloatPoint(Number.POSITIVE_INFINITY);
    var TOO_NEGATIVE_TO_REPRESENT = new FloatPoint(Number.NEGATIVE_INFINITY);

    // Negative zero is a distinguished value representing -0.0.
    // There should only be one instance for -0.0.
    var NEGATIVE_ZERO = new FloatPoint(0);

    FloatPoint.pi = new FloatPoint(Math.PI);
    FloatPoint.e = new FloatPoint(Math.E);
    FloatPoint.nan = NaN;
    FloatPoint.inf = inf;
    FloatPoint.neginf = neginf;

    FloatPoint.makeInstance = function(n) {
	if (isNaN(n)) {
	    return FloatPoint.nan;
	} else if (n === Number.POSITIVE_INFINITY) {
	    return FloatPoint.inf;
	} else if (n === Number.NEGATIVE_INFINITY) {
	    return FloatPoint.neginf;
	}
	return new FloatPoint(n);
    };



    FloatPoint.prototype.isFinite = function() {
	return (isFinite(this.n) ||
		this === TOO_POSITIVE_TO_REPRESENT ||
		this === TOO_NEGATIVE_TO_REPRESENT);
    };


    FloatPoint.prototype.toExact = function() {
	// The precision of ieee is about 16 decimal digits, which we use here.
	if (! isFinite(this.n) || isNaN(this.n)) {
	    throwRuntimeError("toExact: no exact representation for " + this, this);
	}
	var fracPart = this.n - Math.floor(this.n);
	var intPart = this.n - fracPart;
	return add(intPart,
		   Rational.makeInstance(Math.floor(fracPart * 10e16), 10e16));
    };

    FloatPoint.prototype.isExact = function() {
	return false;
    };


    FloatPoint.prototype.level = 2;


    FloatPoint.prototype.liftTo = function(target) {
	if (target.level === 3)
	    return new Complex(this, 0);
	return throwRuntimeError("invalid level of Number", this, target);
    };

    FloatPoint.prototype.toString = function() {
	if (isNaN(this.n))
	    return "+nan.0";
	if (this.n === Number.POSITIVE_INFINITY)
	    return "+inf.0";
	if (this.n === Number.NEGATIVE_INFINITY)
	    return "-inf.0";
	if (this === NEGATIVE_ZERO)
	    return "-0.0";
	if (this.n === 0)
	    return "0.0";
	return this.n.toString();
    };


    FloatPoint.prototype.equals = function(other, aUnionFind) {
	return ((other instanceof FloatPoint) &&
		((this.n === other.n)));
    };



    FloatPoint.prototype.isRational = function() {
        return this.isFinite();
    };

    FloatPoint.prototype.isInteger = function() {
	return this.isFinite() && this.n === Math.floor(this.n);
    };

    FloatPoint.prototype.isReal = function() {
	return true;
    };


    // sign: Number -> {-1, 0, 1}
    var sign = function(n) {
	if (lessThan(n, 0)) {
	    return -1;
	} else if (greaterThan(n, 0)) {
	    return 1;
	} else if (n === NEGATIVE_ZERO) {
	    return -1;
	} else {
	    return 0;
	}
    };


    FloatPoint.prototype.add = function(other) {
	if (this.isFinite() && other.isFinite()) {
	    if (this === NEGATIVE_ZERO && other === NEGATIVE_ZERO) {
		return NEGATIVE_ZERO;
	    }
	    return FloatPoint.makeInstance(this.n + other.n);
	} else {
	    if (isNaN(this.n) || isNaN(other.n)) {
		return NaN;
	    } else if (this.isFinite() && ! other.isFinite()) {
		return other;
	    } else if (!this.isFinite() && other.isFinite()) {
		return this;
	    } else {
		return ((sign(this) * sign(other) === 1) ?
			this : NaN);
	    };
	}
    };

    FloatPoint.prototype.subtract = function(other) {
	if (this.isFinite() && other.isFinite()) {
	    var result = this.n - other.n;
	    if (result === 0.0) {
		if (other.n === NEGATIVE_ZERO) {
		    return FloatPoint.makeInstance(result);
		}
		else if (this.n === NEGATIVE_ZERO) {
		    return NEGATIVE_ZERO;
		}
	    }
	    return FloatPoint.makeInstance(result);
	} else if (isNaN(this.n) || isNaN(other.n)) {
	    return NaN;
	} else if (! this.isFinite() && ! other.isFinite()) {
	    if (sign(this) === sign(other)) {
		return NaN;
	    } else {
		return this;
	    }
	} else if (this.isFinite()) {
	    return multiply(other, -1);
	} else {  // other.isFinite()
	    return this;
	}

    };

    FloatPoint.prototype.negate = function() {
	if (this === NEGATIVE_ZERO) {
	    return FloatPoint.makeInstance(0);
	} else if (this.n === 0) {
	    return NEGATIVE_ZERO;
	}
	return FloatPoint.makeInstance(-this.n);
    };

    FloatPoint.prototype.multiply = function(other) {
	if (this.n === 0 || other.n === 0) { return FloatPoint.makeInstance(0.0); }

	if (this.isFinite() && other.isFinite()) {
	    var product = this.n * other.n;
	    if (product !== 0) {
		return FloatPoint.makeInstance(product);
	    }
	    return sign(this) * sign(other) == 1 ?
		FloatPoint.makeInstance(0) : NEGATIVE_ZERO;
	} else if (isNaN(this.n) || isNaN(other.n)) {
	    return NaN;
	} else {
	    return ((sign(this) * sign(other) === 1) ? inf : neginf);
	}
    };

    FloatPoint.prototype.divide = function(other) {
	if (this.isFinite() && other.isFinite()) {
	    if (other.n === 0) {
		return throwRuntimeError("division by zero", this, other);
	    }
            return FloatPoint.makeInstance(this.n / other.n);
	} else if (isNaN(this.n) || isNaN(other.n)) {
	    return NaN;
	} else if (! this.isFinite() && !other.isFinite()) {
	    return NaN;
	} else if (this.isFinite() && !other.isFinite()) {
	    return FloatPoint.makeInstance(0.0);
	} else if (! this.isFinite() && other.isFinite()) {
	    return ((sign(this) * sign(other) === 1) ? inf : neginf);
	} else {
	    return throwRuntimeError("impossible", this, other);
	}
    };


    FloatPoint.prototype.toFixnum = function() {
	return this.n;
    };

    FloatPoint.prototype.numerator = function() {
	var stringRep = this.n.toString();
	var match = stringRep.match(/^(.*)\.(.*)$/);
	if (match) {
	    return FloatPoint.makeInstance(parseFloat(match[1] + match[2]));
	} else {
	    return this;
	}
    };

    FloatPoint.prototype.denominator = function() {
	var stringRep = this.n.toString();
	var match = stringRep.match(/^(.*)\.(.*)$/);
	if (match) {
	    return FloatPoint.makeInstance(Math.pow(10, match[2].length));
	} else {
	    return FloatPoint.makeInstance(1.0);
	}
    };


    FloatPoint.prototype.floor = function() {
	if (! isFinite(this.n)) {
	    return this;
	}
	return fromFixnum(Math.floor(this.n));
    };

    FloatPoint.prototype.ceiling = function() {
	if (! isFinite(this.n)) {
	    return this;
	}
	return fromFixnum(Math.ceil(this.n));
    };



    FloatPoint.prototype.greaterThan = function(other) {
	return this.n > other.n;
    };

    FloatPoint.prototype.greaterThanOrEqual = function(other) {
	return this.n >= other.n;
    };

    FloatPoint.prototype.lessThan = function(other) {
	return this.n < other.n;
    };

    FloatPoint.prototype.lessThanOrEqual = function(other) {
	return this.n <= other.n;
    };


    FloatPoint.prototype.integerSqrt = function() {
	if (isInteger(this)) {
	    if(this.n >= 0) {
	        return FloatPoint.makeInstance(floor(sqrt(this.n)));
	    }else {
	        return Complex.makeInstance(0,
	               FloatPoint.makeInstance(floor(sqrt(-this.n))))
	    }
	    
	} else {
	    throwRuntimeError("integerSqrt: can only be applied to an integer", this);
	}
    };

    FloatPoint.prototype.sqrt = function() {
	if (this.n < 0) {
	    var result = Complex.makeInstance(
		0,
		FloatPoint.makeInstance(Math.sqrt(-this.n)));
	    return result;
	} else {
	    return FloatPoint.makeInstance(Math.sqrt(this.n));
	}
    };

    FloatPoint.prototype.abs = function() {
	return FloatPoint.makeInstance(Math.abs(this.n));
    };



    FloatPoint.prototype.log = function(){
	if (this.n < 0)
	    return (new Complex(this, 0)).log();
	else
	    return FloatPoint.makeInstance(Math.log(this.n));
    };

    FloatPoint.prototype.angle = function(){
	if (0 === this.n)
	    return 0;
	if (this.n > 0)
	    return 0;
	else
	    return FloatPoint.pi;
    };

    FloatPoint.prototype.tan = function(){
	return FloatPoint.makeInstance(Math.tan(this.n));
    };

    FloatPoint.prototype.atan = function(){
	return FloatPoint.makeInstance(Math.atan(this.n));
    };

    FloatPoint.prototype.cos = function(){
	return FloatPoint.makeInstance(Math.cos(this.n));
    };

    FloatPoint.prototype.sin = function(){
	return FloatPoint.makeInstance(Math.sin(this.n));
    };

    FloatPoint.prototype.expt = function(a){
	if (this.n === 1) {
	    if (a.isFinite()) {
		return this;
	    } else if (isNaN(a.n)){
		return this;
	    } else {
		return this;
	    }
	} else {
	    return FloatPoint.makeInstance(Math.pow(this.n, a.n));
	}
    };

    FloatPoint.prototype.exp = function(){
	return FloatPoint.makeInstance(Math.exp(this.n));
    };

    FloatPoint.prototype.acos = function(){
	return FloatPoint.makeInstance(Math.acos(this.n));
    };

    FloatPoint.prototype.asin = function(){
	return FloatPoint.makeInstance(Math.asin(this.n));
    };

    FloatPoint.prototype.imaginaryPart = function(){
	return 0;
    };

    FloatPoint.prototype.realPart = function(){
	return this;
    };


    FloatPoint.prototype.round = function(){
	if (isFinite(this.n)) {
	    if (Math.abs(Math.floor(this.n) - this.n) === 0.5) {
		if (Math.floor(this.n) % 2 === 0)
		    return fromFixnum(Math.floor(this.n));
		return fromFixnum(Math.ceil(this.n));
	    } else {
		return fromFixnum(Math.round(this.n));
	    }
	} else {
	    return this;
	}
    };


    FloatPoint.prototype.conjugate = function() {
	return this;
    };

    FloatPoint.prototype.magnitude = FloatPoint.prototype.abs;



    //////////////////////////////////////////////////////////////////////
    // Complex numbers
    //////////////////////////////////////////////////////////////////////

    var Complex = function(r, i){
	this.r = r;
	this.i = i;
    };

    // Constructs a complex number from two basic number r and i.  r and i can
    // either be plt.type.Rational or plt.type.FloatPoint.
    Complex.makeInstance = function(r, i){
	if (i === undefined) { i = 0; }
	if (typeof(r) === 'number') { r = fromFixnum(r); }
	if (typeof(i) === 'number') { i = fromFixnum(i); }
	if (isExact(i) && isInteger(i) && _integerIsZero(i)) {
	    return r;
	}
	return new Complex(r, i);
    };

    Complex.prototype.toString = function() {
	var realPart = this.r.toString(), imagPart = this.i.toString();
	if (imagPart[0] === '-' || imagPart[0] === '+') {
	    return realPart + imagPart + 'i';
	} else {
	    return realPart + "+" + imagPart + 'i';
	}
    };


    Complex.prototype.isFinite = function() {
	return isSchemeNumberFinite(this.r) && isSchemeNumberFinite(this.i);
    };


    Complex.prototype.isRational = function() {
	return isRational(this.r) && equals(this.i, 0);
    };

    Complex.prototype.isInteger = function() {
	return (isInteger(this.r) &&
		equals(this.i, 0));
    };

    Complex.prototype.toExact = function() {
	if (! this.isReal()) {
	    throwRuntimeError("inexact->exact: expects argument of type real number", this);
	}
	return toExact(this.r);
    };

    Complex.prototype.isExact = function() {
        return isExact(this.r) && isExact(this.i);
    };



    Complex.prototype.level = 3;


    Complex.prototype.liftTo = function(target){
	throwRuntimeError("Don't know how to lift Complex number", this, target);
    };

    Complex.prototype.equals = function(other) {
	var result = ((other instanceof Complex) &&
		      (equals(this.r, other.r)) &&
		      (equals(this.i, other.i)));
	return result;
    };



    Complex.prototype.greaterThan = function(other) {
	if (! this.isReal() || ! other.isReal()) {
	    throwRuntimeError(">: expects argument of type real number", this, other);
	}
	return greaterThan(this.r, other.r);
    };

    Complex.prototype.greaterThanOrEqual = function(other) {
	if (! this.isReal() || ! other.isReal()) {
	    throwRuntimeError(">=: expects argument of type real number", this, other);
	}
	return greaterThanOrEqual(this.r, other.r);
    };

    Complex.prototype.lessThan = function(other) {
	if (! this.isReal() || ! other.isReal()) {
	    throwRuntimeError("<: expects argument of type real number", this, other);
	}
	return lessThan(this.r, other.r);
    };

    Complex.prototype.lessThanOrEqual = function(other) {
	if (! this.isReal() || ! other.isReal()) {
	    throwRuntimeError("<=: expects argument of type real number", this, other);
	}
	return lessThanOrEqual(this.r, other.r);
    };


    Complex.prototype.abs = function(){
	if (!equals(this.i, 0).valueOf())
	    throwRuntimeError("abs: expects argument of type real number", this);
	return abs(this.r);
    };

    Complex.prototype.toFixnum = function(){
	if (!equals(this.i, 0).valueOf())
	    throwRuntimeError("toFixnum: expects argument of type real number", this);
	return toFixnum(this.r);
    };

    Complex.prototype.numerator = function() {
	if (!this.isReal())
	    throwRuntimeError("numerator: can only be applied to real number", this);
	return numerator(this.n);
    };


    Complex.prototype.denominator = function() {
	if (!this.isReal())
	    throwRuntimeError("floor: can only be applied to real number", this);
	return denominator(this.n);
    };

    Complex.prototype.add = function(other){
	return Complex.makeInstance(
	    add(this.r, other.r),
	    add(this.i, other.i));
    };

    Complex.prototype.subtract = function(other){
	return Complex.makeInstance(
	    subtract(this.r, other.r),
	    subtract(this.i, other.i));
    };

    Complex.prototype.negate = function() {
	return Complex.makeInstance(negate(this.r),
				    negate(this.i));
    };


    Complex.prototype.multiply = function(other){
	// If the other value is real, just do primitive division
	if (other.isReal()) {
	    return Complex.makeInstance(
		multiply(this.r, other.r),
		multiply(this.i, other.r));
	}
	var r = subtract(
	    multiply(this.r, other.r),
	    multiply(this.i, other.i));
	var i = add(
	    multiply(this.r, other.i),
	    multiply(this.i, other.r));
	return Complex.makeInstance(r, i);
    };

    Complex.prototype.divide = function(other){
	// If the other value is real, just do primitive division
	if (other.isReal()) {
	    return Complex.makeInstance(
		divide(this.r, other.r),
		divide(this.i, other.r));
	}


	var con = conjugate(other);
	var up = multiply(this, con);

	// Down is guaranteed to be real by this point.
	var down = multiply(other, con);

	var result = Complex.makeInstance(
	    divide(realPart(up), down),
	    divide(imaginaryPart(up), down));
	return result;
    };

    Complex.prototype.conjugate = function(){
	var result = Complex.makeInstance(
	    this.r,
	    subtract(0,
		     this.i));

	return result;
    };

    Complex.prototype.magnitude = function(){
	var sum = add(
	    multiply(this.r, this.r),
	    multiply(this.i, this.i));
	return sqrt(sum);
    };

    Complex.prototype.isReal = function(){
	return equals(this.i, 0);
    };

    Complex.prototype.integerSqrt = function() {
	if (isInteger(this)) {
	    return integerSqrt(this.r);
	} else {
	    throwRuntimeError("integerSqrt: can only be applied to an integer", this);
	}
    };

    Complex.prototype.sqrt = function(){
	if (this.isReal())
	    return sqrt(this.r);
	// http://en.wikipedia.org/wiki/Square_root#Square_roots_of_negative_and_complex_numbers
	var r_plus_x = add(this.magnitude(), this.r);

	var r = sqrt(halve(r_plus_x));

	var i = divide(this.i, sqrt(multiply(r_plus_x, FloatPoint.makeInstance(2))));


	return Complex.makeInstance(r, i);
    };

    Complex.prototype.log = function(){
	var m = this.magnitude();
	var theta = this.angle();
	var result = add(
	    log(m),
	    timesI(theta));
	return result;
    };

    Complex.prototype.angle = function(){
	if (this.isReal()) {
	    return angle(this.r);
	}
	if (equals(0, this.r)) {
	    var tmp = halve(FloatPoint.pi);
	    return greaterThan(this.i, 0) ?
		tmp : negate(tmp);
	} else {
	    var tmp = atan(divide(abs(this.i), abs(this.r)));
	    if (greaterThan(this.r, 0)) {
		return greaterThan(this.i, 0) ?
		    tmp : negate(tmp);
	    } else {
		return greaterThan(this.i, 0) ?
		    subtract(FloatPoint.pi, tmp) : subtract(tmp, FloatPoint.pi);
	    }
	}
    };

    var plusI = Complex.makeInstance(0, 1);
    var minusI = Complex.makeInstance(0, -1);


    Complex.prototype.tan = function() {
	return divide(this.sin(), this.cos());
    };

    Complex.prototype.atan = function(){
	if (equals(this, plusI) ||
	    equals(this, minusI)) {
	    return neginf;
	}
	return multiply(
	    plusI,
	    multiply(
		FloatPoint.makeInstance(0.5),
		log(divide(
		    add(plusI, this),
		    add(
			plusI,
			subtract(0, this))))));
    };

    Complex.prototype.cos = function(){
	if (this.isReal())
	    return cos(this.r);
	var iz = timesI(this);
	var iz_negate = negate(iz);

	return halve(add(exp(iz), exp(iz_negate)));
    };

    Complex.prototype.sin = function(){
	if (this.isReal())
	    return sin(this.r);
	var iz = timesI(this);
	var iz_negate = negate(iz);
	var z2 = Complex.makeInstance(0, 2);
	var exp_negate = subtract(exp(iz), exp(iz_negate));
	var result = divide(exp_negate, z2);
	return result;
    };


    Complex.prototype.expt = function(y){
	if (isExactInteger(y) && greaterThanOrEqual(y, 0)) {
	    return fastExpt(this, y);
	}
	var expo = multiply(y, this.log());
	return exp(expo);
    };

    Complex.prototype.exp = function(){
	var r = exp(this.r);
	var cos_a = cos(this.i);
	var sin_a = sin(this.i);

	return multiply(
	    r,
	    add(cos_a, timesI(sin_a)));
    };

    Complex.prototype.acos = function(){
	if (this.isReal())
	    return acos(this.r);
	var pi_half = halve(FloatPoint.pi);
	var iz = timesI(this);
	var root = sqrt(subtract(1, sqr(this)));
	var l = timesI(log(add(iz, root)));
	return add(pi_half, l);
    };

    Complex.prototype.asin = function(){
	if (this.isReal())
	    return asin(this.r);

	var oneNegateThisSq =
	    subtract(1, sqr(this));
	var sqrtOneNegateThisSq = sqrt(oneNegateThisSq);
	return multiply(2, atan(divide(this,
				       add(1, sqrtOneNegateThisSq))));
    };

    Complex.prototype.ceiling = function(){
	if (!this.isReal())
	    throwRuntimeError("ceiling: can only be applied to real number", this);
	return ceiling(this.r);
    };

    Complex.prototype.floor = function(){
	if (!this.isReal())
	    throwRuntimeError("floor: can only be applied to real number", this);
	return floor(this.r);
    };

    Complex.prototype.imaginaryPart = function(){
	return this.i;
    };

    Complex.prototype.realPart = function(){
	return this.r;
    };

    Complex.prototype.round = function(){
	if (!this.isReal())
	    throwRuntimeError("round: can only be applied to real number", this);
	return round(this.r);
    };



    var rationalRegexp = new RegExp("^([+-]?\\d+)/(\\d+)$");
    var bignumScientificPattern = new RegExp("^([+-]?\\d*)\\.?(\\d*)[Ee](\\+?\\d+)$");
    var complexRegexp = new RegExp("^([+-]?[\\d\\w/\\.]*)([+-])([\\d\\w/\\.]*)i$");
    var flonumRegexp = new RegExp("^([+-]?\\d*)\\.?(\\d*)$");

    // fromString: string -> (scheme-number | false)
    var fromString = function(x) {
	var aMatch = x.match(rationalRegexp);
	if (aMatch) {
	    return Rational.makeInstance(fromString(aMatch[1]),
					 fromString(aMatch[2]));
	}

	var cMatch = x.match(complexRegexp);
	if (cMatch) {
	    return Complex.makeInstance(fromString(cMatch[1] || "0"),
					fromString(cMatch[2] + (cMatch[3] || "1")));
	}

	if (x === '+nan.0' || x === '-nan.0')
	    return FloatPoint.nan;
	if (x === '+inf.0')
	    return FloatPoint.inf;
	if (x === '-inf.0')
	    return FloatPoint.neginf;
	if (x === "-0.0") {
	    return NEGATIVE_ZERO;
	}
	if (x.match(flonumRegexp) || x.match(bignumScientificPattern)) {
	    var n = Number(x);
	    if (isOverflow(n)) {
		return makeBignum(x);
	    } else {
		return fromFixnum(n);
	    }
	} else {
	    return false;
	}
    };





    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////

    // The code below comes from Tom Wu's BigInteger implementation:

    // Copyright (c) 2005  Tom Wu
    // All Rights Reserved.
    // See "LICENSE" for details.

    // Basic JavaScript BN library - subset useful for RSA encryption.

    // Bits per digit
    var dbits;

    // JavaScript engine analysis
    var canary = 0xdeadbeefcafe;
    var j_lm = ((canary&0xffffff)==0xefcafe);

    // (public) Constructor
    function BigInteger(a,b,c) {
	if(a != null)
	    if("number" == typeof a) this.fromNumber(a,b,c);
	else if(b == null && "string" != typeof a) this.fromString(a,256);
	else this.fromString(a,b);
    }

    // return new, unset BigInteger
    function nbi() { return new BigInteger(null); }

    // am: Compute w_j += (x*this_i), propagate carries,
    // c is initial carry, returns final carry.
    // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
    // We need to select the fastest one that works in this environment.

    // am1: use a single mult and divide to get the high bits,
    // max digit bits should be 26 because
    // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
    function am1(i,x,w,j,c,n) {
	while(--n >= 0) {
	    var v = x*this[i++]+w[j]+c;
	    c = Math.floor(v/0x4000000);
	    w[j++] = v&0x3ffffff;
	}
	return c;
    }
    // am2 avoids a big mult-and-extract completely.
    // Max digit bits should be <= 30 because we do bitwise ops
    // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
    function am2(i,x,w,j,c,n) {
	var xl = x&0x7fff, xh = x>>15;
	while(--n >= 0) {
	    var l = this[i]&0x7fff;
	    var h = this[i++]>>15;
	    var m = xh*l+h*xl;
	    l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
	    c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
	    w[j++] = l&0x3fffffff;
	}
	return c;
    }
    // Alternately, set max digit bits to 28 since some
    // browsers slow down when dealing with 32-bit numbers.
    function am3(i,x,w,j,c,n) {
	var xl = x&0x3fff, xh = x>>14;
	while(--n >= 0) {
	    var l = this[i]&0x3fff;
	    var h = this[i++]>>14;
	    var m = xh*l+h*xl;
	    l = xl*l+((m&0x3fff)<<14)+w[j]+c;
	    c = (l>>28)+(m>>14)+xh*h;
	    w[j++] = l&0xfffffff;
	}
	return c;
    }
    if(j_lm && (typeof(navigator) !== 'undefined' && navigator.appName == "Microsoft Internet Explorer")) {
	BigInteger.prototype.am = am2;
	dbits = 30;
    }
    else if(j_lm && (typeof(navigator) !== 'undefined' && navigator.appName != "Netscape")) {
	BigInteger.prototype.am = am1;
	dbits = 26;
    }
    else { // Mozilla/Netscape seems to prefer am3
	BigInteger.prototype.am = am3;
	dbits = 28;
    }

    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = ((1<<dbits)-1);
    BigInteger.prototype.DV = (1<<dbits);

    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2,BI_FP);
    BigInteger.prototype.F1 = BI_FP-dbits;
    BigInteger.prototype.F2 = 2*dbits-BI_FP;

    // Digit conversions
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = [];
    var rr,vv;
    rr = "0".charCodeAt(0);
    for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

    function int2char(n) { return BI_RM.charAt(n); }
    function intAt(s,i) {
	var c = BI_RC[s.charCodeAt(i)];
	return (c==null)?-1:c;
    }

    // (protected) copy this to r
    function bnpCopyTo(r) {
	for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
	r.t = this.t;
	r.s = this.s;
    }

    // (protected) set from integer value x, -DV <= x < DV
    function bnpFromInt(x) {
	this.t = 1;
	this.s = (x<0)?-1:0;
	if(x > 0) this[0] = x;
	else if(x < -1) this[0] = x+DV;
	else this.t = 0;
    }

    // return bigint initialized to value
    function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

    // (protected) set from string and radix
    function bnpFromString(s,b) {
	var k;
	if(b == 16) k = 4;
	else if(b == 8) k = 3;
	else if(b == 256) k = 8; // byte array
	else if(b == 2) k = 1;
	else if(b == 32) k = 5;
	else if(b == 4) k = 2;
	else { this.fromRadix(s,b); return; }
	this.t = 0;
	this.s = 0;
	var i = s.length, mi = false, sh = 0;
	while(--i >= 0) {
	    var x = (k==8)?s[i]&0xff:intAt(s,i);
	    if(x < 0) {
		if(s.charAt(i) == "-") mi = true;
		continue;
	    }
	    mi = false;
	    if(sh == 0)
		this[this.t++] = x;
	    else if(sh+k > this.DB) {
		this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
		this[this.t++] = (x>>(this.DB-sh));
	    }
	    else
		this[this.t-1] |= x<<sh;
	    sh += k;
	    if(sh >= this.DB) sh -= this.DB;
	}
	if(k == 8 && (s[0]&0x80) != 0) {
	    this.s = -1;
	    if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
	}
	this.clamp();
	if(mi) BigInteger.ZERO.subTo(this,this);
    }

    // (protected) clamp off excess high words
    function bnpClamp() {
	var c = this.s&this.DM;
	while(this.t > 0 && this[this.t-1] == c) --this.t;
    }

    // (public) return string representation in given radix
    function bnToString(b) {
	if(this.s < 0) return "-"+this.negate().toString(b);
	var k;
	if(b == 16) k = 4;
	else if(b == 8) k = 3;
	else if(b == 2) k = 1;
	else if(b == 32) k = 5;
	else if(b == 4) k = 2;
	else return this.toRadix(b);
	var km = (1<<k)-1, d, m = false, r = [], i = this.t;
	var p = this.DB-(i*this.DB)%k;
	if(i-- > 0) {
	    if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r.push(int2char(d)); }
	    while(i >= 0) {
		if(p < k) {
		    d = (this[i]&((1<<p)-1))<<(k-p);
		    d |= this[--i]>>(p+=this.DB-k);
		}
		else {
		    d = (this[i]>>(p-=k))&km;
		    if(p <= 0) { p += this.DB; --i; }
		}
		if(d > 0) m = true;
		if(m) r.push(int2char(d));
	    }
	}
	return m?r.join(""):"0";
    }

    // (public) -this
    function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

    // (public) |this|
    function bnAbs() { return (this.s<0)?this.negate():this; }

    // (public) return + if this > a, - if this < a, 0 if equal
    function bnCompareTo(a) {
	var r = this.s-a.s;
	if(r != 0) return r;
	var i = this.t;
	r = i-a.t;
	if(r != 0) return r;
	while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
	return 0;
    }

    // returns bit length of the integer x
    function nbits(x) {
	var r = 1, t;
	if((t=x>>>16) != 0) { x = t; r += 16; }
	if((t=x>>8) != 0) { x = t; r += 8; }
	if((t=x>>4) != 0) { x = t; r += 4; }
	if((t=x>>2) != 0) { x = t; r += 2; }
	if((t=x>>1) != 0) { x = t; r += 1; }
	return r;
    }

    // (public) return the number of bits in "this"
    function bnBitLength() {
	if(this.t <= 0) return 0;
	return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
    }

    // (protected) r = this << n*DB
    function bnpDLShiftTo(n,r) {
	var i;
	for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
	for(i = n-1; i >= 0; --i) r[i] = 0;
	r.t = this.t+n;
	r.s = this.s;
    }

    // (protected) r = this >> n*DB
    function bnpDRShiftTo(n,r) {
	for(var i = n; i < this.t; ++i) r[i-n] = this[i];
	r.t = Math.max(this.t-n,0);
	r.s = this.s;
    }

    // (protected) r = this << n
    function bnpLShiftTo(n,r) {
	var bs = n%this.DB;
	var cbs = this.DB-bs;
	var bm = (1<<cbs)-1;
	var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
	for(i = this.t-1; i >= 0; --i) {
	    r[i+ds+1] = (this[i]>>cbs)|c;
	    c = (this[i]&bm)<<bs;
	}
	for(i = ds-1; i >= 0; --i) r[i] = 0;
	r[ds] = c;
	r.t = this.t+ds+1;
	r.s = this.s;
	r.clamp();
    }

    // (protected) r = this >> n
    function bnpRShiftTo(n,r) {
	r.s = this.s;
	var ds = Math.floor(n/this.DB);
	if(ds >= this.t) { r.t = 0; return; }
	var bs = n%this.DB;
	var cbs = this.DB-bs;
	var bm = (1<<bs)-1;
	r[0] = this[ds]>>bs;
	for(var i = ds+1; i < this.t; ++i) {
	    r[i-ds-1] |= (this[i]&bm)<<cbs;
	    r[i-ds] = this[i]>>bs;
	}
	if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
	r.t = this.t-ds;
	r.clamp();
    }

    // (protected) r = this - a
    function bnpSubTo(a,r) {
	var i = 0, c = 0, m = Math.min(a.t,this.t);
	while(i < m) {
	    c += this[i]-a[i];
	    r[i++] = c&this.DM;
	    c >>= this.DB;
	}
	if(a.t < this.t) {
	    c -= a.s;
	    while(i < this.t) {
		c += this[i];
		r[i++] = c&this.DM;
		c >>= this.DB;
	    }
	    c += this.s;
	}
	else {
	    c += this.s;
	    while(i < a.t) {
		c -= a[i];
		r[i++] = c&this.DM;
		c >>= this.DB;
	    }
	    c -= a.s;
	}
	r.s = (c<0)?-1:0;
	if(c < -1) r[i++] = this.DV+c;
	else if(c > 0) r[i++] = c;
	r.t = i;
	r.clamp();
    }

    // (protected) r = this * a, r != this,a (HAC 14.12)
    // "this" should be the larger one if appropriate.
    function bnpMultiplyTo(a,r) {
	var x = this.abs(), y = a.abs();
	var i = x.t;
	r.t = i+y.t;
	while(--i >= 0) r[i] = 0;
	for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
	r.s = 0;
	r.clamp();
	if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
    }

    // (protected) r = this^2, r != this (HAC 14.16)
    function bnpSquareTo(r) {
	var x = this.abs();
	var i = r.t = 2*x.t;
	while(--i >= 0) r[i] = 0;
	for(i = 0; i < x.t-1; ++i) {
	    var c = x.am(i,x[i],r,2*i,0,1);
	    if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
		r[i+x.t] -= x.DV;
		r[i+x.t+1] = 1;
	    }
	}
	if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
	r.s = 0;
	r.clamp();
    }


    // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
    // r != q, this != m.  q or r may be null.
    function bnpDivRemTo(m,q,r) {
	var pm = m.abs();
	if(pm.t <= 0) return;
	var pt = this.abs();
	if(pt.t < pm.t) {
	    if(q != null) q.fromInt(0);
	    if(r != null) this.copyTo(r);
	    return;
	}
	if(r == null) r = nbi();
	var y = nbi(), ts = this.s, ms = m.s;
	var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
	if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
	else { pm.copyTo(y); pt.copyTo(r); }
	var ys = y.t;
	var y0 = y[ys-1];
	if(y0 == 0) return;
	var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
	var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
	var i = r.t, j = i-ys, t = (q==null)?nbi():q;
	y.dlShiftTo(j,t);
	if(r.compareTo(t) >= 0) {
	    r[r.t++] = 1;
	    r.subTo(t,r);
	}
	BigInteger.ONE.dlShiftTo(ys,t);
	t.subTo(y,y);	// "negative" y so we can replace sub with am later
	while(y.t < ys) y[y.t++] = 0;
	while(--j >= 0) {
	    // Estimate quotient digit
	    var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
	    if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
		y.dlShiftTo(j,t);
		r.subTo(t,r);
		while(r[i] < --qd) r.subTo(t,r);
	    }
	}
	if(q != null) {
	    r.drShiftTo(ys,q);
	    if(ts != ms) BigInteger.ZERO.subTo(q,q);
	}
	r.t = ys;
	r.clamp();
	if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
	if(ts < 0) BigInteger.ZERO.subTo(r,r);
    }

    // (public) this mod a
    function bnMod(a) {
	var r = nbi();
	this.abs().divRemTo(a,null,r);
	if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
	return r;
    }

    // Modular reduction using "classic" algorithm
    function Classic(m) { this.m = m; }
    function cConvert(x) {
	if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
	else return x;
    }
    function cRevert(x) { return x; }
    function cReduce(x) { x.divRemTo(this.m,null,x); }
    function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
    function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;

    // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
    // justification:
    //         xy == 1 (mod m)
    //         xy =  1+km
    //   xy(2-xy) = (1+km)(1-km)
    // x[y(2-xy)] = 1-k^2m^2
    // x[y(2-xy)] == 1 (mod m^2)
    // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
    // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
    // JS multiply "overflows" differently from C/C++, so care is needed here.
    function bnpInvDigit() {
	if(this.t < 1) return 0;
	var x = this[0];
	if((x&1) == 0) return 0;
	var y = x&3;		// y == 1/x mod 2^2
	y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
	y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
	y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
	// last step - calculate inverse mod DV directly;
	// assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
	y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
	// we really want the negative inverse, and -DV < y < DV
	return (y>0)?this.DV-y:-y;
    }

    // Montgomery reduction
    function Montgomery(m) {
	this.m = m;
	this.mp = m.invDigit();
	this.mpl = this.mp&0x7fff;
	this.mph = this.mp>>15;
	this.um = (1<<(m.DB-15))-1;
	this.mt2 = 2*m.t;
    }

    // xR mod m
    function montConvert(x) {
	var r = nbi();
	x.abs().dlShiftTo(this.m.t,r);
	r.divRemTo(this.m,null,r);
	if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
	return r;
    }

    // x/R mod m
    function montRevert(x) {
	var r = nbi();
	x.copyTo(r);
	this.reduce(r);
	return r;
    }

    // x = x/R mod m (HAC 14.32)
    function montReduce(x) {
	while(x.t <= this.mt2)	// pad x so am has enough room later
	    x[x.t++] = 0;
	for(var i = 0; i < this.m.t; ++i) {
	    // faster way of calculating u0 = x[i]*mp mod DV
	    var j = x[i]&0x7fff;
	    var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
	    // use am to combine the multiply-shift-add into one call
	    j = i+this.m.t;
	    x[j] += this.m.am(0,u0,x,i,0,this.m.t);
	    // propagate carry
	    while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
	}
	x.clamp();
	x.drShiftTo(this.m.t,x);
	if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
    }

    // r = "x^2/R mod m"; x != r
    function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    // r = "xy/R mod m"; x,y != r
    function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;

    // (protected) true iff this is even
    function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

    // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
    function bnpExp(e,z) {
	    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
	    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
	    g.copyTo(r);
	    while(--i >= 0) {
	        z.sqrTo(r,r2);
	        if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
	        else { var t = r; r = r2; r2 = t; }
	    }
	    return z.revert(r);
    }

    // (public) this^e % m, 0 <= e < 2^32
    function bnModPowInt(e,m) {
	var z;
	if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
	return this.exp(e,z);
    }

    // protected
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;

    // public
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;

    // "constants"
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);

    // Copyright (c) 2005-2009  Tom Wu
    // All Rights Reserved.
    // See "LICENSE" for details.

    // Extended JavaScript BN functions, required for RSA private ops.

    // Version 1.1: new BigInteger("0", 10) returns "proper" zero

    // (public)
    function bnClone() { var r = nbi(); this.copyTo(r); return r; }

    // (public) return value as integer
    function bnIntValue() {
	if(this.s < 0) {
	    if(this.t == 1) return this[0]-this.DV;
	    else if(this.t == 0) return -1;
	}
	else if(this.t == 1) return this[0];
	else if(this.t == 0) return 0;
	// assumes 16 < DB < 32
	return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
    }

    // (public) return value as byte
    function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

    // (public) return value as short (assumes DB>=16)
    function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

    // (protected) return x s.t. r^x < DV
    function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

    // (public) 0 if this == 0, 1 if this > 0
    function bnSigNum() {
	if(this.s < 0) return -1;
	else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
	else return 1;
    }

    // (protected) convert to radix string
    function bnpToRadix(b) {
	if(b == null) b = 10;
	if(this.signum() == 0 || b < 2 || b > 36) return "0";
	var cs = this.chunkSize(b);
	var a = Math.pow(b,cs);
	var d = nbv(a), y = nbi(), z = nbi(), r = "";
	this.divRemTo(d,y,z);
	while(y.signum() > 0) {
	    r = (a+z.intValue()).toString(b).substr(1) + r;
	    y.divRemTo(d,y,z);
	}
	return z.intValue().toString(b) + r;
    }

    // (protected) convert from radix string
    function bnpFromRadix(s,b) {
	this.fromInt(0);
	if(b == null) b = 10;
	var cs = this.chunkSize(b);
	var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
	for(var i = 0; i < s.length; ++i) {
	    var x = intAt(s,i);
	    if(x < 0) {
		if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
		continue;
	    }
	    w = b*w+x;
	    if(++j >= cs) {
		this.dMultiply(d);
		this.dAddOffset(w,0);
		j = 0;
		w = 0;
	    }
	}
	if(j > 0) {
	    this.dMultiply(Math.pow(b,j));
	    this.dAddOffset(w,0);
	}
	if(mi) BigInteger.ZERO.subTo(this,this);
    }

    // (protected) alternate constructor
    function bnpFromNumber(a,b,c) {
	if("number" == typeof b) {
	    // new BigInteger(int,int,RNG)
	    if(a < 2) this.fromInt(1);
	    else {
		this.fromNumber(a,c);
		if(!this.testBit(a-1))	// force MSB set
		    this.bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
		if(this.isEven()) this.dAddOffset(1,0); // force odd
		while(!this.isProbablePrime(b)) {
		    this.dAddOffset(2,0);
		    if(this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a-1),this);
		}
	    }
	}
	else {
	    // new BigInteger(int,RNG)
	    var x = [], t = a&7;
	    x.length = (a>>3)+1;
	    b.nextBytes(x);
	    if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
	    this.fromString(x,256);
	}
    }

    // (public) convert to bigendian byte array
    function bnToByteArray() {
	var i = this.t, r = [];
	r[0] = this.s;
	var p = this.DB-(i*this.DB)%8, d, k = 0;
	if(i-- > 0) {
	    if(p < this.DB && (d = this[i]>>p) != (this.s&this.DM)>>p)
		r[k++] = d|(this.s<<(this.DB-p));
	    while(i >= 0) {
		if(p < 8) {
		    d = (this[i]&((1<<p)-1))<<(8-p);
		    d |= this[--i]>>(p+=this.DB-8);
		}
		else {
		    d = (this[i]>>(p-=8))&0xff;
		    if(p <= 0) { p += this.DB; --i; }
		}
		if((d&0x80) != 0) d |= -256;
		if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
		if(k > 0 || d != this.s) r[k++] = d;
	    }
	}
	return r;
    }

    function bnEquals(a) { return(this.compareTo(a)==0); }
    function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
    function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

    // (protected) r = this op a (bitwise)
    function bnpBitwiseTo(a,op,r) {
	var i, f, m = Math.min(a.t,this.t);
	for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
	if(a.t < this.t) {
	    f = a.s&this.DM;
	    for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
	    r.t = this.t;
	}
	else {
	    f = this.s&this.DM;
	    for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
	    r.t = a.t;
	}
	r.s = op(this.s,a.s);
	r.clamp();
    }

    // (public) this & a
    function op_and(x,y) { return x&y; }
    function bnAnd(a) { var r = nbi(); this.bitwiseTo(a,op_and,r); return r; }

    // (public) this | a
    function op_or(x,y) { return x|y; }
    function bnOr(a) { var r = nbi(); this.bitwiseTo(a,op_or,r); return r; }

    // (public) this ^ a
    function op_xor(x,y) { return x^y; }
    function bnXor(a) { var r = nbi(); this.bitwiseTo(a,op_xor,r); return r; }

    // (public) this & ~a
    function op_andnot(x,y) { return x&~y; }
    function bnAndNot(a) { var r = nbi(); this.bitwiseTo(a,op_andnot,r); return r; }

    // (public) ~this
    function bnNot() {
	var r = nbi();
	for(var i = 0; i < this.t; ++i) r[i] = this.DM&~this[i];
	r.t = this.t;
	r.s = ~this.s;
	return r;
    }

    // (public) this << n
    function bnShiftLeft(n) {
	var r = nbi();
	if(n < 0) this.rShiftTo(-n,r); else this.lShiftTo(n,r);
	return r;
    }

    // (public) this >> n
    function bnShiftRight(n) {
	var r = nbi();
	if(n < 0) this.lShiftTo(-n,r); else this.rShiftTo(n,r);
	return r;
    }

    // return index of lowest 1-bit in x, x < 2^31
    function lbit(x) {
	if(x == 0) return -1;
	var r = 0;
	if((x&0xffff) == 0) { x >>= 16; r += 16; }
	if((x&0xff) == 0) { x >>= 8; r += 8; }
	if((x&0xf) == 0) { x >>= 4; r += 4; }
	if((x&3) == 0) { x >>= 2; r += 2; }
	if((x&1) == 0) ++r;
	return r;
    }

    // (public) returns index of lowest 1-bit (or -1 if none)
    function bnGetLowestSetBit() {
	for(var i = 0; i < this.t; ++i)
	    if(this[i] != 0) return i*this.DB+lbit(this[i]);
	if(this.s < 0) return this.t*this.DB;
	return -1;
    }

    // return number of 1 bits in x
    function cbit(x) {
	var r = 0;
	while(x != 0) { x &= x-1; ++r; }
	return r;
    }

    // (public) return number of set bits
    function bnBitCount() {
	var r = 0, x = this.s&this.DM;
	for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
	return r;
    }

    // (public) true iff nth bit is set
    function bnTestBit(n) {
	var j = Math.floor(n/this.DB);
	if(j >= this.t) return(this.s!=0);
	return((this[j]&(1<<(n%this.DB)))!=0);
    }

    // (protected) this op (1<<n)
    function bnpChangeBit(n,op) {
	var r = BigInteger.ONE.shiftLeft(n);
	this.bitwiseTo(r,op,r);
	return r;
    }

    // (public) this | (1<<n)
    function bnSetBit(n) { return this.changeBit(n,op_or); }

    // (public) this & ~(1<<n)
    function bnClearBit(n) { return this.changeBit(n,op_andnot); }

    // (public) this ^ (1<<n)
    function bnFlipBit(n) { return this.changeBit(n,op_xor); }

    // (protected) r = this + a
    function bnpAddTo(a,r) {
	var i = 0, c = 0, m = Math.min(a.t,this.t);
	while(i < m) {
	    c += this[i]+a[i];
	    r[i++] = c&this.DM;
	    c >>= this.DB;
	}
	if(a.t < this.t) {
	    c += a.s;
	    while(i < this.t) {
		c += this[i];
		r[i++] = c&this.DM;
		c >>= this.DB;
	    }
	    c += this.s;
	}
	else {
	    c += this.s;
	    while(i < a.t) {
		c += a[i];
		r[i++] = c&this.DM;
		c >>= this.DB;
	    }
	    c += a.s;
	}
	r.s = (c<0)?-1:0;
	if(c > 0) r[i++] = c;
	else if(c < -1) r[i++] = this.DV+c;
	r.t = i;
	r.clamp();
    }

    // (public) this + a
    function bnAdd(a) { var r = nbi(); this.addTo(a,r); return r; }

    // (public) this - a
    function bnSubtract(a) { var r = nbi(); this.subTo(a,r); return r; }

    // (public) this * a
    function bnMultiply(a) { var r = nbi(); this.multiplyTo(a,r); return r; }

    // (public) this / a
    function bnDivide(a) { var r = nbi(); this.divRemTo(a,r,null); return r; }

    // (public) this % a
    function bnRemainder(a) { var r = nbi(); this.divRemTo(a,null,r); return r; }

    // (public) [this/a,this%a]
    function bnDivideAndRemainder(a) {
	var q = nbi(), r = nbi();
	this.divRemTo(a,q,r);
	return [q,r];
    }

    // (protected) this *= n, this >= 0, 1 < n < DV
    function bnpDMultiply(n) {
	this[this.t] = this.am(0,n-1,this,0,0,this.t);
	++this.t;
	this.clamp();
    }

    // (protected) this += n << w words, this >= 0
    function bnpDAddOffset(n,w) {
	if(n == 0) return;
	while(this.t <= w) this[this.t++] = 0;
	this[w] += n;
	while(this[w] >= this.DV) {
	    this[w] -= this.DV;
	    if(++w >= this.t) this[this.t++] = 0;
	    ++this[w];
	}
    }

    // A "null" reducer
    function NullExp() {}
    function nNop(x) { return x; }
    function nMulTo(x,y,r) { x.multiplyTo(y,r); }
    function nSqrTo(x,r) { x.squareTo(r); }

    NullExp.prototype.convert = nNop;
    NullExp.prototype.revert = nNop;
    NullExp.prototype.mulTo = nMulTo;
    NullExp.prototype.sqrTo = nSqrTo;

    // (public) this^e
    function bnPow(e) { return this.exp(e,new NullExp()); }

    // (protected) r = lower n words of "this * a", a.t <= n
    // "this" should be the larger one if appropriate.
    function bnpMultiplyLowerTo(a,n,r) {
	var i = Math.min(this.t+a.t,n);
	r.s = 0; // assumes a,this >= 0
	r.t = i;
	while(i > 0) r[--i] = 0;
	var j;
	for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
	for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
	r.clamp();
    }

    // (protected) r = "this * a" without lower n words, n > 0
    // "this" should be the larger one if appropriate.
    function bnpMultiplyUpperTo(a,n,r) {
	--n;
	var i = r.t = this.t+a.t-n;
	r.s = 0; // assumes a,this >= 0
	while(--i >= 0) r[i] = 0;
	for(i = Math.max(n-this.t,0); i < a.t; ++i)
	    r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
	r.clamp();
	r.drShiftTo(1,r);
    }

    // Barrett modular reduction
    function Barrett(m) {
	// setup Barrett
	this.r2 = nbi();
	this.q3 = nbi();
	BigInteger.ONE.dlShiftTo(2*m.t,this.r2);
	this.mu = this.r2.divide(m);
	this.m = m;
    }

    function barrettConvert(x) {
	if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
	else if(x.compareTo(this.m) < 0) return x;
	else { var r = nbi(); x.copyTo(r); this.reduce(r); return r; }
    }

    function barrettRevert(x) { return x; }

    // x = x mod m (HAC 14.42)
    function barrettReduce(x) {
	x.drShiftTo(this.m.t-1,this.r2);
	if(x.t > this.m.t+1) { x.t = this.m.t+1; x.clamp(); }
	this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3);
	this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);
	while(x.compareTo(this.r2) < 0) x.dAddOffset(1,this.m.t+1);
	x.subTo(this.r2,x);
	while(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
    }

    // r = x^2 mod m; x != r
    function barrettSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

    // r = x*y mod m; x,y != r
    function barrettMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

    Barrett.prototype.convert = barrettConvert;
    Barrett.prototype.revert = barrettRevert;
    Barrett.prototype.reduce = barrettReduce;
    Barrett.prototype.mulTo = barrettMulTo;
    Barrett.prototype.sqrTo = barrettSqrTo;

    // (public) this^e % m (HAC 14.85)
    function bnModPow(e,m) {
	var i = e.bitLength(), k, r = nbv(1), z;
	if(i <= 0) return r;
	else if(i < 18) k = 1;
	else if(i < 48) k = 3;
	else if(i < 144) k = 4;
	else if(i < 768) k = 5;
	else k = 6;
	if(i < 8)
	    z = new Classic(m);
	else if(m.isEven())
	    z = new Barrett(m);
	else
	    z = new Montgomery(m);

	// precomputation
	var g = [], n = 3, k1 = k-1, km = (1<<k)-1;
	g[1] = z.convert(this);
	if(k > 1) {
	    var g2 = nbi();
	    z.sqrTo(g[1],g2);
	    while(n <= km) {
		g[n] = nbi();
		z.mulTo(g2,g[n-2],g[n]);
		n += 2;
	    }
	}

	var j = e.t-1, w, is1 = true, r2 = nbi(), t;
	i = nbits(e[j])-1;
	while(j >= 0) {
	    if(i >= k1) w = (e[j]>>(i-k1))&km;
	    else {
		w = (e[j]&((1<<(i+1))-1))<<(k1-i);
		if(j > 0) w |= e[j-1]>>(this.DB+i-k1);
	    }

	    n = k;
	    while((w&1) == 0) { w >>= 1; --n; }
	    if((i -= n) < 0) { i += this.DB; --j; }
	    if(is1) {	// ret == 1, don't bother squaring or multiplying it
		g[w].copyTo(r);
		is1 = false;
	    }
	    else {
		while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
		if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
		z.mulTo(r2,g[w],r);
	    }

	    while(j >= 0 && (e[j]&(1<<i)) == 0) {
		z.sqrTo(r,r2); t = r; r = r2; r2 = t;
		if(--i < 0) { i = this.DB-1; --j; }
	    }
	}
	return z.revert(r);
    }

    // (public) gcd(this,a) (HAC 14.54)
    function bnGCD(a) {
	var x = (this.s<0)?this.negate():this.clone();
	var y = (a.s<0)?a.negate():a.clone();
	if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
	var i = x.getLowestSetBit(), g = y.getLowestSetBit();
	if(g < 0) return x;
	if(i < g) g = i;
	if(g > 0) {
	    x.rShiftTo(g,x);
	    y.rShiftTo(g,y);
	}
	while(x.signum() > 0) {
	    if((i = x.getLowestSetBit()) > 0) x.rShiftTo(i,x);
	    if((i = y.getLowestSetBit()) > 0) y.rShiftTo(i,y);
	    if(x.compareTo(y) >= 0) {
		x.subTo(y,x);
		x.rShiftTo(1,x);
	    }
	    else {
		y.subTo(x,y);
		y.rShiftTo(1,y);
	    }
	}
	if(g > 0) y.lShiftTo(g,y);
	return y;
    }

    // (protected) this % n, n < 2^26
    function bnpModInt(n) {
	if(n <= 0) return 0;
	var d = this.DV%n, r = (this.s<0)?n-1:0;
	if(this.t > 0)
	    if(d == 0) r = this[0]%n;
	else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
	return r;
    }

    // (public) 1/this % m (HAC 14.61)
    function bnModInverse(m) {
	var ac = m.isEven();
	if((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
	var u = m.clone(), v = this.clone();
	var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
	while(u.signum() != 0) {
	    while(u.isEven()) {
		u.rShiftTo(1,u);
		if(ac) {
		    if(!a.isEven() || !b.isEven()) { a.addTo(this,a); b.subTo(m,b); }
		    a.rShiftTo(1,a);
		}
		else if(!b.isEven()) b.subTo(m,b);
		b.rShiftTo(1,b);
	    }
	    while(v.isEven()) {
		v.rShiftTo(1,v);
		if(ac) {
		    if(!c.isEven() || !d.isEven()) { c.addTo(this,c); d.subTo(m,d); }
		    c.rShiftTo(1,c);
		}
		else if(!d.isEven()) d.subTo(m,d);
		d.rShiftTo(1,d);
	    }
	    if(u.compareTo(v) >= 0) {
		u.subTo(v,u);
		if(ac) a.subTo(c,a);
		b.subTo(d,b);
	    }
	    else {
		v.subTo(u,v);
		if(ac) c.subTo(a,c);
		d.subTo(b,d);
	    }
	}
	if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
	if(d.compareTo(m) >= 0) return d.subtract(m);
	if(d.signum() < 0) d.addTo(m,d); else return d;
	if(d.signum() < 0) return d.add(m); else return d;
    }

    var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509];
    var lplim = (1<<26)/lowprimes[lowprimes.length-1];

    // (public) test primality with certainty >= 1-.5^t
    function bnIsProbablePrime(t) {
	var i, x = this.abs();
	if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
	    for(i = 0; i < lowprimes.length; ++i)
		if(x[0] == lowprimes[i]) return true;
	    return false;
	}
	if(x.isEven()) return false;
	i = 1;
	while(i < lowprimes.length) {
	    var m = lowprimes[i], j = i+1;
	    while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
	    m = x.modInt(m);
	    while(i < j) if(m%lowprimes[i++] == 0) return false;
	}
	return x.millerRabin(t);
    }

    // (protected) true if probably prime (HAC 4.24, Miller-Rabin)
    function bnpMillerRabin(t) {
	var n1 = this.subtract(BigInteger.ONE);
	var k = n1.getLowestSetBit();
	if(k <= 0) return false;
	var r = n1.shiftRight(k);
	t = (t+1)>>1;
	if(t > lowprimes.length) t = lowprimes.length;
	var a = nbi();
	for(var i = 0; i < t; ++i) {
	    a.fromInt(lowprimes[i]);
	    var y = a.modPow(r,this);
	    if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
		var j = 1;
		while(j++ < k && y.compareTo(n1) != 0) {
		    y = y.modPowInt(2,this);
		    if(y.compareTo(BigInteger.ONE) == 0) return false;
		}
		if(y.compareTo(n1) != 0) return false;
	    }
	}
	return true;
    }
    
    

    // protected
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.fromNumber = bnpFromNumber;
    BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
    BigInteger.prototype.changeBit = bnpChangeBit;
    BigInteger.prototype.addTo = bnpAddTo;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
    BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
    BigInteger.prototype.modInt = bnpModInt;
    BigInteger.prototype.millerRabin = bnpMillerRabin;

    // public
    BigInteger.prototype.clone = bnClone;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.byteValue = bnByteValue;
    BigInteger.prototype.shortValue = bnShortValue;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.toByteArray = bnToByteArray;
    BigInteger.prototype.equals = bnEquals;
    BigInteger.prototype.min = bnMin;
    BigInteger.prototype.max = bnMax;
    BigInteger.prototype.and = bnAnd;
    BigInteger.prototype.or = bnOr;
    BigInteger.prototype.xor = bnXor;
    BigInteger.prototype.andNot = bnAndNot;
    BigInteger.prototype.not = bnNot;
    BigInteger.prototype.shiftLeft = bnShiftLeft;
    BigInteger.prototype.shiftRight = bnShiftRight;
    BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
    BigInteger.prototype.bitCount = bnBitCount;
    BigInteger.prototype.testBit = bnTestBit;
    BigInteger.prototype.setBit = bnSetBit;
    BigInteger.prototype.clearBit = bnClearBit;
    BigInteger.prototype.flipBit = bnFlipBit;
    BigInteger.prototype.add = bnAdd;
    BigInteger.prototype.subtract = bnSubtract;
    BigInteger.prototype.multiply = bnMultiply;
    BigInteger.prototype.divide = bnDivide;
    BigInteger.prototype.remainder = bnRemainder;
    BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
    BigInteger.prototype.modPow = bnModPow;
    BigInteger.prototype.modInverse = bnModInverse;
    BigInteger.prototype.pow = bnPow;
    BigInteger.prototype.gcd = bnGCD;
    BigInteger.prototype.isProbablePrime = bnIsProbablePrime;

    // BigInteger interfaces not implemented in jsbn:

    // BigInteger(int signum, byte[] magnitude)
    // double doubleValue()
    // float floatValue()
    // int hashCode()
    // long longValue()
    // static BigInteger valueOf(long val)



    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    // END OF copy-and-paste of jsbn.



    BigInteger.NEGATIVE_ONE = BigInteger.ONE.negate();


    // Other methods we need to add for compatibilty with js-numbers numeric tower.

    // add is implemented above.
    // subtract is implemented above.
    // multiply is implemented above.
    // equals is implemented above.
    // abs is implemented above.
    // negate is defined above.

    // makeBignum: string -> BigInteger
    var makeBignum = function(s) {
	if (typeof(s) === 'number') { s = s + ''; }
	var match = s.match(bignumScientificPattern);
	if (match) {
	    return new BigInteger(match[1]+match[2] +
				  zerostring(Number(match[3]) - match[2].length),
				  10);
	} else {
	    return new BigInteger(s, 10);
	}
    };
    var zerostring = function(n) {
	var buf = [];
	for (var i = 0; i < n; i++) {
	    buf.push('0');
	}
	return buf.join('');
    };


    BigInteger.prototype.level = 0;
    BigInteger.prototype.liftTo = function(target) {
	if (target.level === 1) {
	    return new Rational(this, 1);
	}
	if (target.level === 2) {
	    var fixrep = this.toFixnum();
	    if (fixrep === Number.POSITIVE_INFINITY)
		return TOO_POSITIVE_TO_REPRESENT;
	    if (fixrep === Number.NEGATIVE_INFINITY)
		return TOO_NEGATIVE_TO_REPRESENT;
	    return new FloatPoint(fixrep);
	}
	if (target.level === 3) {
	    return new Complex(this, 0);
	}
	return throwRuntimeError("invalid level for BigInteger lift", this, target);
    };

    BigInteger.prototype.isFinite = function() {
	return true;
    };

    BigInteger.prototype.isInteger = function() {
	return true;
    };

    BigInteger.prototype.isRational = function() {
	return true;
    };

    BigInteger.prototype.isReal = function() {
	return true;
    };

    BigInteger.prototype.isExact = function() {
	return true;
    };

    BigInteger.prototype.toExact = function() {
	return this;
    };

    BigInteger.prototype.toFixnum = function() {
	var result = 0, str = this.toString(), i;
	if (str[0] === '-') {
	    for (i=1; i < str.length; i++) {
		result = result * 10 + Number(str[i]);
	    }
	    return -result;
	} else {
	    for (i=0; i < str.length; i++) {
		result = result * 10 + Number(str[i]);
	    }
	    return result;
	}
    };


    BigInteger.prototype.greaterThan = function(other) {
	return this.compareTo(other) > 0;
    };

    BigInteger.prototype.greaterThanOrEqual = function(other) {
	return this.compareTo(other) >= 0;
    };

    BigInteger.prototype.lessThan = function(other) {
	return this.compareTo(other) < 0;
    };

    BigInteger.prototype.lessThanOrEqual = function(other) {
	return this.compareTo(other) <= 0;
    };

    // divide: scheme-number -> scheme-number
    // WARNING NOTE: we override the old version of divide.
    BigInteger.prototype.divide = function(other) {
	var quotientAndRemainder = bnDivideAndRemainder.call(this, other);
	if (quotientAndRemainder[1].compareTo(BigInteger.ZERO) === 0) {
	    return quotientAndRemainder[0];
	} else {
	    var result = add(quotientAndRemainder[0],
			     Rational.makeInstance(quotientAndRemainder[1], other));
	    return result;
	}
    };

    BigInteger.prototype.numerator = function() {
	return this;
    };

    BigInteger.prototype.denominator = function() {
	return 1;
    };


    (function() {
	// Classic implementation of Newton-Ralphson square-root search,
	// adapted for integer-sqrt.
	// http://en.wikipedia.org/wiki/Newton's_method#Square_root_of_a_number
	    var searchIter = function(n, guess) {
		while(!(goodEnough(n, guess))) {
		    guess = average(guess, floor(divide(n, guess)));
		}
		return guess;
	    };
	    	    
	    var average = function (x,y) {
		return floor(divide(add(x,y), 2));
	    };

	    var goodEnough = function(n, guess) {
		return (lessThanOrEqual(sqr(guess),n) &&
			lessThan(n,sqr(add(guess, 1))));
	    };

	    // integerSqrt: -> scheme-number
	    BigInteger.prototype.integerSqrt = function() {
		if(this.s == 0) {
		    return searchIter(this, this);
		} else {
		    var tmpThis = multiply(this, -1);
		    return Complex.makeInstance(0, 
						searchIter(tmpThis, tmpThis));
		}
	    };
    })();




    
    // sqrt: -> scheme-number
    // http://en.wikipedia.org/wiki/Newton's_method#Square_root_of_a_number
    // Produce the square root.

    // floor: -> scheme-number
    // Produce the floor.
    BigInteger.prototype.floor = function() {
        return this;
    }

    // ceiling: -> scheme-number
    // Produce the ceiling.
    BigInteger.prototype.ceiling = function() {
        return this;
    }

    // conjugate: -> scheme-number
    // Produce the conjugate.

    // magnitude: -> scheme-number
    // Produce the magnitude.

    // log: -> scheme-number
    // Produce the log.

    // angle: -> scheme-number
    // Produce the angle.

    // atan: -> scheme-number
    // Produce the arc tangent.

    // cos: -> scheme-number
    // Produce the cosine.

    // sin: -> scheme-number
    // Produce the sine.


    // expt: scheme-number -> scheme-number
    // Produce the power to the input.
    BigInteger.prototype.expt = function(n) {
	return bnPow.call(this, n);
    };



    // exp: -> scheme-number
    // Produce e raised to the given power.

    // acos: -> scheme-number
    // Produce the arc cosine.

    // asin: -> scheme-number
    // Produce the arc sine.

    BigInteger.prototype.imaginaryPart = function() {
	    return 0;
    }
    BigInteger.prototype.realPart = function() {
	    return this;
    }

    // round: -> scheme-number
    // Round to the nearest integer.









    // External interface of js-numbers:

    Numbers['fromFixnum'] = fromFixnum;
    Numbers['fromString'] = fromString;
    Numbers['makeBignum'] = makeBignum;
    Numbers['makeRational'] = Rational.makeInstance;
    Numbers['makeFloat'] = FloatPoint.makeInstance;
    Numbers['makeComplex'] = Complex.makeInstance;
    Numbers['makeComplexPolar'] = makeComplexPolar;

    Numbers['pi'] = FloatPoint.pi;
    Numbers['e'] = FloatPoint.e;
    Numbers['nan'] = FloatPoint.nan;
    Numbers['negative_inf'] = FloatPoint.neginf;
    Numbers['inf'] = FloatPoint.inf;
    Numbers['negative_one'] = -1;   // Rational.NEGATIVE_ONE;
    Numbers['zero'] = 0;            // Rational.ZERO;
    Numbers['one'] = 1;             // Rational.ONE;
    Numbers['i'] = plusI;
    Numbers['negative_i'] = minusI;
    Numbers['negative_zero'] = NEGATIVE_ZERO;

    Numbers['onThrowRuntimeError'] = onThrowRuntimeError;
    Numbers['isSchemeNumber'] = isSchemeNumber;
    Numbers['isRational'] = isRational;
    Numbers['isReal'] = isReal;
    Numbers['isExact'] = isExact;
    Numbers['isInteger'] = isInteger;

    Numbers['toFixnum'] = toFixnum;
    Numbers['toExact'] = toExact;
    Numbers['add'] = add;
    Numbers['subtract'] = subtract;
    Numbers['multiply'] = multiply;
    Numbers['divide'] = divide;
    Numbers['equals'] = equals;
    Numbers['eqv'] = eqv;
    Numbers['approxEquals'] = approxEquals;
    Numbers['greaterThanOrEqual'] = greaterThanOrEqual;
    Numbers['lessThanOrEqual'] = lessThanOrEqual;
    Numbers['greaterThan'] = greaterThan;
    Numbers['lessThan'] = lessThan;
    Numbers['expt'] = expt;
    Numbers['exp'] = exp;
    Numbers['modulo'] = modulo;
    Numbers['numerator'] = numerator;
    Numbers['denominator'] = denominator;
    Numbers['integerSqrt'] = integerSqrt;
    Numbers['sqrt'] = sqrt;
    Numbers['abs'] = abs;
    Numbers['quotient'] = quotient;
    Numbers['remainder'] = remainder;
    Numbers['floor'] = floor;
    Numbers['ceiling'] = ceiling;
    Numbers['conjugate'] = conjugate;
    Numbers['magnitude'] = magnitude;
    Numbers['log'] = log;
    Numbers['angle'] = angle;
    Numbers['tan'] = tan;
    Numbers['atan'] = atan;
    Numbers['cos'] = cos;
    Numbers['sin'] = sin;
    Numbers['tan'] = tan;
    Numbers['acos'] = acos;
    Numbers['asin'] = asin;
    Numbers['cosh'] = cosh;
    Numbers['sinh'] = sinh;
    Numbers['imaginaryPart'] = imaginaryPart;
    Numbers['realPart'] = realPart;
    Numbers['round'] = round;
    Numbers['sqr'] = sqr;
    Numbers['gcd'] = gcd;
    Numbers['lcm'] = lcm;


})();

/**
 * Copyright 2009 Tim Down.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


//     *
//       void put(Object key, Object value)

//       Sets the value associated with the key supplied. If the hash table already contains the key then the old value is overwritten.
//     *
//       void get(Object key)

//       Returns the value associated with the key supplied, or null if no value is found for that key.
//     *
//       Boolean containsKey(Object key)

//       Returns whether the hash table contains the specified key.
//     *
//       Boolean containsValue(Object value)

//       Returns whether the hash table contains the specified value.
//     *
//       void clear()

//       Removes all entries from the hash table.
//     *
//       Boolean isEmpty()

//       Returns true if the hash table contains no key/value pairs.
//     *
//       Array keys()

//       Returns an array containing all the keys contained in the hash table.
//     *
//       Array values()

//       Returns an array containing all the values contained in the hash table.
//     *
//       void remove(Object key)

//       Removes the key and its corresponding value from the hash table.
//     *
//       Number size()

//       Returns the number of key/value pairs contained in the hash table.


var _Hashtable=(function(){function _1(_2){return(typeof _2==="undefined");};function _3(_4){return(typeof _4==="function");};function _5(_6){return(typeof _6==="string");};function _7(_8,_9){return _3(_8[_9]);};function _a(_b){return _7(_b,"equals");};function _c(_d){return _7(_d,"hashCode");};function _e(_f){if(_5(_f)){return _f;}else{if(_c(_f)){var _10=_f.hashCode();if(!_5(_10)){return _e(_10);}
return _10;}else{if(_7(_f,"toString")){return _f.toString();}else{return String(_f);}}}};function _11(_12,_13){return _12.equals(_13);};function _14(_15,_16){if(_a(_16)){return _16.equals(_15);}else{return _15===_16;}};function _17(o1,o2){return o1===o2;};function _1a(arr,_1c,_1d,_1e,_1f){var _20;for(var i=0,len=arr.length;i<len;i++){_20=arr[i];if(_1f(_1c,_1d(_20))){return _1e?[i,_20]:true;}}
return false;};function _23(arr,idx){if(_7(arr,"splice")){arr.splice(idx,1);}else{if(idx===arr.length-1){arr.length=idx;}else{var _26=arr.slice(idx+1);arr.length=idx;for(var i=0,len=_26.length;i<len;i++){arr[idx+i]=_26[i];}}}};function _29(kv,_2b){if(kv===null){throw new Error("null is not a valid "+_2b);}else{if(_1(kv)){throw new Error(_2b+" must not be undefined");}}};var _2c="key",_2d="value";function _2e(key){_29(key,_2c);};function _30(_31){_29(_31,_2d);};function _32(_33,_34,_35){this.entries=[];this.addEntry(_33,_34);if(_35!==null){this.getEqualityFunction=function(){return _35;};}};function _36(_37){return _37[0];};function _38(_39){return _39[1];};_32.prototype={getEqualityFunction:function(_3a){if(_a(_3a)){return _11;}else{return _14;}},searchForEntry:function(key){return _1a(this.entries,key,_36,true,this.getEqualityFunction(key));},getEntryForKey:function(key){return this.searchForEntry(key)[1];},getEntryIndexForKey:function(key){return this.searchForEntry(key)[0];},removeEntryForKey:function(key){var _3f=this.searchForEntry(key);if(_3f){_23(this.entries,_3f[0]);return true;}
return false;},addEntry:function(key,_41){this.entries[this.entries.length]=[key,_41];},size:function(){return this.entries.length;},keys:function(_42){var _43=_42.length;for(var i=0,len=this.entries.length;i<len;i++){_42[_43+i]=this.entries[i][0];}},values:function(_46){var _47=_46.length;for(var i=0,len=this.entries.length;i<len;i++){_46[_47+i]=this.entries[i][1];}},containsKey:function(key){return _1a(this.entries,key,_36,false,this.getEqualityFunction(key));},containsValue:function(_4b){return _1a(this.entries,_4b,_38,false,_17);}};function _4c(){};_4c.prototype=[];function _4d(_4e){return _4e[0];};function _4f(_50,_51,_52){return _1a(_50,_51,_4d,true,_52);};function _53(_54,_55){var _56=_54[_55];if(_56&&(_56 instanceof _4c)){return _56[1];}
return null;};function _57(_58,_59){var _5a=[];var _5b={};_58=_3(_58)?_58:_e;_59=_3(_59)?_59:null;this.put=function(key,_5d){_2e(key);_30(_5d);var _5e=_58(key);var _5f=_53(_5b,_5e);if(_5f){var _60=_5f.getEntryForKey(key);if(_60){_60[1]=_5d;}else{_5f.addEntry(key,_5d);}}else{var _61=new _4c();_61[0]=_5e;_61[1]=new _32(key,_5d,_59);_5a[_5a.length]=_61;_5b[_5e]=_61;}};this.get=function(key){_2e(key);var _63=_58(key);var _64=_53(_5b,_63);if(_64){var _65=_64.getEntryForKey(key);if(_65){return _65[1];}}
return null;};this.containsKey=function(key){_2e(key);var _67=_58(key);var _68=_53(_5b,_67);if(_68){return _68.containsKey(key);}
return false;};this.containsValue=function(_69){_30(_69);for(var i=0,len=_5a.length;i<len;i++){if(_5a[i][1].containsValue(_69)){return true;}}
return false;};this.clear=function(){_5a.length=0;_5b={};};this.isEmpty=function(){return _5a.length===0;};this.keys=function(){var _6c=[];for(var i=0,len=_5a.length;i<len;i++){_5a[i][1].keys(_6c);}
return _6c;};this.values=function(){var _6f=[];for(var i=0,len=_5a.length;i<len;i++){_5a[i][1].values(_6f);}
return _6f;};this.remove=function(key){_2e(key);var _73=_58(key);var _74=_53(_5b,_73);if(_74){if(_74.removeEntryForKey(key)){if(_74.size()===0){var _75=_4f(_5a,_73,_74.getEqualityFunction(key));_23(_5a,_75[0]);delete _5b[_73];}}}};this.size=function(){var _76=0;for(var i=0,len=_5a.length;i<len;i++){_76+=_5a[i][1].size();}
return _76;};};return _57;})();
//////////////////////////////////////////////////////////////////////
// helper functions

//var jsnums = require('./js-numbers');


var types = {};


(function () {

//////////////////////////////////////////////////////////////////////


var appendChild = function(parent, child) {
    parent.appendChild(child);
};


//////////////////////////////////////////////////////////////////////



var _eqHashCodeCounter = 0;
makeEqHashCode = function() {
    _eqHashCodeCounter++;
    return _eqHashCodeCounter;
};

    
// getHashCode: any -> (or fixnum string)
// Produces a hashcode appropriate for eq.
getEqHashCode = function(x) {
    if (x && !x._eqHashCode) {
	x._eqHashCode = makeEqHashCode();
    }
    if (x && x._eqHashCode) {
	return x._eqHashCode;
    }
    if (typeof(x) == 'string') {
	return x;
    }
    return 0;
};


// Union/find for circular equality testing.

var UnionFind = function() {
	// this.parenMap holds the arrows from an arbitrary pointer
	// to its parent.
	this.parentMap = makeLowLevelEqHash();
}

// find: ptr -> UnionFindNode
// Returns the representative for this ptr.
UnionFind.prototype.find = function(ptr) {
	var parent = (this.parentMap.containsKey(ptr) ? 
		      this.parentMap.get(ptr) : ptr);
	if (parent === ptr) {
	    return parent;
	} else {
	    var rep = this.find(parent);
	    // Path compression:
	    this.parentMap.put(ptr, rep);
	    return rep;
	}
};

// merge: ptr ptr -> void
// Merge the representative nodes for ptr1 and ptr2.
UnionFind.prototype.merge = function(ptr1, ptr2) {
	this.parentMap.put(this.find(ptr1), this.find(ptr2));
};



//////////////////////////////////////////////////////////////////////

// Class inheritance infrastructure

// This code copied directly from http://ejohn.org/blog/simple-javascript-inheritance/
var Class = (function(){
	var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
	// The base Class implementation (does nothing)
	var innerClass = function(){};
	
	// Create a new Class that inherits from this class
	innerClass.extend = function(prop) {
		var _super = this.prototype;
		
		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;
		
		// Copy the properties over onto the new prototype
		for (var name in prop) {
			// Check if we're overwriting an existing function
			prototype[name] = typeof prop[name] == "function" && 
				typeof _super[name] == "function" && fnTest.test(prop[name]) ?
				(function(name, fn){
					return function() {
						var tmp = this._super;
						
						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = _super[name];
						
						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						var ret = fn.apply(this, arguments);				
						this._super = tmp;
						
						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}
		
		// The dummy class constructor
		var Dummy = function() {
			// All construction is actually done in the init method
			if ( !initializing && this.init )
				this.init.apply(this, arguments);
		}
		
		// Populate our constructed prototype object
		Dummy.prototype = prototype;
		
		// Enforce the constructor to be what we expect
		Dummy.constructor = Dummy;

		// And make this class extendable
		Dummy.extend = arguments.callee;
		
		return Dummy;
	};
	return innerClass;
})();
 


//////////////////////////////////////////////////////////////////////


var makeStructureType = function(theName, initFieldCnt, autoFieldCnt, parentType, autoV) {
    // If no parent type given, then the parent type is Struct
    if ( !parentType ) {
	parentType = ({type: Struct,
		       numberOfArgs: 0,
		       numberOfFields: 0,
		       firstField: 0});
    }
    var numParentArgs = parentType.numberOfArgs;

    // Create a new struct type inheriting from the parent
    var aStruct = parentType.type.extend({
	init: function(name, args) {
		this._super(name, args);

		for (var i = 0; i < initFieldCnt; i++) {
			this._fields.push(args[i+numParentArgs]);
		}
		for (var i = 0; i < autoFieldCnt; i++) {
			this._fields.push(autoV);
		}
	},
    });
    // Set type, necessary for equality checking
    aStruct.prototype.type = aStruct;

    // construct and return the new type
    return { 
	type: aStruct,
	numberOfArgs: initFieldCnt + numParentArgs,
	numberOfFields: initFieldCnt + autoFieldCnt,
	firstField: parentType.firstField + parentType.numberOfFields,

	constructor: function() { return new aStruct(theName, arguments); },
	predicate: function(x) { return x instanceof aStruct; },
	accessor: function(x, i) { return x._fields[i + this.firstField]; },
	mutator: function(x, i, v) { x._fields[i + this.firstField] = v; }
    };
};


// Structures.
var Struct = Class.extend({
	init: function (constructorName, fields) {
	    this._constructorName = constructorName; 
	    this._fields = [];
	},

	toWrittenString: function(cache) { 
	    //    cache.put(this, true);
	    var buffer = [];
	    buffer.push("(");
	    buffer.push(this._constructorName);
	    for(var i = 0; i < this._fields.length; i++) {
		buffer.push(" ");
		buffer.push(toWrittenString(this._fields[i], cache));
	    }
	    buffer.push(")");
	    return buffer.join("");
	},

	toDisplayedString: function(cache) { return this.toWrittenString(cache); },

	toDomNode: function(cache) {
	    //    cache.put(this, true);
	    var node = document.createElement("div");
	    node.appendChild(document.createTextNode("("));
	    node.appendChild(document.createTextNode(this._constructorName));
	    for(var i = 0; i < this._fields.length; i++) {
		node.appendChild(document.createTextNode(" "));
		appendChild(node, toDomNode(this._fields[i], cache));
	    }
	    node.appendChild(document.createTextNode(")"));
	    return node;
	},


	isEqual: function(other, aUnionFind) {
	    if ( this.type === undefined ||
		 other.type === undefined ||
		 this.type !== other.type ) {
		    return false;
	    }
//	    if (typeof(other) != 'object') {
//		return false;
//	    }
//	    if (! other._constructorName) {
//		return false;
//	    }
//	    if (other._constructorName != this._constructorName) {
//		return false;
//	    }
//	    if (typeof(other._fields) === 'undefined') {
//		return false;
//	    }
//	    if (this._fields.length != other._fields.length) {
//		return false;
//	    }
	    for (var i = 0; i < this._fields.length; i++) {
		if (! isEqual(this._fields[i],
			      other._fields[i],
			      aUnionFind)) {
			return false;
		}
	    }
	    return true;
	}
});
Struct.prototype.type = Struct;



//////////////////////////////////////////////////////////////////////

// Regular expressions.

var RegularExpression = function(pattern) {
    this.pattern = pattern;
};


var ByteRegularExpression = function(pattern) {
    this.pattern = pattern;
};




//////////////////////////////////////////////////////////////////////

// Paths

var Path = function(p) {
    this.path = p;
};


//////////////////////////////////////////////////////////////////////

// Bytes

var Bytes = function(bts, mutable) {
    this.bytes = bts;
    this.mutable = (mutable === undefined) ? false : mutable;
};

Bytes.prototype.get = function(i) {
	return this.bytes[i];
};

Bytes.prototype.set = function(i, b) {
	if (this.mutable) {
		this.bytes[i] = b;
	}
};

Bytes.prototype.length = function() {
	return this.bytes.length;
};

Bytes.prototype.copy = function(mutable) {
	return new Bytes(this.bytes.slice(0), mutable);
};

Bytes.prototype.subbytes = function(start, end) {
	if (end == null || end == undefined) {
		end = this.bytes.length;
	}
	
	return new Bytes( this.bytes.slice(start, end), true );
};


Bytes.prototype.toString = function() {
	var ret = '';
	for (var i = 0; i < this.bytes.length; i++) {
		ret += String.fromCharCode(this.bytes[i]);
	}

	return ret;
};

Bytes.prototype.toDisplayedString = Bytes.prototype.toString;
Bytes.prototype.toWrittenString = function() {
	return '#"' + this.toString() + '"';
};



//////////////////////////////////////////////////////////////////////
// Boxes
    
var Box = function(x, mutable) {
	this.val = x;
	this.mutable = mutable;
};

Box.prototype.unbox = function() {
    return this.val;
};

Box.prototype.set = function(newVal) {
    if (this.mutable) {
	    this.val = newVal;
    }
};

Box.prototype.toString = function() {
    return "#&" + this.val.toString();
}
//////////////////////////////////////////////////////////////////////








// We are reusing the built-in Javascript boolean class here.
Logic = {
    TRUE : true,
    FALSE : false
};

// WARNING
// WARNING: we are extending the built-in Javascript boolean class here!
// WARNING
Boolean.prototype.toWrittenString = function(cache) {
    if (this.valueOf()) { return "true"; }
    return "false";
};
Boolean.prototype.toDisplayedString = Boolean.prototype.toWrittenString;

Boolean.prototype.toString = function() { return this.valueOf() ? "true" : "false"; };

Boolean.prototype.isEqual = function(other, aUnionFind){
    return this == other;
};




// Chars
// Char: string -> Char
Char = function(val){
    this.val = val;
};
    
Char.makeInstance = function(val){
    return new Char(val);
};

Char.prototype.toWrittenString = function(cache) {
    return "#\\" + this.val;
};

Char.prototype.toDisplayedString = function (cache) {
    return this.val;
};

Char.prototype.toString = function() { return '#\\'+this.val; }

Char.prototype.getValue = function() {
    return this.val;
};

Char.prototype.isEqual = function(other, aUnionFind){
    return other instanceof Char && this.val == other.val;
};

//////////////////////////////////////////////////////////////////////
    
// Symbols

//////////////////////////////////////////////////////////////////////
var Symbol = function(val) {
    this.val = val;
};

var symbolCache = {};
    
// makeInstance: string -> Symbol.
Symbol.makeInstance = function(val) {
    // To ensure that we can eq? symbols with equal values.
    if (!(val in symbolCache)) {
	symbolCache[val] = new Symbol(val);
    } else {
    }
    return symbolCache[val];
};
    
Symbol.prototype.isEqual = function(other, aUnionFind) {
    return other instanceof Symbol &&
    this.val == other.val;
};
    

Symbol.prototype.toString = function() {
    return this.val;
};

Symbol.prototype.toWrittenString = function(cache) {
    return this.val;
};

Symbol.prototype.toDisplayedString = function(cache) {
    return this.val;
};

//////////////////////////////////////////////////////////////////////

// Keywords

var Keyword = function(val) {
    this.val = val;
};

var keywordCache = {};
    
// makeInstance: string -> Keyword.
Keyword.makeInstance = function(val) {
    // To ensure that we can eq? symbols with equal values.
    if (!(val in keywordCache)) {
	keywordCache[val] = new Keyword(val);
    } else {
    }
    return keywordCache[val];
};
    
Keyword.prototype.isEqual = function(other, aUnionFind) {
    return other instanceof Keyword &&
    this.val == other.val;
};
    

Keyword.prototype.toString = function() {
    return this.val;
};

Keyword.prototype.toWrittenString = function(cache) {
    return this.val;
};

Keyword.prototype.toDisplayedString = function(cache) {
    return this.val;
};


//////////////////////////////////////////////////////////////////////


    
    
    
Empty = function() {
};
Empty.EMPTY = new Empty();


Empty.prototype.isEqual = function(other, aUnionFind) {
    return other instanceof Empty;
};

Empty.prototype.reverse = function() {
    return this;
};

Empty.prototype.first = function() {
    throwRuntimeError("first can't be applied on empty.");
};
Empty.prototype.rest = function() {
    throwRuntimeError("rest can't be applied on empty.");
};
Empty.prototype.isEmpty = function() {
    return true;
};
Empty.prototype.toWrittenString = function(cache) { return "empty"; };
Empty.prototype.toDisplayedString = function(cache) { return "empty"; };
Empty.prototype.toString = function(cache) { return "()"; };


    
// Empty.append: (listof X) -> (listof X)
Empty.prototype.append = function(b){
    return b;
};
    
Cons = function(f, r) {
    this.f = f;
    this.r = r;
};

Cons.prototype.reverse = function() {
    var lst = this;
    var ret = Empty.EMPTY;
    while (!lst.isEmpty()){
	ret = Cons.makeInstance(lst.first(), ret);
	lst = lst.rest();
    }
    return ret;
};
    
Cons.makeInstance = function(f, r) {
    return new Cons(f, r);
};


// FIXME: can we reduce the recursion on this?
Cons.prototype.isEqual = function(other, aUnionFind) {
    if (! (other instanceof Cons)) {
	return Logic.FALSE;
    }
    return (isEqual(this.first(), other.first(), aUnionFind) &&
	    isEqual(this.rest(), other.rest(), aUnionFind));
};
    
Cons.prototype.first = function() {
    return this.f;
};
    
Cons.prototype.rest = function() {
    return this.r;
};
    
Cons.prototype.isEmpty = function() {
    return false;
};
    
// Cons.append: (listof X) -> (listof X)
Cons.prototype.append = function(b){
    if (b.isEmpty())
	return this;
    var ret = b;
    var lst = this.reverse();
    while ( !lst.isEmpty() ) {
	ret = Cons.makeInstance(lst.first(), ret);
	lst = lst.rest();
    }
	
    return ret;
};
    

Cons.prototype.toWrittenString = function(cache) {
    //    cache.put(this, true);
    var texts = [];
    var p = this;
    while (true) {
	if ((!(p instanceof Cons)) && (!(p instanceof Empty))) {
	    texts.push(".");
	    texts.push(toWrittenString(p, cache));
	    break;
	}
	if (p.isEmpty())
	    break;
	texts.push(toWrittenString(p.first(), cache));
	p = p.rest();
    }
    return "(" + texts.join(" ") + ")";
};

Cons.prototype.toString = Cons.prototype.toWrittenString;

Cons.prototype.toDisplayedString = function(cache) {
    //    cache.put(this, true);
    var texts = [];
    var p = this;
    while (true) {
	if ((!(p instanceof Cons)) && (!(p instanceof Empty))) {
	    texts.push(".");
	    texts.push(toDisplayedString(p, cache));
	    break;
	}
	if (p.isEmpty()) 
	    break;
	texts.push(toDisplayedString(p.first(), cache));
	p = p.rest();
    }
    return "(" + texts.join(" ") + ")";
};



Cons.prototype.toDomNode = function(cache) {
    //    cache.put(this, true);
    var node = document.createElement("span");
    node.appendChild(document.createTextNode("("));
    var p = this;
    while (true) {
	if ((!(p instanceof Cons)) && (!(p instanceof Empty))) {
	    appendChild(node, document.createTextNode(" "));
	    appendChild(node, document.createTextNode("."));
	    appendChild(node, document.createTextNode(" "));
	    appendChild(node, toDomNode(p, cache));
	    break;
	}
	if (p.isEmpty())
	    break;
	appendChild(node, toDomNode(p.first(), cache));
	p = p.rest();
	if (! p.isEmpty()) {
	    appendChild(node, document.createTextNode(" "));
	}
    }
    node.appendChild(document.createTextNode(")"));
    return node;
};



//////////////////////////////////////////////////////////////////////

Vector = function(n, initialElements) {
    this.elts = new Array(n);
    if (initialElements) {
	for (var i = 0; i < n; i++) {
	    this.elts[i] = initialElements[i];
	}
    } else {
	for (var i = 0; i < n; i++) {
	    this.elts[i] = undefined;
	}
    }
    this.mutable = true;
};
Vector.makeInstance = function(n, elts) {
    return new Vector(n, elts);
}
    Vector.prototype.length = function() {
	return this.elts.length;
    };
Vector.prototype.ref = function(k) {
    return this.elts[k];
};
Vector.prototype.set = function(k, v) {
    this.elts[k] = v;
};

Vector.prototype.isEqual = function(other, aUnionFind) {
    if (other != null && other != undefined && other instanceof Vector) {
	if (other.length() != this.length()) {
	    return false
	}
	for (var i = 0; i <  this.length(); i++) {
	    if (! isEqual(this.elts[i], other.elts[i], aUnionFind)) {
		return false;
	    }
	}
	return true;
    } else {
	return false;
    }
};

Vector.prototype.toList = function() {
    var ret = Empty.EMPTY;
    for (var i = this.length() - 1; i >= 0; i--) {
	ret = Cons.makeInstance(this.elts[i], ret);	    
    }	
    return ret;
};

Vector.prototype.toWrittenString = function(cache) {
    //    cache.put(this, true);
    var texts = [];
    for (var i = 0; i < this.length(); i++) {
	texts.push(toWrittenString(this.ref(i), cache));
    }
    return "#(" + texts.join(" ") + ")";
};

Vector.prototype.toDisplayedString = function(cache) {
    //    cache.put(this, true);
    var texts = [];
    for (var i = 0; i < this.length(); i++) {
	texts.push(toDisplayedString(this.ref(i), cache));
    }
    return "#(" + texts.join(" ") + ")";
};

Vector.prototype.toDomNode = function(cache) {
    //    cache.put(this, true);
    var node = document.createElement("span");
    node.appendChild(document.createTextNode("#("));
    for (var i = 0; i < this.length(); i++) {
	appendChild(node,
		    toDomNode(this.ref(i), cache));
	if (i !== this.length()-1) {
	    appendChild(node, document.createTextNode(" "));
	}
    }
    node.appendChild(document.createTextNode(")"));
    return node;
};


//////////////////////////////////////////////////////////////////////






// Now using mutable strings
var Str = function(chars) {
	this.chars = chars;
	this.length = chars.length;
	this.mutable = true;
}

Str.makeInstance = function(chars) {
	return new Str(chars);
}

Str.fromString = function(s) {
	return Str.makeInstance(s.split(""));
}

Str.prototype.toString = function() {
	return this.chars.join("");
}

Str.prototype.toWrittenString = function(cache) {
    return escapeString(this.toString());
}

Str.prototype.toDisplayedString = Str.prototype.toString;

Str.prototype.copy = function() {
	return Str.makeInstance(this.chars.slice(0));
}

Str.prototype.substring = function(start, end) {
	if (end == null || end == undefined) {
		end = this.length;
	}
	
	return Str.makeInstance( this.chars.slice(start, end) );
}

Str.prototype.charAt = function(index) {
	return this.chars[index];
}

Str.prototype.charCodeAt = function(index) {
	return this.chars[index].charCodeAt(0);
}

Str.prototype.replace = function(expr, newStr) {
	return Str.fromString( this.toString().replace(expr, newStr) );
}


Str.prototype.isEqual = function(other, aUnionFind) {
	if ( !(other instanceof Str || typeof(other) == 'string') ) {
		return false;
	}
	return this.toString() === other.toString();
}


Str.prototype.set = function(i, c) {
	this.chars[i] = c;
}

Str.prototype.toUpperCase = function() {
	return Str.fromString( this.chars.join("").toUpperCase() );
}

Str.prototype.toLowerCase = function() {
	return Str.fromString( this.chars.join("").toLowerCase() );
}

Str.prototype.match = function(regexpr) {
	return this.toString().match(regexpr);
}


var _quoteReplacingRegexp = new RegExp("[\"\\\\]", "g");
var escapeString = function(s) {
    return '"' + s.replace(_quoteReplacingRegexp,
			      function(match, submatch, index) {
				  return "\\" + match;
			      }) + '"';
};


/*
// Strings
// For the moment, we just reuse Javascript strings.
String = String;
String.makeInstance = function(s) {
    return s.valueOf();
};
    
    
// WARNING
// WARNING: we are extending the built-in Javascript string class here!
// WARNING
String.prototype.isEqual = function(other, aUnionFind){
    return this == other;
};
    
var _quoteReplacingRegexp = new RegExp("[\"\\\\]", "g");
String.prototype.toWrittenString = function(cache) {
    return '"' + this.replace(_quoteReplacingRegexp,
			      function(match, submatch, index) {
				  return "\\" + match;
			      }) + '"';
};

String.prototype.toDisplayedString = function(cache) {
    return this;
};
*/


//////////////////////////////////////////////////////////////////////

// makeLowLevelEqHash: -> hashtable
// Constructs an eq hashtable that uses Moby's getEqHashCode function.
var makeLowLevelEqHash = function() {
    return new _Hashtable(function(x) { return getEqHashCode(x); },
			  function(x, y) { return x === y; });
};

makeLowLevelEqHash = makeLowLevelEqHash;









//////////////////////////////////////////////////////////////////////
// Hashtables
var EqHashTable = function(inputHash) {
    this.hash = makeLowLevelEqHash();
    this.mutable = true;

};
EqHashTable = EqHashTable;

EqHashTable.prototype.toWrittenString = function(cache) {
    return "<hash>";
};

EqHashTable.prototype.toDisplayedString = function(cache) {
    return "<hash>";
};

EqHashTable.prototype.isEqual = function(other, aUnionFind) {
    if ( !(other instanceof EqHashTable) ) {
	return false; 
    }

    if (this.hash.keys().length != other.hash.keys().length) { 
	return false;
    }

    var keys = this.hash.keys();
    for (var i = 0; i < keys.length; i++){
	if ( !(other.hash.containsKey(keys[i]) &&
	       isEqual(this.hash.get(keys[i]),
		       other.hash.get(keys[i]),
		       aUnionFind)) ) {
		return false;
	}
    }
    return true;
};



var EqualHashTable = function(inputHash) {
	this.hash = new _Hashtable(function(x) {
			return toWrittenString(x); 
		},
		function(x, y) {
			return isEqual(x, y, new UnionFind()); 
		});
	this.mutable = true;
};

EqualHashTable = EqualHashTable;

EqualHashTable.prototype.toWrittenString = function(cache) {
    return "<hash>";
};
EqualHashTable.prototype.toDisplayedString = function(cache) {
    return "<hash>";
};

EqualHashTable.prototype.isEqual = function(other, aUnionFind) {
    if ( !(other instanceof EqualHashTable) ) {
	return false; 
    }

    if (this.hash.keys().length != other.hash.keys().length) { 
	return false;
    }

    var keys = this.hash.keys();
    for (var i = 0; i < keys.length; i++){
	if (! (other.hash.containsKey(keys[i]) &&
	       isEqual(this.hash.get(keys[i]),
		       other.hash.get(keys[i]),
		       aUnionFind))) {
	    return false;
	}
    }
    return true;
};











//////////////////////////////////////////////////////////////////////







var toWrittenString = function(x, cache) {
    if (! cache) { 
     	cache = makeLowLevelEqHash();
    }

    if (x && cache.containsKey(x)) {
     	return "...";
    }

    if (x == undefined || x == null) {
	return "<undefined>";
    }
    if (typeof(x) == 'string') {
	return escapeString(x.toString());
    }
    if (typeof(x) != 'object' && typeof(x) != 'function') {
	return x.toString();
    }
    if (typeof(x.toWrittenString) !== 'undefined') {
	return x.toWrittenString(cache);
    }
    if (typeof(x.toDisplayedString) !== 'undefined') {
	return x.toDisplayedString(cache);
    } else {
	return x.toString();
    }
};



var toDisplayedString = function(x, cache) {
    if (! cache) {
    	cache = makeLowLevelEqHash();
    }
    if (x && cache.containsKey(x)) {
    	return "...";
    }

    if (x == undefined || x == null) {
	return "<undefined>";
    }
    if (typeof(x) == 'string') {
	return x.toString();
    }
    if (typeof(x) != 'object' && typeof(x) != 'function') {
	return x.toString();
    }
    if (typeof(x.toDisplayedString) !== 'undefined') {
	return x.toDisplayedString(cache);
    }
    if (typeof(x.toWrittenString) !== 'undefined') {
	return x.toWrittenString(cache);
    } else {
	return x.toString();
    }
};



// toDomNode: scheme-value -> dom-node
var toDomNode = function(x, cache) {
    if (! cache) {
    	cache = makeLowLevelEqHash();
    }
    
    if (x && cache.containsKey(x)) {
    	return document.createTextNode("...");
    }

    if (x == undefined || x == null) {
	var node = document.createTextNode("<undefined>");
	return node;
    }
    if (typeof(x) == 'string') {
	var node = document.createTextNode(toWrittenString(x));
	return node;
    }
    if (typeof(x) != 'object' && typeof(x) != 'function') {
	var node = document.createTextNode(x.toString());
	return node;
    }
    if (x.nodeType) {
	return x;
    }
    if (typeof(x.toDomNode) !== 'undefined') {
	return x.toDomNode(cache);
    }
    if (typeof(x.toWrittenString) !== 'undefined') {
	var node = document.createTextNode(toWrittenString(x, cache));
	return node;
    }
    if (typeof(x.toDisplayedString) !== 'undefined') {
	var node = document.createTextNode(toDisplayedString(x, cache));
	return node;
    } else {
	var node = document.createTextNode(x.toString());
	return node;
    }
};




var isNumber = jsnums.isSchemeNumber;

var isString = function(s) {
	return (typeof s === 'string' || s instanceof Str);
}


// isEqual: X Y -> boolean
// Returns true if the objects are equivalent; otherwise, returns false.
var isEqual = function(x, y, aUnionFind) {
    if (x === y) { return true; }

    if (isNumber(x) && isNumber(y)) {
	return jsnums.equals(x, y);
    }

    if (isString(x) && isString(y)) {
	return x.toString() === y.toString();
    }

    if (x == undefined || x == null) {
	return (y == undefined || y == null);
    }

    if (typeof(x) == 'object' && typeof(y) == 'object') {
	if (aUnionFind.find(x) === aUnionFind.find(y)) {
	    return true;
	}
	else {
	    aUnionFind.merge(x, y); 
	    return x.isEqual(y, aUnionFind);
	}
    }
    return false;
};





// liftToplevelToFunctionValue: primitive-function string fixnum scheme-value -> scheme-value
// Lifts a primitive toplevel or module-bound value to a scheme value.
var liftToplevelToFunctionValue = function(primitiveF,
				       name,
				       minArity, 
				       procedureArityDescription) {
    if (! primitiveF._mobyLiftedFunction) {
	var lifted = function(args) {
	    return primitiveF.apply(null, args.slice(0, minArity).concat([args.slice(minArity)]));
	};
	lifted.isEqual = function(other, cache) { 
	    return this === other; 
	}
	lifted.toWrittenString = function(cache) { 
	    return "<procedure:" + name + ">";
	};
	lifted.toDisplayedString = lifted.toWrittenString;
	lifted.procedureArity = procedureArityDescription;
	primitiveF._mobyLiftedFunction = lifted;
	    
    } 
    return primitiveF._mobyLiftedFunction;
};



//////////////////////////////////////////////////////////////////////
var ThreadCell = function(v, isPreserved) {
    this.v = v;
    this.isPreserved = isPreserved || false;
};



//////////////////////////////////////////////////////////////////////


// Wrapper around functions that return multiple values.
var ValuesWrapper = function(elts) {
    this.elts = elts;
};


var UndefinedValue = function() {
};
UndefinedValue.prototype.toString = function() {
    return "<undefined>";
};
var UNDEFINED_VALUE = new UndefinedValue();

var VoidValue = function() {};
VoidValue.prototype.toString = function() {
	return "<void>";
};

var VOID_VALUE = new VoidValue();


var EofValue = function() {};
EofValue.prototype.toString = function() {
	return "<eof>";
}

var EOF_VALUE = new EofValue();


var ClosureValue = function(numParams, paramTypes, isRest, closureVals, body) {
    this.numParams = numParams;
    this.paramTypes = paramTypes;
    this.isRest = isRest;
    this.closureVals = closureVals;
    this.body = body;
};




ClosureValue.prototype.toString = function() {
    return "<closure>";
};


var CaseLambdaValue = function(name, closures) {
    this.name = name;
    this.closures = closures;
};



var ContinuationClosureValue = function(vstack, cstack) {
    this.vstack = vstack.slice(0);
    this.cstack = cstack.slice(0);
};



//////////////////////////////////////////////////////////////////////



var PrefixValue = function() {
    this.slots = [];
    this.definedMask = [];
};

PrefixValue.prototype.addSlot = function(v) {
    if (v === undefined) { 
	this.slots.push(types.UNDEFINED);
	this.definedMask.push(false);
    } else {
        this.slots.push(v);
	if (v instanceof GlobalBucket) {
	    if (v.value === types.UNDEFINED) {
		this.definedMask.push(false);
	    } else {
		this.definedMask.push(true);
	    }
	} else {
	    this.definedMask.push(true);
	}
    }
};

PrefixValue.prototype.ref = function(n) {
    if (this.slots[n] instanceof GlobalBucket) {
	if (this.definedMask[n]) {
	    return this.slots[n].value;
	} else {
	    throw new Error(this.slots[n].name + " is not defined");
	}

    } else {
	if (this.definedMask[n]) {
	    return this.slots[n];
	} else {
	    throw new Error("variable has not been defined");
	}
    }
};

PrefixValue.prototype.set = function(n, v) {
    if (this.slots[n] instanceof GlobalBucket) {
	this.slots[n].value = v;
	this.definedMask[n] = true;
    } else {
	this.slots[n] = v;
	this.definedMask[n] = true;
    }
};


PrefixValue.prototype.length = function() { 
    return this.slots.length;
};


var GlobalBucket = function(name, value) {
    this.name = name;
    this.value = value;
};




//////////////////////////////////////////////////////////////////////


var VariableReference = function(prefix, pos) {
    this.prefix = prefix;
    this.pos = pos;
};

VariableReference.prototype.ref = function() {
    return this.prefix.ref(this.pos);
};

VariableReference.prototype.set = function(v) {
    this.prefix.set(this.pos, v);
}

//////////////////////////////////////////////////////////////////////

// Continuation Marks

var ContMarkRecordControl = function(dict) {
    this.dict = dict || makeLowLevelEqHash();
};

ContMarkRecordControl.prototype.invoke = function(state) {
    // No-op: the record will simply pop off the control stack.
};

ContMarkRecordControl.prototype.update = function(key, val) {
    var newDict = makeLowLevelEqHash();
    // FIXME: what's the javascript idiom for hash key copy?
    // Maybe we should use a rbtree instead?
    var oldKeys = this.dict.keys();
    for (var i = 0; i < oldKeys.length; i++) {
	    newDict.put( oldKeys[i], this.dict.get(oldKeys[i]) );
    }
    newDict.put(key, val);
    return new ContMarkRecordControl(newDict);
};



var ContinuationMarkSet = function(dict) {
    this.dict = dict;
}

ContinuationMarkSet.prototype.toDomNode = function(cache) {
    var dom = document.createElement("span");
    dom.appendChild(document.createTextNode('#<continuation-mark-set>'));
    return dom;
};

ContinuationMarkSet.prototype.toWrittenString = function(cache) {
    return '#<continuation-mark-set>';
};

ContinuationMarkSet.prototype.toDisplayedString = function(cache) {
    return '#<continuation-mark-set>';
};

ContinuationMarkSet.prototype.ref = function(key) {
    if ( this.dict.containsKey(key) ) {
	    return this.dict.get(key);
    }
    return [];
};



//////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////

var PrimProc = function(name, numParams, isRest, usesState, impl) {
    this.name = name;
    this.numParams = numParams;
    this.isRest = isRest;
    this.usesState = usesState;
    this.impl = impl;
};

PrimProc.prototype.toString = function() {
    return ("<procedure:" + this.name + ">");
};

PrimProc.prototype.toWrittenString = function(cache) {
    return ("<procedure:" + this.name + ">");
};

PrimProc.prototype.toDisplayedString = function(cache) {
    return ("<procedure:" + this.name + ">");
};


PrimProc.prototype.toDomNode = function(cache) {
    var div = document.createElement("span");
    div.appendChild(document.createTextNode("<procedure:"+ this.name +">"));
    return div;
};


var CasePrimitive = function(name, cases) {
    this.name = name;
    this.cases = cases;
};


CasePrimitive.prototype.toDomNode = function(cache) {
    var div = document.createElement("span");
    div.appendChild(document.createTextNode("<procedure:"+ this.name +">"));
    return div;    
};

CasePrimitive.prototype.toWrittenString = function(cache) {
    return ("<procedure:" + this.name + ">");
};

CasePrimitive.prototype.toDisplayedString = function(cache) {
    return ("<procedure:" + this.name + ">");
};





//////////////////////////////////////////////////////////////////////





var makeList = function(args) {
    var result = Empty.EMPTY;
    for(var i = args.length-1; i >= 0; i--) {
	result = Cons.makeInstance(args[i], result);
    }
    return result;
};


var makeVector = function(args) {
    return Vector.makeInstance(args.length, args);
}

var makeString = function(s) {
	if (s instanceof Str) {
		return s;
	}
	else if (s instanceof Array) {
//		for (var i = 0; i < s.length; i++) {
//			if ( typeof s[i] !== 'string' || s[i].length != 1 ) {
//				return undefined;
//			}
//		}
		return Str.makeInstance(s);
	}
	else if (typeof s === 'string') {
		return Str.fromString(s);
	}
	else {
		throw new Error('makeString expects and array of 1-character strings or a string;' +
				' given ' + s.toString());
	}
}


var makeHashEq = function(lst) {
	var newHash = new EqHashTable();
	while ( !lst.isEmpty() ) {
		newHash.hash.put(lst.first().first(), lst.first().rest());
		lst = lst.rest();
	}
	return newHash;
}


var makeHashEqual = function(lst) {
	var newHash = new EqualHashTable();
	while ( !lst.isEmpty() ) {
		newHash.hash.put(lst.first().first(), lst.first().rest());
		lst = lst.rest();
	}
	return newHash;
}


var Posn = makeStructureType('posn', 2, 0, false, false);
var Color = makeStructureType('color', 3, 0, false, false);
var ArityAtLeast = makeStructureType('arity-at-least', 1, 0, false, false);


types.symbol = Symbol.makeInstance;
types.rational = jsnums.makeRational;
types.float = jsnums.makeFloat;
types.complex = jsnums.makeComplex;
types.bignum = jsnums.makeBignum;
types.list = makeList;
types.vector = makeVector;
types.regexp = function(p) { return new RegularExpression(p) ; }
types.byteRegexp = function(p) { return new ByteRegularExpression(p) ; }
types['char'] = Char.makeInstance;
types['string'] = makeString;
types.box = function(x) { return new Box(x, true); };
types.boxImmutable = function(x) { return new Box(x, false); };
types.path = function(x) { return new Path(x); };
types.bytes = function(x, mutable) { return new Bytes(x, mutable); };
types.keyword = function(k) { return new Keyword(k); };
types.pair = function(x, y) { return Cons.makeInstance(x, y); };
types.hash = makeHashEqual;
types.hashEq = makeHashEq;

types.toWrittenString = toWrittenString;
types.toDisplayedString = toDisplayedString;
types.toDomNode = toDomNode;

types.posn = Posn.constructor;
types.posnX = function(psn) { return Posn.accessor(psn, 0); };
types.posnY = function(psn) { return Posn.accessor(psn, 1); };

types.color = Color.constructor;
types.colorRed = function(x) { return Color.accessor(x, 0); };
types.colorGreen = function(x) { return Color.accessor(x, 1); };
types.colorBlue = function(x) { return Color.accessor(x, 2); };

types.arityAtLeast = ArityAtLeast.constructor;
types.arityValue = function(arity) { return ArityAtLeast.accessor(arity, 0); };


types.FALSE = Logic.FALSE;
types.TRUE = Logic.TRUE;
types.EMPTY = Empty.EMPTY;

types.isEqual = isEqual;
types.isNumber = isNumber;
types.isSymbol = function(x) { return x instanceof Symbol; };
types.isChar = function(x) { return x instanceof Char; };
types.isString = isString;
types.isPair = function(x) { return x instanceof Cons; };
types.isVector = function(x) { return x instanceof Vector; };
types.isBox = function(x) { return x instanceof Box; };
types.isHash = function(x) { return (x instanceof EqHashTable ||
				     x instanceof EqualHashTable); };
types.isByteString = function(x) { return x instanceof Bytes; };
types.isStruct = function(x) { return x instanceof Struct; };
types.isPosn = Posn.predicate;
types.isArityAtLeast = ArityAtLeast.predicate;
types.isColor = Color.predicate;

types.UnionFind = UnionFind;
types.cons = Cons.makeInstance;

types.UNDEFINED = UNDEFINED_VALUE;
types.VOID = VOID_VALUE;
types.EOF = EOF_VALUE;

types.ValuesWrapper = ValuesWrapper;
types.ClosureValue = ClosureValue;
types.ContinuationClosureValue = ContinuationClosureValue;
types.CaseLambdaValue = CaseLambdaValue;
types.PrimProc = PrimProc;
types.CasePrimitive = CasePrimitive;

types.contMarkRecordControl = function(dict) { return new ContMarkRecordControl(dict); };
types.isContMarkRecordControl = function(x) { return x instanceof ContMarkRecordControl; };
types.continuationMarkSet = function(dict) { return new ContinuationMarkSet(dict); };
types.isContinuationMarkSet = function(x) { return x instanceof ContinuationMarkSet; };


types.PrefixValue = PrefixValue;
types.GlobalBucket = GlobalBucket;
types.VariableReference = VariableReference;

types.Box = Box;
types.ThreadCell = ThreadCell;



types.Class = Class;


types.makeStructureType = makeStructureType;


types.makeLowLevelEqHash = makeLowLevelEqHash;


// Error type exports
var SchemeError = function(val) {
	this.val = val;
}
types.schemeError = function(v) { return new SchemeError(v); };
types.isSchemeError = function(v) { return v instanceof SchemeError; };

var Exn = makeStructureType('exn', 2, 0, false, false);
types.exn = Exn.constructor;
types.isExn = Exn.predicate;
types.exnMessage = function(exn) { return Exn.accessor(exn, 0); };
types.exnContMarks = function(exn) { return Exn.accessor(exn, 1); };
types.exnSetContMarks = function(exn, v) { Exn.mutator(exn, 1, v); };

var ExnFail = makeStructureType('exn:fail', 0, 0, Exn, false);
types.exnFail = ExnFail.constructor;
types.isExnFail = ExnFail.predicate;

var ExnFailContract = makeStructureType('exn:fail:contract', 0, 0, ExnFail, false);
types.exnFailContract = ExnFailContract.constructor;
types.isExnFailContract = ExnFailContract.predicate;


})();

//var types = require('./types');



// Represents the interpreter state.


var state = {};

(function () {

var DEBUG_ON = false;

var setDebug = function(v) {
    DEBUG_ON = v;
}

var debug = function(s) {
    if (DEBUG_ON) {
	sys.debug(s);
    }
}

var debugF = function(f_s) {
    if (DEBUG_ON) {
	sys.debug(f_s());
    }
}


var defaultPrintHook = function(thing) { 
    sys.print(types.toWrittenString(thing) + "\n"); };

var defaultDisplayHook = function(thing) { 
    sys.print(types.toDisplayedString(thing)); };

var defaultToplevelNodeHook = function() { 
    throw new Error("There is a software configuration error by the system's maintainer: the toplevel node has not been initialized yet.");
};



// Interpreter
var State = function() {
    this.v = [];       // value register
    this.vstack = [];  // value stack
    this.cstack = [];  // control stack
    this.heap = {};    // map from name to closures
    this.globals = {}; // map from string to types.GlobalBucket values
    this.hooks = { printHook: defaultPrintHook,
		   displayHook: defaultPrintHook,
		   toplevelNodeHook: defaultToplevelNodeHook };
};


// clearForEval: -> void
// Clear out the value register, the vstack, and the cstack.
State.prototype.clearForEval = function() {
    this.v = [];
    this.vstack = [];
    this.cstack = [];
};


State.prototype.save = function() {
    return { v: this.v,
	     vstack: this.vstack.slice(0),
	     cstack: this.cstack.slice(0),
	     heap: this.heap,
	     globals: this.globals,
             hooks: this.hooks };
};


State.prototype.restore = function(params) {
    this.v = params.v;
    this.vstack = params.vstack;
    this.cstack = params.cstack;
    this.heap = params.heap;
    this.globals = params.globals;
    this.hooks = params.hooks;
};



// Add the following form to the control stack.
State.prototype.pushControl = function(aForm) {
    this.cstack.push(aForm);
};


// Add several forms to the control stack in reverse order.
State.prototype.pushManyControls = function(forms) {
    for (var i = 0; i < forms.length; i++) {
	this.cstack.push(forms[forms.length-1-i]);
    }
};


// Returns true if the machine is in a stuck state.
State.prototype.isStuck = function() {
    return this.cstack.length === 0;
};

// Pop the last pushed form.
State.prototype.popControl = function() {
    if (this.cstack.length === 0) {
	throw new Error("cstack empty");
    }
    return this.cstack.pop();
};


// Push a value.
State.prototype.pushValue = function(aVal) {
    debugF(function(){ return "pushValue" + sys.inspect(aVal); } );
    this.vstack.push(aVal);
};


// Pop a value.
State.prototype.popValue = function() {
    debugF(function(){ return "popValue" });
    if (this.vstack.length === 0) {
 	throw new Error("vstack empty");
    }
    return this.vstack.pop();
};

// Push n undefined values onto the stack.
State.prototype.pushn = function(n) {
    debugF(function(){ return "PUSHN " + n } );
    for (var i = 0; i < n; i++) {
	this.vstack.push(types.UNDEFINED);
    }
};

// Pop n values from the stack.
State.prototype.popn = function(n) {
    debugF(function(){ return "POPN " + n } );
    for (var i = 0; i < n; i++) {
	if (this.vstack.length === 0) {
 	    throw new Error("vstack empty");
	}
	this.vstack.pop();
    }
};


// Peek at the nth value on the stack.
State.prototype.peekn = function(depth) {
    if (this.vstack.length - 1 - (depth || 0) < 0) {
	throw new Error("vstack not long enough");
    }
    return this.vstack[this.vstack.length - 1 - (depth || 0)];
};

// Set the nth value on the stack.
State.prototype.setn = function(depth, v) {
    this.vstack[this.vstack.length - 1 - (depth || 0)] = v;
};


// Reference an element of a prefix on the value stack.
State.prototype.refPrefix = function(depth, pos) {
    return this.vstack[this.vstack.length-1 - depth].ref(pos);
};


// Set an element of a prefix on the value stack.
State.prototype.setPrefix = function(depth, pos, v) {
    debug("setPrefix");
    this.vstack[this.vstack.length - 1 - depth].set(pos, v);
};




State.prototype.setPrintHook = function(printHook) {
    this.hooks['printHook'] = printHook;
};


State.prototype.getPrintHook = function() {
    return this.hooks['printHook'];
};


State.prototype.setDisplayHook = function(printHook) {
    this.hooks['displayHook'] = printHook;
};


State.prototype.getDisplayHook = function() {
    return this.hooks['displayHook'];
};


State.prototype.getToplevelNodeHook = function() {
    return this.hooks['toplevelNodeHook'];
};


State.prototype.setToplevelNodeHook = function(hook) {
    this.hooks['toplevelNodeHook'] = hook;
};




state.State = State;

})();

var world = {};

(function() {

//     var make_dash_effect_colon_none =
// 	(plt.Kernel.invokeModule("moby/runtime/effect-struct")
// 	 .EXPORTS['make-effect:none']);

    world.config = {};


    // augment: hash hash -> hash
    // Functionally extend a hashtable with another one.
    var augment = function(o, a) {
	var oo = {};
	for (var e in o) {
	    if (o.hasOwnProperty(e)) {
		oo[e] = o[e];
	    }
	}
	for (var e in a) {
	    if (a.hasOwnProperty(e)) {
		oo[e] = a[e];
	    }
	}
	return oo;
    }



    var WorldConfig = function() {
	// The following handler values are initially false until they're updated
	// by configuration.
      
	// A handler is a function:
	//     handler: world X Y ... -> Z


	this.vals = {
	    // changeWorld: (world -> world) -> void
	    // When called, this will update the world based on the
	    // updater passed to it.
	    changeWorld: false,

	    // shutdownWorld: -> void
	    // When called, this will shut down the world computation.
	    shutdownWorld: false,

	    // initialEffect: effect
	    // The initial effect to invoke when the world computation
	    // begins.
	    initialEffect: false,


	    // onRedraw: world -> scene
	    onRedraw: false,

	    // onDraw: world -> (sexpof dom)
	    onDraw: false,

	    // onDrawCss: world -> (sexpof css-style)
	    onDrawCss: false,


	    // tickDelay: number
	    tickDelay: false,
	    // onTick: world -> world
	    onTick: false,
	    // onTickEffect: world -> effect
	    onTickEffect: false,

	    // onKey: world key -> world
	    onKey: false,
	    // onKeyEffect: world key -> effect
	    onKeyEffect : false,

	    // onTilt: world number number number -> world
	    onTilt: false,
	    // onTiltEffect: world number number number -> effect
	    onTiltEffect: false,

	    // onAcceleration: world number number number -> world
	    onAcceleration: false,
	    // onAccelerationEffect: world number number number -> effect
	    onAccelerationEffect: false,

	    // onShake: world -> world
	    onShake: false,
	    // onShakeEffect: world -> effect
	    onShakeEffect: false,

	    // onSmsReceive: world -> world
	    onSmsReceive: false,
	    // onSmsReceiveEffect: world -> effect
	    onSmsReceiveEffect: false,

	    // onLocationChange: world number number -> world
	    onLocationChange : false,
	    // onLocationChangeEffect: world number number -> effect
	    onLocationChangeEffect: false,


	    // onAnnounce: world string X ... -> world
	    onAnnounce: false,
	    // onAnnounce: world string X ... -> effect
	    onAnnounceEffect: false,

	    // stopWhen: world -> boolean
	    stopWhen: false,
	    // stopWhenEffect: world -> effect
	    stopWhenEffect: false,



	    //////////////////////////////////////////////////////////////////////
	    // For universe game playing

	    // connectToGame: string
	    // Registers with some universe, given an identifier
	    // which is a URL to a Universe server.
	    connectToGame: false,
	    onGameStart: false,
	    onOpponentTurn: false,
	    onMyTurn: false,
	    afterMyTurn: false,
	    onGameFinish: false
	};
    }

  
    // WorldConfig.lookup: string -> handler
    // Looks up a value in the configuration.
    WorldConfig.prototype.lookup = function(key) {
//	plt.Kernel.check(key, plt.Kernel.isString, "WorldConfig.lookup", "string", 1);
	if (key in this.vals) {
	    return this.vals[key];
	} else {
	    throw Error("Can't find " + key + " in the configuration");
	}
    }
  


    // WorldConfig.updateAll: (hashof string handler) -> WorldConfig
    WorldConfig.prototype.updateAll = function(aHash) {
	var result = new WorldConfig();
	result.vals = augment(this.vals, aHash);
	return result;
    }

  
    world.config.WorldConfig = WorldConfig;

    // The following global variable CONFIG is mutated by either
    // big-bang from the regular world or the one in jsworld.
    world.config.CONFIG = new WorldConfig();


    // A handler is a function that consumes a config and produces a
    // config.


    //////////////////////////////////////////////////////////////////////

    var getNoneEffect = function() {
	throw new Error("getNoneEffect: We should not be calling effects!");
	//	return make_dash_effect_colon_none();
    }



    //////////////////////////////////////////////////////////////////////

    world.config.Kernel = world.config.Kernel || {};
    world.config.Kernel.getNoneEffect = getNoneEffect;


/*
    // makeSimplePropertyUpdater: (string (X -> boolean) string string) -> (X -> handler)
    var makeSimplePropertyUpdater = function(propertyName,
					     propertyPredicate,
					     propertyTypeName,
					     updaterName) {
	return function(val) {
	    plt.Kernel.check(val, propertyPredicate, updaterName, propertyTypeName, 1);
	    return addStringMethods(
		function(config) {
		    return config.updateAll({propertyName: val });
		}, updaterName);
	}
    };

    // connects to the game
    world.config.Kernel.connect_dash_to_dash_game = 
	makeSimplePropertyUpdater('connectToGame',
				  plt.Kernel.isString,
				  "string",
				  "connect-to-game");


    // Registers a handler for game-start events.
    world.config.Kernel.on_dash_game_dash_start = 
	makeSimplePropertyUpdater('onGameStart',
				  plt.Kernel.isFunction,
				  "function",
				  "on-game-start");


    // Registers a handler for opponent-turn events.
    world.config.Kernel.on_dash_opponent_dash_turn = 
	makeSimplePropertyUpdater('onOpponentTurn',
				  plt.Kernel.isFunction,
				  "function",
				  "on-opponent-turn");


    // Registers a handler for my turn.
    world.config.Kernel.on_dash_my_dash_turn = 
	makeSimplePropertyUpdater('onMyTurn',
				  plt.Kernel.isFunction,
				  "function",
				  "on-my-turn");

    // Register a handler after I make a move.
    world.config.Kernel.after_dash_my_dash_turn = 
	makeSimplePropertyUpdater('afterMyTurn',
				  plt.Kernel.isFunction,
				  "function",
				  "after-my-turn");

    world.config.Kernel.on_dash_game_dash_finish = 
	makeSimplePropertyUpdater('onGameFinish',
				  plt.Kernel.isFunction,
				  "function",
				  "on-game-finish");
*/



})();
// Feeds stimuli inputs into the world.  The functions here
// are responsible for converting to Scheme values.
//
// NOTE and WARNING: make sure to really do the coersions, even for
// strings.  Bad things happen otherwise, as in the sms stuff, where
// we're getting string-like values that aren't actually strings.



(function() {

    world.stimuli = {};

    var handlers = [];

    var doNothing = function() {};


    var StimuliHandler = function(config, caller, restarter) {
	this.config = config;
	this.caller = caller;
	this.restarter = restarter;
	handlers.push(this);
    };

//    StimuliHandler.prototype.failHandler = function(e) {
//	this.onShutdown();
//    	this.restarter(e);
//    };	

    // doStimuli: CPS( (world -> effect) (world -> world) -> void )
    //
    // Processes a stimuli by compute the effect and applying it, and
    // computing a new world to replace the old.
    StimuliHandler.prototype.doStimuli = function(computeEffectF, computeWorldF, restArgs, k) {
	var effectUpdaters = [];
	var that = this;
	try {
	    that.change(function(w, k2) {
		var args = [w].concat(restArgs);
		var doStimuliHelper = function() {
			if (computeWorldF) {
			    that.caller(computeWorldF, args, k2);
			} else {
			    k2(w);
			}
		};
		doStimuliHelper();
	    }, k);
 		// if (computeEffectF) {
// 		    that.caller(computeEffectF, [args],
// 			    function(effect) {
// 			    	effectUpdaters = applyEffect(effect);
// 				doStimuliHelper();
// 			    },
//	    		    this.failHandler);
// 		}
// 		else { doStimuliHelper(); }
// 	    },
// 	    function() {
// 	    	helpers.forEachK(effectUpdaters,
// 				 function(effect, k2) { that.change(effect, k2); },
// 				 function(e) { throw e; },
// 				 k);
// 	    });
	} catch (e) { 
//		if (console && console.log && e.stack) {
//			console.log(e.stack);
//		}
	    this.onShutdown();
	}
    }


    // Orientation change
    // args: [azimuth, pitch, roll]
    StimuliHandler.prototype.onTilt = function(args, k) {
	var onTilt = this.lookup("onTilt");
	var onTiltEffect = this.lookup("onTiltEffect");
	this.doStimuli(onTiltEffect, onTilt, helpers.map(args, flt), k);
    };


    // Accelerations
    // args: [x, y, z]
    StimuliHandler.prototype.onAcceleration = function(args, k) {
	var onAcceleration = this.lookup('onAcceleration');
	var onAccelerationEffect = this.lookup('onAccelerationEffect');
	this.doStimuli(onAccelerationEffect, onAcceleration, helpers.map(args, flt), k);
    };


    // Shakes
    // args: []
    StimuliHandler.prototype.onShake = function(args, k) {
	var onShake = this.lookup('onShake');
	var onShakeEffect = this.lookup('onShakeEffect');
	this.doStimuli(onShakeEffect, onShake, [], k);
    };


    // Sms receiving
    // args: [sender, message]
    StimuliHandler.prototype.onSmsReceive = function(args, k) {
	var onSmsReceive = this.lookup('onSmsReceive');
	var onSmsReceiveEffect = this.lookup('onSmsReceiveEffect');
	// IMPORTANT: must coerse to string by using x+"".  Do not use
	// toString(): it's not safe.
	this.doStimuli(onSmsReceiveEffect, onSmsReceive, [args[0]+"", args[1]+""], k);
    };


    // Locations
    // args: [lat, lng]
    StimuliHandler.prototype.onLocation = function(args, k) {
	var onLocationChange = this.lookup('onLocationChange');
	var onLocationChangeEffect = this.lookup('onLocationChangeEffect');
	this.doStimuli(onLocationChangeEffect, onLocationChange, helpers.map(args, flt), k);
    };



    // Keystrokes
    // args: [e]
    StimuliHandler.prototype.onKey = function(args, k) {
	// getKeyCodeName: keyEvent -> String
	// Given an event, try to get the name of the key.
	var getKeyCodeName = function(e) {
	    var code = e.charCode || e.keyCode;
	    var keyname;
	    if (code == 37) {
		keyname = "left";
	    } else if (code == 38) {
		keyname = "up";
	    } else if (code == 39) {
		keyname = "right";
	    } else if (code == 40) {
		keyname = "down";
	    } else if (code == 32) {
		keyname = "space";
	    } else if (code == 13) {
		keyname = "enter";
	    } else {
		keyname = String.fromCharCode(code); 
	    }
	    return keyname;
	}
	var keyname = getKeyCodeName(args[0]);
	var onKey = this.lookup('onKey');
	var onKeyEffect = this.lookup('onKeyEffect');
	this.doStimuli(onKeyEffect, onKey, [keyname], doNothing, k);
    };



    // Time ticks
    // args: []
    StimuliHandler.prototype.onTick = function(args, k) {
	var onTick = this.lookup('onTick');
	var onTickEffect = this.lookup('onTickEffect');
	this.doStimuli(onTickEffect, onTick, [], k);
    };



    // Announcements
    // args: [eventName, vals]
    StimuliHandler.prototype.onAnnounce = function(args, k) {
	var vals = args[1];
	var valsList = types.EMPTY;
	for (var i = 0; i < vals.length; i++) {
	    valsList = types.cons(vals[vals.length - i - 1], valsList);
	}

	var onAnnounce = this.lookup('onAnnounce');
	var onAnnounceEffect = this.lookup('onAnnounceEffect');	
	this.doStimuli(onAnnounce, onAnnounceEffect, [args[0], valsList], k);
    };



    // The shutdown stimuli: special case that forces a world computation to quit.
    // Also removes this instance from the list of handlers
    StimuliHandler.prototype.onShutdown = function() {	
	var index = handlers.indexOf(this);
	if (index != -1) {
		handlers.splice(index, 1);
	}

	var shutdownWorld = this.lookup('shutdownWorld');
	if (shutdownWorld) {
	    shutdownWorld();
	}
    };


    //////////////////////////////////////////////////////////////////////
    // Helpers
    var flt = jsnums.float;
    
    StimuliHandler.prototype.lookup = function(s) {
	return this.config.lookup(s);
    };

    StimuliHandler.prototype.change = function(f, k) {
	if (this.lookup('changeWorld')) {
	    this.lookup('changeWorld')(f, k);
	}
	else { k(); }
    };

    // applyEffect: compound-effect: (arrayof (world -> world))
    var applyEffect = function(e) {
	return world.Kernel.applyEffect(e);
    };

    var makeStimulusHandler = function(funName) {
	    return function() {
		var args = arguments;
		for (var i = 0; i < handlers.length; i++) {
			(handlers[i])[funName](args, doNothing);
		}
//		helpers.forEachK(handlers,
//				 function(h, k) { h[funName](args, k); },
//				 function(e) { throw e; },
//				 doNothing);
	    }
    };

    //////////////////////////////////////////////////////////////////////
    // Exports
    
    world.stimuli.StimuliHandler = StimuliHandler;

    world.stimuli.onTilt = makeStimulusHandler('onTilt');
    world.stimuli.onAcceleration = makeStimulusHandler('onAcceleration');
    world.stimuli.onShake = makeStimulusHandler('onShake');
    world.stimuli.onSmsReceive = makeStimulusHandler('onSmsReceive');
    world.stimuli.onLocation = makeStimulusHandler('onLocation');
    world.stimuli.onKey = makeStimulusHandler('onKey');
    world.stimuli.onTick = makeStimulusHandler('onTick');
    world.stimuli.onAnnounce = makeStimulusHandler('onAnnounce');

    world.stimuli.massShutdown = function() {
	    for (var i = 0; i < handlers.length; i++) {
		var shutdownWorld = handlers[i].lookup('shutdownWorld');
		if (shutdownWorld) {
		    shutdownWorld();
		}
	    }
	    handlers = [];
    };


})();



// Depends on kernel.js, world-config.js, effect-struct.js
(function() {
    
    world.Kernel = {};
    var worldListeners = [];
    var stopped;
    var timerInterval = false;


    // Inheritance from pg 168: Javascript, the Definitive Guide.
    var heir = function(p) {
	var f = function() {}
	f.prototype = p;
	return new f();
    }


    // clone: object -> object
    // Copies an object.  The new object should respond like the old
    // object, including to things like instanceof
    var clone = function(obj) {
	var C = function() {}
	C.prototype = obj;
	var c = new C();
	for (property in obj) {
	    if (obj.hasOwnProperty(property)) {
		c[property] = obj[property];
	    }
	}
	return c;
    };




    var announceListeners = [];
    world.Kernel.addAnnounceListener = function(listener) {
	announceListeners.push(listener);
    };
    world.Kernel.removeAnnounceListener = function(listener) {
	var idx = announceListeners.indexOf(listener);
	if (idx != -1) {
	    announceListeners.splice(idx, 1);
	}
    };
    world.Kernel.announce = function(eventName, vals) {
	for (var i = 0; i < announceListeners.length; i++) {
	    try {
		announceListeners[i](eventName, vals);
	    } catch (e) {}
	}
    };










    // changeWorld: world -> void
    // Changes the current world to newWorld.
    var changeWorld = function(newWorld) {
	world = newWorld;
	notifyWorldListeners();
    }


    // updateWorld: (world -> world) -> void
    // Public function: update the world, given the old state of the
    // world.
    world.Kernel.updateWorld = function(updater) {
	var newWorld = updater(world);
	changeWorld(newWorld);
    }


    world.Kernel.shutdownWorld = function() {
	stopped = true;
    };


    // notifyWorldListeners: -> void
    // Tells all of the world listeners that the world has changed.
    var notifyWorldListeners = function() {
	var i;
	for (i = 0; i < worldListeners.length; i++) {
	    worldListeners[i](world);
	}
    }

    // addWorldListener: (world -> void) -> void
    // Adds a new world listener: whenever the world is changed, the aListener
    // will be called with that new world.
    var addWorldListener = function(aListener) {
	worldListeners.push(aListener);
    }
    

    // getKeyCodeName: keyEvent -> String
    // Given an event, try to get the name of the key.
    var getKeyCodeName = function(e) {
	var code = e.charCode || e.keyCode;
	var keyname;
	if (code == 37) {
	    keyname = "left";
	} else if (code == 38) {
	    keyname = "up";
	} else if (code == 39) {
	    keyname = "right";
	} else if (code == 40) {
	    keyname = "down";
	} else {
	    keyname = String.fromCharCode(code); 
	}
	return keyname;
    }


    // resetWorld: -> void
    // Resets all of the world global values.
    var resetWorld = function() {
	if (timerInterval) {
	    clearInterval(timerInterval);
	    timerInterval = false;
	}
	stopped = false;
	worldListeners = [];
    }


    var getBigBangWindow = function(width, height) {
        if (window.document.getElementById("canvas") != undefined) {
	    return window;
	}

        var newWindow = window.open(
	    "big-bang.html",
	    "big-bang");
	//"toolbar=false,location=false,directories=false,status=false,menubar=false,width="+width+",height="+height);
	if (newWindow == null) { 
            throw new Error("Error: Not allowed to create a new window."); }

	return newWindow;
    }


    // bigBang: number number world (arrayof (-> void)) -> void
    // Begins a world computation.  The initial world is aWorld, and handlers
    // register other reactive functions (timer tick, key press, etc.) which
    // will change the world.
    world.Kernel.bigBang = function(width, height, aWorld, handlers) {
//	helpers.check(width, helpers.isNumber, "big-bang", "number", 1);
//	helpers.check(height, helpers.isNumber, "big-bang", "number", 2);
//	helpers.arrayEach(args, function(x, i) { 
//	    helpers.check(x, helpers.isFunction, "big-bang", "handler", i+4) });
	

	var i;
	var newWindow = getBigBangWindow(width, height);
	var canvas = 
	    newWindow.document.getElementById("canvas");
	canvas.width = jsnums.toFixnum(width);
	canvas.height = jsnums.toFixnum(height);

	resetWorld();

	var config = new world.config.WorldConfig();
	for (i = 0; i < handlers.length; i++) {
	    config = handlers[i](config);
	}
	config = config.updateAll({'changeWorld': world.Kernel.updateWorld,
				   'shutdownWorld': world.Kernel.shutdownWorld});
	world.config.CONFIG = config;


	if (config.lookup('onKey')) {
	    newWindow.onkeydown = function(e) {
		world.stimuli.onKey(e);
	    }
	}

	if (config.lookup('onRedraw')) {
	    addWorldListener(function (w) {
		var context = canvas.getContext("2d");
		uCaller(config.lookup('onRedraw'), [w],
			function (aScene) {
//				var aScene = config.lookup('onRedraw')([w]);
				aScene.render(context, 0, 0);
			});
	    });
	}

	addWorldListener(function (w) {
	    if (config.lookup('stopWhen')) {
		if (config.lookup('stopWhen')([w])) {
		    stopped = true;
		}
	    }
	});


 	if(config.lookup('onTick')) {
	    scheduleTimerTick(newWindow, config);
	}


 	changeWorld(aWorld);

	if (config.lookup('initialEffect')) {
	    var updaters = world.Kernel.applyEffect(
		config.lookup('initialEffect'));
	    for (var i = 0; i < updaters.length; i++) {
		if (! stopped) {
		    updateWorld(updaters);
		}
	    }
	}

    };

    // scheduleTimerTick: -> void
    // Repeatedly schedules an evaluation of the onTick until the program has stopped.
    var scheduleTimerTick = function(window, config) {
	timerInterval = window.setInterval(
	    function() {
		if (stopped) {
		    window.clearTimeout(timerInterval);
		    timerInterval = false;
		}
		else {
		    world.stimuli.onTick();
		}
	    },
	    config.lookup('tickDelay'));
    }




    // Base class for all images.
    var BaseImage = function(pinholeX, pinholeY) {
	this.pinholeX = pinholeX;
	this.pinholeY = pinholeY;
    }
    world.Kernel.BaseImage = BaseImage;


    var isImage = function(thing) {
	return (thing !== null &&
		thing !== undefined &&
		thing instanceof BaseImage);
    }



    BaseImage.prototype.updatePinhole = function(x, y) {
	var aCopy = clone(this);
	aCopy.pinholeX = x;
	aCopy.pinholeY = y;
	return aCopy;
    };



    // render: context fixnum fixnum: -> void
    // Render the image, where the upper-left corner of the image is drawn at
    // (x, y).
    BaseImage.prototype.render = function(ctx, x, y) {
	    throw new Error('BaseImage.render unimplemented!');
//	plt.Kernel.throwMobyError(
//	    false, 
//	    "make-moby-error-type:generic-runtime-error", 
//	    "Unimplemented method render");
    };


    // makeCanvas: number number -> canvas
    // Constructs a canvas object of a particular width and height.
    world.Kernel.makeCanvas = function(width, height) {
	var canvas = document.createElement("canvas");
 	canvas.width = width;
 	canvas.height = height;
 	canvas.style.width = canvas.width + "px";
 	canvas.style.height = canvas.height + "px";
	
	// KLUDGE: IE compatibility uses /js/excanvas.js, and dynamic
	// elements must be marked this way.
	if (window && typeof window.G_vmlCanvasManager != 'undefined') {
	    canvas.style.display = 'none';
	    document.body.appendChild(canvas);
	    canvas = window.G_vmlCanvasManager.initElement(canvas);
	    document.body.removeChild(canvas);
	    canvas.style.display = '';
	}
	return canvas;
    };


    BaseImage.prototype.toDomNode = function(cache) {
	var that = this;
	var width = that.getWidth();
	var height = that.getHeight();
	var canvas = world.Kernel.makeCanvas(width, height);

	// KLUDGE: some of the rendering functions depend on a context
	// where the canvas is attached to the DOM tree.  So we temporarily
	// make it invisible, attach it to the tree, render, and then rip it out
	// again.
	var oldDisplay = canvas.style.display;
	canvas.style.display = 'none';
	document.body.appendChild(canvas);
 	var ctx = canvas.getContext("2d");
	that.render(ctx, 0, 0) 
	document.body.removeChild(canvas);
	canvas.style.display = '';

	return canvas;
    };
    BaseImage.prototype.toWrittenString = function(cache) { return "<image>"; }
    BaseImage.prototype.toDisplayedString = function(cache) { return "<image>"; }

    BaseImage.prototype.isEqual = function(other, aUnionFind) {
	    return (this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY);
    };



    
    // isScene: any -> boolean
    // Produces true when x is a scene.
    var isScene = function(x) {
	return ((x != undefined) && (x != null) && (x instanceof SceneImage));
    };

    // SceneImage: primitive-number primitive-number (listof image) -> Scene
    var SceneImage = function(width, height, children) {
	BaseImage.call(this, 0, 0);
	this.width = width;
	this.height = height;
	this.children = children;
    }
    SceneImage.prototype = heir(BaseImage.prototype);


    // add: image primitive-number primitive-number -> Scene
    SceneImage.prototype.add = function(anImage, x, y) {
	return new SceneImage(this.width, 
			      this.height,
			      this.children.concat([[anImage, 
						     x - anImage.pinholeX, 
						     y - anImage.pinholeY]]));
    };

    // render: 2d-context primitive-number primitive-number -> void
    SceneImage.prototype.render = function(ctx, x, y) {
	var i;
	var childImage, childX, childY;
	// Clear the scene.
	ctx.clearRect(x, y, this.width, this.height);
	// Then ask every object to render itself.
	for(i = 0; i < this.children.length; i++) {
	    childImage = this.children[i][0];
	    childX = this.children[i][1];
	    childY = this.children[i][2];
	    ctx.save();
	    childImage.render(ctx, childX + x, childY + y);
	    ctx.restore();
	}
    };

    SceneImage.prototype.getWidth = function() {
	return this.width;
    };

    SceneImage.prototype.getHeight = function() {
	return this.height;
    };

    SceneImage.prototype.isEqual = function(other, aUnionFind) {
	    if (!(other instanceof SceneImage) &&
		this.pinholeX != other.pinholeX &&
		this.pinholeY != other.pinholeY &&
		this.width != other.width ||
		this.height != other.height ||
		this.children.length != other.children.length) {
		    return false;
	    }

	    for (var i = 0; i < this.children.length; i++) {
		    if ( !types.isEqual(this.children[i], other.children[i], aUnionFind) ) {
			    return false;
		    }
	    }
	    return true;
    };


    //////////////////////////////////////////////////////////////////////

    
    var FileImage = function(src, rawImage) {
	BaseImage.call(this, 0, 0);
	var self = this;
	this.src = src;
	this.isLoaded = false;
	if (rawImage && rawImage.complete) { 
	    this.img = rawImage;
	    this.isLoaded = true;
	    this.pinholeX = self.img.width / 2;
	    this.pinholeY = self.img.height / 2;
	} else {
	    // fixme: we may want to do something blocking here for
	    // onload, since we don't know at this time what the file size
	    // should be, nor will drawImage do the right thing until the
	    // file is loaded.
	    this.img = new Image();
	    this.img.onload = function() {
		self.isLoaded = true;
		self.pinholeX = self.img.width / 2;
		self.pinholeY = self.img.height / 2;
	    };
	    this.img.onerror = function(e) {
		self.img.onerror = "";
		self.img.src = "http://www.wescheme.org/images/broken.png";
	    }
	    this.img.src = src;
	}
    }
    FileImage.prototype = heir(BaseImage.prototype);
//    world.Kernel.FileImage = FileImage;

    
    var imageCache = {};
    FileImage.makeInstance = function(path) {
	if (! (path in imageCache)) {
	    imageCache[path] = new FileImage(path);
	} 
	return imageCache[path];
    };
    
    FileImage.installInstance = function(path, rawImage) {
	imageCache[path] = new FileImage(path, rawImage);
    };
    
    FileImage.installBrokenImage = function(path) {
	imageCache[path] = new TextImage("Unable to load " + path, 10, 
					 colorDb.get("red"));
    };



    FileImage.prototype.render = function(ctx, x, y) {
	ctx.drawImage(this.img, x, y);
    };


    FileImage.prototype.getWidth = function() {
	return this.img.width;
    };


    FileImage.prototype.getHeight = function() {
	return this.img.height;
    };

    // Override toDomNode: we don't need a full-fledged canvas here.
    FileImage.prototype.toDomNode = function(cache) {
	return this.img.cloneNode(true);
    };

    FileImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof FileImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.src == other.src &&
		    types.isEqual(this.img, other.img, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////


    // OverlayImage: image image -> image
    // Creates an image that overlays img1 on top of the
    // other image.
    var OverlayImage = function(img1, img2, shiftX, shiftY) {
	var deltaX = img1.pinholeX - img2.pinholeX + shiftX;
	var deltaY = img1.pinholeY - img2.pinholeY + shiftY;
	var left = Math.min(0, deltaX);
	var top = Math.min(0, deltaY);
	var right = Math.max(deltaX + img2.getWidth(), 
			     img1.getWidth());
	var bottom = Math.max(deltaY + img2.getHeight(),
			      img1.getHeight());

	BaseImage.call(this,
		       img1.pinholeX - left,
		       img1.pinholeY - top);
	this.img1 = img1;
	this.img2 = img2;
	this.width = right - left;
	this.height = bottom - top;

	this.img1Dx = -left;
	this.img1Dy = -top;
	this.img2Dx = deltaX - left;	
	this.img2Dy = deltaY - top;
    };

    OverlayImage.prototype = heir(BaseImage.prototype);
    
    
    OverlayImage.prototype.render = function(ctx, x, y) {
	this.img2.render(ctx, x + this.img2Dx, y + this.img2Dy);
	this.img1.render(ctx, x + this.img1Dx, y + this.img1Dy);
    };

    
    OverlayImage.prototype.getWidth = function() {
	return this.width;
    };
    
    OverlayImage.prototype.getHeight = function() {
	return this.height;
    };

    OverlayImage.prototype.isEqual = function(other, aUnionFind) {
	    return ( other instanceof OverlayImage &&
		     this.pinholeX == other.pinholeX &&
		     this.pinholeY == other.pinholeY &&
		     this.width == other.width &&
		     this.height == other.height &&
		     this.img1Dx == other.img1Dx &&
		     this.img1Dy == other.img1Dy &&
		     this.img2Dx == other.img2Dx &&
		     this.img2Dy == other.img2Dy &&
		     types.isEqual(this.img1, other.img1, aUnionFind) &&
		     types.isEqual(this.img2, other.img2, aUnionFind) );
    };
    

    //////////////////////////////////////////////////////////////////////



    var colorString = function(aColor) {
	return ("rgb(" + 
		types.colorRed(aColor) + "," +
		types.colorGreen(aColor) + ", " + 
		types.colorBlue(aColor) + ")");
    };



    var RectangleImage = function(width, height, style, color) {
	BaseImage.call(this, width/2, height/2);
	this.width = width;
	this.height = height;
	this.style = style;
	this.color = color;
    };
    RectangleImage.prototype = heir(BaseImage.prototype);


    RectangleImage.prototype.render = function(ctx, x, y) {
	if (this.style.toString().toLowerCase() == "outline") {
	    ctx.strokeStyle = colorString(this.color);
	    ctx.strokeRect(x, y, this.width, this.height);
	} else {
	    ctx.fillStyle = colorString(this.color);
	    ctx.fillRect(x, y, this.width, this.height);
	}
    };

    RectangleImage.prototype.getWidth = function() {
	return this.width;
    };


    RectangleImage.prototype.getHeight = function() {
	return this.height;
    };

    RectangleImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof RectangleImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.width == other.width &&
		    this.height == other.height &&
		    this.style == other.style &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    
    var TextImage = function(msg, size, color) {
	BaseImage.call(this, 0, 0);
	this.msg = msg;
	this.size = size;
	this.color = color;
	this.font = this.size + "px Optimer";

	
	var canvas = world.Kernel.makeCanvas(0, 0);
 	var ctx = canvas.getContext("2d");
	ctx.font = this.font;
	var metrics = ctx.measureText(msg);

	this.width = metrics.width;
	// KLUDGE: I don't know how to get at the height.
	this.height = ctx.measureText("m").width + 20;

    }

    TextImage.prototype = heir(BaseImage.prototype);

    TextImage.prototype.render = function(ctx, x, y) {
	ctx.save();
	ctx.font = this.font;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillStyle = colorString(this.color);
	ctx.fillText(this.msg, x, y);
	ctx.restore();
    };
    
    TextImage.prototype.getWidth = function() {
	return this.width;
    };


    TextImage.prototype.getHeight = function() {
	return this.height;
    };

    TextImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof TextImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.msg == other.msg &&
		    this.size == other.size &&
		    types.isEqual(this.color, other.color, aUnionFind) &&
		    this.font == other.font);
    };


    //////////////////////////////////////////////////////////////////////

    var CircleImage = function(radius, style, color) {
	BaseImage.call(this, radius, radius);
	this.radius = radius;
	this.style = style;
	this.color = color;
    }
    CircleImage.prototype = heir(BaseImage.prototype);

    CircleImage.prototype.render = function(ctx, x, y) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + this.radius,
		y + this.radius,
		this.radius, 0, 2*Math.PI, false);
	if (this.style.toString().toLowerCase() == "outline") {
	    ctx.strokeStyle = colorString(this.color);
	    ctx.stroke();
	} else {
	    ctx.fillStyle = colorString(this.color);
	    ctx.fill();
	}
	ctx.closePath();
	ctx.restore();
    };
    
    CircleImage.prototype.getWidth = function() {
	return this.radius * 2;
    };

    CircleImage.prototype.getHeight = function() {
	return this.radius * 2;
    };

    CircleImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof CircleImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.radius == other.radius &&
		    this.style == other.style &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };



    //////////////////////////////////////////////////////////////////////


    // StarImage: fixnum fixnum fixnum color -> image
    var StarImage = function(points, outer, inner, style, color) {
	BaseImage.call(this,
		       Math.max(outer, inner),
		       Math.max(outer, inner));
	this.points = points;
	this.outer = outer;
	this.inner = inner;
	this.style = style;
	this.color = color;

	this.radius = Math.max(this.inner, this.outer);
    };

    StarImage.prototype = heir(BaseImage.prototype);

    var oneDegreeAsRadian = Math.PI / 180;

    // render: context fixnum fixnum -> void
    // Draws a star on the given context.
    // Most of this code here adapted from the Canvas tutorial at:
    // http://developer.apple.com/safari/articles/makinggraphicswithcanvas.html
    StarImage.prototype.render = function(ctx, x, y) {
	ctx.save();
	ctx.beginPath();
	for( var pt = 0; pt < (this.points * 2) + 1; pt++ ) {
	    var rads = ( ( 360 / (2 * this.points) ) * pt ) * oneDegreeAsRadian - 0.5;
	    var radius = ( pt % 2 == 1 ) ? this.outer : this.inner;
	    ctx.lineTo(x + this.radius + ( Math.sin( rads ) * radius ), 
		       y + this.radius + ( Math.cos( rads ) * radius ) );
	}
	if (this.style.toString().toLowerCase() == "outline") {
	    ctx.strokeStyle = colorString(this.color);
	    ctx.stroke();
	} else {
	    ctx.fillStyle = colorString(this.color);
	    ctx.fill();
	}
	ctx.closePath();
	ctx.restore();
    };
    
    // getWidth: -> fixnum
    StarImage.prototype.getWidth = function() {
	return this.radius * 2;
    };


    // getHeight: -> fixnum
    StarImage.prototype.getHeight = function() {
	return this.radius * 2;
    };

    StarImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof StarImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.points == other.points &&
		    this.outer == other.outer &&
		    this.inner == other.inner &&
		    this.style == other.style &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };




    //////////////////////////////////////////////////////////////////////
    //Triangle
    ///////
    var TriangleImage = function(side, style, color) {
	BaseImage.call(this, side, side);
	this.side = side;
	this.style = style;
	this.color = color;
    }
    TriangleImage.prototype = heir(BaseImage.prototype);


    TriangleImage.prototype.render = function(ctx, x, y) {
	var width = this.getWidth();
	var height = this.getHeight();

	ctx.beginPath();
	ctx.moveTo(x + this.side/2, y);
	ctx.lineTo(x + width, y + height);
	ctx.lineTo(x, y + height);
	ctx.closePath();

	if (this.style.toString().toLowerCase() == "outline") {
	    ctx.strokeStyle = colorString(this.color);
	    ctx.stroke();
	}
	else {
	    ctx.fillStyle = colorString(this.color);
	    ctx.fill();
	}
    };
    


    TriangleImage.prototype.getWidth = function() {
	return this.side;
    };

    TriangleImage.prototype.getHeight = function() {
	return Math.ceil(this.side * Math.sqrt(3) / 2);
    };

    TriangleImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof TriangleImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.side == other.side &&
		    this.style == other.style &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };



    //////////////////////////////////////////////////////////////////////
    //Ellipse 
    var EllipseImage = function(width, height, style, color) {
	BaseImage.call(this, Math.floor(width/2), Math.floor(height/2));
	this.width = width;
	this.height = height;
	this.style = style;
	this.color = color;
    }

    EllipseImage.prototype = heir(BaseImage.prototype);

    
    EllipseImage.prototype.render = function(ctx, aX, aY) {
	ctx.save();
	// Most of this code is taken from:
	// http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
        var hB = (this.width / 2) * .5522848,
            vB = (this.height / 2) * .5522848,
            eX = aX + this.width,
            eY = aY + this.height,
            mX = aX + this.width / 2,
            mY = aY + this.height / 2;
        ctx.moveTo(aX, mY);
        ctx.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
        ctx.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
        ctx.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        ctx.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
        ctx.closePath();
	if (this.style.toString().toLowerCase() == "outline") {
 	    ctx.strokeStyle = colorString(this.color);
	    ctx.stroke();
	}
	else {
 	    ctx.fillStyle = colorString(this.color);
	    ctx.fill();
	}
	ctx.restore();
    };
    
    EllipseImage.prototype.getWidth = function() {
	return this.width;
    };

    EllipseImage.prototype.getHeight = function() {
	return this.height;
    };

    EllipseImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof EllipseImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.width == other.width &&
		    this.height == other.height &&
		    this.style == other.style &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };


    //////////////////////////////////////////////////////////////////////
    //Line
    var LineImage = function(x, y, color) {
	BaseImage.call(this, 0, 0);
	this.x = x;
	this.y = y;
	this.color = color;
    }

    LineImage.prototype = heir(BaseImage.prototype);

    
    LineImage.prototype.render = function(ctx, xstart, ystart) {
	ctx.save();
	ctx.moveTo(xstart, ystart);
	ctx.lineTo((this.x + xstart),
		   (this.y + ystart));
	ctx.strokeStyle = colorString(this.color);
	ctx.stroke();
	ctx.restore();
    };
    

    LineImage.prototype.getWidth = function() {
	return (this.x + 1);
    };
    

    LineImage.prototype.getHeight = function() {
	return (this.y + 1);
    };

    LineImage.prototype.isEqual = function(other, aUnionFind) {
	    return (other instanceof LineImage &&
		    this.pinholeX == other.pinholeX &&
		    this.pinholeY == other.pinholeY &&
		    this.x == other.x &&
		    this.y == other.y &&
		    types.isEqual(this.color, other.color, aUnionFind));
    };





    //////////////////////////////////////////////////////////////////////
    // Effects

    /**
     * applyEffect: compound-effect -> (arrayof (world -> world))

     applyEffect applies all of the effects

     @param aCompEffect a compound effect is either a scheme list of
     compound effects or a single primitive effect */
    world.Kernel.applyEffect = function(aCompEffect) {
	    throw new Error('applyEffect: we are not currently using effects!');
/*
	if ( types.isEmpty(aCompEffect) ) {
    	    // Do Nothing
	} else if ( types.isPair(aCompEffect) ) {
    	    var results = world.Kernel.applyEffect(aCompEffect.first());
    	    return results.concat(world.Kernel.applyEffect(aCompEffect.rest()));
	} else {
	    var newResult = aCompEffect.run();
	    if (newResult) {
	    	return newResult;
	    }
	}
	return [];
*/
    }

    //////////////////////////////////////////////////////////////////////////




    // Color database
    var ColorDb = function() {
	this.colors = {};
    }
    ColorDb.prototype.put = function(name, color) {
	this.colors[name] = color;
    };

    ColorDb.prototype.get = function(name) {
	return this.colors[name.toString().toUpperCase()];
    };


    // FIXME: update toString to handle the primitive field values.

    var colorDb = new ColorDb();
    colorDb.put("ORANGE", types.color(255, 165, 0));
    colorDb.put("RED", types.color(255, 0, 0));
    colorDb.put("ORANGERED", types.color(255, 69, 0));
    colorDb.put("TOMATO", types.color(255, 99, 71));
    colorDb.put("DARKRED", types.color(139, 0, 0));
    colorDb.put("RED", types.color(255, 0, 0));
    colorDb.put("FIREBRICK", types.color(178, 34, 34));
    colorDb.put("CRIMSON", types.color(220, 20, 60));
    colorDb.put("DEEPPINK", types.color(255, 20, 147));
    colorDb.put("MAROON", types.color(176, 48, 96));
    colorDb.put("INDIAN RED", types.color(205, 92, 92));
    colorDb.put("INDIANRED", types.color(205, 92, 92));
    colorDb.put("MEDIUM VIOLET RED", types.color(199, 21, 133));
    colorDb.put("MEDIUMVIOLETRED", types.color(199, 21, 133));
    colorDb.put("VIOLET RED", types.color(208, 32, 144));
    colorDb.put("VIOLETRED", types.color(208, 32, 144));
    colorDb.put("LIGHTCORAL", types.color(240, 128, 128));
    colorDb.put("HOTPINK", types.color(255, 105, 180));
    colorDb.put("PALEVIOLETRED", types.color(219, 112, 147));
    colorDb.put("LIGHTPINK", types.color(255, 182, 193));
    colorDb.put("ROSYBROWN", types.color(188, 143, 143));
    colorDb.put("PINK", types.color(255, 192, 203));
    colorDb.put("ORCHID", types.color(218, 112, 214));
    colorDb.put("LAVENDERBLUSH", types.color(255, 240, 245));
    colorDb.put("SNOW", types.color(255, 250, 250));
    colorDb.put("CHOCOLATE", types.color(210, 105, 30));
    colorDb.put("SADDLEBROWN", types.color(139, 69, 19));
    colorDb.put("BROWN", types.color(132, 60, 36));
    colorDb.put("DARKORANGE", types.color(255, 140, 0));
    colorDb.put("CORAL", types.color(255, 127, 80));
    colorDb.put("SIENNA", types.color(160, 82, 45));
    colorDb.put("ORANGE", types.color(255, 165, 0));
    colorDb.put("SALMON", types.color(250, 128, 114));
    colorDb.put("PERU", types.color(205, 133, 63));
    colorDb.put("DARKGOLDENROD", types.color(184, 134, 11));
    colorDb.put("GOLDENROD", types.color(218, 165, 32));
    colorDb.put("SANDYBROWN", types.color(244, 164, 96));
    colorDb.put("LIGHTSALMON", types.color(255, 160, 122));
    colorDb.put("DARKSALMON", types.color(233, 150, 122));
    colorDb.put("GOLD", types.color(255, 215, 0));
    colorDb.put("YELLOW", types.color(255, 255, 0));
    colorDb.put("OLIVE", types.color(128, 128, 0));
    colorDb.put("BURLYWOOD", types.color(222, 184, 135));
    colorDb.put("TAN", types.color(210, 180, 140));
    colorDb.put("NAVAJOWHITE", types.color(255, 222, 173));
    colorDb.put("PEACHPUFF", types.color(255, 218, 185));
    colorDb.put("KHAKI", types.color(240, 230, 140));
    colorDb.put("DARKKHAKI", types.color(189, 183, 107));
    colorDb.put("MOCCASIN", types.color(255, 228, 181));
    colorDb.put("WHEAT", types.color(245, 222, 179));
    colorDb.put("BISQUE", types.color(255, 228, 196));
    colorDb.put("PALEGOLDENROD", types.color(238, 232, 170));
    colorDb.put("BLANCHEDALMOND", types.color(255, 235, 205));
    colorDb.put("MEDIUM GOLDENROD", types.color(234, 234, 173));
    colorDb.put("MEDIUMGOLDENROD", types.color(234, 234, 173));
    colorDb.put("PAPAYAWHIP", types.color(255, 239, 213));
    colorDb.put("MISTYROSE", types.color(255, 228, 225));
    colorDb.put("LEMONCHIFFON", types.color(255, 250, 205));
    colorDb.put("ANTIQUEWHITE", types.color(250, 235, 215));
    colorDb.put("CORNSILK", types.color(255, 248, 220));
    colorDb.put("LIGHTGOLDENRODYELLOW", types.color(250, 250, 210));
    colorDb.put("OLDLACE", types.color(253, 245, 230));
    colorDb.put("LINEN", types.color(250, 240, 230));
    colorDb.put("LIGHTYELLOW", types.color(255, 255, 224));
    colorDb.put("SEASHELL", types.color(255, 245, 238));
    colorDb.put("BEIGE", types.color(245, 245, 220));
    colorDb.put("FLORALWHITE", types.color(255, 250, 240));
    colorDb.put("IVORY", types.color(255, 255, 240));
    colorDb.put("GREEN", types.color(0, 255, 0));
    colorDb.put("LAWNGREEN", types.color(124, 252, 0));
    colorDb.put("CHARTREUSE", types.color(127, 255, 0));
    colorDb.put("GREEN YELLOW", types.color(173, 255, 47));
    colorDb.put("GREENYELLOW", types.color(173, 255, 47));
    colorDb.put("YELLOW GREEN", types.color(154, 205, 50));
    colorDb.put("YELLOWGREEN", types.color(154, 205, 50));
    colorDb.put("MEDIUM FOREST GREEN", types.color(107, 142, 35));
    colorDb.put("OLIVEDRAB", types.color(107, 142, 35));
    colorDb.put("MEDIUMFORESTGREEN", types.color(107, 142, 35));
    colorDb.put("DARK OLIVE GREEN", types.color(85, 107, 47));
    colorDb.put("DARKOLIVEGREEN", types.color(85, 107, 47));
    colorDb.put("DARKSEAGREEN", types.color(143, 188, 139));
    colorDb.put("LIME", types.color(0, 255, 0));
    colorDb.put("DARK GREEN", types.color(0, 100, 0));
    colorDb.put("DARKGREEN", types.color(0, 100, 0));
    colorDb.put("LIME GREEN", types.color(50, 205, 50));
    colorDb.put("LIMEGREEN", types.color(50, 205, 50));
    colorDb.put("FOREST GREEN", types.color(34, 139, 34));
    colorDb.put("FORESTGREEN", types.color(34, 139, 34));
    colorDb.put("SPRING GREEN", types.color(0, 255, 127));
    colorDb.put("SPRINGGREEN", types.color(0, 255, 127));
    colorDb.put("MEDIUM SPRING GREEN", types.color(0, 250, 154));
    colorDb.put("MEDIUMSPRINGGREEN", types.color(0, 250, 154));
    colorDb.put("SEA GREEN", types.color(46, 139, 87));
    colorDb.put("SEAGREEN", types.color(46, 139, 87));
    colorDb.put("MEDIUM SEA GREEN", types.color(60, 179, 113));
    colorDb.put("MEDIUMSEAGREEN", types.color(60, 179, 113));
    colorDb.put("AQUAMARINE", types.color(112, 216, 144));
    colorDb.put("LIGHTGREEN", types.color(144, 238, 144));
    colorDb.put("PALE GREEN", types.color(152, 251, 152));
    colorDb.put("PALEGREEN", types.color(152, 251, 152));
    colorDb.put("MEDIUM AQUAMARINE", types.color(102, 205, 170));
    colorDb.put("MEDIUMAQUAMARINE", types.color(102, 205, 170));
    colorDb.put("TURQUOISE", types.color(64, 224, 208));
    colorDb.put("LIGHTSEAGREEN", types.color(32, 178, 170));
    colorDb.put("MEDIUM TURQUOISE", types.color(72, 209, 204));
    colorDb.put("MEDIUMTURQUOISE", types.color(72, 209, 204));
    colorDb.put("HONEYDEW", types.color(240, 255, 240));
    colorDb.put("MINTCREAM", types.color(245, 255, 250));
    colorDb.put("ROYALBLUE", types.color(65, 105, 225));
    colorDb.put("DODGERBLUE", types.color(30, 144, 255));
    colorDb.put("DEEPSKYBLUE", types.color(0, 191, 255));
    colorDb.put("CORNFLOWERBLUE", types.color(100, 149, 237));
    colorDb.put("STEEL BLUE", types.color(70, 130, 180));
    colorDb.put("STEELBLUE", types.color(70, 130, 180));
    colorDb.put("LIGHTSKYBLUE", types.color(135, 206, 250));
    colorDb.put("DARK TURQUOISE", types.color(0, 206, 209));
    colorDb.put("DARKTURQUOISE", types.color(0, 206, 209));
    colorDb.put("CYAN", types.color(0, 255, 255));
    colorDb.put("AQUA", types.color(0, 255, 255));
    colorDb.put("DARKCYAN", types.color(0, 139, 139));
    colorDb.put("TEAL", types.color(0, 128, 128));
    colorDb.put("SKY BLUE", types.color(135, 206, 235));
    colorDb.put("SKYBLUE", types.color(135, 206, 235));
    colorDb.put("CADET BLUE", types.color(96, 160, 160));
    colorDb.put("CADETBLUE", types.color(95, 158, 160));
    colorDb.put("DARK SLATE GRAY", types.color(47, 79, 79));
    colorDb.put("DARKSLATEGRAY", types.color(47, 79, 79));
    colorDb.put("LIGHTSLATEGRAY", types.color(119, 136, 153));
    colorDb.put("SLATEGRAY", types.color(112, 128, 144));
    colorDb.put("LIGHT STEEL BLUE", types.color(176, 196, 222));
    colorDb.put("LIGHTSTEELBLUE", types.color(176, 196, 222));
    colorDb.put("LIGHT BLUE", types.color(173, 216, 230));
    colorDb.put("LIGHTBLUE", types.color(173, 216, 230));
    colorDb.put("POWDERBLUE", types.color(176, 224, 230));
    colorDb.put("PALETURQUOISE", types.color(175, 238, 238));
    colorDb.put("LIGHTCYAN", types.color(224, 255, 255));
    colorDb.put("ALICEBLUE", types.color(240, 248, 255));
    colorDb.put("AZURE", types.color(240, 255, 255));
    colorDb.put("MEDIUM BLUE", types.color(0, 0, 205));
    colorDb.put("MEDIUMBLUE", types.color(0, 0, 205));
    colorDb.put("DARKBLUE", types.color(0, 0, 139));
    colorDb.put("MIDNIGHT BLUE", types.color(25, 25, 112));
    colorDb.put("MIDNIGHTBLUE", types.color(25, 25, 112));
    colorDb.put("NAVY", types.color(36, 36, 140));
    colorDb.put("BLUE", types.color(0, 0, 255));
    colorDb.put("INDIGO", types.color(75, 0, 130));
    colorDb.put("BLUE VIOLET", types.color(138, 43, 226));
    colorDb.put("BLUEVIOLET", types.color(138, 43, 226));
    colorDb.put("MEDIUM SLATE BLUE", types.color(123, 104, 238));
    colorDb.put("MEDIUMSLATEBLUE", types.color(123, 104, 238));
    colorDb.put("SLATE BLUE", types.color(106, 90, 205));
    colorDb.put("SLATEBLUE", types.color(106, 90, 205));
    colorDb.put("PURPLE", types.color(160, 32, 240));
    colorDb.put("DARK SLATE BLUE", types.color(72, 61, 139));
    colorDb.put("DARKSLATEBLUE", types.color(72, 61, 139));
    colorDb.put("DARKVIOLET", types.color(148, 0, 211));
    colorDb.put("DARK ORCHID", types.color(153, 50, 204));
    colorDb.put("DARKORCHID", types.color(153, 50, 204));
    colorDb.put("MEDIUMPURPLE", types.color(147, 112, 219));
    colorDb.put("CORNFLOWER BLUE", types.color(68, 64, 108));
    colorDb.put("MEDIUM ORCHID", types.color(186, 85, 211));
    colorDb.put("MEDIUMORCHID", types.color(186, 85, 211));
    colorDb.put("MAGENTA", types.color(255, 0, 255));
    colorDb.put("FUCHSIA", types.color(255, 0, 255));
    colorDb.put("DARKMAGENTA", types.color(139, 0, 139));
    colorDb.put("VIOLET", types.color(238, 130, 238));
    colorDb.put("PLUM", types.color(221, 160, 221));
    colorDb.put("LAVENDER", types.color(230, 230, 250));
    colorDb.put("THISTLE", types.color(216, 191, 216));
    colorDb.put("GHOSTWHITE", types.color(248, 248, 255));
    colorDb.put("WHITE", types.color(255, 255, 255));
    colorDb.put("WHITESMOKE", types.color(245, 245, 245));
    colorDb.put("GAINSBORO", types.color(220, 220, 220));
    colorDb.put("LIGHT GRAY", types.color(211, 211, 211));
    colorDb.put("LIGHTGRAY", types.color(211, 211, 211));
    colorDb.put("SILVER", types.color(192, 192, 192));
    colorDb.put("GRAY", types.color(190, 190, 190));
    colorDb.put("DARK GRAY", types.color(169, 169, 169));
    colorDb.put("DARKGRAY", types.color(169, 169, 169));
    colorDb.put("DIM GRAY", types.color(105, 105, 105));
    colorDb.put("DIMGRAY", types.color(105, 105, 105));
    colorDb.put("BLACK", types.color(0, 0, 0));





    ///////////////////////////////////////////////////////////////
    // Exports

    world.Kernel.isImage = isImage;
    world.Kernel.isScene = isScene;
    world.Kernel.isColor = function(thing) {
	return (types.isColor(thing) ||
		((types.isString(thing) || types.isSymbol(thing)) &&
		 typeof(colorDb.get(thing)) != 'undefined'));
    };
    world.Kernel.colorDb = colorDb;

    world.Kernel.sceneImage = function(width, height, children) {
	   return new SceneImage(width, height, children);
    };
    world.Kernel.circleImage = function(radius, style, color) {
	    return new CircleImage(radius, style, color);
    };
    world.Kernel.starImage = function(points, outer, inner, style, color) {
	    return new StarImage(points, outer, inner, style, color);
    };
    world.Kernel.rectangleImage = function(width, height, style, color) {
	    return new RectangleImage(width, height, style, color);
    };
    world.Kernel.triangleImage = function(side, style, color) {
	    return new TriangleImage(side, style, color);
    };
    world.Kernel.ellipseImage = function(width, height, style, color) {
	    return new EllipseImage(width, height, style, color);
    };
    world.Kernel.lineImage = function(x, y, color) {
	    return new LineImage(x, y, color);
    };
    world.Kernel.overlayImage = function(img1, img2, shiftX, shiftY) {
	    return new OverlayImage(img1, img2, shiftX, shiftY);
    };
    world.Kernel.textImage = function(msg, size, color) {
	    return new TextImage(msg, size, color);
    };
    world.Kernel.fileImage = function(path) {
	    return FileImage.makeInstance(path);
    };


    world.Kernel.isSceneImage = function(x) { return x instanceof SceneImage; };
    world.Kernel.isCircleImage = function(x) { return x instanceof CircleImage; };
    world.Kernel.isStarImage = function(x) { return x instanceof StarImage; };
    world.Kernel.isRectangleImage = function(x) { return x instanceof RectangleImage; };
    world.Kernel.isTriangleImage = function(x) { return x instanceof TriangleImage; };
    world.Kernel.isEllipseImage = function(x) { return x instanceof EllipseImage; };
    world.Kernel.isLineImage = function(x) { return x instanceof LineImage; };
    world.Kernel.isOverlayImage = function(x) { return x instanceof OverlayImage; };
    world.Kernel.isTextImage = function(x) { return x instanceof TextImage; };
    world.Kernel.isFileImage = function(x) { return x instanceof FileImage; };





})();

var jsworld = {};

// Stuff here is copy-and-pasted from Chris's JSWorld.  We
// namespace-protect it, and add the Javascript <-> Moby wrapper
// functions here.

(function() {

    /* Type signature notation
     * CPS(a b ... -> c) is used to denote
     *    a b ... (c -> void) -> void
     */

    jsworld.Jsworld = {};
    var Jsworld = jsworld.Jsworld;


    var currentFocusedNode = false;

    var doNothing = function() {};



    //
    // WORLD STUFFS
    //

    function InitialWorld() {}

    var world = new InitialWorld();
    var worldListeners = [];
    var eventDetachers = [];
    var runningBigBangs = [];



    // Close all world computations.
    Jsworld.shutdown = function() {
	while(runningBigBangs.length > 0) {
	    var currentRecord = runningBigBangs.pop();
	    if (currentRecord) { currentRecord.pause(); }
	}
	clear_running_state();
    }



    function add_world_listener(listener) {
	worldListeners.push(listener);
    }


    function remove_world_listener(listener) {
	var index = worldListeners.indexOf(listener);
	if (index != -1) {
	    worldListeners.splice(index, 1);
	}
    }

    function clear_running_state() {
	world = new InitialWorld();
	worldListeners = [];

	for (var i = 0; i < eventDetachers.length; i++) {
		eventDetachers[i]();
	}
	eventDetachers = [];
    }



    // change_world: CPS( CPS(world -> world) -> void )
    // Adjust the world, and notify all listeners.
    function change_world(updater, k) {
	var originalWorld = world;

	var changeWorldHelp = function() {
		if (world instanceof WrappedWorldWithEffects) {
			var effects = world.getEffects();
			helpers.forEachK(effects,
				 function(anEffect, k2) { anEffect.invokeEffect(k2); },
				 function (e) { throw e; },
				 function() {
				 	world = world.getWorld();
					changeWorldHelp2();
				 });
		} else {
			changeWorldHelp2();
		}
	};
	
	var changeWorldHelp2 = function() {
		helpers.forEachK(worldListeners,
			 function(listener, k2) { listener(world, originalWorld, k2); },
			 function(e) { world = originalWorld; throw e; },
			 k);
	};

	try {
		updater(world, function(newWorld) {
				world = newWorld;
				changeWorldHelp();
			});
	} catch(e) {
		world = originalWorld;

		if (console && console.log && e.stack) {
			console.log(e.stack);
		}
		throw e;
	}
    }
    Jsworld.change_world = change_world;




    //
    // STUFF THAT SHOULD REALLY BE IN ECMASCRIPT
    //
    Number.prototype.NaN0=function(){return isNaN(this)?0:this;}
    function getPosition(e){
	var left = 0;
	var top  = 0;
	while (e.offsetParent){
	    left += e.offsetLeft + (e.currentStyle?(parseInt(e.currentStyle.borderLeftWidth)).NaN0():0);
	    top  += e.offsetTop  + (e.currentStyle?(parseInt(e.currentStyle.borderTopWidth)).NaN0():0);
	    e     = e.offsetParent;
	}
	left += e.offsetLeft + (e.currentStyle?(parseInt(e.currentStyle.borderLeftWidth)).NaN0():0);
	top  += e.offsetTop  + (e.currentStyle?(parseInt(e.currentStyle.borderTopWidth)).NaN0():0);
	return {x:left, y:top};	
    }
    Jsworld.getPosition = getPosition;


    var gensym_counter = 0;
    function gensym(){ return gensym_counter++;}
    Jsworld.gensym = gensym;


//    function map(a, f) {
//	var b = new Array(a.length);
//	for (var i = 0; i < a.length; i++) {
//		b[i] = f(a[i]);
//	}
//	return b;
//    }
    var map = helpers.map;
    Jsworld.map = map;



    function concat_map(a, f) {
	var b = [];
	for (var i = 0; i < a.length; i++) {
		b = b.concat(f(a[i]));
	}
	return b;
    }


    function mapi(a, f) {
	var b = new Array(a.length);
	for (var i = 0; i < a.length; i++) {
		b[i] = f(a[i], i);
	}
	return b;
    }
    Jsworld.mapi = mapi;


    function fold(a, x, f) {
	for (var i = 0; i < a.length; i++) {
		x = f(a[i], x);
	}
	return x;
    }
    Jsworld.fold = fold;


    function augment(o, a) {
	var oo = {};
	for (var e in o)
	    oo[e] = o[e];
	for (var e in a)
	    oo[e] = a[e];
	return oo;
    }
    Jsworld.augment = augment;


    function assoc_cons(o, k, v) {
	var oo = {};
	for (var e in o)
	    oo[e] = o[e];
	oo[k] = v;
	return oo;
    }
    Jsworld.assoc_cons = assoc_cons;


    function cons(value, array) {
	return [value].concat(array);
    }
    Jsworld.cons = cons;


    function append(array1, array2){
	return array1.concat(array2);
    }
    Jsworld.append = append;

    function array_join(array1, array2){
	var joined = [];
	for (var i = 0; i < array1.length; i++)
	    joined.push([array1[i], array2[i]]);
	return joined;
    }
    Jsworld.array_join = array_join;


    function removeq(a, value) {
	for (var i = 0; i < a.length; i++)
	    if (a[i] === value){
		return a.slice(0, i).concat(a.slice(i+1));
	    }			
	return a;
    }
    Jsworld.removeq = removeq;

    function removef(a, value) {
	for (var i = 0; i < a.length; i++)
	    if ( f(a[i]) ){
		return a.slice(0, i).concat(a.slice(i+1));
	    }			
	return a;
    }
    Jsworld.removef = removef;


    function filter(a, f) {
	var b = [];
	for (var i = 0; i < a.length; i++) {
		if ( f(a[i]) ) {
			b.push(a[i]);
		}
	}
	return b;
    }
    Jsworld.filter = filter;


    function without(obj, attrib) {
	var o = {};
	for (var a in obj)
	    if (a != attrib)
		o[a] = obj[a];
	return o;
    }
    Jsworld.without = without;


    function memberq(a, x) {
	for (var i = 0; i < a.length; i++)
	    if (a[i] === x) return true;
	return false;
    }
    Jsworld.memberq = memberq;


    function member(a, x) {
	for (var i = 0; i < a.length; i++)
	    if (a[i] == x) return true;
	return false;
    }
    Jsworld.member = member;



    function head(a){
	return a[0];
    }
    Jsworld.head = head;


    function tail(a){
	return a.slice(1, a.length);
    }
    Jsworld.tail = tail;

    //
    // DOM UPDATING STUFFS
    //

    // tree(N): { node: N, children: [tree(N)] }
    // relation(N): { relation: 'parent', parent: N, child: N } | { relation: 'neighbor', left: N, right: N }
    // relations(N): [relation(N)]
    // nodes(N): [N]
    // css(N): [css_node(N)]
    // css_node(N): { node: N, attribs: attribs } | { className: string, attribs: attribs }
    // attrib: { attrib: string, values: [string] }
    // attribs: [attrib]

    // treeable(nodes(N), relations(N)) = bool
    /*function treeable(nodes, relations) {
    // for all neighbor relations between x and y
    for (var i = 0; i < relations.length; i++)
    if (relations[i].relation == 'neighbor') {
    var x = relations[i].left, y = relations[i].right;
 
    // there does not exist a neighbor relation between x and z!=y or z!=x and y
    for (var j = 0; j < relations.length; j++)
    if (relations[j].relation === 'neighbor')
    if (relations[j].left === x && relations[j].right !== y ||
    relations[j].left !== x && relations[j].right === y)
    return false;
    }
 
    // for all parent relations between x and y
    for (var i = 0; i < relations.length; i++)
    if (relations[i].relation == 'parent') {
    var x = relations[i].parent, y = relations[i].child;
 
    // there does not exist a parent relation between z!=x and y
    for (var j = 0; j < relations.length; j++)
    if (relations[j].relation == 'parent')
    if (relations[j].parent !== x && relations[j].child === y)
    return false;
    }
 
    // for all neighbor relations between x and y
    for (var i = 0; i < relations.length; i++)
    if (relations[i].relation == 'neighbor') {
    var x = relations[i].left, y = relations[i].right;
 
    // all parent relations between z and x or y share the same z
    for (var j = 0; j < relations.length; j++)
    if (relations[j].relation == 'parent')
    for (var k = 0; k < relations.length; k++)
    if (relations[k].relation == 'parent')
    if (relations[j].child === x && relations[k].child === y &&
    relations[j].parent !== relations[k].parent)
    return false;
    }
 
    return true;
    }*/


    // node_to_tree: dom -> dom-tree
    // Given a native dom node, produces the appropriate tree.
    function node_to_tree(domNode) {
	var result = [domNode];
	for (var c = domNode.firstChild; c != null; c = c.nextSibling) {
	    result.push(node_to_tree(c));
	}
	return result;
    }
    Jsworld.node_to_tree = node_to_tree;



    // nodes(tree(N)) = nodes(N)
    function nodes(tree) {
	var ret = [tree.node];
	
	if (tree.node.jsworldOpaque == true) {
	    return ret;
	}

	for (var i = 0; i < tree.children.length; i++)
	    ret = ret.concat(nodes(tree.children[i]));
	
	return ret;
    }

    // nodeEq: node node -> boolean
    // Returns true if the two nodes should be the same.
    function nodeEq(node1, node2) {
	return (node1 && node2 && node1 === node2);
    }

    function nodeNotEq(node1, node2) {
	return ! nodeEq(node1, node2);
    }



    // relations(tree(N)) = relations(N)
    function relations(tree) {
	var ret = [];
	
	if (tree.node.jsworldOpaque == true) { return []; }

	for (var i = 0; i < tree.children.length; i++)
	    ret.push({ relation: 'parent', parent: tree.node, child: tree.children[i].node });
	
	for (var i = 0; i < tree.children.length - 1; i++)
	    ret.push({ relation: 'neighbor', left: tree.children[i].node, right: tree.children[i + 1].node });
	
	for (var i = 0; i < tree.children.length; i++)
	    ret = ret.concat(relations(tree.children[i]));
	
	return ret;
    }


    function appendChild(parent, child) {
	parent.appendChild(child);
    }


    // update_dom(nodes(Node), relations(Node)) = void
    function update_dom(toplevelNode, nodes, relations) {

	// TODO: rewrite this to move stuff all in one go... possible? necessary?
	
	// move all children to their proper parents
	for (var i = 0; i < relations.length; i++) {
	    if (relations[i].relation == 'parent') {
		var parent = relations[i].parent, child = relations[i].child;
		if (nodeNotEq(child.parentNode, parent)) {
		    appendChild(parent, child);
		} else {
		}
	    }
	}
	
	// arrange siblings in proper order
	// truly terrible... BUBBLE SORT
	for (;;) {
	    var unsorted = false;
		
	    for (var i = 0; i < relations.length; i++) {
		if (relations[i].relation == 'neighbor') {
		    var left = relations[i].left, right = relations[i].right;
				
		    if (nodeNotEq(left.nextSibling, right)) {
			left.parentNode.insertBefore(left, right)
			unsorted = true;
		    }
		}
	    }
		
	    if (!unsorted) break;
	}

	
	// remove dead nodes
	var live_nodes;
	
	// it is my hope that by sorting the nodes we get the worse of
	// O(n*log n) or O(m) performance instead of O(n*m)
	// for all I know Node.compareDocumentPosition is O(m)
	// and now we get O(n*m*log n)
	function positionComparator(a, b) {
	    var rel = a.compareDocumentPosition(b);
	    // children first
	    if (rel & a.DOCUMENT_POSITION_CONTAINED_BY) return 1;
	    if (rel & a.DOCUMENT_POSITION_CONTAINS) return -1;
	    // otherwise use precedes/follows
	    if (rel & a.DOCUMENT_POSITION_FOLLOWING) return -1;
	    if (rel & a.DOCUMENT_POSITION_PRECEDING) return 1;
	    // otherwise same node or don't care, we'll skip it anyway
	    return 0;
	}
	
	try {
	    // don't take out concat, it doubles as a shallow copy
	    // (as well as ensuring we keep document.body)
	    live_nodes = nodes.concat(toplevelNode).sort(positionComparator);
	}
	catch (e) {
	    // probably doesn't implement Node.compareDocumentPosition
	    live_nodes = null;
	}
	
	var node = toplevelNode, stop = toplevelNode.parentNode;
	while (node != stop) {
	    for (;;) {
		// process first
		// move down
		if (node.firstChild == null || node.jsworldOpaque == true) break;
		node = node.firstChild;
	    }
		
	    while (node != stop) {
		var next = node.nextSibling, parent = node.parentNode;
		
		// process last
		var found = false;
		var foundNode = undefined;

		if (live_nodes != null)
		    while (live_nodes.length > 0 && positionComparator(node, live_nodes[0]) >= 0) {
			var other_node = live_nodes.shift();
			if (nodeEq(other_node, node)) {
			    found = true;
			    foundNode = other_node;
			    break;
			}
			// need to think about this
			//live_nodes.push(other_node);
		    }
		else
		    for (var i = 0; i < nodes.length; i++)
			if (nodeEq(nodes[i], node)) {
			    found = true;
			    foundNode = nodes[i];
			    break;
			}
			
		if (!found) {
		    if (node.isJsworldOpaque) {
		    } else {
			// reparent children, remove node
			while (node.firstChild != null) {
			    appendChild(node.parentNode, node.firstChild);
			}
		    }
				
		    next = node.nextSibling; // HACKY
		    node.parentNode.removeChild(node);
		} else {
		    mergeNodeValues(node, foundNode);
		}

		// move sideways
		if (next == null) node = parent;
		else { node = next; break; }
	    }
	}

	
	refresh_node_values(nodes);
    }

    function mergeNodeValues(node, foundNode) {
//	for (attr in node) {
//	    foundNode[attr] = node[attr];
//	}
    }



    // camelCase: string -> string
    function camelCase(name) {
	return name.replace(/\-(.)/g, function(m, l){return l.toUpperCase()});
    }


    function set_css_attribs(node, attribs) {
	for (var j = 0; j < attribs.length; j++){
	    node.style[camelCase(attribs[j].attrib)] = attribs[j].values.join(" ");
	}
    }


    // isMatchingCssSelector: node css -> boolean
    // Returns true if the CSS selector matches.
    function isMatchingCssSelector(node, css) {
	if (css.id.match(/^\./)) {
	    // Check to see if we match the class
	    return ('class' in node && member(node['class'].split(/\s+/),
					      css.id.substring(1)));
	} else {
	    return ('id' in node && node.id == css.id);
	}
    }


    function update_css(nodes, css) {
	// clear CSS
	for (var i = 0; i < nodes.length; i++) {
	    clearCss(nodes[i]);
	}
	
	// set CSS
	for (var i = 0; i < css.length; i++)
	    if ('id' in css[i]) {
		for (var j = 0; j < nodes.length; j++)
		    if (isMatchingCssSelector(nodes[j], css[i])) {
			set_css_attribs(nodes[j], css[i].attribs);
		    }
	    }
	    else set_css_attribs(css[i].node, css[i].attribs);
    }


    var clearCss = function(node) {
	if ('style' in node)
	    node.style.cssText = "";
    }



    // If any node cares about the world, send it in.
    function refresh_node_values(nodes) {
	for (var i = 0; i < nodes.length; i++) {
	    if (nodes[i].onWorldChange) {
		nodes[i].onWorldChange(world);
	    }
	}
    }



    function do_redraw(world, oldWorld, toplevelNode, redraw_func, redraw_css_func, k) {
	if (oldWorld instanceof InitialWorld) {
	    // Simple path
	    redraw_func(world,
		function(drawn) {
			var t = sexp2tree(drawn);
			var ns = nodes(t);
	    		// HACK: css before dom, due to excanvas hack.
	    		redraw_css_func(world,
				function(css) {
					update_css(ns, sexp2css(css));
					update_dom(toplevelNode, ns, relations(t));
					k();
				});
		});
	} else {
	    maintainingSelection(
		function(k2) {
		    // For legibility, here is the non-CPS version of the same function:
		    /*
			var oldRedraw = redraw_func(oldWorld);
 			var newRedraw = redraw_func(world);	    
 			var oldRedrawCss = redraw_css_func(oldWorld);
			var newRedrawCss = redraw_css_func(world);
			var t = sexp2tree(newRedraw);
 			var ns = nodes(t);

			// Try to save the current selection and preserve it across
			// dom updates.

 			if(oldRedraw !== newRedraw) {
				// Kludge: update the CSS styles first.
				// This is a workaround an issue with excanvas: any style change
				// clears the content of the canvas, so we do this first before
				// attaching the dom element.
				update_css(ns, sexp2css(newRedrawCss));
				update_dom(toplevelNode, ns, relations(t));
 			} else {
				if(oldRedrawCss !== newRedrawCss) {
					update_css(ns, sexp2css(newRedrawCss));
				}
 			}
		    */

		    // We try to avoid updating the dom if the value
		    // hasn't changed.
		    redraw_func(oldWorld,
			function(oldRedraw) {
			    redraw_func(world,
				function(newRedraw) {
				    redraw_css_func(oldWorld,
					function(oldRedrawCss) {
					    redraw_css_func(world,
						function(newRedrawCss) {
						    var t = sexp2tree(newRedraw);
						    var ns = nodes(t);

						    // Try to save the current selection and preserve it across
						    // dom updates.

 						    if(oldRedraw !== newRedraw) {
							// Kludge: update the CSS styles first.
							// This is a workaround an issue with excanvas: any style change
							// clears the content of the canvas, so we do this first before
							// attaching the dom element.
							update_css(ns, sexp2css(newRedrawCss));
							update_dom(toplevelNode, ns, relations(t));
						    } else {
							if (oldRedrawCss !== newRedrawCss) {
							    update_css(ns, sexp2css(newRedrawCss));
							}
						    }
						    k2();
						})
					})
				})
			});
		}, k);
	}
    }


    // maintainingSelection: (-> void) -> void
    // Calls the thunk f while trying to maintain the current focused selection.
    function maintainingSelection(f, k) {
	var currentFocusedSelection;
	if (hasCurrentFocusedSelection()) {
	    currentFocusedSelection = getCurrentFocusedSelection();
	    f(function() {
		currentFocusedSelection.restore();
		k();
	    });
	} else {
	    f(function() { k(); });
	}
    }



    function FocusedSelection() {
	this.focused = currentFocusedNode;
	this.selectionStart = currentFocusedNode.selectionStart;
	this.selectionEnd = currentFocusedNode.selectionEnd;
    }

    // Try to restore the focus.
    FocusedSelection.prototype.restore = function() {
	// FIXME: if we're scrolling through, what's visible
	// isn't restored yet.
	if (this.focused.parentNode) {
	    this.focused.selectionStart = this.selectionStart;
	    this.focused.selectionEnd = this.selectionEnd;
	    this.focused.focus();
	} else if (this.focused.id) {
	    var matching = document.getElementById(this.focused.id);
	    if (matching) {
		matching.selectionStart = this.selectionStart;
		matching.selectionEnd = this.selectionEnd;
		matching.focus();
	    }
	}
    };

    function hasCurrentFocusedSelection() {
	return currentFocusedNode != undefined;
    }

    function getCurrentFocusedSelection() {
	return new FocusedSelection();
    }



    //////////////////////////////////////////////////////////////////////

    function BigBangRecord(top, world, handlerCreators, handlers, attribs) {    
	this.top = top;
	this.world = world;
	this.handlers = handlers;
	this.handlerCreators = handlerCreators;
	this.attribs = attribs;
    }

    BigBangRecord.prototype.restart = function() {
	big_bang(this.top, this.world, this.handlerCreators, this.attribs);
    }
    
    BigBangRecord.prototype.pause = function() {
	for(var i = 0 ; i < this.handlers.length; i++) {
	    if (this.handlers[i] instanceof StopWhenHandler) {
		// Do nothing for now.
	    } else {
		this.handlers[i].onUnregister(top);
	    }
	}
    };
    //////////////////////////////////////////////////////////////////////

    // Notes: big_bang maintains a stack of activation records; it should be possible
    // to call big_bang re-entrantly.
    function big_bang(top, init_world, handlerCreators, attribs, k) {
	clear_running_state();

	// Construct a fresh set of the handlers.
	var handlers = map(handlerCreators, function(x) { return x();} );
	if (runningBigBangs.length > 0) { 
	    runningBigBangs[runningBigBangs.length - 1].pause();
	}

	// Create an activation record for this big-bang.
	var activationRecord = 
	    new BigBangRecord(top, init_world, handlerCreators, handlers, attribs);
	runningBigBangs.push(activationRecord);
	function keepRecordUpToDate(w, oldW, k2) {
	    activationRecord.world = w;
	    k2();
	}
	add_world_listener(keepRecordUpToDate);



	// Monitor for termination and register the other handlers.
	var stopWhen = new StopWhenHandler(function(w, k2) { k2(false); },
					   function(w, k2) { k2(); });
	for(var i = 0 ; i < handlers.length; i++) {
	    if (handlers[i] instanceof StopWhenHandler) {
		stopWhen = handlers[i];
	    } else {
		handlers[i].onRegister(top);
	    }
	}
	function watchForTermination(w, oldW, k2) {
	    stopWhen.test(w,
		function(stop) {
		    if (stop) {
			Jsworld.shutdown();
		        k(w);
	/*
			stopWhen.receiver(world,
			    function() {		    
				var currentRecord = runningBigBangs.pop();
				if (currentRecord) { currentRecord.pause(); }
				if (runningBigBangs.length > 0) {
				    var restartingBigBang = runningBigBangs.pop();
				    restartingBigBang.restart();
				}
				k();
			    });
	*/
		    }
		    else { k2(); }
		});
	};
	add_world_listener(watchForTermination);


	// Finally, begin the big-bang.
	copy_attribs(top, attribs);
	change_world(function(w, k2) { k2(init_world); }, doNothing);


    }
    Jsworld.big_bang = big_bang;





    // on_tick: number CPS(world -> world) -> handler
    function on_tick(delay, tick) {
	return function() {
	    var ticker = {
		watchId: -1,
		onRegister: function (top) { 
		    ticker.watchId = setInterval(function() { change_world(tick, doNothing); }, delay);
		},

		onUnregister: function (top) {
		    clearInterval(ticker.watchId);
		}
	    };
	    return ticker;
	};
    }
    Jsworld.on_tick = on_tick;


    
    //  on_draw: CPS(world -> (sexpof node)) CPS(world -> (sexpof css-style)) -> handler
    function on_draw(redraw, redraw_css) {
	var wrappedRedraw = function(w, k) {
	    redraw(w, function(newDomTree) {
	    	checkDomSexp(newDomTree, newDomTree);
	    	k(newDomTree);
	    });
	}

	return function() {
	    var drawer = {
		_top: null,
		_listener: function(w, oldW, k2) { 
		    do_redraw(w, oldW, drawer._top, wrappedRedraw, redraw_css, k2); 
		},
		onRegister: function (top) { 
		    drawer._top = top;
		    add_world_listener(drawer._listener);
		},

		onUnregister: function (top) {
		    remove_world_listener(drawer._listener);
		}
	    };
	    return drawer;
	};
    }
    Jsworld.on_draw = on_draw;



    function StopWhenHandler(test, receiver) {
	this.test = test;
	this.receiver = receiver;
    }
    // stop_when: CPS(world -> boolean) CPS(world -> boolean) -> handler
    function stop_when(test, receiver) {
	return function() {
	    if (receiver == undefined) {
		receiver = function(world, k2) {};
	    }
	    return new StopWhenHandler(test, receiver);
	};
    }
    Jsworld.stop_when = stop_when;



    function on_world_change(f) {
	var listener = function(world, oldW, k) { f(world, k); };
	return function() {
	    return { 
		onRegister: function (top) { 
		    add_world_listener(listener); },
		onUnregister: function (top) {
		    remove_world_listener(listener)}
	    };
	};
    }
    Jsworld.on_world_change = on_world_change;





    // Compatibility for attaching events to nodes.
    function attachEvent(node, eventName, fn) {
	if (node.addEventListener) {
	    // Mozilla
	    node.addEventListener(eventName, fn, false);
	} else {
	    // IE
	    node.attachEvent('on' + eventName, fn, false);
	}
    }

    var detachEvent = function(node, eventName, fn) {
	if (node.addEventListener) {
	    // Mozilla
	    node.removeEventListener(eventName, fn, false);
	} else {
	    // IE
	    node.detachEvent('on' + eventName, fn, false);
	}
    }

    //
    // DOM CREATION STUFFS
    //

    // add_ev: node string CPS(world event -> world) -> void
    // Attaches a world-updating handler when the world is changed.
    function add_ev(node, event, f) {
	var eventHandler = function(e) { change_world(function(w, k) { f(w, e, k); },
						       doNothing); };
	attachEvent(node, event, eventHandler);
	eventDetachers.push(function() { detachEvent(node, event, eventHandler); });
    }

    // add_ev_after: node string CPS(world event -> world) -> void
    // Attaches a world-updating handler when the world is changed, but only
    // after the fired event has finished.
    function add_ev_after(node, event, f) {
	var eventHandler = function(e) {
		setTimeout(function() { change_world(function(w, k) { f(w, e, k); },
						     doNothing); },
			   0);
	};
	attachEvent(node, event, eventHandler);
	eventDetachers.push(function() { detachEvent(node, event, eventHandler); });
    }


    function addFocusTracking(node) {
	attachEvent(node, "focus", function(e) {
	    currentFocusedNode = node; });
	attachEvent(node, "blur", function(e) {
	    currentFocusedNode = undefined;
	});
	return node;
    }





    //
    // WORLD STUFFS
    //


    function sexp2tree(sexp) {
	if(sexp.length == undefined) return { node: sexp, children: [] };
	else return { node: sexp[0], children: map(sexp.slice(1), sexp2tree) };
    }

    function sexp2attrib(sexp) {
	return { attrib: sexp[0], values: sexp.slice(1) };
    }

    function sexp2css_node(sexp) {
	var attribs = map(sexp.slice(1), sexp2attrib);
	if (typeof sexp[0] == 'string'){
	    return [{ id: sexp[0], attribs: attribs }];
	} else if ('length' in sexp[0]){
	    return map(sexp[0], function (id) { return { id: id, attribs: attribs } });
	} else {
	    return [{ node: sexp[0], attribs: attribs }];
	}
    }

    function sexp2css(sexp) {
	return concat_map(sexp, sexp2css_node);
    }



    function isTextNode(n) {
	return (n.nodeType == Node.TEXT_NODE);
    }


    function isElementNode(n) {
	return (n.nodeType == Node.ELEMENT_NODE);
    }


    var throwDomError = function(thing, topThing) {
	throw new JsworldDomError(
	    helpers.format(
		"Expected a non-empty array, received ~s within ~s",
		[thing, topThing]),
	    thing);
    };

    // checkDomSexp: X X -> boolean
    // Checks to see if thing is a DOM-sexp.  If not,
    // throws an object that explains why not.
    function checkDomSexp(thing, topThing) {
	if (! thing instanceof Array) {
	    throwDomError(thing, topThing);
	}
	if (thing.length == 0) {
	    throwDomError(thing, topThing);
	}

	// Check that the first element is a Text or an element.
	if (isTextNode(thing[0])) {
	    if (thing.length > 1) {
		throw new JsworldDomError(helpers.format("Text node ~s can not have children",
							 [thing]),
					  thing);
	    }
	} else if (isElementNode(thing[0])) {
	    for (var i = 1; i < thing.length; i++) {
		checkDomSexp(thing[i], thing);
	    }
	} else {
	    throw new JsworldDomError(
		helpers.format(
		    "expected a Text or an Element, received ~s within ~s",
		    [thing, topThing]),
		thing[0]);
	}
    }

    function JsworldDomError(msg, elt) {
	this.msg = msg;
	this.elt = elt;
    }
    JsworldDomError.prototype.toString = function() {
	return "on-draw: " + this.msg;
    }





    //
    // DOM CREATION STUFFS
    //


    function copy_attribs(node, attribs) {
	if (attribs)
	    for (a in attribs) {
		if (attribs.hasOwnProperty(a)) {
		    if (typeof attribs[a] == 'function')
			add_ev(node, a, attribs[a]);
		    else{
			node[a] = attribs[a];//eval("node."+a+"='"+attribs[a]+"'");
		    }
		}
	    }
	return node;
    }


    //
    // NODE TYPES
    //

    function p(attribs) {
	return addFocusTracking(copy_attribs(document.createElement('p'), attribs));
    }
    Jsworld.p = p;

    function div(attribs) {
	return addFocusTracking(copy_attribs(document.createElement('div'), attribs));
    }
    Jsworld.div = div;

    // Used To Be: (world event -> world) (hashof X Y) -> domElement
    // Now: CPS(world event -> world) (hashof X Y) -> domElement
    function button(f, attribs) {
	var n = document.createElement('button');
	add_ev(n, 'click', f);
	return addFocusTracking(copy_attribs(n, attribs));
    }
    Jsworld.button = button;


//     function bidirectional_input(type, toVal, updateVal, attribs) {
// 	var n = document.createElement('input');
// 	n.type = type;
// 	function onKey(w, e) {
// 	    return updateVal(w, n.value);
// 	}
// 	// This established the widget->world direction
// 	add_ev_after(n, 'keypress', onKey);
// 	// and this establishes the world->widget.
// 	n.onWorldChange = function(w) {n.value = toVal(w)};
// 	return addFocusTracking(copy_attribs(n, attribs));
//     }
//     Jsworld.bidirectional_input = bidirectional_input;


    var preventDefault = function(event) {
	if (event.preventDefault) {
	    event.preventDefault();
	} else {
	    event.returnValue = false;
	}
    }

    var stopPropagation = function(event) {
	if (event.stopPropagation) {
	    event.stopPropagation();
	} else {
	    event.cancelBubble = true;
	}
    }


    var stopClickPropagation = function(node) {
	attachEvent(node, "click",
		    function(e) {
			stopPropagation(e);
		    });
	return node;
    }
    

    // input: string CPS(world -> world) 
    function input(aType, updateF, attribs) {
	aType = aType.toLowerCase();
	var dispatchTable = { text : text_input,
			      password: text_input,
			      checkbox: checkbox_input
			      //button: button_input,
			      //radio: radio_input 
	};

	if (dispatchTable[aType]) {
	    return (dispatchTable[aType])(aType, updateF, attribs);
	}
	else {
	    throw new Error("js-input: does not currently support type " + aType);
	}
    }
    Jsworld.input = input;


    var text_input = function(type, updateF, attribs) {
	var n = document.createElement('input');
	n.type = type;
	function onKey(w, e, k) {
	    updateF(w, n.value, k);
	}
	// This established the widget->world direction
	add_ev_after(n, 'keypress', onKey);

	// Every second, do a manual polling of the object, just in case.
	var delay = 1000;
	var lastVal = n.value;
	var intervalId = setInterval(function() {
	    if (! n.parentNode) {
		clearInterval(intervalId);
		return;
	    }
	    if (lastVal != n.value) {
		lastVal = n.value;
		change_world(function (w, k) {
		    updateF(w, n.value, k);
		}, doNothing);
	    }
	},
		    delay);
	return stopClickPropagation(
	    addFocusTracking(copy_attribs(n, attribs)));
    };


    var checkbox_input = function(type, updateF, attribs) {
	var n = document.createElement('input');
	n.type = type;

	var onCheck = function(w, e, k) {
	    updateF(w, n.checked, k);
	};
	// This established the widget->world direction
	add_ev_after(n, 'change', onCheck);
	
	attachEvent(n, 'click', function(e) {
		stopPropagation(e);
	    });

	return copy_attribs(n, attribs);
    };


    var button_input = function(type, updateF, attribs) {
	var n = document.createElement('button');
	add_ev(n, 'click', function(w, e, k) { updateF(w, n.value, k); });
	return addFocusTracking(copy_attribs(n, attribs));
    };



    // worldToValF: CPS(world -> string)
    // updateF: CPS(world string -> world)
    function bidirectional_text_input(worldToValF, updateF, attribs) {
	var n = document.createElement('input');
	n.type = "text";
	var lastValue = undefined;
	function monitor(w, e, k) {
	    updateF(w, n.value, k);
	}
	add_ev(n, 'keypress', monitor);
	return stopClickPropagation(
	    addFocusTracking(
		copy_attribs(n, attribs)));
    }
    

    function text(s, attribs) {
	var result = document.createTextNode(s);
	return result;
    }
    Jsworld.text = text;

    function select(attribs, opts, f){
	var n = document.createElement('select');
	for(var i = 0; i < opts.length; i++) {
	    n.add(option({value: opts[i]}), null);
	}
	n.jsworldOpaque = true;
	add_ev(n, 'change', f);
	var result = addFocusTracking(copy_attribs(n, attribs));
	return result;
    }
    Jsworld.select = select;

    function option(attribs){
	var node = document.createElement("option");
        node.text = attribs.value;
	node.value = attribs.value;
 	return node;
    }



    function textarea(attribs){
	return addFocusTracking(copy_attribs(document.createElement('textarea'), attribs));
    }
    Jsworld.textarea = textarea;

    function h1(attribs){
	return addFocusTracking(copy_attribs(document.createElement('h1'), attribs));
    }
    Jsworld.h1 = h1;

    function canvas(attribs){
	return addFocusTracking(copy_attribs(document.createElement('canvas'), attribs));	
    }
    Jsworld.canvas = canvas;


    function img(src, attribs) {
	var n = document.createElement('img');
	n.src = src;
	return addFocusTracking(copy_attribs(n, attribs));
    }
    Jsworld.img = img;



    function raw_node(node, attribs) {
	return addFocusTracking(copy_attribs(node, attribs));
    }
    Jsworld.raw_node = raw_node;





    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    // Effects

    // An effect is an object with an invokeEffect() method.
    
    var WrappedWorldWithEffects = function(w, e) {
	if (w instanceof WrappedWorldWithEffects) {
	    this.w = w.w;
	    this.e = w.e.concat([e]);
	} else {
	    this.w = w;
	    this.e = [e];
	}
    };

    WrappedWorldWithEffects.prototype.getWorld = function() {
	return this.w;
    };

    WrappedWorldWithEffects.prototype.getEffects = function() {
	return this.e;
    };


    //////////////////////////////////////////////////////////////////////

    Jsworld.with_effect = function(w, e) {
	return new WrappedWorldWithEffects(w, e);
    };




    //////////////////////////////////////////////////////////////////////
    // Example effect: raise an alert.
    Jsworld.alert_effect = function(msg) {
	return new AlertEffect(msg);
    };

    var AlertEffect = function(msg) {
	this.msg = msg;
    };

    AlertEffect.prototype.invokeEffect = function(k) {
	alert(this.msg);
	k();
    };


    //////////////////////////////////////////////////////////////////////


    // Example effect: play a song, given its url
    Jsworld.music_effect = function(musicUrl) {
	return new MusicEffect(musicUrl);
    };

    var MusicEffect = function(musicUrl) {
	this.musicUrl = musicUrl;
    };

    MusicEffect.prototype.invokeEffect = function(k) {
	new Audio(url).play();
	k();
    };





})();

// Depends on world.js, world-config.js

(function() {

    var Jsworld = jsworld.MobyJsworld = {};

    // The real low-level jsworld module:
    var _js = jsworld.Jsworld;


    var caller;
    var setCaller = function(c) {
    	caller = function(op, args, k) {
		c(op, args, k, handleError);
	};
    };
    var unsetCaller = function() {
    	caller = function() {
		throw new Error('caller not defined!');
	};
    };
    unsetCaller();

    // The restarted and things to set it
    // Note that we never want to restart the same computation
    // more than once, so we throw an error if someone tries to do that
    var restarter;
    var setRestarter = function(r) {
	    var hasRestarted = false;
	    restarter = function(v) {
		    if (hasRestarted) {
			    throw new Error('Cannot restart twice!');
		    }
		    hasRestarted = true;
		    r(v);
	    };
    };
    var unsetRestarter = function() {
	restarter = function() {
		throw new Error('restarter not defined!');
	};
    };
    unsetRestarter();
    







    // isHandler: X -> boolean
    // Right now, a handler is a function that consumes and produces
    // configs.  We should tighten up the type check eventually.
    var isHandler = function(x) {
	return typeof(x) == 'function';
    }




    //////////////////////////////////////////////////////////////////////
    //From this point forward, we define wrappers to integrate jsworld
    //with Moby.


    // getBigBangWindow: -> window
    var getBigBangWindow = function() {
        if (window.document.getElementById("jsworld-div") !== undefined) {
	    return window;
	} else {
	    var newDiv = window.document.createElement("div");
	    newDiv.id = 'jsworld-div';
	    window.document.appendChild(newDiv);
	    return window;
	}
    }


    // types are
    // sexp: (cons node (listof sexp))
    // css-style: (node (listof (list string string)))

    // Exports:




    var isPair = types.isPair;
    var isEmpty = function(x) { return x === types.EMPTY; };
    var isList = function(x) { return (isPair(x) || isEmpty(x)); };



    // The default printWorldHook will write the written content of the node.
    // We probably want to invoke the pretty printer here instead!
    Jsworld.printWorldHook = function(world, node) {
	var newNode;
	if(node.lastChild == null) {
	    newNode = types.toDomNode(world);
	    node.appendChild(newNode);
	} else {
	    newNode = types.toDomNode(world);
	    node.replaceChild(newNode, node.lastChild);
	}
    };



    // Figure out the target of an event.
    // http://www.quirksmode.org/js/events_properties.html#target
    var findEventTarget = function(e) {
	var targ;
	if (e.target) 
	    targ = e.target;
	else if (e.srcElement) 
	    targ = e.srcElement;
	if (targ.nodeType == 3) // defeat Safari bug
	    targ = targ.parentNode;
	return targ;
    }

    // isNode: any -> boolean
    // Returns true if the thing has a nodeType.
    var isNode = function(thing) {
	return typeof(thing.nodeType) != 'undefined';
    }



    // checkWellFormedDomTree: X X (or number undefined) -> void
    // Check to see if the tree is well formed.  If it isn't,
    // we need to raise a meaningful error so the user can repair
    // the structure.
    //
    // Invariants:
    // The dom tree must be a pair.
    // The first element must be a node.
    // Each of the rest of the elements must be dom trees.
    // If the first element is a text node, it must NOT have children.
    var checkWellFormedDomTree = function(x, top, index) {
	var fail = function(formatStr, formatArgs) {
		throw types.schemeError(
			types.exnFailContract(helpers.format(formatStr, formatArgs),
			       		      false));
	}

	if (types.isPair(x)) {
	    var firstElt = x.first();
	    var restElts = x.rest();

	    if (! isNode(firstElt)) {
		fail("on-draw: expected a dom-element, but received ~s instead, the first element within ~s", [firstElt, top]);
	    }

	    if (firstElt.nodeType == Node.TEXT_NODE && !restElts.isEmpty() ) {
		fail("on-draw: the text node ~s must not have children.  It has ~s", [firstElt, restElts]);
	    }

	    var i = 2;
	    while( !restElts.isEmpty() ) {
		checkWellFormedDomTree(restElts.first(), x, i);
		restElts = restElts.rest();
		i++;
	    }
	} else {
		var formatStr = "on-draw: expected a dom-s-expression, but received ~s instead";
		var formatArgs = [x];
		if (index != undefined) {
			formatStr += ", the ~a element within ~s";
			formatArgs.push( helpers.ordinalize(index) );
			formatArgs.push(top);
		}
		formatStr += ".";

		fail(formatStr, formatArgs);
	}
    };


    // Compatibility for attaching events to nodes.
    var attachEvent = function(node, eventName, fn) {
	if (node.addEventListener) {
	    // Mozilla
	    node.addEventListener(eventName, fn, false);
	} else {
	    // IE
	    node.attachEvent('on' + eventName, fn, false);
	}
    };

    var detachEvent = function(node, eventName, fn) {
	if (node.addEventListener) {
	    // Mozilla
	    node.removeEventListener(eventName, fn, false);
	} else {
	    // IE
	    node.detachEvent('on' + eventName, fn, false);
	}
    }

//    var attachEvent = function(node, eventName, fn) {
//	plt.Kernel.attachEvent(node, eventName, fn);
//    }

    var preventDefault = function(event) {
	if (event.preventDefault) {
	    event.preventDefault();
	} else {
	    event.returnValue = false;
	}
    }

    var stopPropagation = function(event) {
	if (event.stopPropagation) {
	    event.stopPropagation();
	} else {
	    event.cancelBubble = true;
	}
    }


    // bigBang: world dom (listof (list string string)) (arrayof handler) -> world
    Jsworld.bigBang = function(initWorld, toplevelNode, handlers, theCaller, theRestarter) {
	    //console.log('in high level big-bang');
	setCaller(theCaller);
	setRestarter(theRestarter);
	var attribs = types.EMPTY;
	
	// Ensure that the toplevelNode can be focused by mouse or keyboard
	toplevelNode.tabIndex = 0;
	// Absorb all click events so they don't bubble up.
	attachEvent(toplevelNode,
		    'click',
		    function(e) {
			preventDefault(e);
			stopPropagation(e);
			return false;
		    },
		    false);
	

	var config = new world.config.WorldConfig();
	for(var i = 0; i < handlers.length; i++) {
	    if (isList(handlers[i])) {
		attribs = handlers[i];
	    } else if (isHandler(handlers[i])) {
		config = handlers[i](config);
	    }
	}
	config = config.updateAll({'changeWorld': Jsworld.updateWorld,
				   'shutdownWorld': Jsworld.shutdownWorld});
	var stimuli = new world.stimuli.StimuliHandler(config, caller, restarter);
	
	var wrappedHandlers = [];
	var wrappedRedraw;
	var wrappedRedrawCss;
	

	if (config.lookup('onDraw')) {
	    wrappedRedraw = function(w, k) {
		try {
		    caller(config.lookup('onDraw'), [w],
			    function(newDomTree) {
//				plt.Kernel.setLastLoc(undefined);
				checkWellFormedDomTree(newDomTree, newDomTree, undefined);
				var result = [toplevelNode, 
					      helpers.deepListToArray(newDomTree)];
				k(result);
			    });
		} catch (e) {
		    handleError(e);
//		    throw e;
		}
	    }

	    wrappedRedrawCss = function(w, k) {
		try {
		    caller(config.lookup('onDrawCss'), [w],
			    function(res) {
				var result = helpers.deepListToArray(res);
//				plt.Kernel.setLastLoc(undefined);
				k(result);
			    });
		} catch (e) {
		    handleError(e);
//		    throw e;
		}
	    }
	    wrappedHandlers.push(_js.on_draw(wrappedRedraw, wrappedRedrawCss));
	} else if (config.lookup('onRedraw')) {
	    var reusableCanvas = undefined;
	    var reusableCanvasNode = undefined;
	    
	    wrappedRedraw = function(w, k) {
		try {
			//console.log('in onRedraw handler');
		    caller(config.lookup('onRedraw'), [w],
			    function(aScene) {
				// Performance hack: if we're using onRedraw, we know
				// we've got a scene, so we optimize away the repeated
				// construction of a canvas object.
				if ( world.Kernel.isImage(aScene) ) {
					var width = aScene.getWidth();
					var height = aScene.getHeight();

					if (! reusableCanvas) {
						reusableCanvas = world.Kernel.makeCanvas(width, height);
						// Note: the canvas object may itself manage objects,
						// as in the case of an excanvas.  In that case, we must make
						// sure jsworld doesn't try to disrupt its contents!
						reusableCanvas.jsworldOpaque = true;
						reusableCanvasNode = _js.node_to_tree(reusableCanvas);
					}

					reusableCanvas.width = width;
					reusableCanvas.height = height;			
					var ctx = reusableCanvas.getContext("2d");
					aScene.render(ctx, 0, 0);

					k([toplevelNode, reusableCanvasNode]);
				} else {
					k([toplevelNode, _js.node_to_tree(types.toDomNode(aScene))]);
				}
			   });
		} catch (e) {
		    handleError(e);
//		    throw e;
		}
	    }
	    
	    wrappedRedrawCss = function(w, k) {
		    //console.log('in RedrawCss handler');
		k([[reusableCanvas, 
		    ["width", reusableCanvas.width + "px"],
		    ["height", reusableCanvas.height + "px"]]]);
	    }
	    wrappedHandlers.push(_js.on_draw(wrappedRedraw, wrappedRedrawCss));
	} else {
	    wrappedHandlers.push(_js.on_world_change
				 (function(w, k) { 
				     Jsworld.printWorldHook(w, toplevelNode);
				     k();
				 }));
	}

	if (config.lookup('tickDelay')) {
	    var wrappedTick = function(w, k) {
		    //console.log('in onTick handler');
		world.stimuli.onTick([], k);
	    }
	    var wrappedDelay = jsnums.toFixnum( config.lookup('tickDelay') );
	    wrappedHandlers.push(_js.on_tick(wrappedDelay, wrappedTick));
	}

	if (config.lookup('stopWhen')) {
	    wrappedHandlers.push(_js.stop_when(function(w, k) { 
				    //console.log('in stopWhen handler');
			caller(config.lookup('stopWhen'), [w],
				function(res) { k(res); });
		    }));
	}
	

	if (config.lookup('onKey')) {
	    // Add event handlers that listen in on key events that are applied
	    // directly on the toplevelNode.  We pay attention to keydown, and
	    // omit keypress.
	    attachEvent(toplevelNode,
			'keydown',
			function(e) {
			    stimuli.onKey(e);
			    preventDefault(e);
			    stopPropagation(e);
			    return false;
			});
	    attachEvent(toplevelNode,
			'keypress',
			function(e) {
			    preventDefault(e);
			    stopPropagation(e);
			    return false;
			});
	    toplevelNode.focus();
	}


// 	if (config.lookup('initialEffect')) {
// 	    var updaters =
// 		world.Kernel.applyEffect(config.lookup('initialEffect'));
// 	    for (var i = 0 ; i < updaters.length; i++) {
// 		if (config.lookup('stopWhen') && 
// 		    config.lookup('stopWhen')([initWorld])) {
// 		    break;
// 		} else {
// 		    initWorld = updaters[i](initWorld);
// 		}
// 	    }
// 	}
	

	
	_js.big_bang(toplevelNode,
		     initWorld,
		     wrappedHandlers,
		     helpers.assocListToHash(attribs),
		     function(w) {
			 unsetCaller();
			 restarter(w);
		     });
    }



    var handleError = function(e) {
	helpers.reportError(e);
	// When something bad happens, shut down 
	// the world computation.
	helpers.reportError("Shutting down jsworld computations");
//	world.stimuli.onShutdown(); 
	world.stimuli.massShutdown();

	if ( types.isSchemeError(e) ) {
		restarter(e);
	}
	else if (typeof(e) == 'string') {
		restarter( types.schemeError(types.exnFail(e, false)) );
	}
	else if (e instanceof Error) {
		restarter( types.schemeError(types.exnFail(e.message, false)) );
	}
	else {
		restarter( type.schemeError(e) );
	}
    }
    


    // updateWorld: CPS( CPS(world -> world) -> void )
    Jsworld.updateWorld = function(updater, k) {
	var wrappedUpdater = function(w, k2) {
	    try {
		updater(w, k2);
	    } catch (e) {
		    if (console && console.log && e.stack) {
			    console.log(e.stack);
		    }
		handleError(e);
//		k2(w);
	    }
	}

	_js.change_world(wrappedUpdater, k);
    }
    


    // shutdownWorld: -> void
    // Shut down all world computations.
    Jsworld.shutdownWorld = function() {
	_js.shutdown();
    };


//    var getAttribs = function(args) {
//	if (args.length == 0) {
//	    return []
//	}
//	if (args.length == 1) {
//	    return helpers.assocListToHash(args[0]);
//	} else {
//	    throw new Error("getAttribs recevied unexpected value for args: "
//			    + args);
//	}
//    }


    Jsworld.p = _js.p;

    Jsworld.div = _js.div;

    Jsworld.buttonBang = function(updateWorldF, effectF, attribs) {
	var wrappedF = function(w, evt, k) {
	    try {
// FIXME: Get effects back online!
//		caller(effectF, [world],
//			function(effect) {
			    caller(updateWorldF, [w],
				function(newWorld) {
//					world.Kernel.applyEffect(effect);
					k(newWorld);
				});
//			});
	    } catch (e) {
		    if (console && console.log && e.stack) {
			    console.log(e.stack);
		    }
		handleError(e);
//		k(w);
	    }
	}
	return _js.button(wrappedF, attribs);
    };
    

    Jsworld.input = function(type, updateF, attribs) {
	    var wrappedUpdater = function(w, evt, k) {
//		    console.log(e);
		    caller(updateF, [w, evt], k);
	    }
	    return _js.input(type, wrappedUpdater, attribs);
    };


    Jsworld.get_dash_input_dash_value = function(node) {
//	plt.Kernel.check(node, 
//			 function(x) { return (plt.Kernel.isString(node) ||
//					       node.nodeType == 
//					       Node.ELEMENT_NODE) }, 
//			 "get-input-value",
//			 "dom-node",
//			 1);
	if (types.isString(node)) {
	    return (document.getElementById(node).value || "");
	} else {
	    return (node.value || "");
	}

    };



    // Images.
    Jsworld.img = _js.img;

    // text: string -> node
    Jsworld.text = _js.text;

    Jsworld.select = function(options, updateF, attribs) { 
	    var wrappedUpdater = function(w, e, k) {
//		    console.log(e);
		    caller(updateF, [w, e.target.value], k);
	    }
	    return _js.select(attribs, options, wrappedUpdater);
    };


    // fixme: add support for textarea, h1, canvas


//    // raw_node: scheme-value assoc -> node
//    Jsworld.rawNode = function(x, args) {
//	var attribs = getAttribs(args);
//	var node = _js.raw_node(types.toDomNode(x), attribs);
//	node.toWrittenString = function(cache) { return "(js-raw-node ...)"; }
//	node.toDisplayedString = node.toWrittenString;
//	node.toDomNode = function(cache) { return node; }
//	return node;
//    };



})();

var primitive = {};

(function() {


var CALL;
var setCALL = function(V) {
    CALL = function(op, operands, k) {
	return new V(op, operands, k);
    };
};



var PAUSE;
var setPAUSE = function(V) {
    PAUSE = function(onPause) {
	return new V(onPause);
    };
};








var PRIMITIVES = {};

var PrimProc = types.PrimProc;
var CasePrimitive = types.CasePrimitive;


//////////////////////////////////////////////////////////////////////

// Helper Functions

var id = function(x) { return x; };

var sub1 = function(x) {
	check(x, isNumber, 'sub1', 'number', 1);
	return jsnums.subtract(x, 1);
}

var add1 = function(x) {
	check(x, isNumber, 'add1', 'number', 1);
	return jsnums.add(x, 1);
}

var callWithValues = function(f, vals) {
	if (vals instanceof types.ValuesWrapper) {
		return CALL(f, vals.elts, id);
	}
	else {
		return CALL(f, [vals], id);
	}
};

var procedureArity = function(proc) {
	check(proc, isFunction, 'procedure-arity', 'procedure', 1);
			
	var singleCaseArity = function(aCase) {
		if (aCase instanceof types.ContinuationClosureValue) {
			return 1;
		}
		else if (aCase.isRest) {
			return types.arityAtLeast(aCase.numParams);
		}
		else {
			return aCase.numParams;
		}
	}
	
	if ( proc instanceof PrimProc ||
	     proc instanceof types.ClosureValue ||
	     proc instanceof types.ContinuationClosureValue ) {
		return singleCaseArity(proc);
	}
	else if ( proc instanceof CasePrimitive ) {
		var ret = types.EMPTY;
		for (var i = 0; i < proc.cases.length; i++) {
			ret = types.cons(singleCaseArity(proc.cases[i]), ret);
		}
		return ret.reverse();
	}
	else if ( proc instanceof types.CaseLambdaValue ) {
		var ret = types.EMPTY;
		for (var i = 0; i < proc.closures.length; i++) {
			ret = types.cons( singleCaseArity(proc.closures[i]), ret );
		}
		return ret.reverse();
	}
	else {
		throw new Error('procedure-arity given wrong type that passed isFunction!');
	}
};

var funArityContains = function(n) {
	return function(proc) {
		if ( !isFunction(proc) ) {
			return false;
		}

		var arity = procedureArity(proc);
		if ( !isList(arity) ) {
			arity = types.list([arity]);
		}

		while ( !arity.isEmpty() ) {
			if ( isNumber(arity.first()) &&
			     n === arity.first() ) {
				return true;
			}
			else if ( types.isArityAtLeast(arity.first()) &&
				  types.arityValue( arity.first() ) <= n ) {
				return true;
			}
			arity = arity.rest();
		}
		return false;
	}
}

var length = function(lst) {
	checkList(lst, 'length', 1);
	var ret = 0;
	for (; !lst.isEmpty(); lst = lst.rest()) {
		ret = ret+1;
	}
	return ret;
}

var append = function(args) {
	var i;
	arrayEach(args, function(x, i) {checkList(x, 'append', i+1);});

	if (args.length == 0) {
		return types.EMPTY;
	}
	var ret = args[args.length-1];
	for (i = args.length-2; i >= 0; i--) {
		ret = args[i].append(ret);
	}
	return ret;
}

var foldHelp = function(f, acc, args) {
	if ( args[0].isEmpty() ) {
		return acc;
	}

	var fArgs = [];
	var argsRest = [];
	for (var i = 0; i < args.length; i++) {
		fArgs.push(args[i].first());
		argsRest.push(args[i].rest());
	}
	fArgs.push(acc);
	return CALL(f, fArgs,
		function(result) {
			return foldHelp(f, result, argsRest);
		});
}

var quicksort = function(functionName) {
	return function(initList, comp) {
		checkList(initList, functionName, 1);
		check(comp, funArityContains(2), functionName, 'procedure', 2);
	
		var quicksortHelp = function(lst) {
			if ( lst.isEmpty() ) {
				return types.EMPTY;
			}
	
			var compYes = new PrimProc('compYes', 1, false, false,
					function(x) { return CALL(comp, [x, lst.first()], id); });
			var compNo = new PrimProc('compNo', 1, false, false,
					function(x) { return CALL(comp, [x, lst.first()],
								  function(res) { return !res; });
					});
			var recCallProc = new PrimProc('quicksort', 1, false, false, quicksortHelp);
			return CALL(PRIMITIVES['filter'], [compYes, lst.rest()],
				function(half1) {
					return CALL(recCallProc, [half1],
						function(sorted1) {
							return CALL(PRIMITIVES['filter'], [compNo, lst.rest()],
								function(half2) {
									return CALL(recCallProc, [half2],
										function(sorted2) {
											return append([sorted1,
												       types.list([lst.first()]),
												       sorted2]);
										});
								});
						});
				});
		}
		return quicksortHelp(initList);
	};
}

var schemeListToArray = function(lst) {
	var result = [];
	while ( !lst.isEmpty() ) {
		result.push(lst.first());
		lst = lst.rest();
	}
	return result;
}

var compare = function(args, comp) {
	var curArg = args[0];
	for (var i = 1; i < args.length; i++) {
		if ( !comp(curArg, args[i]) ) {
			return false;
		}
		curArg = args[i];
	}
	return true;
}

// isAlphabeticString: string -> boolean
var isAlphabeticString = function(s) {
	for(var i = 0; i < s.length; i++) {
		if (! ((s.charAt(i) >= "a" && s.charAt(i) <= "z") ||
		       (s.charAt(i) >= "A" && s.charAt(i) <= "Z"))) {
			return false;
		}
	}
	return true;
}

var isNumericString = function(s) {
	for (var i = 0; i < s.length; i++) {
		if ( ! (s.charAt(i) >= '0' && s.charAt(i) <= '9') ) {
			return false;
		}
	}
	return true;
}

// isWhitespaceString: string -> boolean
var isWhitespaceString = (function() {
	var pat = new RegExp("^\\s*$");
	return function(s) {
		return (s.match(pat) ? true : false);
	}
}());




var isImmutable = function(x) {
	return ((isString(x) ||
		 isByteString(x) ||
		 isVector(x) ||
		 isBox(x)) &&
		!x.mutable);
};




// Every world configuration function (on-tick, stop-when, ...)
// produces a WorldConfigOption instance.
var WorldConfigOption = types.Class.extend({
	init: function(name) {
	    this.name = name;	    
	},

	configure: function(config) {
	    throw new Error("unimplemented");
	},

	toDomNode: function(cache) {
	    var div = document.createElement('div');
	    div.appendChild(document.createTextNode("(" + this.name + " ...)"));
	    return div;
	},

	toWrittenString: function(cache) {
	    return "(" + this.name + " ...)";
	},

	toDisplayedString: function(cache) {
	    return "(" + this.name + " ...)";
	}
});


var isWorldConfigOption = function(x) { return x instanceof WorldConfigOption; };



var onEvent = function(funName, inConfigName, numArgs) {
    return function(handler) {
	return onEventBang(funName, inConfigName)(handler,
						  new PrimProc('', numArgs, false, false,
							       function() {
								   return world.config.Kernel.getNoneEffect();
							       }));
    };
};

var onEventBang = function(funName, inConfigName) {
    return function(handler, effectHandler) {
	check(handler, isFunction, funName, 'procedure', 1);
	check(effectHandler, isFunction, funName, 'procedure', 2);
	return new (WorldConfigOption.extend({
		    init: function() {
			this._super(funName);
		    },
		    configure: function(config) {
			var newHash = {};
			newHash[inConfigName] = handler;
			newHash[inConfigName+'Effect'] = effectHandler;
			return config.updateAll(newHash);
		    }}))();
    };
};


var assocListToHash = helpers.assocListToHash;


var raise = function(v) {
	throw types.schemeError(v);
};




//////////////////////////////////////////////////////////////////////


var isNumber = jsnums.isSchemeNumber;
var isReal = jsnums.isReal;
var isRational = jsnums.isRational;
var isComplex = isNumber;
var isInteger = jsnums.isInteger;

var isNatural = function(x) {
	return jsnums.isExact(x) && isInteger(x) && jsnums.greaterThanOrEqual(x, 0);
}

var isSymbol = types.isSymbol;
var isChar = types.isChar;
var isString = types.isString;
var isPair = types.isPair;
var isEmpty = function(x) { return x === types.EMPTY; };
var isList = function(x) { return (isPair(x) || isEmpty(x)); };
var isVector = types.isVector;
var isBox = types.isBox;
var isHash = types.isHash;
var isByteString = types.isByteString;

var isByte = function(x) {
	return (isNatural(x) &&
		jsnums.lessThanOrEqual(x, 255));
}

var isBoolean = function(x) {
	return (x === true || x === false);
}

var isFunction = function(x) {
	return (x instanceof types.PrimProc ||
		x instanceof types.CasePrimitive ||
		x instanceof types.ClosureValue ||
		x instanceof types.CaseLambdaValue ||
		x instanceof types.ContinuationClosureValue);
}

var isEqual = function(x, y) {
	return types.isEqual(x, y, new types.UnionFind());
}

var isEq = function(x, y) {
	return x === y;
}

var isEqv = function(x, y) {
	if (isNumber(x) && isNumber(y)) {
		return jsnums.eqv(x, y);
	}
	else if (isChar(x) && isChar(y)) {
		return x.val === y.val;
	}
	return x === y;
}

var isImage = world.Kernel.isImage;
var isScene = world.Kernel.isScene;
var isColor = world.Kernel.isColor;
var colorDb = world.Kernel.colorDb;
var isStyle = function(x) {
	return ((isString(x) || isSymbol(x)) &&
		(x.toString().toLowerCase() == "solid" ||
		 x.toString().toLowerCase() == "outline"));
};


var isAssocList = function(x) {
	return isList(x) && length(x) == 2;
}



var arrayEach = function(arr, f) {
	for (var i = 0; i < arr.length; i++) {
		f.apply(arr[i], [arr[i], i]);
	}
}

var errorFormatStr = "~a: expects type <~a> as ~a argument, given: ~s~a";

var check = function(x, f, functionName, typeName, position, otherArgs) {
	
	if ( !f(x) ) {
		var otherArgsStr = '';
		if (otherArgs && otherArgs.length > 0) {
			otherArgsStr = '; other arguments were:';
			for (var i = 0; i < otherArgs.length; i++) {
				otherArgsStr += ' ' + types.toWrittenString(otherArgs[i]);
			}
		}

		var msg = helpers.format(errorFormatStr, [functionName,
					 		  typeName,
					 		  helpers.ordinalize(position),
							  x,
					 		  otherArgsStr]);
		raise( types.exnFailContract(msg, false) );
	}
}

var checkList = function(x, functionName, position, otherArgs) {
	if ( !isList(x) ) {
		var otherArgsStr = '';
		if (otherArgs && otherArgs.length > 0) {
			otherArgsStr = '; other arguments were:';
			for (var i = 0; i < otherArgs.length; i++) {
				otherArgsStr += ' ' + types.toWrittenString(otherArgs[i]);
			}
		}

		var msg = helpers.format(errorFormatStr, [functionName,
					 		  "list",
					 		  helpers.ordinalize(position),
							  x,
					 		  otherArgsStr]);
		raise( types.exnFailContract(msg, false) );
	}
}

var checkListOf = function(lst, f, functionName, typeName, position, otherArgs) {
	var otherArgsStr = '';
	if (otherArgs && otherArgs.length > 0) {
		otherArgsStr = '; other arguments were:';
		for (var i = 0; i < otherArgs.length; i++) {
			otherArgsStr += ' ' + types.toWrittenString(otherArgs[i]);
		}
	}

	if ( !isList(lst) ) {
		var msg = helpers.format(errorFormatStr, [functionName,
							  "list of " + typeName,
							   helpers.ordinalize(position),
							   x,
							   otherArgsStr]);
		raise( types.exnFailContract(msg, false) );
	}
	else {
		while( !lst.isEmpty() ) {
			if ( !f(lst.first()) ) {
				var msg = (functionName + ': expects type <list of ' +
					   typeName + '> as ' + helpers.ordinalize(position) + ' argument, given: ' +
					   types.toWrittenString(x) + otherArgsStr);

				raise( types.exnFailContract(msg, false) );
			}
			lst = lst.rest();
		}
	}
}

var checkAllSameLength = function(lists, functionName) {
	if (lists.length == 0)
		return;
	
	var len = length(lists[0]);
	arrayEach(lists,
		  function(lst, i) {
			if (length(lst) != len) {
				var msg = functionName + ': all lists must have the same size';
				raise( types.exnFailContract(msg, false) );
			}
		});
}


//////////////////////////////////////////////////////////////////////


// Special moby-specific primitives

PRIMITIVES['verify-boolean-branch-value'] =
	new PrimProc('verify-boolean-branch-value',
		     2,
		     false,
		     false,
		     function(x, aLoc) { 
			 if (x !== true && x !== false) {
			     // FIXME: should throw structure
			     // make-moby-error-type:branch-value-not-boolean
			     // instead.
			     throw new Error("the value " + sys.inspect(x) + " is not boolean type at " + aLoc);
			 }
			 return x;
		     })

PRIMITIVES['throw-cond-exhausted-error'] = 
	new PrimProc('throw-cond-exhausted-error',
		     1,
		     false,
		     false,
		     function(aLoc) {
			     // FIXME: should throw structure
			     // make-moby-error-type:conditional-exhausted
			     // instead.
			 throw new Error("cond exhausted at " + aLoc);
		     });


PRIMITIVES['print-values'] = 
    new PrimProc('print-values',
		 0,
		 true,
		 true,
		 function(state, values) {
		     for (var i = 0; i < values.length; i++) {
			 if (values[i] !== types.VOID) {
			     state.getPrintHook()(values[i]);
			 }
		     }
		     state.v = types.VOID;
		 });


//////////////////////////////////////////////////////////////////////

var defaultPrint = 
    new PrimProc('print', 
		 1, 
		 false, 
		 true, 
		 function(state, x) {
		     state.getPrintHook()(''+ types.toWrittenString(x) + '\n');
		     state.v = types.VOID;
		 });


PRIMITIVES['display'] = 
	new CasePrimitive('display',
		      [new PrimProc('display', 1, false, true, function(state, x) {
				  state.getPrintHook()('' + types.toDisplayedString(x));
			  state.v = types.VOID;
	}),
			  new PrimProc('display', 2, false, true, function(state, x, port) {
	     // FIXME
	     throw new Error("display to a port not implemented yet.");
	 } )]);



PRIMITIVES['newline'] = 
	new CasePrimitive('newline',
	[new PrimProc('newline', 0, false, true, function(state) {
		    state.getPrintHook()('\n');
	    state.v = types.VOID;
	}),
	 new PrimProc('newline', 1, false, false, function(port) {
	     // FIXME
	     throw new Error("newline to a port not implemented yet.");
	 } )]);



PRIMITIVES['current-print'] =
    new PrimProc('current-print', 
		 0, 
		 false, false,
		 function() {
		     return defaultPrint;
		 });


PRIMITIVES['current-continuation-marks'] =
    // FIXME: should be CasePrimitive taking either 0 or 1 arguments
    new PrimProc('current-continuation-marks',
		 0,
		 false, true,
		 function(state) {
		     var dict = types.makeLowLevelEqHash();
		     for (var i = 0; i < state.cstack.length; i++) {
			 if ( types.isContMarkRecordControl(state.cstack[i]) ) {
			     var aDict = state.cstack[i].dict;
			     var keys = aDict.keys();
			     for (var j = 0; j < keys.length; j++) {
				 dict.put( keys[j], (dict.get(keys[j]) || []) );
				 dict.get(keys[j]).push( aDict.get(keys[j]) );
			     }
			 }
		     }
		     state.v = types.continuationMarkSet(dict);
		 });

PRIMITIVES['continuation-mark-set->list'] = 
    new PrimProc('continuation-mark-set->list',
		 2,
		 false,
		 true,
		 function(state, markSet, keyV) {
		     check(markSet, 
			   types.isContinuationMarkSet, 
			   'continuation-mark-set->list',
			   'continuation-mark-set',
			   1);
		     state.v = types.list(markSet.ref(keyV));
		 });



PRIMITIVES['for-each'] =
    new PrimProc('for-each', 
		 2, 
		 true, false,
		 function(f, firstArg, arglists) {
		 	arglists.unshift(firstArg);
			check(f, isFunction, 'for-each', 'procedure', 1);
			arrayEach(arglists, function(lst, i) {checkList(lst, 'for-each', i+2);});
			checkAllSameLength(arglists, 'for-each');

			var forEachHelp = function(args) {
				if (args[0].isEmpty()) {
					return types.VOID;
				}

				var argsFirst = [];
				var argsRest = [];
				for (var i = 0; i < args.length; i++) {
					argsFirst.push(args[i].first());
					argsRest.push(args[i].rest());
				}

				return CALL(f, argsFirst,
					function(result) {return forEachHelp(argsRest);});
			}

			return forEachHelp(arglists);
		 });


/*
PRIMITIVES['random'] =
    new PrimProc("random",
		 0,
		 true, false,
		 function(args) {
		     if (args.length === 0) {
			  throw new Error("random not implemented yet\n");
		     } else if (args.length === 1) {
			  // FIXME: NOT RIGHT
			  sys.print("FIXME: random not implemented correctly yet\n");
			  return 0;
		     } else if (args.length === 2) {
			  throw new Error("random not implemented yet\n");
		     }
		 });
*/


PRIMITIVES['make-thread-cell'] = 
	new CasePrimitive('make-thread-cell', [
	new PrimProc("make-thread-cell",
		     1, false, false,
		     function(x) {
			  return new types.ThreadCell(x, false);
		     }
		    ),
	new PrimProc("make-thread-cell",
		     2, false, false,
		     function(x, y) {
			  return new types.ThreadCell(x, y);
		     }
		    )]);



PRIMITIVES['make-continuation-prompt-tag'] = 
	new CasePrimitive('make-continuation-prompt-tag', 
			  [
	new PrimProc("make-continuation-prompt-tag",
		     0, false, false,
		     function() {
			  return new types.ThreadCell();
		     }
		    ),
	new PrimProc("make-continuation-prompt-tag",
		     1, false, false,
		     function(x) {
			  return new types.ThreadCell(x);
		     }
		    )]);



var makeOptionPrimitive = function(name,
				   numArgs,
				   defaultVals,
				   bodyF) {
    var makeNthPrimitive = function(n) {
	return new PrimProc(name,
			     numArgs + n,
			     false,
			     false,
			     function() {
				 assert.equal(arguments.length,
					      numArgs + n);
				 var args = [];
				 for (var i = 0; i < arguments.length; i++) {
				     args.push(arguments[i]);
				 }
				 return bodyF.apply(
				     bodyF,
				     args.concat(defaultVals.slice(i, defaultVals.length)));
			     });
    };
	
    var cases = [];
    for (var i = 0; i <= defaultVals.length; i++) {
	cases.push(makeNthPrimitive(i));
    }
    return new CasePrimitive(name, cases);
};




PRIMITIVES['make-struct-type'] =
	makeOptionPrimitive(
	    'make-struct-type',
	    4,
	    [false, 
	     types.EMPTY,
	     types.symbol("prefab"),
	     false,
	     types.EMPTY,
	     false],
	    function(name,
 	 	     superType,
 	 	     initFieldCnt, 
 	 	     autoFieldCnt,
 		     autoV,
 	 	     props,	// FIXME: currently ignored
 	 	     inspector, // FIXME: currently ignored
 	 	     procSpec, 	// FIXME: currently ignored
 	 	     immutables, // FIXME: currently ignored
 	 	     guard) {	 // FIXME: currently ignored
		var aStructType = 
		    types.makeStructureType(name,
					    jsnums.toFixnum(initFieldCnt),
					    jsnums.toFixnum(autoFieldCnt),
					    superType,
					    autoV);

		return new types.ValuesWrapper
		([aStructType,
		 (new PrimProc('constructor',
			       aStructType.numberOfArgs,
			       false,
			       false,
			       aStructType.constructor)),
		 (new PrimProc('predicate', 1, false, false, aStructType.predicate)),
		 (new PrimProc('accessor',
			       2,
			       false,
			       false,
			       function(x, i) {
					check(x, aStructType.predicate, name+'-ref', '<struct:'+name+'>', 1);
					check(i, isNatural, name+'-ref', 'non-negative exact integer', 2);

					var numFields = aStructType.numberOfFields;
					if ( jsnums.greaterThanOrEqual(i, numFields) ) {
					  	var msg = (name+'-ref: slot index for <struct'+name+'> not in ' +
							   '[0, ' + (numFields-1) + ']: ' + i);
					  	raise( types.exnFailContract(msg, false) );
					}
					return aStructType.accessor(x, jsnums.toFixnum(i));
			       })),
		 (new PrimProc('mutator',
			       3,
			       false,
			       false,
			       function(x, i, v) {
					check(x, aStructType.predicate, name+'-set!', '<struct:'+name+'>', 1);
					check(i, isNatural, name+'-set!', 'non-negative exact integer', 2);

					var numFields = aStructType.numberOfFields;
					if ( jsnums.greaterThanOrEqual(i, numFields) ) {
					  	var msg = (name+'-set!: slot index for <struct'+name+'> not in ' +
							   '[0, ' + (numFields-1) + ']: ' + i);
					  	raise( types.exnFailContract(msg, false) );
					}
					aStructType.mutator(x, jsnums.toFixnum(i), v)
			       }))]);
	    });
			    
			   
PRIMITIVES['make-struct-field-accessor'] =
	makeOptionPrimitive(
	    'make-struct-field-accessor',
	    2,
	    [false],
	    function(accessor, fieldPos, fieldName) {
		return new PrimProc(fieldName, 
				     1, 
				     false,
				     false,
				     function(x) {

					 return accessor.impl(x, fieldPos);
				     });
	    });



PRIMITIVES['make-struct-field-mutator'] =
	makeOptionPrimitive(
	    'make-struct-field-mutator',
	    2,
	    [false],
	    function(mutator, fieldPos, fieldName) {
		return new PrimProc(fieldName, 
				     2, 
				     false,
				     false,
				     function(x, v) {
					 return mutator.impl(x, fieldPos, v);
				     });
	    });



PRIMITIVES['current-inexact-milliseconds'] =
    new PrimProc(
	'current-inexact-milliseconds',
	0,
	false, false,
	function() {
	    return jsnums.makeFloat((new Date()).valueOf());
	});


PRIMITIVES['procedure-arity'] = new PrimProc('procedure-arity', 1, false, false, procedureArity);


PRIMITIVES['apply'] =
    new PrimProc('apply',
		 2,
		 true, false,
		 function(f, firstArg, args) {
		 	check(f, isFunction, 'apply', 'procedure', 1);
		 	args.unshift(firstArg);

			var lastArg = args.pop();
			checkList(lastArg, 'apply', args.length+2);
			var args = args.concat(schemeListToArray(lastArg));

			return CALL(f, args, id);
		 });


PRIMITIVES['values'] =
    new PrimProc('values',
		 0,
		 true, false,
		 function(args) {
		 	if (args.length === 1) {
				return args[0];
			}
		 	return new types.ValuesWrapper(args);
		 });


PRIMITIVES['call-with-values'] =
    new PrimProc('call-with-values',
		 2,
		 false, false,
		 function(g, r) {
		 	check(g, funArityContains(0), 'call-with-values', 'procedure', 1);
			check(r, isFunction, 'call-with-values', 'procedure', 2);

			return CALL(g, [],
				function(res) {
					return callWithValues(r, res);
				});
		 });


PRIMITIVES['compose'] =
    new PrimProc('compose',
		 0,
		 true, false,
		 function(procs) {
		 	arrayEach(procs, function(p, i) {check(p, isFunction, 'compose', 'procedure', i+1);});

			if (procs.length == 0) {
				return PRIMITIVES['values'];
			}
			var funList = types.list(procs).reverse();
			
			var composeHelp = function(x, fList) {
				if ( fList.isEmpty() ) {
					return x;
				}

				return CALL(new PrimProc('', 1, false, false,
						         function(args) {
							     return callWithValues(fList.first(), args);
							 }),
					    [x],
					    function(result) {
						return composeHelp(result, fList.rest());
					    });
			}
			return new PrimProc('', 0, true, false,
					    function(args) {
						if (args.length === 1) {
							return composeHelp(args[0], funList);
						}
					        return composeHelp(new types.ValuesWrapper(args), funList);
					    });
		 });


PRIMITIVES['current-seconds'] =
    new PrimProc('current-seconds',
		 0,
		 false, false,
		 function() {
		 	return Math.floor( (new Date()).getTime() / 1000 );
		 });


PRIMITIVES['not'] =
    new PrimProc('not',
		 1,
		 false, false,
		 function(x) {
		 	return x === false;
		 });


PRIMITIVES['void'] =
    new PrimProc('void', 0, true, false,
		 function(args) {
		 	return types.VOID;
		 });


PRIMITIVES['random'] =
	new CasePrimitive('random',
	[new PrimProc('random', 0, false, false,
		      function() {return jsnums.float(Math.random());}),
	 new PrimProc('random', 1, false, false,
		      function(n) {
			  check(n, isNatural, 'random', 'non-negative exact integer', 1);
			  return Math.floor(Math.random() * jsnums.toFixnum(n));
		      }) ]);


PRIMITIVES['identity'] = new PrimProc('identity', 1, false, false, id);


PRIMITIVES['raise'] = new PrimProc('raise', 1, false, false, raise);

PRIMITIVES['error'] =
    new PrimProc('error',
		 1,
		 true, false,
		 function(arg1, args) {
		 	check(arg1, function(x) {return isSymbol(x) || isString(x);},
			      'error', 'symbol or string', 1);

			if ( isSymbol(arg1) ) {
				if ( args.length === 0 ) {
					raise( types.exnFail("error: " + arg1.val, false) );
				}
				var formatStr = args.shift();
				check(formatStr, isString, 'error', 'string', 2);

				args.unshift(arg1);
				raise( types.exnFail(format('~s: '+formatStr.toString(), args), false) );
			}
			else {
				var msg = arg1.toString();
				for (var i = 0; i < args.length; i++) {
					msg += args[i].toWrittenString();
				}
				raise( types.exnFail(msg, false) );
			}
		 });


PRIMITIVES['make-exn'] =
    new PrimProc('make-exn',
		 2,
		 false, false,
		 function(msg, contMarks) {
		 	check(msg, isString, 'make-exn', 'string', 1);
			check(contMarks, types.isContinuationMarkSet, 'make-exn', 'continuation mark set', 2);
			return types.exn(msg, contMarks);
		 });

PRIMITIVES['exn-message'] =
    new PrimProc('exn-message',
		 1,
		 false, false,
		 function(exn) {
		 	check(exn, types.isExn, 'exn-message', 'exn', 1);
			return types.exnMessage(exn);
		 });


PRIMITIVES['exn-continuation-marks'] =
    new PrimProc('exn-continuation-marks',
		 1,
		 false, false,
		 function(exn) {
		 	check(exn, types.isExn, 'exn-continuation-marks', 'exn', 1);
			return types.exnContMarks(exn);
		 });


PRIMITIVES['make-exn:fail'] =
    new PrimProc('make-exn:fail',
		 2,
		 false, false,
		 function(msg, contMarks) {
		 	check(msg, isString, 'make-exn:fail', 'string', 1);
			check(contMarks, types.isContinuationMarkSet, 'make-exn:fail', 'continuation mark set', 2);
			return types.exnFail(msg, contMarks);
		 });


PRIMITIVES['make-exn:fail:contract'] =
    new PrimProc('make-exn:fail:contract',
		 2,
		 false, false,
		 function(msg, contMarks) {
		 	check(msg, isString, 'make-exn:fail:contract', 'string', 1);
			check(contMarks, types.isContinuationMarkSet, 'make-exn:fail:contract', 'continuation mark set', 2);
			return types.exnFailContract(msg, contMarks);
		 });



/***********************
 *** Math Primitives ***
 ***********************/


PRIMITIVES['*'] = 
    new PrimProc('*',
		 0,
		 true, false,
		 function(args) {
		     arrayEach(args, function(x, i) {check(x, isNumber, '*', 'number', i+1);});

		     var result = types.rational(1);
		     for(var i = 0; i < args.length; i++) {
			  result = jsnums.multiply(args[i], result);
		     }
		     return result;
		 });



PRIMITIVES['-'] = 
    new PrimProc("-",
		 1,
		 true, false,
		 function(x, args) {
		     check(x, isNumber, '-', 'number', 1);
		     arrayEach(args, function(y, i) {check(y, isNumber, '-', 'number', i+2);});

		     if (args.length == 0) { 
			  return jsnums.subtract(0, x);
		     }
		     var result = x;
		     for (var i = 0; i < args.length; i++) {
			  result = jsnums.subtract(result, args[i]);
		     }
		     return result;
		 });


PRIMITIVES['+'] = 
    new PrimProc("+",
		 0,
		 true, false,
		 function(args) {
		     arrayEach(args, function(x, i) {check(x, isNumber, '+', 'number', i+1);});

		     if (args.length == 0) { 
			  return 0;
		     }
		     var result = args[0];
		     for (var i = 1; i < args.length; i++) {
			  result = jsnums.add(result, args[i]);
		     }
		     return result;
		 });


PRIMITIVES['='] = 
    new PrimProc("=",
		 2,
		 true, false,
		 function(x, y, args) {
		 	args.unshift(y);
		 	args.unshift(x);
		 	arrayEach(args, function(z, i) {check(z, isNumber, '=', 'number', i+1);});

		 	return compare(args, jsnums.equals);
		 });


PRIMITIVES['=~'] =
    new PrimProc('=~',
		 3,
		 false, false,
		 function(x, y, range) {
		 	check(x, isReal, '=~', 'real', 1);
			check(y, isReal, '=~', 'real', 2);
			check(range, function(n) {return isReal(n) && jsnums.greaterThanOrEqual(n, 0);},
			      '=~', 'non-negative real', 3);

			return jsnums.lessThanOrEqual(jsnums.abs(jsnums.subtract(x, y)), range);
		 });


PRIMITIVES['/'] =
    new PrimProc('/',
		 1,
		 true, false,
		 function(x, args) {
		 	check(x, isNumber, '/', 'number', 1);
		 	arrayEach(args, function(y, i) {check(y, isNumber, '/', 'number', i+2);});
			
			if (args.length == 0) {
				return jsnums.divide(1, x);
			}

		 	var res = x;
		 	for (var i = 0; i < args.length; i++) {
				res = jsnums.divide(res, args[i]);
		 	}
		 	return res;
		 });



PRIMITIVES['sub1'] =
    new PrimProc("sub1",
		 1,
		 false, false,
		 sub1);

PRIMITIVES['add1'] =
    new PrimProc("add1",
		 1,
		 false, false,
		 add1);


PRIMITIVES['<'] = 
    new PrimProc('<',
		 2,
		 true, false,
		 function(x, y, args) {
		 	args.unshift(y);
		 	args.unshift(x);
		 	arrayEach(args, function(z, i) {check(z, isNumber, '<', 'number', i+1);});

		 	return compare(args, jsnums.lessThan);
		 });


PRIMITIVES['>'] =
    new PrimProc('>',
		 2,
		 true, false,
		 function(x, y, args) {
		 	args.unshift(y);
		 	args.unshift(x);
		 	arrayEach(args, function(z, i) {check(z, isNumber, '>', 'number', i+1);});

		 	return compare(args, jsnums.greaterThan);
		 });


PRIMITIVES['<='] = 
    new PrimProc('<=',
		 2,
		 true, false,
		 function(x, y, args) {
		 	args.unshift(y);
		 	args.unshift(x);
		 	arrayEach(args, function(z, i) {check(z, isNumber, '<=', 'number', i+1);});

		 	return compare(args, jsnums.lessThanOrEqual);
		 });


PRIMITIVES['>='] =
    new PrimProc('>=',
		 2,
		 true, false,
		 function(x, y, args) {
		 	args.unshift(y);
		 	args.unshift(x);
		 	arrayEach(args, function(z, i) {check(z, isNumber, '>=', 'number', i+1);});

		 	return compare(args, jsnums.greaterThanOrEqual);
		 });




PRIMITIVES['abs'] =
    new PrimProc('abs',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'abs', 'real', 1);
			return jsnums.abs(x);
		 });


PRIMITIVES['quotient'] =
    new PrimProc('quotient',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isInteger, 'quotient', 'integer', 1);
			check(y, isInteger, 'quotient', 'integer', 2);

			return jsnums.quotient(x, y);
		 });


PRIMITIVES['remainder'] =
    new PrimProc('remainder',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isInteger, 'remainder', 'integer', 1);
			check(y, isInteger, 'remainder', 'integer', 2);

			return jsnums.remainder(x, y);
		 });


PRIMITIVES['modulo'] =
    new PrimProc('modulo',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isInteger, 'modulo', 'integer', 1);
			check(y, isInteger, 'modulo', 'integer', 2);

			return jsnums.modulo(x, y);
		 });


PRIMITIVES['max'] =
    new PrimProc('max',
		 1,
		 true, false,
		 function(x, args) {
		 	check(x, isReal, 'max', 'real', 1);
			arrayEach(args, function(y, i) {check(y, isReal, 'max', 'real', i+2);});

			var curMax = x;
			for (var i = 0; i < args.length; i++) {
				if ( jsnums.greaterThan(args[i], curMax) ) {
					curMax = args[i];
				}
			}
			return curMax;
		 });


PRIMITIVES['min'] =
    new PrimProc('min',
		 1,
		 true, false,
		 function(x, args) {
		 	check(x, isReal, 'min', 'real', 1);
			arrayEach(args, function(y, i) {check(y, isReal, 'min', 'real', i+2);});

			var curMin = x;
			for (var i = 0; i < args.length; i++) {
				if ( jsnums.lessThan(args[i], curMin) ) {
					curMin = args[i];
				}
			}
			return curMin;
		 });


PRIMITIVES['gcd'] =
    new PrimProc('gcd',
		 1,
		 true, false,
		 function(x, args) {
		 	args.unshift(x);
		 	arrayEach(args, function(y, i) {check(y, isInteger, 'gcd', 'integer', i+1);});

		 	return jsnums.gcd.apply(null, args);
		 });

PRIMITIVES['lcm'] =
    new PrimProc('lcm',
		 1,
		 true, false,
		 function(x, args) {
		 	args.unshift(x);
		 	arrayEach(args, function(y, i) {check(y, isInteger, 'lcm', 'integer', i+1);});

		 	return jsnums.gcd.apply(null, args);
		 });


PRIMITIVES['floor'] =
    new PrimProc('floor',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'floor', 'real', 1);
			return jsnums.floor(x);
		 });


PRIMITIVES['ceiling'] =
    new PrimProc('ceiling',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'ceiling', 'real', 1);
			return jsnums.ceiling(x);
		 });


PRIMITIVES['round'] =
    new PrimProc('round',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'round', 'real', 1);
			return jsnums.round(x);
		 });


PRIMITIVES['numerator'] =
    new PrimProc('numerator',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isRational, 'numerator', 'rational', 1);
			return jsnums.numerator(x);
		 });


PRIMITIVES['denominator'] =
    new PrimProc('denominator',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isRational, 'denominator', 'rational', 1);
			return jsnums.denominator(x);
		 });


PRIMITIVES['expt'] = 
    new PrimProc("expt",
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isNumber, 'expt', 'number', 1);
			check(y, isNumber, 'expt', 'number', 2);
		 	return jsnums.expt(x, y);
		 });


PRIMITIVES['exp'] =
    new PrimProc('exp',
		 1,
		 false, false,
		 function(x, y) {
		 	check(x, isNumber, 'exp', 'number', 1);
			return jsnums.exp(x);
		 });


PRIMITIVES['log'] =
    new PrimProc('log',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'log', 'number', 1);
			return jsnums.log(x);
		 });


PRIMITIVES['sin'] =
    new PrimProc('sin',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'sin', 'number', 1);
			return jsnums.sin(x);
		 });


PRIMITIVES['cos'] =
    new PrimProc('cos',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'cos', 'number', 1);
			return jsnums.cos(x);
		 });


PRIMITIVES['tan'] =
    new PrimProc('tan',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'tan', 'number', 1);
			return jsnums.tan(x);
		 });


PRIMITIVES['asin'] =
    new PrimProc('asin',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'asin', 'number', 1);
			return jsnums.asin(x);
		 });


PRIMITIVES['acos'] =
    new PrimProc('acos',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'acos', 'number', 1);
			return jsnums.acos(x);
		 });


PRIMITIVES['atan'] =
    new PrimProc('atan',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'atan', 'number', 1);
			return jsnums.atan(x);
		 });


PRIMITIVES['sinh'] =
    new PrimProc('sinh',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'sinh', 'number', 1);
			return jsnums.sinh(x);
		 });


PRIMITIVES['cosh'] =
    new PrimProc('cosh',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'cosh', 'number', 1);
			return jsnums.cosh(x);
		 });


PRIMITIVES['sqr'] =
    new PrimProc('sqr',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'sqr', 'number', 1);
			return jsnums.sqr(x);
		 });


PRIMITIVES['sqrt'] =
    new PrimProc('sqrt',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'sqrt', 'number', 1);
			return jsnums.sqrt(x);
		 });


PRIMITIVES['integer-sqrt'] =
    new PrimProc('integer-sqrt',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isInteger, 'integer-sqrt', 'integer', 1);
			return jsnums.integerSqrt(x);
		 });


PRIMITIVES['make-rectangular'] =
    new PrimProc('make-rectangular',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isReal, 'make-rectangular', 'real', 1);
			check(y, isReal, 'make-rectangular', 'real', 2);
			return jsnums.makeRectangular(x, y);
		 });

PRIMITIVES['make-polar'] =
    new PrimProc('make-polar',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isReal, 'make-polar', 'real', 1);
			check(x, isReal, 'make-polar', 'real', 2);
			return jsnums.makePolar(x, y);
		 });


PRIMITIVES['real-part'] =
    new PrimProc('real-part',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'real-part', 'number', 1);
			return jsnums.realPart(x);
		 });


PRIMITIVES['imag-part'] =
    new PrimProc('imag-part',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'imag-part', 'number', 1);
			return jsnums.imaginaryPart(x);
		 });


PRIMITIVES['angle'] =
    new PrimProc('angle',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'angle', 'number', 1);
			return jsnums.angle(x);
		 });


PRIMITIVES['magnitude'] =
    new PrimProc('magnitude',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'magnitude', 'number', 1);
			return jsnums.magnitude(x);
		 });


PRIMITIVES['conjugate'] =
    new PrimProc('conjugate',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'conjugate', 'number', 1);
			return jsnums.conjugate(x);
		 });


PRIMITIVES['sgn'] =
    new PrimProc('sgn',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'sgn', 'real number', 1);
			if ( jsnums.greaterThan(x, 0) ) {
				return 1;
			}
			else if ( jsnums.lessThan(x, 0) ) {
				return -1;
			}
			else {
				return 0;
			}
		 });


PRIMITIVES['inexact->exact'] =
    new PrimProc('inexact->exact',
		 1,
		 false, false,
		 function (x) {
		 	check(x, isNumber, 'inexact->exact', 'number', 1);
			return jsnums.toExact(x);
		 });


PRIMITIVES['number->string'] =
    new PrimProc('number->string',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isNumber, 'number->string', 'number', 1);
			return types.string(x+'');
		 });


PRIMITIVES['string->number'] =
    new PrimProc('string->number',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string->number', 'string', 1);
			return jsnums.fromString(str);
		 });


PRIMITIVES['xml->s-exp'] =
    new PrimProc('xml->s-exp',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'xml->s-exp', 'string', 1);
			if (str.length == 0) {
				return types.string('');
			}

			var xmlDoc;
			try {
				//Internet Explorer
				xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
				xmlDoc.async = "false";
				xmlDoc.loadXML(s);
				// FIXME: check parse errors
			}
			catch(e) {
				var parser = new DOMParser();
				xmlDoc = parser.parseFromString(s, "text/xml");
				// FIXME: check parse errors
			}

			var parseAttributes = function(attrs) {
				var result = types.EMPTY;
				for (var i = 0; i < attrs.length; i++) {
					var keyValue = types.cons(types.symbol(attrs.item(i).nodeName),
								  types.cons(attrs.item(i).nodeValue,
									     types.EMPTY));
					result = types.cons(keyValue, result);
				}
				return types.cons(types.symbol("@"), result).reverse();
			};

			var parse = function(node) {
				if (node.nodeType == Node.ELEMENT_NODE) {
					var result = types.EMPTY;
					var child = node.firstChild;
					while (child != null) {
						var nextResult = parse(child);
						if (isString(nextResult) && 
						    !result.isEmpty() &&
						    isString(result.first())) {
							result = types.cons(result.first() + nextResult,
									    result.rest());
						} else {
							result = types.cons(nextResult, result);
						}
						child = child.nextSibling;
					}
					result = result.reverse();
					result = types.cons(parseAttributes(node.attributes),
							    result);
					result = types.cons(
						types.symbol(node.nodeName),
						result);
					return result;
				} else if (node.nodeType == Node.TEXT_NODE) {
					return node.textContent;
				} else if (node.nodeType == Node.CDATA_SECTION_NODE) {
					return node.data;
				} else {
					return types.EMPTY;
				}
			};
			var result = parse(xmlDoc.firstChild);
			return result;
		 });




/******************
 *** Predicates ***
 ******************/

PRIMITIVES['procedure?'] = new PrimProc('procedure?', 1, false, false, isFunction);

PRIMITIVES['pair?'] = new PrimProc('pair?', 1, false, false, isPair);
PRIMITIVES['cons?'] = new PrimProc('cons?', 1, false, false, isPair);
PRIMITIVES['empty?'] = new PrimProc('empty?', 1, false, false, isEmpty);
PRIMITIVES['null?'] = new PrimProc('null?', 1, false, false, isEmpty);

PRIMITIVES['undefined?'] = new PrimProc('undefined?', 1, false, false, function(x) { return x === types.UNDEFINED; });
PRIMITIVES['void?'] = new PrimProc('void?', 1, false, false, function(x) { return x === types.VOID; });

PRIMITIVES['symbol?'] = new PrimProc('symbol?', 1, false, false, isSymbol);
PRIMITIVES['string?'] = new PrimProc('string?', 1, false, false, isString);
PRIMITIVES['char?'] = new PrimProc('char?', 1, false, false, isChar);
PRIMITIVES['boolean?'] = new PrimProc('boolean?', 1, false, false, isBoolean);
PRIMITIVES['vector?'] = new PrimProc('vector?', 1, false, false, isVector);
PRIMITIVES['struct?'] = new PrimProc('struct?', 1, false, false, types.isStruct);
PRIMITIVES['eof-object?'] = new PrimProc('eof-object?', 1, false, false, function(x) { return x === types.EOF; });
PRIMITIVES['posn?'] = new PrimProc('posn?', 1, false, false, types.isPosn);
PRIMITIVES['bytes?'] = new PrimProc('bytes?', 1, false, false, isByteString);
PRIMITIVES['byte?'] = new PrimProc('byte?', 1, false, false, isByte);

PRIMITIVES['number?'] = new PrimProc('number?', 1, false, false, isNumber);
PRIMITIVES['complex?'] = new PrimProc('complex?', 1, false, false, isComplex);
PRIMITIVES['real?'] = new PrimProc('real?', 1, false, false, isReal);
PRIMITIVES['rational?'] = new PrimProc('rational?', 1, false, false, isRational);
PRIMITIVES['integer?'] = new PrimProc('integer?', 1, false, false, isInteger);

PRIMITIVES['exact?'] =
    new PrimProc('exact?', 1, false, false,
		 function(x) {
			check(x, isNumber, 'exact?', 'number', 1);
			return jsnums.isExact(x);
		 });
PRIMITIVES['inexact?'] =
    new PrimProc('inexact?', 1, false, false,
		 function(x) {
			check(x, isNumber, 'inexact?', 'number', 1);
			return !jsnums.isExact(x);
		 });

PRIMITIVES['odd?'] =
    new PrimProc('odd?',
		 1,
		 false, false,
		 function(x) {
			check(x, isInteger, 'odd?', 'integer', 1);
			return jsnums.equals(jsnums.modulo(x, 2), 1);
		 });
PRIMITIVES['even?'] =
    new PrimProc('even?',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isInteger, 'even?', 'integer', 1);
			return jsnums.equals(jsnums.modulo(x, 2), 0);
		 });

PRIMITIVES['zero?'] =
    new PrimProc("zero?",
		 1,
		 false, false,
		 function(x) {
		     return jsnums.equals(0, x)
		 });

PRIMITIVES['positive?'] =
    new PrimProc('positive?',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'positive?', 'real', 1);
			return jsnums.greaterThan(x, 0);
		 });
PRIMITIVES['negative?'] =
    new PrimProc('negative?',
		 1,
		 false, false,
		 function(x) {
		 	check(x, isReal, 'negative?', 'real', 1);
			return jsnums.lessThan(x, 0);
		 });

PRIMITIVES['box?'] = new PrimProc('box?', 1, false, false, isBox);

PRIMITIVES['hash?'] = new PrimProc('hash?', 1, false, false, isHash);


PRIMITIVES['eq?'] = new PrimProc('eq?', 2, false, false, isEq);
PRIMITIVES['eqv?'] = new PrimProc('eqv?', 2, false, false, isEqv);
PRIMITIVES['equal?'] = new PrimProc('equal?', 2, false, false, isEqual);
PRIMITIVES['equal~?'] =
    new PrimProc('equal~?',
		 3,
		 false, false,
		 function(x, y, range) {
		 	check(range, function(n) {return isReal(n) && jsnums.greaterThanOrEqual(n, 0);},
			      'equal~?', 'non-negative real', 3);

			return (isEqual(x, y) ||
				(isReal(x) && isReal(y) &&
				 jsnums.lessThanOrEqual(jsnums.abs(jsnums.subtract(x, y)), range)));
		 });


PRIMITIVES['false?'] = new PrimProc('false?', 1, false, false, function(x) { return x === false; });
PRIMITIVES['boolean=?'] =
    new PrimProc('boolean=?',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isBoolean, 'boolean=?', 'boolean', 1);
			check(y, isBoolean, 'boolean=?', 'boolean', 2);
			return x === y;
		 });

PRIMITIVES['symbol=?'] =
    new PrimProc('symbol=?',
		 2,
		 false, false,
		 function(x, y) {
		 	check(x, isSymbol, 'symbol=?', 'symbol', 1);
			check(y, isSymbol, 'symbol=?', 'symbol', 2);
			return isEqual(x, y);
		 });


/***********************
 *** List Primitives ***
 ***********************/

PRIMITIVES['cons'] =
    new PrimProc('cons',
		 2,
		 false, false,
		 function(f, r) {
		 	checkList(r, "cons", 2);
		 	return types.cons(f, r);
		 });


var carFirst = function(name) {
	return function (lst) {
		checkList(lst, name, 1);
		return lst.first();
	};
}
PRIMITIVES['first'] = new PrimProc('first', 1, false, false, carFirst('first'));
PRIMITIVES['car'] = new PrimProc('car', 1, false, false, carFirst('car'));


var cdrRest = function(name) {
	return function (lst) {
		checkList(lst, name, 1);
		return lst.rest();
	};
}
PRIMITIVES['rest'] = new PrimProc('rest', 1, false, false, cdrRest('rest'));
PRIMITIVES['cdr'] = new PrimProc('cdr', 1, false, false, cdrRest('cdr'));


PRIMITIVES['caar'] =
    new PrimProc('caar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'caar', 1);
		 	lst.first().first();
		 });

var cadrSecond = function(name) {
	return function(lst) {
		checkList(lst, name, 1);
		return lst.rest().first();
	};
}
PRIMITIVES['cadr'] = new PrimProc('cadr', 1, false, false, cadrSecond('cadr'));
PRIMITIVES['second'] = new PrimProc('second', 1, false, false, cadrSecond('second'));

PRIMITIVES['cdar'] =
    new PrimProc('cdar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cdar', 1);
		 	return lst.first().rest();
		 });

PRIMITIVES['cddr'] =
    new PrimProc('cddr',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cddr', 1);
		 	return lst.rest().rest();
		 });

PRIMITIVES['caaar'] =
    new PrimProc('caaar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'caaar', 1);
		 	return lst.first().first().first();
		 });

PRIMITIVES['caadr'] =
    new PrimProc('caadr',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'caadr', 1);
		 	return lst.rest().first().first();
		 });

PRIMITIVES['cadar'] =
    new PrimProc('cadar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cadar', 1);
		 	return lst.first().rest().first();
		 });

PRIMITIVES['cdaar'] =
    new PrimProc('cdaar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cdaar', 1);
		 	return lst.first().first().rest();
		 });

PRIMITIVES['cdadr'] =
    new PrimProc('cdadr',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cdadr', 1);
		 	return lst.rest().first().rest();
		 });

PRIMITIVES['cddar'] =
    new PrimProc('cddar',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cddar', 1);
		 	return lst.first().rest().rest();
		 });

var caddrThird = function(name) {
	return function(lst) {
		checkList(lst, name, 1);
		return lst.rest().rest().first();
	};
}
PRIMITIVES['caddr'] = new PrimProc('caddr', 1, false, false, caddrThird('caddr'));
PRIMITIVES['third'] = new PrimProc('third', 1, false, false, caddrThird('third'));

PRIMITIVES['cdddr'] =
    new PrimProc('cdddr',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'cdddr', 1);
		 	return lst.rest().rest().rest();
		 });

var cadddrFourth = function(name) {
	return function (lst) {
		checkList(lst, name, 1);
		return lst.rest().rest().rest().first();
	};
}
PRIMITIVES['cadddr'] = new PrimProc('cadddr', 1, false, false, cadddrFourth('cadddr'));
PRIMITIVES['fourth'] = new PrimProc('fourth', 1, false, false, cadddrFourth('fourth'));

PRIMITIVES['fifth'] =
    new PrimProc('fifth',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'fifth', 1);
		 	return lst.rest().rest().rest().rest().first();
		 });

PRIMITIVES['sixth'] =
    new PrimProc('sixth',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'sixth', 1);
		 	return lst.rest().rest().rest().rest().rest().first();
		 });

PRIMITIVES['seventh'] =
    new PrimProc(
		 'seventh',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'seventh', 1);
		 	return lst.rest().rest().rest().rest().rest().rest().first();
		 });

PRIMITIVES['eighth'] =
    new PrimProc('eighth',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'eighth', 1);
		 	return lst.rest().rest().rest().rest().rest().rest().rest().first();
		 });


PRIMITIVES['length'] =
    new PrimProc('length',
		 1,
		 false, false,
		 function(lst) {
		  	return jsnums.makeRational(length(lst));
		 });


PRIMITIVES['list?'] = new PrimProc('list?', 1, false, false, isList);


PRIMITIVES['list'] =
    new PrimProc('list',
		 0,
		 true, false,
		 types.list);


PRIMITIVES['list*'] =
    new PrimProc('list*',
		 1,
		 true, false,
		 function(items, otherItems) {
		 	if (otherItems.length == 0) {
				return items;
			}
		 
		 	var lastListItem = otherItems.pop();
		 	checkList(lastListItem, 'list*', otherItems.length+2);

		 	otherItems.unshift(items);
		 	return append([types.list(otherItems), lastListItem]);
		 });


PRIMITIVES['list-ref'] =
    new PrimProc('list-ref',
		 2,
		 false, false,
		 function(origList, num) {
		 	checkList(origList, 'list-ref', 1);
		 	check(num, isNatural, 'list-ref', 'non-negative exact integer', 2);

			var lst = origList;
			var n = jsnums.toFixnum(num);
		 	for (var i = 0; i < n; i++) {
		 		if (lst.isEmpty()) {
					var msg = ('list-ref: index ' + n +
						   ' is too large for list: ' +
						   types.toWrittenString(origList));
					raise( types.exnFailContract(msg, false) );
		 		}
	  			lst = lst.rest();
		 	}
		 	return lst.first();
		 });

PRIMITIVES['list-tail'] =
    new PrimProc('list-tail',
		 2,
		 false, false,
		 function(lst, num) {
		 	checkList(lst, 'list-tail', 1);
			check(x, isNatural, 'list-tail', 'non-negative exact integer', 2);

			var lst = origList;
			var n = jsnums.toFixnum(num);
		 	for (var i = 0; i < n; i++) {
				if (lst.isEmpty()) {
					var msg = ('list-tail: index ' + n +
						   ' is too large for list: ' +
						   types.toWrittenString(origList));
					raise( types.exnFailContract(msg, false) );
				}
				lst = lst.rest();
			}
			return lst;
		 });


PRIMITIVES['append'] =
    new PrimProc('append',
		 0,
		 true, false,
		 append);


PRIMITIVES['reverse'] =
    new PrimProc('reverse',
		 1,
		 false, false,
		 function(lst) {
		 	checkList(lst, 'reverse', 1);
		 	return lst.reverse();
		 });


PRIMITIVES['map'] =
    new PrimProc('map',
		 2,
		 true, false,
		 function(f, lst, arglists) {
		 	arglists.unshift(lst);
		 	check(f, isFunction, 'map', 'procedure', 1);
		 	arrayEach(arglists, function(x, i) {checkList(x, 'map', i+2);});
			checkAllSameLength(arglists, 'map');
			
			var mapHelp = function(f, args, acc) {
				if (args[0].isEmpty()) {
				    return acc.reverse();
				}
				
				var argsFirst = [];
				var argsRest = [];
				for (var i = 0; i < args.length; i++) {
					argsFirst.push(args[i].first());
					argsRest.push(args[i].rest());
				}
				var result = CALL(f, argsFirst,
					function(result) {
						return mapHelp(f, argsRest, types.cons(result, acc));
					});
				return result;
			}
			return mapHelp(f, arglists, types.EMPTY);
		});


PRIMITIVES['andmap'] =
    new PrimProc('andmap',
		 2,
		 true, false,
		 function(f, lst, arglists) {
		 	arglists.unshift(lst);
		  	check(f, isFunction, 'andmap', 'procedure', 1);
		  	arrayEach(arglists, function(x, i) {checkList(x, 'andmap', i+2);});
			checkAllSameLength(arglists, 'andmap');
  
			var andmapHelp = function(f, args) {
				if ( args[0].isEmpty() ) {
					return true;
				}

				var argsFirst = [];
				var argsRest = [];
				for (var i = 0; i < args.length; i++) {
					argsFirst.push(args[i].first());
					argsRest.push(args[i].rest());
				}

				return CALL(f, argsFirst,
					function(result) {
						return result && andmapHelp(f, argsRest);
					});
			}
			return andmapHelp(f, arglists);
		 });


PRIMITIVES['ormap'] =
    new PrimProc('ormap',
		 2,
		 true, false,
		 function(f, lst, arglists) {
		 	arglists.unshift(lst);
		  	check(f, isFunction, 'ormap', 'procedure', 1);
		  	arrayEach(arglists, function(x, i) {checkList(x, 'ormap', i+2);});
			checkAllSameLength(arglists, 'ormap');

			var ormapHelp = function(f, args) {
				if ( args[0].isEmpty() ) {
					return false;
				}

				var argsFirst = [];
				var argsRest = [];
				for (var i = 0; i < args.length; i++) {
					argsFirst.push(args[i].first());
					argsRest.push(args[i].rest());
				}

				return CALL(f, argsFirst,
					function(result) {
						return result || ormapHelp(f, argsRest);
					});
			}
			return ormapHelp(f, arglists);
		});


PRIMITIVES['memq'] =
    new PrimProc('memq',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkList(lst, 'memq', 2);
			while ( !lst.isEmpty() ) {
				if ( isEq(item, lst.first()) ) {
					return lst;
				}
				lst = lst.rest();
			}
			return false;
		 });


PRIMITIVES['memv'] =
    new PrimProc('memv',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkList(lst, 'memv', 2);
			while ( !lst.isEmpty() ) {
				if ( isEqv(item, lst.first()) ) {
					return lst;
				}
				lst = lst.rest();
			}
			return false;
		 });


PRIMITIVES['member'] =
    new PrimProc('member',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkList(lst, 'member', 2);
		 	while ( !lst.isEmpty() ) {
		 		if ( isEqual(item, lst.first()) ) {
		 			return lst;
		 		}
		 		lst = lst.rest();
		 	}
		 	return false;
		 });


PRIMITIVES['memf'] =
    new PrimProc('memf',
		 2,
		 false, false,
		 function(f, initList) {
		 	check(f, isFunction, 'memf', 'procedure', 1);
			checkList(initList, 'memf', 2);

			var memfHelp = function(lst) {
				if ( lst.isEmpty() ) {
					return false;
				}

				return CALL(f, [lst.first()],
					function(result) {
						if (result) {
							return lst;
						}
						return memfHelp(lst.rest());
					});
			}
			return memfHelp(initList);
		 });


PRIMITIVES['assq'] =
    new PrimProc('assq',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkListOf(lst, isPair, 'assq', 'pair', 2);
			while ( !lst.isEmpty() ) {
				if ( isEq(item, lst.first().first()) ) {
					return lst.first();
				}
				lst = lst.rest();
			}
			return false;
		 });


PRIMITIVES['assv'] =
    new PrimProc('assv',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkListOf(lst, isPair, 'assv', 'pair', 2);
			while ( !lst.isEmpty() ) {
				if ( isEqv(item, lst.first().first()) ) {
					return lst.first();
				}
				lst = lst.rest();
			}
			return false;
		 });


PRIMITIVES['assoc'] =
    new PrimProc('assoc',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkListOf(lst, isPair, 'assoc', 'pair', 2);
			while ( !lst.isEmpty() ) {
				if ( isEqual(item, lst.first().first()) ) {
					return lst.first();
				}
				lst = lst.rest();
			}
			return false;
		 });


PRIMITIVES['remove'] =
    new PrimProc('remove',
		 2,
		 false, false,
		 function(item, lst) {
		 	checkList(lst, 'remove', 2);
		 	var originalLst = lst;
		 	var result = types.EMPTY;
		 	while ( !lst.isEmpty() ) {
		 		if ( isEqual(item, lst.first()) ) {
		 			return append([result.reverse(), lst.rest()]);
		 		} else {
		 			result = types.cons(lst.first(), result);
		 			lst = lst.rest();
		 		}
		 	}
		 	return originalLst;
		 });


PRIMITIVES['filter'] =
    new PrimProc('filter',
		 2,
		 false, false,
		 function(f, lst) {
		 	check(f, funArityContains(1), 'filter', 'procedure (arity 1)', 1);
			checkList(lst, 'filter', 2);

			var filterHelp = function(f, lst, acc) {
				if ( lst.isEmpty() ) {
					return acc.reverse();
				}

				return CALL(f, [lst.first()],
					function(result) {
						if (result) {
							return filterHelp(f, lst.rest(),
								types.cons(lst.first(), acc));
						}
						else {
							return filterHelp(f, lst.rest(), acc);
						}
					});
			}
			return filterHelp(f, lst, types.EMPTY);
		 });

PRIMITIVES['foldl'] =
    new PrimProc('foldl',
		 3,
		 true, false,
		 function(f, initAcc, lst, arglists) {
		 	arglists.unshift(lst);
		 	check(f, isFunction, 'foldl', 'procedure', 1);
			arrayEach(arglists, function(x, i) {checkList(x, 'foldl', i+3);});
			checkAllSameLength(arglists, 'foldl');
	
			return foldHelp(f, initAcc, arglists);
		});

PRIMITIVES['foldr'] =
    new PrimProc('foldr',
		 3,
		 true, false,
		 function(f, initAcc, lst, arglists) {
		 	arglists.unshift(lst);
		 	check(f, isFunction, 'foldr', 'procedure', 1);
			arrayEach(arglists, function(x, i) {checkList(x, 'foldr', i+3);});
			checkAllSameLength(arglists, 'foldr');

			for (var i = 0; i < arglists.length; i++) {
				arglists[i] = arglists[i].reverse();
			}
			
			return foldHelp(f, initAcc, arglists);
		});


PRIMITIVES['quicksort'] = new PrimProc('quicksort', 2, false, false, quicksort('quicksort'));
PRIMITIVES['sort'] = new PrimProc('sort', 2, false, false, quicksort('sort'));



PRIMITIVES['argmax'] =
    new PrimProc('argmax',
		 2,
		 false, false,
		 function(f, initList) {
		 	check(f, isFunction, 'argmax', 'procedure', 1);
			check(initList, isPair, 'argmax', 'non-empty list', 2);

			var argmaxHelp = function(lst, curMaxVal, curMaxElt) {
				if ( lst.isEmpty() ) {
					return curMaxElt;
				}

				return CALL(f, [lst.first()],
					function(result) {
						check(result, isReal, 'argmax',
						      'procedure that returns real numbers', 1);
						if (jsnums.greaterThan(result, curMaxVal)) {
							return argmaxHelp(lst.rest(), result, lst.first());
						}
						else {
							return argmaxHelp(lst.rest(), curMaxVal, curMaxElt);
						}
					});
			}
			return CALL(f, [initList.first()],
				function(result) {
					check(result, isReal, 'argmax', 'procedure that returns real numbers', 1);
					return argmaxHelp(initList.rest(), result, initList.first());
				});
		 });


PRIMITIVES['argmin'] =
    new PrimProc('argmin',
		 2,
		 false, false,
		 function(f, initList) {
		 	check(f, isFunction, 'argmin', 'procedure', 1);
			check(initList, isPair, 'argmin', 'non-empty list', 2);

			var argminHelp = function(lst, curMaxVal, curMaxElt) {
				if ( lst.isEmpty() ) {
					return curMaxElt;
				}

				return CALL(f, [lst.first()],
					function(result) {
						check(result, isReal, 'argmin',
						      'procedure that returns real numbers', 1);
						if (jsnums.lessThan(result, curMaxVal)) {
							return argminHelp(lst.rest(), result, lst.first());
						}
						else {
							return argminHelp(lst.rest(), curMaxVal, curMaxElt);
						}
					});
			}
			return CALL(f, [initList.first()],
				function(result) {
					check(result, isReal, 'argmin', 'procedure that returns real numbers', 1);
					return argminHelp(initList.rest(), result, initList.first());
				});
		 });


PRIMITIVES['build-list'] =
    new PrimProc('build-list',
		 2,
		 false, false,
		 function(num, f) {
		 	check(num, isNatural, 'build-list', 'non-negative exact integer', 1);
			check(f, isFunction, 'build-list', 'procedure', 2);

			var buildListHelp = function(n, acc) {
				if ( jsnums.greaterThanOrEqual(n, num) ) {
					return acc.reverse();
				}

				return CALL(f, [n],
					function (result) {
						return buildListHelp(n+1, types.cons(result, acc));
					});
			}
			return buildListHelp(0, types.EMPTY);
		 });


/**********************
 *** Box Primitives ***
 **********************/


PRIMITIVES['box'] = new PrimProc('box', 1, false, false, types.box);

PRIMITIVES['box-immutable'] = new PrimProc('box-immutable', 1, false, false, types.boxImmutable);

PRIMITIVES['unbox'] =
    new PrimProc('unbox',
		 1,
		 false, false,
		 function(box) {
		 	check(box, isBox, 'unbox', 'box', 1);
			return box.unbox();
		 });


PRIMITIVES['set-box!'] =
    new PrimProc('set-box!',
		 2,
		 false, false,
		 function(box, newVal) {
		 	check(box, function(x) { return isBox(x) && x.mutable; }, 'set-box!', 'mutable box', 1);
			box.set(newVal);
			return types.VOID;
		 });



/****************************
 *** Hashtable Primitives ***
 ****************************/


PRIMITIVES['make-hash'] =
	new CasePrimitive('make-hash', 
	[new PrimProc('make-hash', 0, false, false, function() { return types.hash(types.EMPTY); }),
	 new PrimProc('make-hash',
		      1,
		      false, false,
		      function(lst) {
			  checkListOf(lst, isPair, 'make-hash', 'list of pairs', 1);
			  return types.hash(lst);
		      }) ]);

PRIMITIVES['make-hasheq'] =
	new CasePrimitive('make-hasheq',
	[new PrimProc('make-hasheq', 0, false, false, function() { return types.hashEq(types.EMPTY); }),
	 new PrimProc('make-hasheq',
		      1,
		      false, false,
		      function(lst) {
			  checkListOf(lst, isPair, 'make-hasheq', 'list of pairs', 1);
			  return types.hashEq(lst);
		      }) ]);

PRIMITIVES['hash-set!'] =
    new PrimProc('hash-set!',
		 3,
		 false, false,
		 function(obj, key, val) {
		 	check(obj, isHash, 'hash-set!', 'hash', 1);
			obj.hash.put(key, val);
			return types.VOID;
		 });

PRIMITIVES['hash-ref'] =
	new CasePrimitive('hash-ref',
	[new PrimProc('hash-ref',
		      2,
		      false, false,
		      function(obj, key) {
			  check(obj, isHash, 'hash-ref', 'hash', 1);

			  if ( !obj.hash.containsKey(key) ) {
			  	var msg = 'hash-ref: no value found for key: ' + types.toWrittenString(key);
			  	raise( types.exnFailContract(msg, false) );
			  }
			  return obj.hash.get(key);
		      }),
	 new PrimProc('hash-ref',
		      3,
		      false, false,
		      function(obj, key, defaultVal) {
			  check(obj, isHash, 'hash-ref', 'hash', 1);

			  if (obj.hash.containsKey(key)) {
				return obj.hash.get(key);
			  }
			  else {
				if (isFunction(defaultVal)) {
					return CALL(defaultVal, [], id);
				}
				return defaultVal;
			  }
		      }) ]);

PRIMITIVES['hash-remove!'] =
    new PrimProc('hash-remove',
		 2,
		 false, false,
		 function(obj, key) {
		 	check(obj, isHash, 'hash-remove!', 'hash', 1);
			obj.hash.remove(key);
			return types.VOID;
		 });

PRIMITIVES['hash-map'] =
    new PrimProc('hash-map',
		 2,
		 false, false,
		 function(ht, f) {
		 	check(ht, isHash, 'hash-map', 'hash', 1);
			check(f, isFunction, 'hash-map', 'procedure', 2);
			
			var keys = ht.hash.keys();
			var hashMapHelp = function(i, acc) {
				if (i >= keys.length) {
					return acc;
				}

				var val = ht.hash.get(keys[i]);
				return CALL(f, [keys[i], val],
					function(result) {
						return hashMapHelp(i+1, types.cons(result, acc));
					});
			}
			return hashMapHelp(0, types.EMPTY);
		 });


PRIMITIVES['hash-for-each'] =
    new PrimProc('hash-for-each',
		 2,
		 false, false,
		 function(ht, f) {
		 	check(ht, isHash, 'hash-for-each', 'hash', 1);
			check(f, isFunction, 'hash-for-each', 'procedure', 2);
		 	
		 	var keys = ht.hash.keys();
		 	var hashForEachHelp = function(i) {
		 		if (i >= keys.length) {
					return types.VOID;
				}

				var val = ht.hash.get(keys[i]);
				return CALL(f, [keys[i], val],
					function(result) {
						hashForEachHelp(i+1);
					});
			}
			return hashForEachHelp(0);
		 });



/*************************
 *** String Primitives ***
 *************************/


PRIMITIVES['make-string'] =
    new PrimProc('make-string',
		 2,
		 false, false,
		 function(n, c) {
		 	check(n, isNatural, 'make-string', 'non-negative exact integer', 1);
			check(c, isChar, 'make-string', 'char', 2);

			var ret = [];
			for (var i = 0; jsnums.lessThan(i, n); i++) {
				ret.push(c.val);
			}
			return types.string(ret);
		 });


PRIMITIVES['replicate'] =
    new PrimProc('replicate',
		 2,
		 false, false,
		 function(n, str) {
		 	check(n, isNatural, 'replicate', 'non-negative exact integer', 1);
			check(str, isString, 'replicate', 'string', 2);

			var ret = "";
			var primStr = str.toString();
			for (var i = 0; jsnums.lessThan(i, n); i++) {
				ret += primStr;
			}
			return types.string(ret);
		 });


PRIMITIVES['string'] =
    new PrimProc('string',
		 0,
		 true, false,
		 function(chars) {
			arrayEach(chars, function(c, i) {check(c, isChar, 'string', 'char', i+1);});

			var ret = [];
			for (var i = 0; i < chars.length; i++) {
				ret.push(chars[i].val);
			}
			return types.string(ret);
		 });


PRIMITIVES['string-length'] =
    new PrimProc('string-length', 1, false, false,
		 function(str) {
		 	check(str, isString, 'string-length', 'string', 1);
			return str.length;
		 });


PRIMITIVES['string-ref'] =
    new PrimProc('string-ref',
		 2,
		 false, false,
		 function(str, num) {
		 	check(str, isString, 'string-ref', 'string', 1);
			check(num, isNatural, 'string-ref', 'non-negative exact integer', 2);

			var n = jsnums.toFixnum(num);
			if (n >= str.length) {
				var msg = ('string-ref: index ' + n + ' out of range ' +
					   '[0, ' + (str.length-1) + '] for string: ' +
					   types.toWrittenString(str));
				raise( types.exnFailContract(msg, false) );
			}
			return types.char(str.charAt(n));
		 });


PRIMITIVES['string=?'] =
    new PrimProc('string=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
		 	strs.unshift(str1);
		 	arrayEach(strs, function(str, i) {check(str, isString, 'string=?', 'string', i+1);});
		 	
			return compare(strs, function(strA, strB) {return strA.toString() === strB.toString();});
		 });


PRIMITIVES['string-ci=?'] =
    new PrimProc('string-ci=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);

			for(var i = 0; i < strs.length; i++) {
				check(strs[i], isString, 'string-ci=?', 'string', i+1);
				strs[i] = strs[i].toString().toLowerCase();
			}

			return compare(strs, function(strA, strB) {return strA === strB;});
		 });


PRIMITIVES['string<?'] =
    new PrimProc('string<?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);
			arrayEach(strs, function(str, i) {check(str, isString, 'string<?', 'string', i+1);});

			return compare(strs, function(strA, strB) {return strA.toString() < strB.toString();});
		 });


PRIMITIVES['string>?'] =
    new PrimProc('string>?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);
			arrayEach(strs, function(str, i) {check(str, isString, 'string>?', 'string', i+1);});

			return compare(strs, function(strA, strB) {return strA.toString() > strB.toString();});
		 });


PRIMITIVES['string<=?'] =
    new PrimProc('string<=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);
			arrayEach(strs, function(str, i) {check(str, isString, 'string<=?', 'string', i+1);});

			return compare(strs, function(strA, strB) {return strA.toString() <= strB.toString();});
		 });


PRIMITIVES['string>=?'] =
    new PrimProc('string>=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);
			arrayEach(strs, function(str, i) {check(str, isString, 'string>=?', 'string', i+1);});

			return compare(strs, function(strA, strB) {return strA.toString() >= strB.toString();});
		 });


PRIMITIVES['string-ci<?'] =
    new PrimProc('string-ci<?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);

			for (var i = 0; i < strs.length; i++) {
				check(strs[i], isString, 'string-ci<?', 'string', i+1);
				strs[i] = strs[i].toString().toLowerCase();
			}

			return compare(strs, function(strA, strB) {return strA < strB;});
		 });


PRIMITIVES['string-ci>?'] =
    new PrimProc('string-ci>?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);

			for (var i = 0; i < strs.length; i++) {
				check(strs[i], isString, 'string-ci>?', 'string', i+1);
				strs[i] = strs[i].toString().toLowerCase();
			}

			return compare(strs, function(strA, strB) {return strA > strB;});
		 });


PRIMITIVES['string-ci<=?'] =
    new PrimProc('string-ci<=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);

			for (var i = 0; i < strs.length; i++) {
				check(strs[i], isString, 'string-ci<=?', 'string', i+1);
				strs[i] = strs[i].toString().toLowerCase();
			}

			return compare(strs, function(strA, strB) {return strA <= strB;});
		 });


PRIMITIVES['string-ci>=?'] =
    new PrimProc('string-ci>=?',
		 2,
		 true, false,
		 function(str1, str2, strs) {
		 	strs.unshift(str2);
			strs.unshift(str1);

			for (var i = 0; i < strs.length; i++) {
				check(strs[i], isString, 'string-ci>=?', 'string', i+1);
				strs[i] = strs[i].toString().toLowerCase();
			}

			return compare(strs, function(strA, strB) {return strA >= strB;});
		 });


PRIMITIVES['substring'] =
	new CasePrimitive('substring', 
	[new PrimProc('substring',
		      2,
		      false, false,
		      function(str, theStart) {
		          check(str, isString, 'substring', 'string', 1);
			   check(theStart, isNatural, 'substring', 'non-negative exact integer', 2);
			  
			   var start = jsnums.toFixnum(theStart);
			   if (start > str.length) {
			   	var msg = ('substring: starting index ' + start + ' out of range ' +
					   '[0, ' + str.length + '] for string: ' + types.toWrittenString(str));
				raise( types.exnFailContract(msg, false) );
			   }
			   else {
			  	return types.string( str.substring(jsnums.toFixnum(start)) );
			   }
		      }),
	 new PrimProc('substring',
		      3,
		      false, false,
		      function(str, theStart, theEnd) {
			  check(str, isString, 'substring', 'string', 1);
			  check(theStart, isNatural, 'substring', 'non-negative exact integer', 2);
			  check(theEnd, isNatural, 'substring', 'non-negative exact integer', 3);

			  var start = jsnums.toFixnum(theStart);
			  var end = jsnums.toFixnum(theEnd);
			  if (start > str.length) {
			   	var msg = ('substring: starting index ' + start + ' out of range ' +
					   '[0, ' + str.length + '] for string: ' + types.toWrittenString(str));
				raise( types.exnFailContract(msg, false) );
			  }
			  if (end < start || end > str.length) {
			   	var msg = ('substring: ending index ' + end + ' out of range ' + '[' + start +
					   ', ' + str.length + '] for string: ' + types.toWrittenString(str));
				raise( types.exnFailContract(msg, false) );
			  }
			  return types.string( str.substring(start, end) );
		      }) ]);


PRIMITIVES['string-append'] = 
    new PrimProc("string-append",
		 0,
		 true, false,
		 function(args) {
		 	arrayEach(args,
				function(str, i) {
					check(str, isString, 'string-append', 'string', i+1);
				});
			
			for (var i = 0; i < args.length; i++) {
				args[i] = args[i].toString();
			}
			return types.string(args.join(""));
		 });


PRIMITIVES['string->list'] =
    new PrimProc('string->list',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string->list', 'string', 1);

			var lst = types.EMPTY;
			for (var i = str.length-1; i >= 0; i--) {
				lst = types.cons(types.char(str.charAt(i)), lst);
			}
			return lst;
		 });


PRIMITIVES['list->string'] =
    new PrimProc('list->string',
		 1,
		 false, false,
		 function(lst) {
		 	checkListOf(lst, isChar, 'list->string', 'char', 1);

			var ret = [];
			while( !lst.isEmpty() ) {
				ret.push(lst.first().val);
				lst = lst.rest();
			}
			return types.string(ret);
		 });


PRIMITIVES['string-copy'] =
    new PrimProc('string-copy',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-copy', 'string', 1);
			return types.string(str.toString());
		 });



PRIMITIVES['string->symbol'] =
    new PrimProc('string->symbol',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string->symbol', 'string', 1);
			return types.symbol(str.toString());
		 });


PRIMITIVES['symbol->string'] =
    new PrimProc('symbol->string',
		 1,
		 false, false,
		 function(symb) {
		 	check(symb, isSymbol, 'symbol->string', 'symbol', 1);
			return types.string(symb.toString());
		 });


PRIMITIVES['format'] =
    new PrimProc('format', 1, true, false,
		 function(formatStr, args) {
		 	check(formatStr, isString, 'format', 'string', 1);
			return types.string( helpers.format(formatStr, args) );
		 });


PRIMITIVES['printf'] =
    new PrimProc('printf', 1, true, true,
		 function(state, formatStr, args) {
		 	check(formatStr, isString, 'printf', 'string', 1);
			var msg = helpers.format(formatStr, args);
			state.getPrintHook()(msg);
			state.v = types.VOID;
		 });


PRIMITIVES['string->int'] =
    new PrimProc('string->int',
		 1,
		 false, false,
		 function(str) {
		 	check(str, function(s) {return isString(s) && s.length == 1;},
			      'string->int', '1-letter string', 1);
			return str.charCodeAt(0);
		 });


PRIMITIVES['int->string'] =
    new PrimProc('int->string',
		 1,
		 false, false,
		 function(num) {
		 	check(num, function(x) {
					if ( !isInteger(x) ) {
						return false;
					}
					var n = jsnums.toFixnum(x);
					return ((n >= 0 && n < 55296) ||
						(n > 57343 && n <= 1114111));
				},
				'int->string',
				'exact integer in [0,55295] or [57344,1114111]',
				1);

			return types.string( String.fromCharCode(jsnums.toFixnum(num)) );
		 });


PRIMITIVES['explode'] =
    new PrimProc('explode',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'explode', 'string', 1);
			var ret = types.EMPTY;
			for (var i = str.length-1; i >= 0; i--) {
				ret = types.cons( types.string(str.charAt(i)), ret );
			}
			return ret;
		 });

PRIMITIVES['implode'] =
    new PrimProc('implode',
		 1,
		 false, false,
		 function(lst) {
		 	checkListOf(lst, function(x) { return isString(x) && x.length == 1; },
				    'implode', 'list of 1-letter strings', 1);
			var ret = [];
			while ( !lst.isEmpty() ) {
				ret.push( lst.first().toString() );
				lst = lst.rest();
			}
			return types.string(ret);
		 });


PRIMITIVES['string-alphabetic?'] =
    new PrimProc('string-alphabetic?',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-alphabetic?', 'string', 1);
			return isAlphabeticString(str);
		 });


PRIMITIVES['string-ith'] =
    new PrimProc('string-ith',
		 2,
		 false, false,
		 function(str, num) {
		 	check(str, isString, 'string-ith', 'string', 1);
			check(num, function(x) { return isNatural(x) && jsnums.lessThan(x, str.length); }, 'string-ith',
			      'exact integer in [0, length of the given string minus 1 (' + (str.length-1) + ')]', 2);
			return types.string( str.charAt(jsnums.toFixnum(num)) );
		 });


PRIMITIVES['string-lower-case?'] =
    new PrimProc('string-lower-case?',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-lower-case?', 'string', 1);
			var primStr = str.toString();
			return isAlphabeticString(str) && primStr.toLowerCase() === primStr;
		 });


PRIMITIVES['string-numeric?'] =
    new PrimProc('string-numeric?',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-numeric?', 'string', 1);
			return isNumericString(str);
		 });


PRIMITIVES['string-upper-case?'] =
    new PrimProc('string-upper-case?',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-upper-case?', 'string', 1);
			var primStr = str.toString();
			return isAlphabeticString(str) && primStr.toUpperCase() === primStr;
		 });


PRIMITIVES['string-whitespace?'] =
    new PrimProc('string-whitespace?',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string-whitespace?', 'string', 1);
			return isWhitespaceString(str);
		 });


PRIMITIVES['build-string'] =
    new PrimProc('build-string',
		 2,
		 false, false,
		 function(num, f) {
		 	check(num, isNatural, 'build-string', 'non-negative exact integer', 1);
			check(f, isFunction, 'build-string', 'procedure', 2);

			var buildStringHelp = function(n, acc) {
				if ( jsnums.greaterThanOrEqual(n, num) ) {
					return types.string(acc);
				}

				return CALL(f, [n],
					function(res) {
						check(res, isChar, 'build-string',
						      'procedure that returns a char', 2);
						return buildStringHelp(n+1, acc.push(res.val));
					});
			}
			return buildStringHelp(0, []);
		 });


PRIMITIVES['string->immutable-string'] =
    new PrimProc('string->immutable-string',
		 1,
		 false, false,
		 function(str) {
		 	check(str, isString, 'string->immutable-string', 'string', 1);
			return str.toString();
		 });


PRIMITIVES['string-set!'] =
    new PrimProc('string-set!',
		 3,
		 false, false,
		 function(str, k, c) {
		 	check(str, function(x) { return isString(x) && typeof x != 'string'; }, 'string-set!', 'mutable string', 1);
			check(k, isNatural, 'string-set!', 'non-negative exact integer', 2);
			check(c, isChar, 'string-set!', 'char', 3);

			if ( jsnums.greaterThanOrEqual(k, str.length) ) {
				var msg = ('string-set!: index ' + n + ' out of range ' +
					   '[0, ' + (str.length-1) + '] for string: ' +
					   types.toWrittenString(str));
				raise( types.exnFailContract(msg, false) );
			}
			str.set(jsnums.toFixnum(k), c.val);
			return types.VOID;
		 });


PRIMITIVES['string-fill!'] =
    new PrimProc('string-fill!',
		 2,
		 false, false,
		 function(str, c) {
		 	check(str, function(x) { return isString(x) && typeof x != 'string'; }, 'string-fill!', 'mutable string', 1);
			check(c, isChar, 'string-fill!', 'char', 2);

			for (var i = 0; i < str.length; i++) {
				str.set(i, c.val);
			}
			return types.VOID;
		 });



/******************************
 *** Byte String Primitives ***
 ******************************/


PRIMITIVES['make-bytes'] =
	new CasePrimitive('make-bytes',
	[new PrimProc('make-bytes',
		      1,
		      false, false,
		      function(k) {
			  check(k, isNatural, 'make-bytes', 'non-negative exact integer', 1);
			  
			  var ret = [];
			  for (var i = 0; i < jsnums.toFixnum(k); i++) {
			  	ret.push(0);
			  }
			  return types.bytes(ret, true);
		      }),
	 new PrimProc('make-bytes',
		      2,
		      false, false,
		      function(k, b) {
			  check(k, isNatural, 'make-bytes', 'non-negative exact integer', 1);
			  check(b, isByte, 'make-bytes', 'byte', 1);

			  var ret = [];
			  for (var i = 0; i < jsnums.toFixnum(k); i++) {
			  	ret.push(b);
			  }
			  return types.bytes(ret, true);
		      }) ]);


PRIMITIVES['bytes'] =
    new PrimProc('bytes',
		 0,
		 true, false,
		 function(args) {
		 	arrayEach(args, function(b, i) {check(b, isByte, 'bytes', 'byte', i+1);});
			return types.bytes(args, true);
		 });


PRIMITIVES['bytes->immutable-bytes'] =
    new PrimProc('bytes->immutable-bytes',
		 1,
		 false, false,
		 function(bstr) {
		 	check(bstr, isByteString, 'bytes->immutable-bytes', 'byte string', 1);
			return bstr.copy(false);
		 });


PRIMITIVES['bytes-length'] =
    new PrimProc('bytes-length',
		 1,
		 false, false,
		 function(bstr) {
		 	check(bstr, isByteString, 'bytes-length', 'byte string', 1);
			return bstr.length();
		 });


PRIMITIVES['bytes-ref'] =
    new PrimProc('bytes-ref',
		 2,
		 false, false,
		 function(bstr, num) {
		 	check(bstr, isByteString, 'bytes-ref', 'byte string', 1);
			check(num, isNatural, 'bytes-ref', 'non-negative exact integer', 2);

			var n = jsnums.toFixnum(num);
			if ( n >= bstr.length() ) {
				var msg = ('bytes-ref: index ' + n + ' out of range ' +
					   '[0, ' + (bstr.length-1) + '] for byte-string: ' +
					   types.toWrittenString(bstr));
				raise( types.exnFailContract(msg, false) );
			}
			return bstr.get(n);
		 });


PRIMITIVES['bytes-set!'] =
    new PrimProc('bytes-set!',
		 3,
		 false, false,
		 function(bstr, num, b) {
		 	check(bstr, function(x) { return isByteString(x) && x.mutable; },
			      'bytes-set!', 'mutable byte string', 1);
			check(num, isNatural, 'bytes-set!', 'non-negative exact integer', 2);
			check(b, isByte, 'bytes-set!', 'byte', 3);

			var n = jsnums.toFixnum(num);
			if ( n >= bstr.length() ) {
				var msg = ('bytes-set!: index ' + n + ' out of range ' +
					   '[0, ' + (bstr.length-1) + '] for byte-string: ' +
					   types.toWrittenString(bstr));
				raise( types.exnFailContract(msg, false) );
			}
			bstr.set(n, b);
			return types.VOID;
		 });


PRIMITIVES['subbytes'] =
	new CasePrimitive('subbytes',
	[new PrimProc('subbytes',
		      2,
		      false, false,
		      function(bstr, theStart) {
		          check(bstr, isByteString, 'subbytes', 'bytes string', 1);
			  check(theStart, isNatural, 'subbytes', 'non-negative exact integer', 2);
			  
			  var start = jsnums.toFixnum(theStart);
			  if (start > bstr.length()) {
			   	var msg = ('subbytes: starting index ' + start + ' out of range ' +
					   '[0, ' + bstr.length + '] for byte-string: ' +
					   types.toWrittenString(bstr));
				raise( types.exnFailContract(msg, false) );
			  }
			  else {
			  	return bstr.subbytes(jsnums.toFixnum(start));
			  }
		      }),
	 new PrimProc('subbytes',
		      3,
		      false, false,
		      function(bstr, theStart, theEnd) {
		          check(bstr, isByteString, 'subbytes', 'byte string', 1);
			  check(theStart, isNatural, 'subbytes', 'non-negative exact integer', 2);
			  check(theEnd, isNatural, 'subbytes', 'non-negative exact integer', 3);

			  var start = jsnums.toFixnum(theStart);
			  var end = jsnums.toFixnum(theEnd);
			  if (start > bstr.length()) {
			   	var msg = ('subbytes: starting index ' + start + ' out of range ' +
					   '[0, ' + bstr.length() + '] for byte-string: ' +
					   types.toWrittenString(bstr));
				raise( types.exnFailContract(msg, false) );
			  }
			  if (end < start || end > bstr.length()) {
			   	var msg = ('subbytes: ending index ' + end + ' out of range ' + '[' + start +
					   ', ' + bstr.length() + '] for byte-string: ' +
					   types.toWrittenString(bstr));
				raise( types.exnFailContract(msg, false) );
			  }
			   else {
			  	return bstr.subbytes(start, end);
			   }
		      }) ]);


PRIMITIVES['bytes-copy'] =
    new PrimProc('bytes-copy',
		 1,
		 false, false,
		 function(bstr) {
		 	check(bstr, isByteString, 'bytes-copy', 'byte string', 1);
			return bstr.copy(true);
		 });


PRIMITIVES['bytes-fill!'] =
    new PrimProc('bytes-fill!',
		 2,
		 false, false,
		 function(bstr, b) {
		 	check(bstr, function(x) { return isByteString(x) && x.mutable; },
			      'bytes-fill!', 'mutable byte string', 1);
			check(b, isByte, 'bytes-fill!', 'byte', 2);
			
			for (var i = 0; i < bstr.length(); i++) {
				bstr.set(i, b);
			}
			return types.VOID;
		 });


PRIMITIVES['bytes-append'] =
    new PrimProc('bytes-append',
		 0,
		 true, false,
		 function(args) {
		  	arrayEach(args, function(x, i) { check(x, isByteString, 'bytes-append', 'byte string', i+1); });

			var ret = [];
			for (var i = 0; i < args.length; i++) {
				ret = ret.concat(args[i].bytes);
			}
			return types.bytes(ret, true);
		 });


PRIMITIVES['bytes->list'] =
    new PrimProc('bytes->list',
		 1,
		 false, false,
		 function(bstr) {
		 	check(bstr, isByteString, 'bytes->list', 'byte string', 1);

			var ret = types.EMPTY;
			for (var i = bstr.length()-1; i >= 0; i--) {
				ret = types.cons(bstr.get(i), ret);
			}
			return ret;
		 });


PRIMITIVES['list->bytes'] =
    new PrimProc('list->bytes',
		 1,
		 false, false,
		 function(lst) {
		 	checkListOf(lst, isByte, 'list->bytes', 'byte', 1);

			var ret = [];
			while ( !lst.isEmpty() ) {
				ret.push(lst.first());
				lst = lst.rest();
			}
			return types.bytes(ret, true);
		 });


PRIMITIVES['bytes=?'] =
    new PrimProc('bytes=?',
		 2,
		 true, false,
		 function(bstr1, bstr2, bstrs) {
		 	bstrs.unshift(bstr2);
			bstrs.unshift(bstr1);
			arrayEach(bstrs, function(x, i) { check(x, isByteString, 'bytes=?', 'byte string', i+1); });

			return compare(bstrs, function(bstrA, bstrB) { return bstrA.toString() === bstrB.toString(); });
		 });


PRIMITIVES['bytes<?'] =
    new PrimProc('bytes<?',
		 2,
		 true, false,
		 function(bstr1, bstr2, bstrs) {
		 	bstrs.unshift(bstr2);
			bstrs.unshift(bstr1);
			arrayEach(bstrs, function(x, i) { check(x, isByteString, 'bytes<?', 'byte string', i+1); });

			return compare(bstrs, function(bstrA, bstrB) { return bstrA.toString() < bstrB.toString(); });
		 });


PRIMITIVES['bytes>?'] =
    new PrimProc('bytes>?',
		 2,
		 true, false,
		 function(bstr1, bstr2, bstrs) {
		 	bstrs.unshift(bstr2);
			bstrs.unshift(bstr1);
			arrayEach(bstrs, function(x, i) { check(x, isByteString, 'bytes>?', 'byte string', i+1); });

			return compare(bstrs, function(bstrA, bstrB) { return bstrA.toString() > bstrB.toString(); });
		 });




/*************************
 *** Vector Primitives ***
 *************************/


PRIMITIVES['make-vector'] =
    new PrimProc('make-vector',
		 2,
		 false, false,
		 function(size, content) {
		 	check(size, isNatural, 'make-vector', 'non-negative exact integer', 1);
			var s = jsnums.toFixnum(size);
			var ret = [];
			for (var i = 0; i < s; i++) {
				ret.push(content);
			}
			return types.vector(ret);
		 });


PRIMITIVES['vector'] =
    new PrimProc('vector',
		 0,
		 true, false,
		 function(args) {
		 	return types.vector(args);
		 });


PRIMITIVES['vector-length'] =
    new PrimProc('vector-length',
		 1,
		 false, false,
		 function(vec) {
		 	check(vec, isVector, 'vector-length', 'vector', 1);
			return vec.length();
		 });


PRIMITIVES['vector-ref'] =
    new PrimProc('vector-ref',
		 2,
		 false, false,
		 function(vec, index) {
		 	check(vec, isVector, 'vector-ref', 'vector', 1);
			check(index, isNatural, 'vector-ref', 'non-negative exact integer', 2);

			var i = jsnums.toFixnum(index);
			if (i >= vec.length()) {
				var msg = ('vector-ref: index ' + i + ' out of range ' +
					   '[0, ' + (vec.length()-1) + '] for vector: ' +
					   types.toWrittenString(vec));
				raise( types.exnFailContract(msg, false) );
			}
			return vec.ref(i);
		 });


PRIMITIVES['vector-set!'] =
    new PrimProc('vector-set!',
		 3,
		 false, false,
		 function(vec, index, val) {
		 	check(vec, isVector, 'vector-set!', 'vector', 1);
			check(index, isNatural, 'vector-set!', 'non-negative exact integer', 2);

			var i = jsnums.toFixnum(index);
			if (i >= vec.length()) {
				var msg = ('vector-set!: index ' + i + ' out of range ' +
					   '[0, ' + (vec.length()-1) + '] for vector: ' +
					   types.toWrittenString(vec));
				raise( types.exnFailContract(msg, false) );
			}
			vec.set(i, val);
			return types.VOID;
		 });


PRIMITIVES['vector->list'] =
    new PrimProc('vector->list',
		 1,
		 false, false,
		 function(vec) {
		 	check(vec, isVector, 'vector->list', 'vector', 1);
			return vec.toList();
		 });


PRIMITIVES['build-vector'] =
    new PrimProc('build-vector',
		 2,
		 false, false,
		 function(num, f) {
		 	check(num, isNatural, 'build-vector', 'non-negative exact integer', 1);
			check(f, isFunction, 'build-vector', 'procedure', 2);

			var buildVectorHelp = function(n, acc) {
				if ( jsnums.greaterThanOrEqual(n, num) ) {
					return types.vector(acc);
				}

				return CALL(f, [n],
					function (result) {
						return buildVectorHelp(n+1, acc.push(result));
					});
			}
			return buildVectorHelp(0, []);
		 });



/***********************
 *** Char Primitives ***
 ***********************/


PRIMITIVES['char=?'] =
    new PrimProc('char=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char=?', 'char', i+1);});

			return compare(chars, function(c1, c2) {return c1.val === c2.val;});
		 });


PRIMITIVES['char<?'] =
    new PrimProc('char<?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char<?', 'char', i+1);});

			return compare(chars, function(c1, c2) {return c1.val < c2.val;});
		 });


PRIMITIVES['char>?'] =
    new PrimProc('char>?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char>?', 'char', i+1);});

			return compare(chars, function(c1, c2) {return c1.val > c2.val;});
		 });


PRIMITIVES['char<=?'] =
    new PrimProc('char<=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char<=?', 'char', i+1);});

			return compare(chars, function(c1, c2) {return c1.val <= c2.val;});
		 });


PRIMITIVES['char>=?'] =
    new PrimProc('char>=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char>=?', 'char', i+1);});

			return compare(chars, function(c1, c2) {return c1.val >= c2.val;});
		 });


PRIMITIVES['char-ci=?'] =
    new PrimProc('char-ci=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char-ci=?', 'char', i+1);});

			return compare(chars,
				function(c1, c2) {
					return c1.val.toLowerCase() === c2.val.toLowerCase();
				});
		 });


PRIMITIVES['char-ci<?'] =
    new PrimProc('char-ci<?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char-ci<?', 'char', i+1);});

			return compare(chars,
				function(c1, c2) {
					return c1.val.toLowerCase() < c2.val.toLowerCase();
				});
		 });


PRIMITIVES['char-ci>?'] =
    new PrimProc('char-ci>?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char-ci>?', 'char', i+1);});

			return compare(chars,
				function(c1, c2) {
					return c1.val.toLowerCase() > c2.val.toLowerCase();
				});
		 });


PRIMITIVES['char-ci<=?'] =
    new PrimProc('char-ci<=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char-ci<=?', 'char', i+1);});

			return compare(chars,
				function(c1, c2) {
					return c1.val.toLowerCase() <= c2.val.toLowerCase();
				});
		 });


PRIMITIVES['char-ci>=?'] =
    new PrimProc('char-ci>=?',
		 2,
		 true, false,
		 function(char1, char2, chars) {
		 	chars.unshift(char2);
			chars.unshift(char1);
			arrayEach(chars, function(c, i) {check(c, isChar, 'char-ci>=?', 'char', i+1);});

			return compare(chars,
				function(c1, c2) {
					return c1.val.toLowerCase() >= c2.val.toLowerCase();
				});
		 });


PRIMITIVES['char-alphabetic?'] =
    new PrimProc('char-alphabetic?',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-alphabetic?', 'char', 1);
			return isAlphabeticString(c.val);
		 });


PRIMITIVES['char-numeric?'] =
    new PrimProc('char-numeric?',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-numeric?', 'char', 1);
			return (c.val >= '0' && c.val <= '9');
		 });


PRIMITIVES['char-whitespace?'] =
    new PrimProc('char-whitespace?',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-whitespace?', 'char', 1);
			return isWhitespaceString(c.val);
		 });


PRIMITIVES['char-upper-case?'] =
    new PrimProc('char-upper-case?',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-upper-case?', 'char', 1);
			return (isAlphabeticString(c.val) && c.val.toUpperCase() === c.val);
		 });


PRIMITIVES['char-lower-case?'] =
    new PrimProc('char-lower-case?',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-lower-case?', 'char', 1);
			return (isAlphabeticString(c.val) && c.val.toLowerCase() === c.val);
		 });


PRIMITIVES['char->integer'] =
    new PrimProc('char->integer',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char->integer', 'char', 1);
			return c.val.charCodeAt(0);
		 });


PRIMITIVES['integer->char'] =
    new PrimProc('integer->char',
		 1,
		 false, false,
		 function(num) {
		 	check(num, function(x) {
					if ( !isInteger(x) ) {
						return false;
					}
					var n = jsnums.toFixnum(x);
					return ((n >= 0 && n < 55296) ||
						(n > 57343 && n <= 1114111));
				},
				'integer->char',
				'exact integer in [0,#x10FFFF], not in [#xD800,#xDFFF]',
				1);

			return types.char( String.fromCharCode(jsnums.toFixnum(num)) );
		 });


PRIMITIVES['char-upcase'] =
    new PrimProc('char-upcase',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-upcase', 'char', 1);
			return types.char( c.val.toUpperCase() );
		 });


PRIMITIVES['char-downcase'] =
    new PrimProc('char-downcase',
		 1,
		 false, false,
		 function(c) {
		 	check(c, isChar, 'char-downcase', 'char', 1);
			return types.char( c.val.toLowerCase() );
		 });



/***********************
 *** Posn Primitives ***
 ***********************/


PRIMITIVES['make-posn'] =
    new PrimProc('make-posn',
		 2,
		 false, false,
		 function(x, y) {
		 	return types.posn(x, y);
		 });


PRIMITIVES['posn-x'] =
    new PrimProc('posn-x',
		 1,
		 false, false,
		 function(p) {
		 	check(p, types.isPosn, 'posn-x', 'posn', 1);
			return types.posnX(p);
		 });


PRIMITIVES['posn-y'] =
    new PrimProc('posn-y',
		 1,
		 false, false,
		 function(p) {
		 	check(p, types.isPosn, 'posn-y', 'posn', 1);
			return types.posnY(p);
		 });



/************************
 *** Image Primitives ***
 ************************/


PRIMITIVES['image?'] = new PrimProc('image?', 1, false, false, isImage);

PRIMITIVES['image=?'] =
    new PrimProc('image=?',
		 2,
		 false, false,
		 function(img1, img2) {
		 	check(img1, isImage, 'image=?', 'image', 1);
			check(img2, isImage, 'image=?', 'image', 2);
			return isEqual(img1, img2);
		 });


PRIMITIVES['make-color'] =
    new PrimProc('make-color',
		 3,
		 false, false,
		 function(r, g, b) {
		 	check(r, isByte, 'make-color', 'number between 0 and 255', 1);
		 	check(g, isByte, 'make-color', 'number between 0 and 255', 2);
		 	check(b, isByte, 'make-color', 'number between 0 and 255', 3);

			return types.color(jsnums.toFixnum(r),
					   jsnums.toFixnum(g),
					   jsnums.toFixnum(b));
		 });

PRIMITIVES['color-red'] =
    new PrimProc('color-red',
		 1,
		 false, false,
		 function(col) {
		 	check(col, types.isColor, 'color-red', 'color', 1);
			return types.colorRed(col);
		 });

PRIMITIVES['color-green'] =
    new PrimProc('color-green',
		 1,
		 false, false,
		 function(col) {
		 	check(col, types.isColor, 'color-green', 'color', 1);
			return types.colorGreen(col);
		 });

PRIMITIVES['color-blue'] =
    new PrimProc('color-blue',
		 1,
		 false, false,
		 function(col) {
		 	check(col, types.isColor, 'color-blue', 'color', 1);
			return types.colorBlue(col);
		 });


PRIMITIVES['empty-scene'] =
    new PrimProc('empty-scene',
		 2,
		 false, false,
		 function(width, height) {
		 	check(width, isNumber, 'empty-scene', 'number', 1);
			check(height, isNumber, 'empty-scene', 'number', 2);
			return world.Kernel.sceneImage(jsnums.toFixnum(width), jsnums.toFixnum(height), []);
		 });


PRIMITIVES['place-image'] =
    new PrimProc('place-image',
		 4,
		 false, false,
		 function(picture, x, y, background) {
			check(picture, isImage, "place-image", "image", 1);
			check(x, isNumber, "place-image", "number", 2);
			check(y, isNumber, "place-image", "number", 3);
			check(background, function(x) { return isScene(x) || isImage(x) },
			      "place-image", "image", 4);
			if (isScene(background)) {
			    return background.add(picture, jsnums.toFixnum(x), jsnums.toFixnum(y));
			} else {
			    var newScene = world.Kernel.sceneImage(background.getWidth(),
								   background.getHeight(),
								   []);
			    newScene = newScene.add(background, 0, 0);
			    newScene = newScene.add(picture, jsnums.toFixnum(x), jsnums.toFixnum(y));
			    return newScene;
			}
		 });


PRIMITIVES['put-pinhole'] =
    new PrimProc('put-pinhole',
		 3,
		 false, false,
		 function(img, x, y) {
			check(img, isImage, "put-pinhole", "image", 1);
			check(x, isNumber, "put-pinhole", "number", 2);
			check(y, isNumber, "put-pinhole", "number", 3);
			return img.updatePinhole(jsnums.toFixnum(x), jsnums.toFixnum(y));
    		 });


PRIMITIVES['circle'] =
    new PrimProc('circle',
		 3,
		 false, false,
		 function(aRadius, aStyle, aColor) {
			check(aRadius, isNumber, "circle", "number", 1);
			check(aStyle, isStyle, "circle", "style", 2);
			check(aColor, isColor, "circle", "color", 3);


			if (colorDb.get(aColor)) {
				aColor = colorDb.get(aColor);
			}
			return world.Kernel.circleImage(jsnums.toFixnum(aRadius), aStyle, aColor);
		 });


PRIMITIVES['star'] =
    new PrimProc('star',
		 5,
		 false, false,
		 function(aPoints, anOuter, anInner, aStyle, aColor) {
			check(aPoints, isNumber, "star", "number", 1);
			check(anOuter, isNumber, "star", "number", 2);
			check(anInner, isNumber, "star", "number", 3);
			check(aStyle, isStyle, "star", "style", 4);
			check(aColor, isColor, "star", "color", 5);

			if (colorDb.get(aColor)) {
				aColor = colorDb.get(aColor);
			}
			return world.Kernel.starImage(jsnums.toFixnum(aPoints),
						      jsnums.toFixnum(anOuter),
						      jsnums.toFixnum(anInner),
						      aStyle,
						      aColor);
		 });


PRIMITIVES['nw:rectangle'] =
    new PrimProc('nw:rectangle',
		 4,
		 false, false,
		 function(w, h, s, c) {
			check(w, isNumber, "nw:rectangle", "number", 1);
			check(h, isNumber, "nw:rectangle", "number", 2);
			check(s, isStyle, "nw:rectangle", "style", 3);
			check(c, isColor, "nw:rectangle", "color", 4);

			if (colorDb.get(c)) {
				c = colorDb.get(c);
			}
			var aRect = world.Kernel.rectangleImage(jsnums.toFixnum(w),
								jsnums.toFixnum(h),
								s, c);
			return aRect.updatePinhole(0, 0);
		 });


PRIMITIVES['rectangle'] =
    new PrimProc('rectangle',
		 4,
		 false, false,
		 function(w, h, s, c) {
			check(w, isNumber, "rectangle", "number", 1);
			check(h, isNumber, "rectangle", "number", 2);
			check(s, isStyle, "rectangle", "style", 3);
			check(c, isColor, "rectangle", "color", 4);

			if (colorDb.get(c)) {
				c = colorDb.get(c);
			}
			return world.Kernel.rectangleImage(jsnums.toFixnum(w),
							   jsnums.toFixnum(h),
							   s, c);
		 });


PRIMITIVES['triangle'] =
    new PrimProc('triangle',
		 3,
		 false, false,
		 function(r, s, c) {
			check(r, isNumber, "triangle", "number", 1);
			check(s, isStyle, "triangle", "string", 2);
			check(c, isColor, "triangle", "color", 3);
			if (colorDb.get(c)) {
				c = colorDb.get(c);
			}
			return world.Kernel.triangleImage(jsnums.toFixnum(r), s, c);
		 });


PRIMITIVES['ellipse'] =
    new PrimProc('ellipse',
		 4,
		 false, false,
		 function(w, h, s, c) {
			check(w, isNumber, "ellipse", "number", 1);
			check(h, isNumber, "ellipse", "number", 2);
			check(s, isStyle, "ellipse", "string", 3);
			check(c, isColor, "ellipse", "color", 4);
			
			if (colorDb.get(c)) {
				c = colorDb.get(c);
			}
			return world.Kernel.ellipseImage(jsnums.toFixnum(w),
							 jsnums.toFixnum(h),
							 s, c);
		 });


PRIMITIVES['line'] =
    new PrimProc('line',
		 3,
		 false, false,
		 function(x, y, c) {
			check(x, isNumber, "line", "number", 1);
			check(y, isNumber, "line", "number", 2);
			check(c, isColor, "line", "color", 3);
			if (colorDb.get(c)) {
				c = colorDb.get(c);
			}
			var line = world.Kernel.lineImage(jsnums.toFixnum(x),
							  jsnums.toFixnum(y),
							  c);
			return line.updatePinhole(0, 0);
		 });


PRIMITIVES['overlay'] =
    new PrimProc('overlay',
		 2,
		 true, false,
		 function(img1, img2, restImages) {
			check(img1, isImage, "overlay", "image", 1);
			check(img2, isImage, "overlay", "image", 2);	
			arrayEach(restImages, function(x, i) { check(x, isImage, "overlay", "image", i+3); });

			var img = world.Kernel.overlayImage(img1, img2, 0, 0);
			for (var i = 0; i < restImages.length; i++) {
				img = world.Kernel.overlayImage(img, restImages[i], 0, 0);
			}
			return img;
		 });


PRIMITIVES['overlay/xy'] =
    new PrimProc('overlay/xy',
		 4,
		 false, false,
		 function(img1, deltaX, deltaY, img2) {
			check(img1, isImage, "overlay/xy", "image", 1);
			check(deltaX, isNumber, "overlay/xy", "number", 2);
			check(deltaY, isNumber, "overlay/xy", "number", 3);
			check(img2, isImage, "overlay/xy", "image", 4);

			return world.Kernel.overlayImage(img1, img2,
							 jsnums.toFixnum(deltaX),
							 jsnums.toFixnum(deltaY));
		 });


PRIMITIVES['underlay'] =
    new PrimProc('underlay',
		 2,
		 true, false,
		 function(img1, img2, restImages) {
			check(img1, isImage, "underlay", "image", 1);
			check(img2, isImage, "underlay", "image", 2);	
			arrayEach(restImages, function(x, i) { check(x, isImage, "underlay", "image", i+3); });

			var img = world.Kernel.overlayImage(img2, img1, 0, 0);
			for (var i = 0; i < restImages.length; i++) {
				img = world.Kernel.overlayImage(restImages[i], img, 0, 0);
			}
			return img;
		 });


PRIMITIVES['underlay/xy'] =
    new PrimProc('underlay/xy',
		 4,
		 false, false,
		 function(img1, deltaX, deltaY, img2) {
			check(img1, isImage, "underlay/xy", "image", 1);
			check(deltaX, isNumber, "underlay/xy", "number", 2);
			check(deltaY, isNumber, "underlay/xy", "number", 3);
			check(img2, isImage, "underlay/xy", "image", 4);

			return world.Kernel.overlayImage(img2, img1,
							 -jsnums.toFixnum(deltaX),
							 -jsnums.toFixnum(deltaY));
		 });


PRIMITIVES['key=?'] =
    new PrimProc('key=?',
		 2,
		 false, false,
		 function(key1, key2) {
		 	return (key1.toString().toLowerCase() === key2.toString().toLowerCase());
		 });


PRIMITIVES['text'] =
    new PrimProc('text',
		 3,
		 false, false,
		 function(aString, aSize, aColor) {
			check(aString, isString, "text", "string", 1);
			check(aSize, isNumber, "text", "number", 2);
			check(aColor, isColor, "text", "color", 3);

			if (colorDb.get(aColor)) {
				aColor = colorDb.get(aColor);
			}
			return world.Kernel.textImage(aString, jsnums.toFixnum(aSize), aColor);
		 });


PRIMITIVES['open-image-url'] =
    new PrimProc('open-image-url',
		 1,
		 false, false,
		 function(path) {
			check(path, isString, "open-image-url", "string", 1);
			return world.Kernel.fileImage(path.toString());
		 });


PRIMITIVES['image-width'] =
    new PrimProc('image-width',
		 1,
		 false, false,
		 function(img) {
		 	check(img, isImage, 'image-width', 'image', 1);
			return img.getWidth();
		 });


PRIMITIVES['image-height'] =
    new PrimProc('image-height',
		 1,
		 false, false,
		 function(img) {
		 	check(img, isImage, 'image-height', 'image', 1);
			return img.getHeight();
		 });



/************************
 *** World Primitives ***
 ************************/



var OnTickBang = WorldConfigOption.extend({
	init: function(aDelay, handler, effectHandler) {
	    this._super('on-tick');
	    this.aDelay = aDelay;
	    this.handler = handler;
	    this.effectHandler = effectHandler;
	},

	configure: function(config) {
	    var newVals = { 
		onTick: this.handler,
		onTickEffect: this.effectHandler,
		tickDelay: jsnums.toFixnum(jsnums.multiply(1000, this.aDelay))
	    };
	    return config.updateAll(newVals);
	}});






PRIMITIVES['on-tick'] =
    new PrimProc('on-tick',
		 2,
		 false, false,
		 function(aDelay, f) {
			check(aDelay, isNumber, "on-tick", "number", 1);
			check(f, isFunction, "on-tick", "function", 2);
			return new OnTickBang(aDelay, f,
				new PrimProc('', 1, false, false,
					function(w) { return world.config.getNoneEffect(); }));
		 });

PRIMITIVES['on-tick!'] =
    new PrimProc('on-tick!',
		 3,
		 false, false,
		 function(aDelay, handler, effectHandler) {
			check(aDelay, isNumber, "on-tick!", "number", 1);
			check(handler, isFunction, "on-tick!", "function", 2);
			check(effectHandler, isFunction, "on-tick!","function", 3);
			return new OnTickBang(aDelay, handler, effectHandler);
		 });


PRIMITIVES['on-key'] = new PrimProc('on-key', 1, false, false, onEvent('on-key', 'onKey', 2));
PRIMITIVES['on-key!'] = new PrimProc('on-key!', 2, false, false, onEventBang('on-key!', 'onKey'));

PRIMITIVES['on-announce'] = new PrimProc('on-announce', 1, false, false,
					 onEvent('on-announce', 'onAnnounce', 3));
PRIMITIVES['on-announce!'] = new PrimProc('on-announce!', 2, false, false,
					  onEventBang('on-announce!', 'onAnnounce'));

PRIMITIVES['on-location-change'] = new PrimProc('on-location-change', 1, false, false,
						onEvent('on-location-change', 'onLocationChange', 3));
PRIMITIVES['on-location-change!'] = new PrimProc('on-location-change!', 2, false, false,
						 onEventBang('on-location-change!', 'onLocationChange'));

PRIMITIVES['on-tilt'] = new PrimProc('on-tilt', 1, false, false, onEvent('on-tilt', 'onTilt', 4));
PRIMITIVES['on-tilt!'] = new PrimProc('on-tilt!', 2, false, false, onEventBang('on-tilt!', 'onTilt'));

PRIMITIVES['on-acceleration'] = new PrimProc('on-acceleration', 1, false, false,
					     onEvent('on-acceleration', 'onAcceleration', 4));
PRIMITIVES['on-acceleration!'] = new PrimProc('on-acceleration!', 2, false, false,
					      onEventBang('on-acceleration!', 'onAcceleration'));

PRIMITIVES['on-sms-receive'] = new PrimProc('on-sms-receive', 1, false, false,
					    onEvent('on-sms-receive', 'onSmsReceive', 3));
PRIMITIVES['on-sms-receive!'] = new PrimProc('on-sms-receive!', 2, false, false,
					     onEventBang('on-sms-receive!', 'onSmsReceive'));

PRIMITIVES['on-shake'] = new PrimProc('on-shake', 1, false, false, onEvent('on-shake', 'onShake', 1));
PRIMITIVES['on-shake!'] = new PrimProc('on-shake!', 2, false, false, onEventBang('on-shake!', 'onShake'));


PRIMITIVES['stop-when'] = new PrimProc('stop-when', 1, false, false,
				       onEvent('stop-when', 'stopWhen', 1));
PRIMITIVES['stop-when!'] = new PrimProc('stop-when!', 2, false, false,
					onEventBang('stop-when!', 'stopWhen'));


PRIMITIVES['on-redraw'] =
    new PrimProc('on-redraw',
		 1,
		 false, false,
		 function(f) {
		     check(f, isFunction, 'on-redraw', 'procedure', 1);
		     return new (WorldConfigOption.extend({
				 init: function() {
				     this._super('on-redraw');
				 },

				 configure: function(config) {
				     return config.updateAll({'onRedraw': f});
				 }}))();

		 });


PRIMITIVES['on-draw'] =
    new PrimProc('on-draw',
		 2,
		 false, false,
		 function(domHandler, styleHandler) {
		 	check(domHandler, isFunction, 'on-draw', 'procedure', 1);
			check(styleHandler, isFunction, 'on-draw', 'procedure', 2);
			return new (WorldConfigOption.extend({
				    init: function() {
					this._super('on-draw');
				    },
				    configure: function(config) {
					return config.updateAll({'onDraw': domHandler,
								 'onDrawCss': styleHandler});
				    }
				}))();
		 });


PRIMITIVES['initial-effect'] =
    new PrimProc('initial-effect',
		 1,
		 false, false,
		 function(effect) {
		     return new (WorldConfigOption.extend({
				 init: function() {
				     this._super("initial-effect");
				 },
				 configure: function(config) {
					return config.updateAll({'initialEffect': effect});
				 }
			     }))();
		 });



/**************************
 *** Jsworld Primitives ***
 **************************/


var jsp = function(attribList) {
	checkListOf(attribList, function(x) { return isList(x) && length(x) == 2; },
		    'js-p', 'list of (list of X Y)', 1);
	var attribs = assocListToHash(attribList);
	var node = jsworld.MobyJsworld.p(attribs);
	node.toWrittenString = function(cache) { return "(js-p)"; };
	node.toDisplayedString = node.toWrittenString;
	node.toDomNode = function(cache) { return node; };
	return node;
};
PRIMITIVES['js-p'] =
	new CasePrimitive('js-p',
	[new PrimProc('js-p', 0, false, false, function() { return jsp(types.EMPTY); }),
	 new PrimProc('js-p', 1, false, false, jsp)]);


var jsdiv = function(attribList) {
	checkListOf(attribList, isAssocList, 'js-div', 'listof (listof X Y)', 1);

	var attribs = assocListToHash(attribList);
	var node = jsworld.MobyJsworld.div(attribs);
	
	node.toWrittenString = function(cache) { return "(js-div)"; };
	node.toDisplayedString = node.toWrittenString;
	node.toDomNode = function(cache) { return node; };
	return node;
};
PRIMITIVES['js-div'] =
	new CasePrimitive('js-div',
	[new PrimProc('js-div', 0, false, false, function() { return jsdiv(types.EMPTY); }),
	 new PrimProc('js-div', 1, false, false, jsdiv)]);


var jsButtonBang = function(funName) {
	return function(worldUpdateF, effectF, attribList) {
		check(worldUpdateF, isFunction, funName, 'procedure', 1);
		check(effectF, isFunction, funName, 'procedure', 2);
		checkListOf(attribList, isAssocList, funName, 'listof (listof X Y)', 3);

		var attribs = assocListToHash(attribList);
		var node = jsworld.MobyJsworld.buttonBang(worldUpdateF, effectF, attribs);

		node.toWrittenString = function(cache) { return '(' + funName + ' ...)'; };
		node.toDisplayedString = node.toWrittenString;
		node.toDomNode = function(cache) { return node; };
		return node;
	}
};
var jsButton = function(updateWorldF, attribList) {
	var noneF = new types.PrimProc('', 1, false, false,
		function(w) {
		    return world.config.Kernel.getNoneEffect();
		});
	return jsButtonBang('js-button')(updateWorldF, noneF, attribList);
};
PRIMITIVES['js-button'] =
	new CasePrimitive('js-button',
	[new PrimProc('js-button', 1, false, false, function(f) { return jsButton(f, types.EMPTY); }),
	 new PrimProc('js-button', 2, false, false, jsButton)]);

PRIMITIVES['js-button!'] =
	new CasePrimitive('js-button!',
	[new PrimProc('js-button!', 2, false, false,
		function(worldUpdateF, effectF) {
			return jsButtonBang('js-button!')(worldUpdateF, effectF, types.EMPTY);
		}),
	 new PrimProc('js-button!', 3, false, false, jsButtonBang('js-button!'))]);



var jsInput = function(type, updateF, attribList) {
	check(type, isString, 'js-input', 'string', 1);
	check(updateF, isFunction, 'js-input', 'procedure', 2);
	checkListOf(attribList, isAssocList, 'js-input', 'listof (listof X Y)', 3);

	var attribs = assocListToHash(attribList);
	var node = jsworld.MobyJsworld.input(type, updateF, attribs);

	node.toWrittenString = function(cache) { return "(js-input ...)"; }
	node.toDisplayedString = node.toWrittenString;
	node.toDomNode = function(cache) { return node; }
	return node;
};
PRIMITIVES['js-input'] =
	new CasePrimitive('js-input', 
	[new PrimProc('js-input', 2, false, false,
		function(type, updateF) {
			return jsInput(type, updateF, types.EMPTY);
		}),
	 new PrimProc('js-input', 3, false, false, jsInput)]);



var jsImg = function(src, attribList) {
	check(src, isString, "js-img", "string", 1);
	checkListOf(attribList, isAssocList, 'js-img', 'listof (listof X Y)', 2);

	var attribs = assocListToHash(attribList);
	var node = jsworld.MobyJsworld.img(src, attribs);

	node.toWrittenString = function(cache) { return "(js-img ...)"; }
	node.toDisplayedString = node.toWrittenString;
	node.toDomNode = function(cache) { return node; }
	return node;
};
PRIMITIVES['js-img'] =
	new CasePrimitive('js-img',
	[new PrimProc('js-img', 1, false, false, function(src) { return jsImg(src, types.EMPTY); }),
	 new PrimProc('js-img', 2, false, false, jsImg)]);



PRIMITIVES['js-text'] =
    new PrimProc('js-text',
		 1,
		 false, false,
		 function(s) {
		 	check(s, isString, 'js-text', 'string', 1);

			var node = jsworld.MobyJsworld.text(s, []);
			node.toWrittenString = function(cache) { return "(js-text ...)"; }
			node.toDisplayedString = node.toWrittenString;
			node.toDomNode = function(cache) { return node; }
			return node;
		 });


var jsSelect = function(optionList, updateF, attribList) {
	checkListOf(optionList, isString, 'js-select', 'listof string', 1);
	check(updateF, isFunction, 'js-select', 'procedure', 2);
	checkListOf(attribList, isAssocList, 'js-select', 'listof (listof X Y)', 3);

	var attribs = assocListToHash(attribList);
	var options = helpers.deepListToArray(optionList);
	var node = jsworld.MobyJsworld.select(options, updateF, attribs);

	node.toWrittenString = function(cache) { return '(js-select ...)'; };
	node.toDisplayedString = node.toWrittenString;
	node.toDomNode = function(cache) { return node; };
	return node;
};
PRIMITIVES['js-select'] =
	new CasePrimitive('js-select',
	[new PrimProc('js-select', 2, false, false,
		function(optionList, updateF) {
			return jsSelect(optionList, updateF, types.EMPTY);
		}),
	 new PrimProc('js-select', 3, false, false, jsSelect)]);




PRIMITIVES['js-big-bang'] =
    new PrimProc('js-big-bang',
		 1,
		 true, true,
		 function(state, initW, handlers) {
		 	arrayEach(handlers,
				function(x, i) {
					check(x, function(y) { return isWorldConfigOption(y) || isList(x); },
					      'js-big-bang', 'handler or attribute list', i+2);
				});
		     var unwrappedConfigs = 
			 helpers.map(handlers, function(x) { return function(config) { return x.configure(config); } });
		     return PAUSE(function(restarter, caller) {
			 jsworld.MobyJsworld.bigBang(initW, 
						     state.getToplevelNodeHook()(),
						     unwrappedConfigs,
						     caller, 
						     restarter);
		     })
		 });






/***************************
 *** Primitive Constants ***
 ***************************/


PRIMITIVES['eof'] = types.EOF;
PRIMITIVES['e'] = jsnums.e;
PRIMITIVES['empty'] = types.EMPTY;
PRIMITIVES['false'] = false;
PRIMITIVES['true'] = true;
PRIMITIVES['pi'] = jsnums.pi;
PRIMITIVES['null'] = types.EMPTY;




/////////////////////////////////////////////////////////////////////////////////////////////

primitive.getPrimitive = function(name) {
    return PRIMITIVES[name];
};

primitive.isPrimitive = function(x) {
    return x instanceof PrimProc;
};

primitive.addPrimitive = function(name, aPrim) {
    PRIMITIVES[name] = aPrim;
};

primitive.Primitive = PrimProc;
primitive.CasePrimitive = CasePrimitive;


primitive.setCALL = setCALL;
primitive.setPAUSE = setPAUSE;

})();

// Control structures

/*
var sys = require('sys');
var types = require('./types');
var primitive = require('./primitive');
var types = require('./types');



var DEBUG_ON = false;

var setDebug = function(v) {
    DEBUG_ON = v;
}

var debug = function(s) {
    if (DEBUG_ON) {
	sys.debug(s);
    }
}

var debugF = function(f_s) {
    if (DEBUG_ON) {
	sys.debug(f_s());
    }
}
*/

var control = {};


(function() {


//////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////
// INTERNAL
// Set
// Setting stack values.

var SetControl = function(depth) {
    this.depth = depth;
};
SetControl.prototype.invoke = function(state) {
    debug("SET " + this.depth);
    if (state.vstack.length - 1 - (this.depth || 0) < 0) {
	throw new Error("vstack not long enough");
    }
    state.setn(this.depth, state.v);
};


//////////////////////////////////////////////////////////////////////
// INTERNAL
// Push a value into the nth position on the stack

var PushnControl = function(n) {
    this.n = n;
};
PushnControl.prototype.invoke = function(state) {
    state.pushn(this.n);
};


// INTERNAL
var SwapControl = function(depth) {
    this.depth = depth;
};

SwapControl.prototype.invoke = function(state) {
    debug("SWAP " + this.depth);
    if (state.vstack.length - 1 - (this.depth || 0) < 0) {
	throw new Error("vstack not long enough");
    }
    var tmp = state.vstack[state.vstack.length - 1 - (this.depth || 0)];
    state.vstack[state.vstack.length - 1 - (this.depth || 0)] = state.v;
    state.v = tmp;
};



// Internal
// Pop n values
var PopnControl = function(n) { 
    this.n = n;
};

PopnControl.prototype.invoke = function(state) {
    state.popn(this.n);
};





//////////////////////////////////////////////////////////////////////














//////////////////////////////////////////////////////////////////////
// Modules

var Prefix = function(params) {
    this.numLifts = params.numLifts;
    this.toplevels = params.toplevels;
};


var ModControl = function(prefix, body) {
    this.prefix = prefix;
    this.body = body;
};

ModControl.prototype.invoke = function(state) {
    processPrefix(state, this.prefix);
    var cmds = [];
    for(var i = 0; i < this.body.length; i++) {
	cmds.push(this.body[i]);
    }
    state.pushManyControls(cmds);
};


var processPrefix = function(state, prefix) {
    var numLifts = prefix.numLifts;
    var newPrefix = new types.PrefixValue();
    for (var i = 0; i < prefix.toplevels.length + numLifts; i++) {
	var top = prefix.toplevels[i];
	if (top === false) {
	    newPrefix.addSlot();
	} else if (top['$'] === 'module-variable') {
	    var aPrim = primitive.getPrimitive(top.sym+'');
	    if (typeof(aPrim) !== 'undefined') {
		newPrefix.addSlot(aPrim);
	    } else {
		throw new Error("unable to install toplevel element " + top.sym); 
	    }
	} else if (top['$'] === 'global-bucket') {
	    var name = top.value+'';
	    if (! state.globals[name]) {
		state.globals[name] =
		    new types.GlobalBucket(name, types.UNDEFINED);
	    } else {
	    }
	    newPrefix.addSlot(state.globals[name]);
	} else {
	    throw new Error("unable to install toplevel element " + top); 
	}
    }
    state.vstack.push(newPrefix);
};




//////////////////////////////////////////////////////////////////////
// Constants


var ConstantControl = function(value) {
    this.value = value;
};


ConstantControl.prototype.invoke = function(state) {
    state.v = this.value;
};





//////////////////////////////////////////////////////////////////////
// Branches


var BranchControl = function(test, thenPart, elsePart) {
    this.test = test;
    this.thenPart = thenPart;
    this.elsePart = elsePart;
};


BranchControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.test);
    cmds.push(new BranchRestControl(this.thenPart, this.elsePart));
    state.pushManyControls(cmds);
};

var BranchRestControl = function(thenPart, elsePart) {
    this.thenPart = thenPart;
    this.elsePart = elsePart;
};


BranchRestControl.prototype.invoke = function(state) {
    debug("BRANCH");
    if (state.v) {
	state.pushControl(this.thenPart);
    } else {
	state.pushControl(this.elsePart);
    }
};



//////////////////////////////////////////////////////////////////////
// Sequences


var SeqControl = function(forms) {
    this.forms = forms;
};


SeqControl.prototype.invoke = function(state) {
    var forms = this.forms;
    var cmds = [];
    for (var i = 0; i < forms.length; i++) {
	cmds.push(forms[i]);
    }
    state.pushManyControls(cmds);    
};



//////////////////////////////////////////////////////////////////////
// Beg0

var Beg0Control = function(seq) {
    this.seq = seq;
};

Beg0Control.prototype.invoke = function(state) {
    if (this.seq.length === 1) {
	state.pushControl(this.seq[0]);
    } else {
	var rest = [];
	for (var i = 1; i < this.seq.length; i++) {
	    rest.push(this.seq[i]);
	}
	state.pushManyControls([this.seq[0], new Beg0RestControl(rest)]);
    }
};


var Beg0RestControl = function(rest) {
    this.rest = rest;
};

Beg0RestControl.prototype.invoke = function(state) {
    // Rearrange the control stack so the rest of the
    // begin sequence will evaluate, followed by 
    // bringing the first expression's value back into
    // the value register.
    state.pushControl(new ConstantControl(state.v));
    state.pushManyControls(this.rest);
};



//////////////////////////////////////////////////////////////////////
// Toplevel variable lookup

var ToplevelControl = function(depth, pos) {
    this.depth = depth;
    this.pos = pos;
    // FIXME: use isConst and isReady 
};

ToplevelControl.prototype.invoke = function(state) {
    state.v = state.refPrefix(this.depth, this.pos);
};



//////////////////////////////////////////////////////////////////////
// Local variable references

var LocalrefControl = function(pos, isUnbox) {
    this.pos = pos;
    this.isUnbox = isUnbox;
};

LocalrefControl.prototype.invoke = function(state) {
    var val = state.peekn(this.pos);
    if (this.isUnbox) {
	val = val.unbox();
    }
    state.v = val;
};



//////////////////////////////////////////////////////////////////////
// Primitive value lookup

var PrimvalControl = function(name) {
    this.name = name + '';
};

PrimvalControl.prototype.invoke = function(state) {
    var prim = primitive.getPrimitive(this.name);
    if (! prim) {
	throw new Error("Primitive " + this.name
			+ " not implemented!");
    }
    state.v = prim;
};



//////////////////////////////////////////////////////////////////////
// Lambdas

var LamControl = function(params) {
    this.numParams = params.numParams;
    this.paramTypes = params.paramTypes;
    this.isRest = params.isRest;
    this.closureMap = params.closureMap;
    this.closureTypes = params.closureTypes;
    this.body = params.body;
};


LamControl.prototype.invoke = function(state) {
    state.v = new types.ClosureValue(this.numParams, 
				     this.paramTypes, 
				     this.isRest, 
				     makeClosureValsFromMap(state,
							    this.closureMap,
							    this.closureTypes), 
				     this.body);
};


// makeClosureValsFromMap: state [number ...] -> [scheme-value ...]
// Builds the array of closure values, given the closure map and its
// types.
var makeClosureValsFromMap = function(state, closureMap, closureTypes) {
    var closureVals = [];
    for (var i = 0; i < closureMap.length; i++) {
	var val, type;
	val = state.peekn(closureMap[i]);
	type = closureTypes[i];
	// FIXME: look at the type; will be significant?
	closureVals.push(val);
    }
    return closureVals;
};



//////////////////////////////////////////////////////////////////////
// Letrec
// Recursive definitions.

var LetRecControl = function(procs, body) {
    this.procs = procs;
    this.body = body;
};

LetRecControl.prototype.invoke = function(state) {
    var cmds = [];
    var n = this.procs.length;
    for (var i = 0; i < n; i++) {
	cmds.push(this.procs[i]);
	cmds.push(new SetControl(n - 1 - i));
    }
    cmds.push(new LetrecReinstallClosureControls(this.procs));
    cmds.push(this.body);
    state.pushManyControls(cmds);
};


var LetrecReinstallClosureControls = function(procs) {
    this.procs = procs;
};


LetrecReinstallClosureControls.prototype.invoke = function(state) {
    // By this point, all the closures in this.proc are installed, but
    // their closures need to be refreshed.
    var n = this.procs.length;
    for (var i = 0; i < n; i++) {
	var procRecord = this.procs[i];
	var closureVal = state.peekn(n - 1 - i);
	closureVal.closureVals = makeClosureValsFromMap(state, 
							procRecord.closureMap,
							procRecord.closureTypes);
    }  
};



//////////////////////////////////////////////////////////////////////
// Define Values


var DefValuesControl = function(ids, body) {
    this.ids = ids;
    this.body = body;
};


DefValuesControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.body);
    cmds.push(new DefValuesInstallControl(this.ids))
    state.pushManyControls(cmds);
};


var DefValuesInstallControl = function(ids) {
    this.ids = ids;
};

DefValuesInstallControl.prototype.invoke = function(state) {
    debug("DEF_VALUES");
    var bodyValue = state.v;
    if (bodyValue instanceof types.ValuesWrapper) {
	if (this.ids.length !== bodyValue.elts.length) {
	    throw new Error("define-values: expected " + this.ids.length 
			    + " values, but received " 
			    + bodyValue.elts.length);
	}
	for (var i = 0; i < this.ids.length; i++) {
	    state.setPrefix(this.ids[i].depth,
			    this.ids[i].pos,
			    bodyValue.elts[i]);
	}
    } else {
	if (this.ids.length !== 1) {
	    throw new Error("define-values: expected " + this.ids.length 
			    + " values, but only received one: " + bodyValue);
	} else {
	    state.setPrefix(this.ids[0].depth,
			    this.ids[0].pos,
			    bodyValue);
	}
    } 
};



//////////////////////////////////////////////////////////////////////
// Procedure application

var ApplicationControl = function(rator, rands) {
    this.rator = rator;
    this.rands = rands;
};


ApplicationControl.prototype.invoke = function(state) {
    var rator = this.rator;
    var rands = this.rands;

    var cmds = [];    
    // We allocate as many values as there are operands.
    if (rands.length !== 0) {
	cmds.push(new PushnControl(rands.length));
    }
    cmds.push(rator);    
    if (rands.length !== 0) {
	cmds.push(new SetControl(rands.length-1));
    }

    for (var i = 0; i < rands.length; i++) {
	if (i !== rands.length - 1) {
	    cmds.push(rands[i]);
	    cmds.push(new SetControl(i));
	} else {
	    cmds.push(rands[rands.length-1]);
	    cmds.push(new SwapControl(rands.length-1));
	}
    }
    cmds.push(new CallControl(rands.length));
    // CallControl will be responsible for popping off the 
    // value stack elements.

    state.pushManyControls(cmds);
};




var CallControl = function(n) {
    this.n = n;
};

CallControl.prototype.invoke = function(state) {
    debug("CALL " + this.n);
    var operandValues = [];
    for (var i = 0; i < this.n; i++) {
	operandValues.push(state.popValue());
    }
    callProcedure(state, state.v, this.n, operandValues);
};


var callProcedure = function(state, procValue, n, operandValues) {
    procValue = selectProcedureByArity(n, procValue);
    if (primitive.isPrimitive(procValue)) {
	callPrimitiveProcedure(state, procValue, n, operandValues);
    } else if (procValue instanceof types.ClosureValue) {
	callClosureProcedure(state, procValue, n, operandValues);
    } else if (procValue instanceof types.ContinuationClosureValue) {
	callContinuationProcedure(state, procValue, n, operandValues);
    } else {
	throw new Error("Procedure is neither primitive nor a closure");
    }
};


var callPrimitiveProcedure = function(state, procValue, n, operandValues) {
    // Tail call optimization:
    if (state.cstack.length !== 0 && 
	state.cstack[state.cstack.length - 1] instanceof PopnControl) {
	state.cstack.pop().invoke(state);
    }
    var args = preparePrimitiveArguments(state, 
					 procValue, 
					 operandValues,
					 n);
    var result = procValue.impl.apply(procValue.impl, args);
    processPrimitiveResult(state, result, procValue);
};


var processPrimitiveResult = function(state, result, procValue) {
    if (result instanceof INTERNAL_CALL) {
	state.cstack.push(new InternalCallRestartControl
			  (result.k, procValue));
	callProcedure(state,
		      result.operator, 
		      result.operands.length, 
		      result.operands);
    } else if (result instanceof INTERNAL_PAUSE) {
	throw new PauseException(result.onPause);
    } else {
	if (! procValue.usesState) {
	    state.v = result;
	}
    }
};



var PauseException = function(onPause) {
    this.onPause = onPause;
};




//////////////////////////////////////////////////////////////////////
// INTERNAL_CALL
// used for interaction between the Primitives and the interpreter (callPrimitiveProcedure).
// Don't confuse this with CallControl.
var INTERNAL_CALL = function(operator, operands, k) {
    this.operator = operator;
    this.operands = operands;
    this.k = k;
};


var InternalCallRestartControl = function(k, procValue) {
    this.k = k;
    this.procValue = procValue;
};

InternalCallRestartControl.prototype.invoke = function(state) {
    processPrimitiveResult(state,
			   this.k(state.v), 
			   this.procValue);
};

primitive.setCALL(INTERNAL_CALL);


//////////////////////////////////////////////////////////////////////

// INTERNAL_PAUSE
// used for interaction between the Primitive functions and the
// interpreter.
// Halts the interpreter, but passing onPause the functions necessary
// to restart computation.
var INTERNAL_PAUSE = function(onPause) {
    this.onPause = onPause;
};


primitive.setPAUSE(INTERNAL_PAUSE);

//////////////////////////////////////////////////////////////////////








var callClosureProcedure = function(state, procValue, n, operandValues) {
    // Tail call optimization
    if (state.cstack.length !== 0 && 
	state.cstack[state.cstack.length - 1] instanceof PopnControl) {
	state.cstack.pop().invoke(state);
	var argCount = prepareClosureArgumentsOnStack(state, 
						      procValue, 
						      operandValues,
						      n);
	state.pushControl(new PopnControl(argCount));
	state.pushControl(procValue.body);

    } else if (state.cstack.length >= 2 &&
	       types.isContMarkRecordControl(state.cstack[state.cstack.length - 1]) &&
	       state.cstack[state.cstack.length - 2] instanceof PopnControl) {
	// Other tail call optimzation: if there's a continuation mark frame...
	state.cstack[state.cstack.length - 2].invoke(state);
	var argCount = prepareClosureArgumentsOnStack(state, 
						      procValue, 
						      operandValues,
						      n);
	state.cstack[state.cstack.length - 2] = new PopnControl(argCount);
	state.pushControl(procValue.body);
    } else {
	// General case:
	var argCount = prepareClosureArgumentsOnStack(state, 
						      procValue, 
						      operandValues,
						      n);
	state.pushControl(new PopnControl(argCount));
	state.pushControl(procValue.body);
    }
};


var callContinuationProcedure = function(state, procValue, n, operandValues) {
    if (n === 1) {
	state.v = operandValues[0];
    } else {
	state.v = new types.ValuesWrapper(operandValues);
    }
    state.vstack = procValue.vstack;
    state.cstack = procValue.cstack;
};




// selectProcedureByArity: (CaseLambdaValue | CasePrimitive | Continuation | Closure | Primitive) -> (Continuation | Closure | Primitive)
var selectProcedureByArity = function(n, procValue) {
    if (procValue instanceof types.CaseLambdaValue) {
	for (var j = 0; j < procValue.closures.length; j++) {
	    if (n === procValue.closures[j].numParams ||
		(n > procValue.closures[j].numParams && 
		 procValue.closures[j].isRest)) {
		return procValue.closures[j];
	    }
	}
	var acceptableParameterArity = [];
	for (var i = 0; i < procValue.closures.length; i++) {
	    acceptableParameterArity.push(procValue.closures[i].numParams + '');
	}
	throw new Error("Procedure expects [" + acceptableParameterArity.join(', ') + 
			"] arguments, but received " + n);
    } else if (procValue instanceof primitive.CasePrimitive) {
	for (var j = 0; j < procValue.cases.length; j++) {
	    if (n === procValue.cases[j].numParams ||
		(n > procValue.cases[j].numParams && 
		 procValue.cases[j].isRest)) {
		return procValue.cases[j];
	    }
	}
	var acceptableParameterArity = [];
	for (var i = 0; i < procValue.cases.length; i++) {
	    acceptableParameterArity.push(procValue.cases[i].numParams + '');
	}
	throw new Error("Procedure expects [" + acceptableParameterArity.join(', ') + 
			"] arguments, but received " + n);
    }


    // At this point, procValue must be either a Continuation,
    // Closure, or Primitive.  We check to see that the number of
    // arguments n matches the acceptable number of arguments from the
    // procValue.
    if (procValue instanceof types.ContinuationClosureValue) {
	// The continuation can accept any number of arguments
	return procValue;
    } else {
	if ((n === procValue.numParams) ||
	    (n > procValue.numParams && procValue.isRest)) {
	    return procValue;
	} else {
	    throw new Error("Procedure expects " + procValue.numParams + " arguments, but received " + n);
	}
    }
};




var prepareClosureArgumentsOnStack = function(state, procValue, operandValues, n) {
    var argCount = 0;
    if (procValue.isRest) {
	var restArg = types.EMPTY;
	for (var i = 0; i < n - procValue.numParams ; i++) {
	    restArg = types.cons(operandValues.pop(), restArg);
	}
	state.pushValue(restArg);
	argCount++;
    }	
    for (var i = operandValues.length -1; i >= 0; i--) {
	state.pushValue(operandValues[i]);
	argCount++;
    }
    for(var i = procValue.closureVals.length-1; i >= 0; i--) {
	state.pushValue(procValue.closureVals[i]);
	argCount++;
    }
    return argCount;
}




var preparePrimitiveArguments = function(state, primitiveValue, operandValues, n) {
    var args = [];

    if (primitiveValue.usesState) {
	args.push(state);
    }

    if (n < primitiveValue.numParams) {
	throw new Error("arity error: expected at least "
			+ primitiveValue.numParams + " arguments, but "
			+ "received " + n + " arguments instead.");
    }
    if (primitiveValue.isRest) {
	for(var i = 0; i < primitiveValue.numParams; i++) {
	    args.push(operandValues.shift());
	}
	var restArgs = [];
	for(var i = 0; i < n - primitiveValue.numParams; i++) {
	    restArgs.push(operandValues.shift());
	}
	args.push(restArgs);
    } else {
	if (primitiveValue.numParams !== n) {
	    throw new Error("arity error: expected " 
			    + primitiveValue.numParams 
			    + " but received " + n);
	}
	for(var i = 0; i < primitiveValue.numParams; i++) {
	    args.push(operandValues.shift());
	}
    }
    return args;
};






//////////////////////////////////////////////////////////////////////
// Continuation marks
var WithContMarkControl = function(key, val, body) {
    this.key = key;
    this.val = val;
    this.body = body;
};

WithContMarkControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.key);
    cmds.push(new WithContMarkKeyControl(this.val,
					 this.body));
    state.pushManyControls(cmds);
};


var WithContMarkKeyControl = function(val, body) {
    this.val = val;
    this.body = body;
};

WithContMarkKeyControl.prototype.invoke = function(state) {
    var evaluatedKey = state.v;
    var cmds = [];
    cmds.push(this.val);
    cmds.push(new WithContMarkVal(evaluatedKey,
				  this.body));
    state.pushManyControls(cmds);
};

var WithContMarkVal = function(key, body) {
    this.key = key;
    this.body = body;
};

WithContMarkVal.prototype.invoke = function(state) {
    var evaluatedVal = state.v;
    // Check to see if there's an existing ContMarkRecordControl
    if (state.cstack.length !== 0 && 
	( types.isContMarkRecordControl(state.cstack[state.cstack.length - 1]) )) {
	state.pushControl(state.cstack.pop().update
			  (this.key, evaluatedVal));
    } else {
	var aHash = types.makeLowLevelEqHash();
	aHash.put(this.key, evaluatedVal);
	state.pushControl(types.contMarkRecordControl(aHash));
    }
    state.pushControl(this.body);
};





//////////////////////////////////////////////////////////////////////
// Apply-values


var ApplyValuesControl = function(proc, argsExpr) {
    this.proc = proc;
    this.argsExpr = argsExpr;
};

ApplyValuesControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.proc);
    cmds.push(new ApplyValuesArgControl(this.argsExpr));
    state.pushManyControls(cmds);
};

var ApplyValuesArgControl = function(expr) {
    this.expr = expr;
};

ApplyValuesArgControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.expr);
    cmds.push(new ApplyValuesAppControl(state.v));
    state.pushManyControls(cmds);

};


var ApplyValuesAppControl = function(procVal) {
    this.procVal = procVal;
};

ApplyValuesAppControl.prototype.invoke = function(state) {
    var exprValue = state.v;
    state.v = this.procVal;
    if (exprValue instanceof types.ValuesWrapper) {
	var elts = exprValue.elts;
	for(var i = elts.length - 1; i >= 0; i--) {
	    state.pushValue(elts[i]);
	}
	state.pushControl(new CallControl(elts.length));
    } else {
	state.pushValue(exprValue);
	state.pushControl(new CallControl(1));
    }
};




//////////////////////////////////////////////////////////////////////
// Let one
var LetOneControl = function(rhs, body) {
    this.rhs = rhs;
    this.body = body;
};


LetOneControl.prototype.invoke = function(state) {
    var cmds = [];
    state.pushn(1);
    cmds.push(this.rhs);
    cmds.push(new SetControl(0));
    cmds.push(this.body);
    cmds.push(new PopnControl(1));
    state.pushManyControls(cmds);
};


//////////////////////////////////////////////////////////////////////
// Let void

var LetVoidControl = function(params) {
    this.count = params.count;
    this.isBoxes = params.isBoxes;
    this.body = params.body;
};

LetVoidControl.prototype.invoke = function(state) {
    var cmds = [];
    var n = this.count;
    state.pushn(n);
    if (this.isBoxes) {
	for (var i = 0; i < n; i++) {
	    state.setn(i, types.box(types.UNDEFINED));
	}
    }
    cmds.push(this.body);
    cmds.push(new PopnControl(n));
    state.pushManyControls(cmds);
};






//////////////////////////////////////////////////////////////////////

var BoxenvControl = function(pos, body) {
    this.pos = pos;
    this.body = body;
};


BoxenvControl.prototype.invoke = function(state) {
    state.setn(this.pos,
	       types.box(state.peekn(this.pos)));
    state.pushControl(this.body);
};



//////////////////////////////////////////////////////////////////////
// install-value

var InstallValueControl = function(params) {
    this.count = params.count;
    this.pos = params.pos;
    this.isBoxes = params.isBoxes;
    this.rhs = params.rhs;
    this.body = params.body;
};


InstallValueControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.rhs);
    cmds.push(new InstallValueRhsControl(this.count,
					 this.pos,
					 this.isBoxes,
					 this.body));
    state.pushManyControls(cmds);
};


var InstallValueRhsControl = function(count, pos, isBoxes, body) {
    this.count = count;
    this.pos = pos;
    this.isBoxes = isBoxes;
    this.body = body;
};

InstallValueRhsControl.prototype.invoke = function(state) {
    // The value's on the stack.  First check the proper number
    // of arguments.
    var aValue = state.v;
    var vals = [];
    if (aValue instanceof types.ValuesWrapper) {
	if (this.count !== aValue.elts.length) {  
	    throw new Error("expected " + this.count 
			    + " values, but received " 
			    + aValue.elts.length)
	}
	vals = aValue.elts;
    } else {
	if (this.count !== 1) {
	    throw new Error("expected " + this.count 
			    + " values, but received"
			    + " one");
	}
	vals = [aValue];
    }
    if (this.isBoxes) {
	for (var i = 0; i < this.count; i++) {
	    state.peekn(i + this.pos).set(vals[i]);
	}
    } else {
	for (var i = 0; i < this.count; i++) {
	    state.setn(i + this.pos, vals[i]);
	}
    }
    state.pushControl(this.body);
};









//////////////////////////////////////////////////////////////////////

var AssignControl = function(params) {
    this.id = params.id;
    this.rhs = params.rhs;
    this.isUndefOk = params.isUndefOk;
};


AssignControl.prototype.invoke = function(state) {
    var cmds = [];
    cmds.push(this.rhs);
    cmds.push(new SetToplevelControl(this.id.depth,
				     this.id.pos,
				     this.isUndefOk));
    state.pushManyControls(cmds);
};



var SetToplevelControl = function(depth, pos, isUndefOk) {
    this.depth = depth;
    this.pos = pos;
    this.isUndefOk = isUndefOk;
};

SetToplevelControl.prototype.invoke = function(state) {
    debug("SET_TOPLEVEL " + this.depth + ", " + this.pos);
    if (state.vstack.length - 1 - (this.depth || 0) < 0) {
	throw new Error("vstack not long enough");
    }
    state.setPrefix(this.depth, this.pos, state.v)
};




//////////////////////////////////////////////////////////////////////
// Variable references

var VarrefControl = function(toplevel) {
    this.toplevel = toplevel;
};

VarrefControl.prototype.invoke = function(state) {
    var depth, pos;
    depth = this.toplevel.depth;
    pos = this.toplevel.pos;
    state.v = new types.VariableReference(state.vstack[state.vstack.length - 1 - depth],
					  pos);
};

//////////////////////////////////////////////////////////////////////




var ClosureControl = function(genId) {
    this.genId = genId + '';
};

ClosureControl.prototype.invoke = function(state) {
    state.v = state.heap[this.genId];
};




//////////////////////////////////////////////////////////////////////
// Case lambda

var CaseLamControl = function(name, clauses) {
    this.name = name;
    this.clauses = clauses;
};

CaseLamControl.prototype.invoke = function(state) {
    var clauses = this.clauses;
    if (clauses.length === 0) {
	state.v = new types.CaseLambdaValue(this.name, []);
    } else {
	state.pushControl(new CaseLambdaComputeControl(this.name, 
						       types.list(clauses).rest(),
						       types.list([])));
	state.pushControl(clauses[0]);
    }
};


var CaseLambdaComputeControl = function(name, lamsToEvaluate, evaluatedLams) {
    this.name = name;
    this.lamsToEvaluate = lamsToEvaluate;
    this.evaluatedLams = evaluatedLams;
};


CaseLambdaComputeControl.prototype.invoke = function(state) {
    var nextEvaluatedLam = state.v;
    if (this.lamsToEvaluate.isEmpty()) {
	var clauseList = (types.cons(nextEvaluatedLam, this.evaluatedLams)).reverse();
	var clauses = [];
	while (!clauseList.isEmpty()) {
	    clauses.push(clauseList.first());
	    clauseList = clauseList.rest();
	}
	state.v = new types.CaseLambdaValue(this.name, clauses);
    } else {
	state.pushControl(new CaseLambdaComputeControl(
	    this.name,
	    this.lamsToEvaluate.rest(),
	    types.cons(nextEvaluatedLam,
		       this.evaluatedLams)));
	state.pushControl(this.lamsToEvaluate.first());
    }
};












//////////////////////////////////////////////////////////////////////
control.processPrefix = processPrefix;

control.ConstantControl = ConstantControl;
control.BranchControl = BranchControl;
control.SeqControl = SeqControl;
control.Beg0Control = Beg0Control;
control.ModControl = ModControl;
control.Prefix = Prefix;
control.ToplevelControl = ToplevelControl;
control.DefValuesControl = DefValuesControl;
control.LamControl = LamControl;
control.PrimvalControl = PrimvalControl;
control.ApplicationControl = ApplicationControl;
control.LocalrefControl = LocalrefControl;
control.ApplyValuesControl = ApplyValuesControl;
control.LetOneControl = LetOneControl;
control.LetVoidControl = LetVoidControl;
control.BoxenvControl = BoxenvControl;
control.InstallValueControl = InstallValueControl;
control.WithContMarkControl = WithContMarkControl;
control.AssignControl = AssignControl;
control.VarrefControl = VarrefControl;
control.ClosureControl = ClosureControl;
control.CaseLamControl = CaseLamControl;
control.LetRecControl = LetRecControl;
control.CallControl = CallControl;


control.PauseException = PauseException;

})();

// Loader: take bytecode and translate to internal format.
/*
var control = require('./control');
var sys = require('sys');
*/

var loader = {};

(function() {



// loadCode: State code -> Control
var loadCode = function(state, nextCode) {
    switch(nextCode.$) {
    case 'mod':
	return loadMod(state, nextCode);
	break;
    case 'def-values':
	return loadDefValues(state, nextCode);
	break;
    case 'indirect':
	return loadIndirect(state, nextCode);
	break;
    case 'apply-values':
	return loadApplyValues(state, nextCode);
	break;
    case 'toplevel':
	return loadToplevel(state, nextCode);
	break;
    case 'constant':
	return loadConstant(state, nextCode);
	break;
    case 'seq':
	return loadSeq(state, nextCode);
	break;
    case 'application':
	return loadApplication(state, nextCode);
	break;
    case 'localref':
	return loadLocalRef(state, nextCode);
	break;
    case 'primval':
	return loadPrimval(state, nextCode);
	break;
    case 'branch':
	return loadBranch(state, nextCode);
	break;
    case 'lam':
	return loadLam(state, nextCode);
	break;
    case 'let-one':
	return loadLetOne(state, nextCode);
	break;
    case 'let-void':
	return loadLetVoid(state, nextCode);
	break;
    case 'beg0':
	return loadBeg0(state, nextCode);
	break;
    case 'boxenv':
	return loadBoxenv(state, nextCode);
	break;
    case 'install-value':
	return loadInstallValue(state, nextCode);
	break;
    case 'with-cont-mark':
	return loadWithContMark(state, nextCode);
	break;
    case 'assign':
	return loadAssign(state, nextCode);
	break;
    case 'varref':
	return loadVarref(state, nextCode);
	break;
    case 'closure':
	return loadClosure(state, nextCode);
	break;
    case 'case-lam':
	return loadCaseLam(state, nextCode);
	break;
    case 'let-rec':
	return loadLetRec(state, nextCode);
	break;
    default:
	// FIXME: as soon as we implement topsyntax,
	// we should never get here.
	throw new Error("I don't know how to handle " + sys.inspect(nextCode));
    }
};



// loadCodes: state [code] -> [Control]
var loadCodes = function(state, codes) {
    var result = [];
    for (var i = 0; i < codes.length; i++) {
	result.push(loadCode(state, codes[i]));
    }
    return result;
};



//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////


var loadMod = function(state, modCode) {
    return new control.ModControl(loadPrefix(modCode['prefix']),
				  loadCodes(state, modCode['body']));
};


var loadPrefix = function(aPrefix) {
    return new control.Prefix({numLifts : aPrefix['num-lifts'],
			       toplevels: aPrefix['toplevels']});
};


var loadDefValues = function(state, nextCode) {
    return new control.DefValuesControl(nextCode['ids'],
					loadCode(state, nextCode['body']));
};


var loadIndirect = function(state, nextCode) {
    return new control.ConstantControl(state.heap[nextCode['value']]);
};


var loadApplyValues = function(state, nextCode) {
    return new control.ApplyValuesControl(
	loadCode(state, nextCode['proc']),
	loadCode(state, nextCode['args-expr']));
};

var loadToplevel = function(state, nextCode) {
    return new control.ToplevelControl(nextCode['depth'],
				       nextCode['pos']);
    // FIXME: use isConst and isReady
    //    isConst: nextCode['const?']
    //    isReady: nextCode['ready?'];
};


var loadConstant = function(state, nextCode) {
    return new control.ConstantControl(nextCode['value']);
};


var loadSeq = function(state, nextCode) {
    var result = new control.SeqControl(loadCodes(state, nextCode['forms']));
    return result;
};

var loadApplication = function(state, nextCode) {
    return new control.ApplicationControl(
	loadCode(state, nextCode['rator']),
	loadCodes(state, nextCode['rands']));
};

var loadLocalRef = function(state, nextCode) {
    return new control.LocalrefControl(
	nextCode['pos'],
	nextCode['unbox?']);

    // FIXME: use the other attributes:
    // 	nextCode['clear'],
    // 	nextCode['other-clears?'],
    // 	nextCode['flonum?'];
};

var loadPrimval = function(state, nextCode) {
    return new control.PrimvalControl(nextCode['value']);
};

var loadBranch = function(state, nextCode) {
    return new control.BranchControl(loadCode(state, nextCode['test']),
				     loadCode(state, nextCode['then']),
				     loadCode(state, nextCode['else']));
};


var loadLam = function(state, nextCode) {
    var result =  new control.LamControl(
	{ numParams: nextCode['num-params'],
	  paramTypes: nextCode['param-types'],
	  isRest: nextCode['rest?'],
	  closureMap: nextCode['closure-map'],
	  closureTypes: nextCode['closure-types'],
	  body: loadCode(state, nextCode['body']) 
	});
    return result;
    // FIXME: use nextCode['flags'],
    //            nextCode['max-let-depth'],
};


var loadLetOne = function(state, nextCode) {
    return new control.LetOneControl(
	loadCode(state, nextCode['rhs']),
	loadCode(state, nextCode['body']));
    // FIXME: use nextCode['flonum?']
};


var loadLetVoid = function(state, nextCode) {
    return new control.LetVoidControl({count: nextCode['count'],
				       isBoxes: nextCode['boxes?'],
				       body: loadCode(state, nextCode['body'])});
};

var loadBeg0 = function(state, nextCode) {
    return new control.Beg0Control(
	loadCodes(state, nextCode['seq']));
};

var loadBoxenv = function(state, nextCode) {
    return new control.BoxenvControl(
	nextCode['pos'],
	loadCode(state, nextCode['body']));
};



var loadInstallValue = function(state, nextCode) {
    return new control.InstallValueControl(
	{ count: nextCode['count'],
	  pos: nextCode['pos'],
	  isBoxes: nextCode['boxes?'],
	  rhs: loadCode(state, nextCode['rhs']),
	  body: loadCode(state, nextCode['body'] )});
};

var loadWithContMark = function(state, nextCode) {
    return new control.WithContMarkControl(
	loadCode(state, nextCode['key']),
	loadCode(state, nextCode['val']),
	loadCode(state, nextCode['body']));
};


var loadAssign = function(state, nextCode) {
    return new control.AssignControl(
	{ id: loadCode(state, nextCode['id']),
	  rhs: loadCode(state, nextCode['rhs']),
	  isUndefOk: nextCode['undef-ok?'] });
};


var loadVarref = function(state, nextCode) {
    return new control.VarrefControl(
	loadCode(state, nextCode['toplevel']));
};

var loadClosure = function(state, nextCode) {
    return new control.ClosureCommand(nextCode['gen-id']);
    // FIXME: use nextCode['lam']?
};


var loadCaseLam = function(state, nextCode) {
    return new control.CaseLamControl(nextCode['name'],
				      loadCodes(state, nextCode['clauses']));
};


var loadLetRec = function(state, nextCode) {
    return new control.LetRecControl(loadCodes(state, nextCode['procs']),
				     loadCode(state, nextCode['body']));
};



//////////////////////////////////////////////////////////////////////


loader.loadCode = loadCode;

loader.loadPrefix = loadPrefix;
})();

/*
// For node.js.
var sys = require('sys');
var types = require('./types');
var primitive = require('./primitive');
var loader = require('./loader');
var assert = require('assert');
var control = require('./control');
var state = require('./state');

var DEBUG_ON = false;

var setDebug = function(v) {
    DEBUG_ON = v;
}

var debug = function(s) {
    if (DEBUG_ON) {
	sys.debug(s);
    }
}

var debugF = function(f_s) {
    if (DEBUG_ON) {
	sys.debug(f_s());
    }
}
*/


//////////////////////////////////////////////////////////////////////







//////////////////////////////////////////////////////////////////////

var interpret = {};


(function() {

// load: compilationTop state? -> state
// Load up the bytecode into a state, ready for evaluation.  If
// an old state is given, then reuses it.  In particular, if the
// compilationTop uses global variables, we try to preserve the
// values of old globals.
var load = function(compilationTop, aState) {
    if (! aState) {
	aState = new state.State();
    }


    // Install the indirects table.
    processIndirects(aState, compilationTop['compiled-indirects']);

    // Process the prefix.
    var prefix = loader.loadPrefix(compilationTop.prefix);
    control.processPrefix(aState, prefix);


    // Add the code form to the control stack.
    aState.pushControl(loader.loadCode(aState, compilationTop.code));

    return aState;

    // TODO: do some processing of the bytecode so that all the
    // constants are native, enable quick dispatching based on
    // bytecode type, rewrite the indirect loops, etc...
};




var processIndirects = function(state, indirects) {
    // First, install the shells
    for (var i = 0 ;i < indirects.length; i++) {
	var anIndirect = indirects[i];
	var lam = anIndirect['lam'];

	var numParams = lam['num-params'];
	var paramTypes = lam['param-types'];
	var isRest = lam['rest?'];
	var closureVals = makeClosureValsFromMap(state,
						 lam['closure-map'], 
						 lam['closure-types']);

	// Subtle: ignore the lam['body'] here: first install the lambdas in the heap.
	var sentinelBody = new control.ConstantControl(false)

	state.heap[anIndirect.id] = 
	    new types.ClosureValue(numParams, 
				   paramTypes, 
				   isRest, 
				   closureVals, 
				   sentinelBody);
    }

    // Once the lambdas are there, we can load up the bodies.
    for (var i = 0 ;i < indirects.length; i++) {
	var anIndirect = indirects[i];
	var lam = anIndirect['lam'];

	var lamValue = state.heap[anIndirect.id];
	lamValue.body = loader.loadCode(state, lam['body'])
    }
};








// makeClosureValsFromMap: state [number ...] -> [scheme-value ...]
// Builds the array of closure values, given the closure map and its
// types.
var makeClosureValsFromMap = function(state, closureMap, closureTypes) {
    var closureVals = [];
    for (var i = 0; i < closureMap.length; i++) {
	var val, type;
	val = state.peekn(closureMap[i]);
	type = closureTypes[i];
	// FIXME: look at the type; will be significant?
	closureVals.push(val);
    }
    return closureVals;
};



    // run: state (scheme-value -> void) (exn -> void) -> void
var run = function(state, onSuccessK, onFailK) {
    if (! onSuccessK) { onSuccessK = function(lastResult) {} };
    if (! onFailK) { onFailK = function(exn) { throw exn; } };



    // FIXME: Clear the existing control stack on run?

    try {
	while(! state.isStuck()) {
	    //debug("\n\nstate:\n");
	    // NOTE: sys.inspect is expensive, so we want to 
	    // control the order of evaluation within this tight
	    // loop.
	    //debugF(function() { return sys.inspect(state) });
	    step(state);
	}

	//     debug("\n\nFinished with: \n")
	//     debugF(function() { return sys.inspect(state) });
	//     debug("\n\nfinal value: ")
	//     debugF(function() { return sys.inspect(state.v) });
	onSuccessK(state.v);
	return;
    } catch (e) {
	if (e instanceof control.PauseException) {
	    var onRestart = makeOnRestart(state, onSuccessK, onFailK);
	    var onCall = makeOnCall(state);
	    e.onPause(onRestart, onCall);
	    return;
	} else if (types.isSchemeError(e)) {
	    // scheme exception
	    if ( types.isExn(e.val) &&
		!types.isContinuationMarkSet( types.exnContMarks(e.val) ) ) {
		    var dict = types.makeLowLevelEqHash();
		    for (var i = 0; i < state.cstack.length; i++) {
			if ( types.isContMarkRecordControl(state.cstack[i]) ) {
			    var aDict = state.cstack[i].dict;
			    var keys = aDict.keys();
			    for (var j = 0; j < keys.length; j++) {
				dict.put( keys[j], (dict.get(keys[j]) || []) );
				dict.get(keys[j]).push( aDict.get(keys[j]) );
			    }
			}
		    }
		    types.exnSetContMarks(e.val, types.continuationMarkSet(dict));
	    }
	    onFailK(e);
	    return;
	} else {
	    // internal exception:
	    // FIXME: wrap it up
	    onFailK(e);
	    return;
	}
    }
};
    
    

// call: state scheme-procedure (arrayof scheme-values) (scheme-value -> void) -> void
var call = function(state, operator, operands, k, onFail) {
    var stateValues = state.save();
    state.clearForEval();


    state.pushControl(
	new control.ApplicationControl(
	    new control.ConstantControl(operator), 
	    helpers.map(operands, 
			function(op) {
			    return new control.ConstantControl(op)})));
    try {
	run(state, 
	    function(v) {
		state.restore(stateValues);
		k(v)},
	    function(exn) {
		state.restore(stateValues);
		onFail(exn);
	    });
    } catch (e) {
	state.restore(stateValues);
	throw e;
    }
};


var makeOnCall = function(state) {
    return function(operator, operands, k, onFail) {
	return call(state, operator, operands, k, onFail);
    };
};





// create function for restarting a run, given the state
// and the continuation k.
var makeOnRestart = function(state, onSuccessK, onFailK) {
    return function(v) {
	if ( types.isSchemeError(v) ) {
		onFailK(v);
	}
	else {
		state.v = v;
		run(state, onSuccessK, onFailK);
	}
    };
};



// step: state -> void
// Takes one step in the abstract machine.
var step = function(state) {
    var nextCode = state.popControl();
    debugF(function() { return sys.inspect(nextCode) });
    if (typeof(nextCode) === 'object' && nextCode['invoke']) {
	nextCode.invoke(state);
    } else {
	// we should never get here.
	throw new Error("I don't know how to handle " + sys.inspect(nextCode));
    }
};



//////////////////////////////////////////////////////////////////////

/*
primitive.addPrimitive(
    "apply",
    new primitive.Primitive('apply', 
			    2, 
			    true, true,
			    function(state, f, firstArg, restArgs) {
				var numArgs = 0;
				restArgs.unshift(firstArg);
				if (restArgs.length > 0) {
				    var lastLst = 
					restArgs[restArgs.length - 1].reverse();
				    while (! lastLst.isEmpty()) {
					state.pushValue(lastLst.first());
					numArgs++;
					lastLst = lastLst.rest();
				    }
				}
				for (var i = restArgs.length - 2; i >= 0; i--) {
				    state.pushValue(restArgs[i]);
				    numArgs++;
				}

				state.v = f;
				state.pushControl(new control.CallControl(numArgs));
			    }));


primitive.addPrimitive('values',
		       new primitive.Primitive(
			   'values', 
			   0, 
			   true, false,
			   function(args) {
			       if (args.length === 1) {
				   return args[0];
			       }
			       return new types.ValuesWrapper(args);
			   }));
*/




primitive.addPrimitive('call/cc', 
		       new primitive.Primitive('call/cc',
					       1,
					       false, true,
					       function(state, f) {
						   var continuationClosure = 
						       captureContinuationClosure(state);
						   state.pushValue(continuationClosure);
						   state.v = f;
						   state.pushControl(new control.CallControl(1));
					       }));


var captureContinuationClosure = function(state) {
    return new types.ContinuationClosureValue(state.vstack,
					      state.cstack);
};



//////////////////////////////////////////////////////////////////////


interpret.load = load;
interpret.step = step;
interpret.run = run;
interpret.call = call;
//interpret.setDebug = setDebug;

})();
