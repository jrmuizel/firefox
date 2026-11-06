/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_Linker_h
#define jit_Linker_h

#include "mozilla/Maybe.h"

#include <stdint.h>

#include "jstypes.h"

#include "jit/AutoWritableJitCode.h"
#include "jit/JitCode.h"
#include "jit/MacroAssembler.h"
#include "vm/Runtime.h"

struct JS_PUBLIC_API JSContext;

namespace js {
namespace jit {

class ExecutableAllocator;
class ExecutablePool;
class JitCode;

enum class CodeKind : uint8_t;

// Code copied to executable memory off the main thread by
// Linker::copyOffThread. Linker::newCodeForCopiedCode turns it into a JitCode
// object on the main thread; otherwise release() must be called to free the
// memory.
struct CopiedJitCode {
  uint8_t* codeStart = nullptr;
  uint32_t totalSize = 0;
  uint32_t headerSize = 0;
  ExecutablePool* pool = nullptr;
  CodeKind kind{};
  JitCode::CopiedSizes sizes;

  bool hasCode() const { return !!pool; }
  void release();
};

// Whether code can be copied to executable memory and linked off the main
// thread. This requires that code pages are writable while other threads run
// code on them (no W^X), and no instruction cache maintenance.
bool CanCopyJitCodeOffThread();

class Linker {
  MacroAssembler& masm;
  mozilla::Maybe<AutoWritableJitCodeFallible> awjcf;

  JitCode* fail(JSContext* cx) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

 public:
  // Construct a linker with a rooted macro assembler.
  explicit Linker(MacroAssembler& masm) : masm(masm) { masm.finish(); }

  // Construct a linker for a macro assembler on which finish() may already
  // have been called by copyOffThread().
  Linker(MacroAssembler& masm, bool masmFinished) : masm(masm) {
    if (!masmFinished) {
      masm.finish();
    }
  }

  // Copy the contents of the macro assembler buffer to memory allocated from
  // |execAlloc|, and link it, without creating a JitCode object. Can be called
  // off the main thread. Returns false on OOM.
  bool copyOffThread(ExecutableAllocator& execAlloc, CodeKind kind,
                     CopiedJitCode* copied);

  // Create a JitCode object for code filled in by copyOffThread. Takes
  // ownership of the executable memory. Errors are reported to the context.
  static JitCode* newCodeForCopiedCode(JSContext* cx, CopiedJitCode& copied);

  // Create a new JitCode object and populate it with the contents of the
  // macro assember buffer.
  //
  // This method cannot GC. Errors are reported to the context.
  JitCode* newCode(JSContext* cx, CodeKind kind);
};

}  // namespace jit
}  // namespace js

#endif /* jit_Linker_h */
