// Object.getOwnPropertyDescriptor with different kinds of objects and keys.

function desc(o, k) {
  var d = Object.getOwnPropertyDescriptor(o, k);
  if (d === undefined) {
    return "undefined";
  }
  return Object.keys(d).map(key => {
    var v = d[key];
    return key + ":" + (typeof v === "function" ? "fn" : String(v));
  }).join(",");
}

function f(a, b) {}
var getter = function () { return 1; };
var sym = Symbol("s");
var bigTA = new Int8Array(10);

function test() {
  var plain = { a: 1, get b() { return 2; }, [sym]: 3 };
  Object.defineProperty(plain, "c", { value: 4, writable: false, enumerable: false, configurable: false });
  Object.defineProperty(plain, "d", { set: getter, configurable: true });
  assertEq(desc(plain, "a"), "value:1,writable:true,enumerable:true,configurable:true");
  assertEq(desc(plain, "b"), "get:fn,set:undefined,enumerable:true,configurable:true");
  assertEq(desc(plain, sym), "value:3,writable:true,enumerable:true,configurable:true");
  assertEq(desc(plain, "c"), "value:4,writable:false,enumerable:false,configurable:false");
  assertEq(desc(plain, "d"), "get:undefined,set:fn,enumerable:false,configurable:true");
  assertEq(desc(plain, "missing"), "undefined");
  assertEq(desc(plain, "toString"), "undefined");

  // Lazily resolved properties.
  assertEq(desc(function g() {}, "prototype"), "value:[object Object],writable:true,enumerable:false,configurable:false");
  assertEq(desc(f, "length"), "value:2,writable:false,enumerable:false,configurable:true");
  assertEq(desc(f, "name"), "value:f,writable:false,enumerable:false,configurable:true");
  assertEq(desc(globalThis, "Array"), "value:fn,writable:true,enumerable:false,configurable:true");

  // Custom data properties and elements.
  var arr = [1, 2, 3];
  assertEq(desc(arr, "length"), "value:3,writable:true,enumerable:false,configurable:false");
  assertEq(desc(arr, 1), "value:2,writable:true,enumerable:true,configurable:true");
  assertEq(desc(arr, "1"), "value:2,writable:true,enumerable:true,configurable:true");
  assertEq(desc(arguments, "length"), "value:0,writable:true,enumerable:false,configurable:true");
  assertEq(desc(new String("abc"), "length"), "value:3,writable:false,enumerable:false,configurable:false");
  assertEq(desc(new String("abc"), "1"), "value:b,writable:false,enumerable:true,configurable:false");
  assertEq(desc("abc", "0"), "value:a,writable:false,enumerable:true,configurable:false");

  // Typed arrays with canonical numeric string keys.
  assertEq(desc(bigTA, "1"), "value:0,writable:true,enumerable:true,configurable:true");
  assertEq(desc(bigTA, "-0"), "undefined");
  assertEq(desc(bigTA, "1.5"), "undefined");
  assertEq(desc(bigTA, "length"), "undefined");

  // Proxies.
  var p = new Proxy({ x: 1 }, {});
  assertEq(desc(p, "x"), "value:1,writable:true,enumerable:true,configurable:true");
  var p2 = new Proxy({}, { getOwnPropertyDescriptor() { return { value: 5, configurable: true }; } });
  assertEq(desc(p2, "y"), "value:5,writable:false,enumerable:false,configurable:true");

  // Dictionary objects.
  var dict = {};
  for (var i = 0; i < 40; i++) {
    dict["p" + i] = i;
  }
  delete dict.p3;
  assertEq(desc(dict, "p20"), "value:20,writable:true,enumerable:true,configurable:true");
  assertEq(desc(dict, "p3"), "undefined");

  // ToObject and ToPropertyKey.
  assertEq(desc(1, "x"), "undefined");
  assertEq(desc(plain, { toString() { return "a"; } }), "value:1,writable:true,enumerable:true,configurable:true");
  var threw = false;
  try {
    Object.getOwnPropertyDescriptor(null, "a");
  } catch (e) {
    threw = e instanceof TypeError;
  }
  assertEq(threw, true);
}

for (var i = 0; i < 200; i++) {
  test();
}
