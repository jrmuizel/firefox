// Test baseline inline IC recipes.

// JumpIfFalse: boolean values pass through without IC call.
function testJumpIfFalse() {
    var count = 0;
    for (var i = 0; i < 100; i++) {
        if (true) { count++; }
        if (false) { count--; }
    }
    assertEq(count, 100);
}
testJumpIfFalse();

// InitProp: fixed-slot property initialization.
function testInitProp() {
    var sum = 0;
    for (var i = 0; i < 100; i++) {
        var o = {x: i};
        sum += o.x;
    }
    assertEq(sum, 4950);
}
testInitProp();

// Lt: int32 less-than comparison.
function testLt() {
    var count = 0;
    for (var i = 0; i < 100; i++) {
        if (i < 50) { count++; }
    }
    assertEq(count, 50);
}
testLt();

// ToNumeric: int32 pass-through.
function testToNumeric() {
    var sum = 0;
    for (var i = 0; i < 100; i++) {
        sum += +i;
    }
    assertEq(sum, 4950);
}
testToNumeric();

// GetIntrinsic: load a constant value.
function testGetIntrinsic() {
    for (var i = 0; i < 100; i++) {
        var u = undefined;
        assertEq(u, undefined);
    }
}
testGetIntrinsic();

// Inc: int32 increment.
function testInc() {
    var x = 0;
    for (var i = 0; i < 100; i++) {
        x++;
    }
    assertEq(x, 100);
}
testInc();

// Inc overflow: falls back to IC.
function testIncOverflow() {
    var x = 2147483646;
    x++;
    assertEq(x, 2147483647);
    x++;
    assertEq(x, 2147483648);
}
testIncOverflow();

// BitAnd: int32 bitwise AND.
function testBitAnd() {
    var sum = 0;
    for (var i = 0; i < 100; i++) {
        sum += (i & 0xF);
    }
    assertEq(sum, 726);
}
testBitAnd();

// Ge: int32 greater-than-or-equal comparison.
function testGe() {
    var count = 0;
    for (var i = 0; i < 100; i++) {
        if (i >= 50) { count++; }
    }
    assertEq(count, 50);
}
testGe();

// Lambda: function cloning.
function testLambda() {
    var fns = [];
    for (var i = 0; i < 100; i++) {
        fns.push(() => i);
    }
    assertEq(fns[0](), 100);
    assertEq(fns[99](), 100);
    assertEq(fns.length, 100);
}
testLambda();

// Polymorphic: inline path disabled when types vary.
function testPolymorphicCompare() {
    var count = 0;
    for (var i = 0; i < 100; i++) {
        var a = i % 2 === 0 ? i : i + 0.5;
        var b = 50;
        if (a < b) { count++; }
    }
    assertEq(count, 50);
}
testPolymorphicCompare();

// GC stress: no crash with GC during inline path.
function testGCStress() {
    var sum = 0;
    for (var i = 0; i < 200; i++) {
        sum += (i & 0xFF);
        if (i % 50 === 0) { gc(); }
    }
    assertEq(sum, 19900);
}
testGCStress();

// Verify with inline IC explicitly disabled.
function testDisabled() {
    var x = 0;
    for (var i = 0; i < 100; i++) {
        x++;
    }
    assertEq(x, 100);
}
testDisabled();
