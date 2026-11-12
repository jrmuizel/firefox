// Equality comparisons against constant strings with atom, non-atom, rope and
// two-byte inputs.

function eq(s) { return s === "children"; }
function ne(s) { return s !== "children"; }
function leq(s) { return s == "children"; }
function lne(s) { return s != "children"; }
function eqTwoByte(s) { return s === "\u1234ab"; }
function eqLong(s) {
  return s === "suppressContentEditableWarningAndSuppressHydrationWarning";
}

function sw(s) {
  switch (s) {
    case "children": return 1;
    case "className": return 2;
    case "style": return 3;
    case "\u1234ab": return 4;
    default: return 0;
  }
}

var inputs = [
  ["children", true],
  ["className", false],
  ["child" + "ren".repeat(1), true],
  ["childrem", false],
  ["", false],
  ["c", false],
  [String.fromCharCode(0x1234) + "ab", false],
  ["x".repeat(100), false],
  [newString("children", {twoByte: true}), true],
];

for (var i = 0; i < 2000; i++) {
  for (var [s, expected] of inputs) {
    assertEq(eq(s), expected);
    assertEq(ne(s), !expected);
    assertEq(leq(s), expected);
    assertEq(lne(s), !expected);
  }
  assertEq(eqTwoByte("\u1234ab"), true);
  assertEq(eqTwoByte("\u1234" + "ab".repeat(1)), true);
  assertEq(eqTwoByte("\u1234ac"), false);
  assertEq(eqTwoByte("children"), false);
  assertEq(sw("children"), 1);
  assertEq(sw("class" + "Name".repeat(1)), 2);
  assertEq(sw("sty" + "le".repeat(1)), 3);
  assertEq(sw("\u1234" + "ab".repeat(1)), 4);
  assertEq(sw("other"), 0);
  assertEq(eqLong(newRope("suppressContentEditableWarning",
                          "AndSuppressHydrationWarning")), true);
  assertEq(eqLong(newRope("suppressContentEditableWarning",
                          "AndSuppressHydrationWarnin_")), false);
  assertEq(eqLong("suppressContentEditableWarningAndSuppressHydrationWarning"),
           true);
  assertEq(eqLong("suppressContentEditableWarningAndSuppressHydrationWarnin"),
           false);
}
