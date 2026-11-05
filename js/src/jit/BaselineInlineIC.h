/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jit_BaselineInlineIC_h
#define jit_BaselineInlineIC_h

#include <stddef.h>
#include <stdint.h>

#include "vm/Opcodes.h"

namespace js {
namespace jit {

class CacheIRStubInfo;

enum class InlineICRecipe : uint8_t {
  None,
  GetProp_FixedSlot,
  GetProp_DynamicSlot,
  JumpIfFalse_Boolean,
  InitProp_FixedSlot,
  Compare_Int32_Lt,
  ToNumeric_Int32,
  GetIntrinsic_Value,
  Inc_Int32,
  BitAnd_Int32,
  Compare_Int32_Ge,
};

InlineICRecipe InlineRecipeForOp(JSOp op, const CacheIRStubInfo* stubInfo);

}  // namespace jit
}  // namespace js

#endif /* jit_BaselineInlineIC_h */
