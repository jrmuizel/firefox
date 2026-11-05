// |jit-test| --fast-warmup; --no-threads

const TYPE = 1, NEXT = 4;

function isC(v) { return v[TYPE] === true; }
function near(v) {
  for (; v !== null && !isC(v); ) {
    v = v[NEXT];
  }
  return v;
}

function makeList(n, containerIndex) {
  const arrs = [];
  for (let i = 0; i < n; i++) {
    const a = new Array(8).fill(null);
    a[TYPE] = i === containerIndex;
    arrs.push(a);
  }
  for (let i = 0; i < n - 1; i++) {
    arrs[i][NEXT] = arrs[i + 1];
  }
  return arrs;
}

function testAndLoop() {
  const withContainer = makeList(10, 7);
  const withoutContainer = makeList(10, -1);
  for (let i = 0; i < 500; i++) {
    assertEq(near(withContainer[0]), withContainer[7]);
    assertEq(near(withoutContainer[0]), null);
  }
}
testAndLoop();

function orOfConstant(x, b) {
  let r = 0;
  if ((b ? true : x > 5) || x < -5) {
    r = 1;
  }
  return r;
}
function testConstantPhiInputs() {
  for (let i = 0; i < 500; i++) {
    assertEq(orOfConstant(0, true), 1);
    assertEq(orOfConstant(10, false), 1);
    assertEq(orOfConstant(-10, false), 1);
    assertEq(orOfConstant(0, false), 0);
  }
}
testConstantPhiInputs();

let counter = 0;
function sideEffect(x) {
  counter++;
  return x;
}
function testSideEffects() {
  counter = 0;
  let hits = 0;
  for (let i = 0; i < 500; i++) {
    const a = i % 3 === 0;
    if (a && sideEffect(i % 2 === 0)) {
      hits++;
    }
    if (!!(a || sideEffect(false))) {
      hits += 2;
    }
  }
  let expectedHits = 0, expectedCounter = 0;
  for (let i = 0; i < 500; i++) {
    const a = i % 3 === 0;
    if (a) {
      expectedCounter++;
      if (i % 2 === 0) {
        expectedHits++;
      }
      expectedHits += 2;
    } else {
      expectedCounter++;
    }
  }
  assertEq(hits, expectedHits);
  assertEq(counter, expectedCounter);
}
testSideEffects();
