// |jit-test| --fast-warmup; --no-threads

// Bindings that are never assigned in the source can still be assigned by the
// debugger. JIT code that treated them as constants must be invalidated.

var g = newGlobal({newCompartment: true});

g.eval(`
  var setter;
  function outer() {
    function f() { return 1; }
    let x = 10;
    function readF() { return f(); }
    function readX() { return x; }
    setter = function () { debugger; };
    return function test() {
      let r = 0;
      for (let i = 0; i < 300; i++) {
        r += readF() + readX();
      }
      return r;
    };
  }
  var test = outer();
`);

for (var i = 0; i < 20; i++) {
  assertEq(g.test(), 300 * 11);
}

// Attach the debugger after the readers have been Ion-compiled.
var dbg = new Debugger(g);

dbg.onDebuggerStatement = function (frame) {
  var env = frame.environment.parent;
  while (env && env.names().indexOf("f") < 0) {
    env = env.parent;
  }
  assertEq(env !== null, true);
  env.setVariable("f", env.getVariable("readX"));
  var xEnv = frame.environment.parent;
  while (xEnv && xEnv.names().indexOf("x") < 0) {
    xEnv = xEnv.parent;
  }
  xEnv.setVariable("x", 20);
};
g.setter();

// readF now calls readX, which returns 20.
assertEq(g.test(), 300 * 40);
