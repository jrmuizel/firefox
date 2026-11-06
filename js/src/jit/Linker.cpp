/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "jit/Linker.h"

#include "jit/JitOptions.h"
#include "jit/JitZone.h"
#include "util/Memory.h"

#include "gc/StoreBuffer-inl.h"

namespace js {
namespace jit {

static const size_t ExecutableAllocatorAlignment = sizeof(void*);
static_assert(CodeAlignment >= ExecutableAllocatorAlignment,
              "Unexpected alignment requirements");

// Returns the number of bytes to allocate for the code, header, and worst-case
// alignment padding, or 0 if the code is too large.
static size_t CodeBytesNeeded(MacroAssembler& masm) {
  size_t bytesNeeded = masm.bytesNeeded() + sizeof(JitCodeHeader) +
                       (CodeAlignment - ExecutableAllocatorAlignment);
  if (bytesNeeded >= MAX_BUFFER_SIZE) {
    return 0;
  }

  // ExecutableAllocator requires bytesNeeded to be aligned.
  return AlignBytes(bytesNeeded, ExecutableAllocatorAlignment);
}

bool CanCopyJitCodeOffThread() {
#if defined(JS_CODEGEN_X64) || defined(JS_CODEGEN_X86)
  return !JitOptions.writeProtectCode;
#else
  return false;
#endif
}

void CopiedJitCode::release() {
  if (pool) {
    pool->release(totalSize, kind);
    pool = nullptr;
  }
}

bool Linker::copyOffThread(ExecutableAllocator& execAlloc, CodeKind kind,
                           CopiedJitCode* copied) {
  MOZ_ASSERT(CanCopyJitCodeOffThread());
  MOZ_ASSERT(!copied->hasCode());
  MOZ_ASSERT(!masm.embedsNurseryPointers());
  if (masm.oom()) {
    return false;
  }

  size_t bytesNeeded = CodeBytesNeeded(masm);
  if (!bytesNeeded) {
    return false;
  }

  ExecutablePool* pool;
  uint8_t* result =
      (uint8_t*)execAlloc.allocOffThread(bytesNeeded, &pool, kind);
  if (!result) {
    return false;
  }

  uint8_t* codeStart = result + sizeof(JitCodeHeader);
  codeStart = (uint8_t*)AlignBytes((uintptr_t)codeStart, CodeAlignment);
  MOZ_ASSERT(codeStart + masm.bytesNeeded() <= result + bytesNeeded);

  {
    AutoMarkJitCodeWritableForThread writable;
    copied->sizes = JitCode::CopyCode(masm, codeStart);
    masm.link(codeStart);
  }

  copied->codeStart = codeStart;
  copied->totalSize = bytesNeeded;
  copied->headerSize = codeStart - result;
  copied->pool = pool;
  copied->kind = kind;
  return true;
}

/* static */
JitCode* Linker::newCodeForCopiedCode(JSContext* cx, CopiedJitCode& copied) {
  MOZ_ASSERT(copied.hasCode());
  JS::AutoAssertNoGC nogc(cx);

  ExecutablePool* pool = copied.pool;
  copied.pool = nullptr;
  // On failure, JitCode::New releases the memory.
  JitCode* code = JitCode::New<NoGC>(cx, copied.codeStart, copied.totalSize,
                                     copied.headerSize, pool, copied.kind);
  if (!code) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  AutoMarkJitCodeWritableForThread writable;
  code->initForCopiedCode(copied.sizes);
  return code;
}

JitCode* Linker::newCode(JSContext* cx, CodeKind kind) {
  JS::AutoAssertNoGC nogc(cx);
  if (masm.oom()) {
    return fail(cx);
  }

  size_t bytesNeeded = CodeBytesNeeded(masm);
  if (!bytesNeeded) {
    return fail(cx);
  }

  JitZone* jitZone = cx->zone()->getOrCreateJitZone(cx);
  if (!jitZone) {
    // Note: don't call fail(cx) here, getOrCreateJitZone reports OOM.
    return nullptr;
  }

  ExecutablePool* pool;
  uint8_t* result =
      (uint8_t*)jitZone->execAlloc().alloc(cx, bytesNeeded, &pool, kind);
  if (!result) {
    return fail(cx);
  }

  // The JitCodeHeader will be stored right before the code buffer.
  uint8_t* codeStart = result + sizeof(JitCodeHeader);

  // Bump the code up to a nice alignment.
  codeStart = (uint8_t*)AlignBytes((uintptr_t)codeStart, CodeAlignment);
  MOZ_ASSERT(codeStart + masm.bytesNeeded() <= result + bytesNeeded);
  uint32_t headerSize = codeStart - result;
  JitCode* code =
      JitCode::New<NoGC>(cx, codeStart, bytesNeeded, headerSize, pool, kind);
  if (!code) {
    return fail(cx);
  }
  if (masm.oom()) {
    return fail(cx);
  }
  awjcf.emplace(code);
  if (!awjcf->makeWritable()) {
    return fail(cx);
  }
  code->copyFrom(masm);
  masm.link(code);
  if (masm.embedsNurseryPointers()) {
    cx->runtime()->gc.storeBuffer().putWholeCell(code);
  }
  return code;
}

}  // namespace jit
}  // namespace js
