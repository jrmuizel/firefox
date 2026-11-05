// |jit-test| --fast-warmup; --no-threads

function testConst() {
  const K = 3;
  const O = {x: 7};
  function getK() { return K; }
  function getOx() { return O.x; }
  function f(i) { return getK() + getOx() + i; }
  let sum = 0;
  for (let i = 0; i < 200; i++) {
    sum += f(i);
  }
  assertEq(sum, 200 * 10 + 199 * 100);
  O.x = 1;
  assertEq(f(0), 4);
}
testConst();

function testLetUpdates() {
  let v = 0;
  function getV() { return v; }
  function f() { return getV(); }
  for (let i = 0; i < 200; i++) {
    v = i;
    assertEq(f(), i);
  }
}
testLetUpdates();

function testTDZ() {
  function f() { return getC(); }
  function getC() { return C; }
  for (let i = 0; i < 100; i++) {
    let threw = false;
    try {
      f();
    } catch (e) {
      threw = e instanceof ReferenceError;
    }
    assertEq(threw, true);
  }
  const C = 5;
  for (let i = 0; i < 100; i++) {
    assertEq(f(), 5);
  }
}
testTDZ();

function makeGetter(n) {
  const N = n;
  return function () { return N; };
}
function testClosures() {
  const getters = [];
  for (let i = 0; i < 4; i++) {
    getters.push(makeGetter(i));
  }
  for (let g of getters) {
    let call = () => g();
    for (let i = 0; i < 100; i++) {
      assertEq(call(), getters.indexOf(g));
    }
  }
  function callAll() {
    let s = 0;
    for (let g of getters) {
      s += g();
    }
    return s;
  }
  for (let i = 0; i < 200; i++) {
    assertEq(callAll(), 6);
  }
}
testClosures();

function testNursery() {
  for (let j = 0; j < 20; j++) {
    const obj = {j};
    let x = j;
    function getObj() { return obj; }
    function getX() { return x; }
    function f() { return getObj().j + getX(); }
    for (let i = 0; i < 50; i++) {
      assertEq(f(), 2 * j + (i > 25 ? 1 : 0));
      if (i == 25) {
        x++;
      }
    }
  }
}
testNursery();

// Const bindings holding non-atom strings must not be folded into MConstant.
function testNonAtomString() {
  const S = ["a", "b", "c"].join("") + String(Math.random() < 2);
  function getS() { return S; }
  function f() { return getS().length; }
  for (let i = 0; i < 200; i++) {
    assertEq(f(), 7);
  }
}
testNonAtomString();
