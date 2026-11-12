// Deleting properties from dictionary objects of various sizes, including
// small dictionary maps that don't have a PropMapTable.

function makeObj(n) {
  var o = {};
  for (var i = 0; i < n; i++) {
    o["p" + i] = i;
  }
  return o;
}

function check(o, expectedKeys) {
  assertEq(Object.keys(o).join(), expectedKeys.join());
  for (var k of expectedKeys) {
    assertEq(o[k], Number(k.slice(1)));
    assertEq(k in o, true);
  }
}

for (var n = 1; n < 30; n++) {
  for (var step = 1; step < 4; step++) {
    var o = makeObj(n);
    var keys = Object.keys(o);
    for (var i = 0; i < n; i += step) {
      assertEq(delete o["p" + i], true);
      assertEq(("p" + i) in o, false);
      keys = keys.filter(k => k !== "p" + i);
      check(o, keys);
    }
    for (var i = 0; i < n; i += step) {
      o["p" + i] = i;
      keys.push("p" + i);
      check(o, keys);
    }
    for (var i = n - 1; i >= 0; i--) {
      delete o["p" + i];
      keys = keys.filter(k => k !== "p" + i);
      check(o, keys);
    }
    assertEq(Object.keys(o).length, 0);
    o.x = 1;
    assertEq(o.x, 1);
  }
}

function testAccessors() {
  var o = Object.getOwnPropertyDescriptor({ foo: 1 }, "foo");
  var v = o.value;
  delete o.value;
  delete o.writable;
  o.get = function () { return v; };
  assertEq(Object.keys(o).join(), "enumerable,configurable,get");
  var obj = Object.defineProperty({}, "foo", o);
  assertEq(obj.foo, 1);
}
for (var i = 0; i < 100; i++) {
  testAccessors();
}
