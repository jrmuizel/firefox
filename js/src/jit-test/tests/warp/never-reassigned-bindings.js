// |jit-test| --fast-warmup; --no-threads

// Bindings that look constant but are reassigned in various ways. JIT code
// must not treat them as never reassigned.

function t1() { function f() { return 1; } function g() { return f(); } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) f = () => 2; } return r; }
assertEq(t1(), 4499);
function t2() { let x = 1; function g() { return x; } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) [x] = [5]; } return r; }
assertEq(t2(), 8996);
function t3() { function f() { return 1; } function g() { return f(); } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) eval("f = () => 3"); } return r; }
assertEq(t3(), 5998);
function t4() { function f() { return 1; } var f; function g() { return f(); } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) { var f = () => 4; } } return r; }
assertEq(t4(), 7497);
function t5() { function f() { return 1; } function g() { return f(); } function h() { f = () => 6; } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) h(); } return r; }
assertEq(t5(), 10495);
function t6() { let x = 1; function g() { return x; } function inc() { x++; } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) inc(); } return r; }
assertEq(t6(), 4499);
function t7() { function f() { return 1; } function g() { return f(); } let r = 0; for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) { for (f of [() => 7]); } } return r; }
assertEq(t7(), 11994);
function t8() { var r = 0; function g() { return f(); } function f() { return 1; } for (let i = 0; i < 3000; i++) { r += g(); if (i == 1500) { if (true) { function f() { return 8; } } } } return r; }
assertEq(t8(), 13493);
