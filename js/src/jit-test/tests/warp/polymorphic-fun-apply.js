// Polymorphic |fun.apply(thisArg, arguments)| and |fun.apply(thisArg, array)|
// calls with scripted, native and other kinds of targets.

function f1(a, b) { return this.x + a + b; }
function f2(a, b) { return this.x * a * b; }
function f3() { return arguments.length; }
function nativeMax() { return Math.max.apply(null, arguments); }

var targets = [f1, f2, f3, Math.max, String.prototype.concat];

function applyArgs(fn) {
  return function () { return fn().apply(this, arguments); };
}

function applyArray(fn, arr) {
  return fn().apply(this, arr);
}

function testArgsObj() {
  var i = 0;
  var callArgs = applyArgs(() => targets[i % targets.length]);
  var obj = { x: 3, toString() { return "obj"; } };
  for (; i < 2000; i++) {
    var r = callArgs.call(obj, 2, 5);
    switch (i % targets.length) {
      case 0: assertEq(r, 10); break;
      case 1: assertEq(r, 30); break;
      case 2: assertEq(r, 2); break;
      case 3: assertEq(r, 5); break;
      case 4: assertEq(r, "obj25"); break;
    }
  }
}
testArgsObj();

function testArray() {
  var obj = { x: 3, toString() { return "obj"; } };
  for (var i = 0; i < 2000; i++) {
    var k = i % targets.length;
    var r = applyArray.call(obj, () => targets[k], [2, 5]);
    switch (k) {
      case 0: assertEq(r, 10); break;
      case 1: assertEq(r, 30); break;
      case 2: assertEq(r, 2); break;
      case 3: assertEq(r, 5); break;
      case 4: assertEq(r, "obj25"); break;
    }
  }
}
testArray();

function testUnusualTargets() {
  class C {}
  var bound = f1.bind({ x: 100 }, 1);
  var proxy = new Proxy(f1, {});
  var unusual = [bound, proxy, C, {}, 1];
  var i = 0;
  var callArgs = applyArgs(() => (i < 1500 ? targets[i % 2] : unusual[i % unusual.length]));
  var obj = { x: 3 };
  for (; i < 2000; i++) {
    var k = i % unusual.length;
    var expectThrow = i >= 1500 && k >= 2;
    var threw = false;
    var r;
    try {
      r = callArgs.call(obj, 2, 5);
    } catch (e) {
      assertEq(e instanceof TypeError, true);
      threw = true;
    }
    assertEq(threw, expectThrow);
    if (i < 1500) {
      assertEq(r, i % 2 ? 30 : 10);
    } else if (k == 0) {
      assertEq(r, 103);
    } else if (k == 1) {
      assertEq(r, 10);
    }
  }
}
testUnusualTargets();

function testModifiedArguments() {
  var i = 0;
  var fn = () => targets[i % 2];
  var callArgs = function () {
    if (i > 1500) {
      arguments[0] = 10;
    }
    return fn().apply(this, arguments);
  };
  var obj = { x: 3 };
  for (; i < 2000; i++) {
    var a = i > 1500 ? 10 : 2;
    var r = callArgs.call(obj, 2, 5);
    assertEq(r, i % 2 ? 3 * a * 5 : 3 + a + 5);
  }
}
testModifiedArguments();

function testHoleyArray() {
  var obj = { x: 3 };
  for (var i = 0; i < 2000; i++) {
    var arr = i > 1500 ? [2, , 5] : [2, 5];
    var r = applyArray.call(obj, () => targets[i % 3], arr);
    var expected;
    switch (i % 3) {
      case 0: expected = i > 1500 ? NaN : 10; break;
      case 1: expected = i > 1500 ? NaN : 30; break;
      case 2: expected = arr.length; break;
    }
    assertEq(r, expected);
  }
}
testHoleyArray();

function testNotApply() {
  var i = 0;
  var o1 = { apply: Function.prototype.apply };
  var callArgs = function () { return targets[i % 2].apply(this, arguments); };
  var obj = { x: 3 };
  for (; i < 2000; i++) {
    if (i == 1500) {
      f1.apply = function () { return "own apply"; };
    }
    var r = callArgs.call(obj, 2, 5);
    if (i >= 1500 && i % 2 == 0) {
      assertEq(r, "own apply");
    } else {
      assertEq(r, i % 2 ? 30 : 10);
    }
  }
  delete f1.apply;
}
testNotApply();
