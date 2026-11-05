/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "jit/BaselineInlineIC.h"

#include "jit/CacheIR.h"
#include "jit/CacheIRCompiler.h"
#include "jit/CacheIRReader.h"

using namespace js;
using namespace js::jit;

// GuardNonDoubleType(ValId, ValueTypeImm=Boolean) + LoadOperandResult(ValId)
static bool MatchesJumpIfFalseBoolean(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardNonDoubleType) {
    return false;
  }
  reader.valOperandId();
  uint8_t type = reader.readByte();
  if (ValueType(type) != ValueType::Boolean) {
    return false;
  }

  if (!reader.more() || reader.readOp() != CacheOp::LoadOperandResult) {
    return false;
  }
  reader.valOperandId();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Limit);
  return true;
}

// GuardToObject(ValId) + GuardShape(ObjId, WeakShapeField) +
// StoreFixedSlot(ObjId, RawInt32Field, ValId)
static bool MatchesInitPropFixedSlot(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToObject) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::GuardShape) {
    return false;
  }
  reader.objOperandId();
  reader.stubOffset();

  if (!reader.more() || reader.readOp() != CacheOp::StoreFixedSlot) {
    return false;
  }
  reader.objOperandId();
  reader.stubOffset();
  reader.valOperandId();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::WeakShape);
  MOZ_ASSERT(stubInfo->fieldType(1) == StubField::Type::RawInt32);
  MOZ_ASSERT(stubInfo->fieldType(2) == StubField::Type::Limit);
  return true;
}

// GuardToInt32(ValId) + GuardToInt32(ValId) +
// CompareInt32Result(JSOpImm, Int32Id, Int32Id)
static bool MatchesCompareInt32(const CacheIRStubInfo* stubInfo,
                                JSOp expected) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::CompareInt32Result) {
    return false;
  }
  JSOp compareOp = reader.jsop();
  reader.int32OperandId();
  reader.int32OperandId();

  if (reader.more() || compareOp != expected) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Limit);
  return true;
}

// GuardToInt32(ValId) + LoadInt32Result(Int32Id)
static bool MatchesToNumericInt32(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::LoadInt32Result) {
    return false;
  }
  reader.int32OperandId();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Limit);
  return true;
}

// LoadValueResult(ValueField)
static bool MatchesGetIntrinsicValue(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::LoadValueResult) {
    return false;
  }
  reader.stubOffset();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Value);
  MOZ_ASSERT(stubInfo->fieldType(1) == StubField::Type::Limit);
  return true;
}

// GuardToInt32(ValId) + Int32IncResult(Int32Id)
static bool MatchesIncInt32(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::Int32IncResult) {
    return false;
  }
  reader.int32OperandId();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Limit);
  return true;
}

// GuardToInt32(ValId) + GuardToInt32(ValId) +
// Int32BitAndResult(Int32Id, Int32Id)
static bool MatchesBitAndInt32(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::GuardToInt32) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::Int32BitAndResult) {
    return false;
  }
  reader.int32OperandId();
  reader.int32OperandId();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::Limit);
  return true;
}

static bool MatchesGetPropFixedSlot(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToObject) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::GuardShape) {
    return false;
  }

  reader.objOperandId();
  reader.stubOffset();

  if (!reader.more() || reader.readOp() != CacheOp::LoadFixedSlotResult) {
    return false;
  }
  reader.objOperandId();
  reader.stubOffset();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::WeakShape);
  MOZ_ASSERT(stubInfo->fieldType(1) == StubField::Type::RawInt32);
  return true;
}

static bool MatchesGetPropDynamicSlot(const CacheIRStubInfo* stubInfo) {
  CacheIRReader reader(stubInfo);

  if (!reader.more() || reader.readOp() != CacheOp::GuardToObject) {
    return false;
  }
  reader.valOperandId();

  if (!reader.more() || reader.readOp() != CacheOp::GuardShape) {
    return false;
  }

  reader.objOperandId();
  reader.stubOffset();

  if (!reader.more() || reader.readOp() != CacheOp::LoadDynamicSlotResult) {
    return false;
  }
  reader.objOperandId();
  reader.stubOffset();

  if (reader.more()) {
    return false;
  }

  MOZ_ASSERT(stubInfo->fieldType(0) == StubField::Type::WeakShape);
  MOZ_ASSERT(stubInfo->fieldType(1) == StubField::Type::RawInt32);
  return true;
}

InlineICRecipe js::jit::InlineRecipeForOp(JSOp op,
                                          const CacheIRStubInfo* stubInfo) {
  switch (op) {
    case JSOp::GetProp:
      if (!stubInfo) {
        break;
      }
      if (MatchesGetPropFixedSlot(stubInfo)) {
        return InlineICRecipe::GetProp_FixedSlot;
      } else if (MatchesGetPropDynamicSlot(stubInfo)) {
        return InlineICRecipe::GetProp_DynamicSlot;
      }
      break;
    case JSOp::JumpIfFalse:
      if (!stubInfo || MatchesJumpIfFalseBoolean(stubInfo)) {
        return InlineICRecipe::JumpIfFalse_Boolean;
      }
      break;
    case JSOp::InitProp:
    case JSOp::InitLockedProp:
    case JSOp::InitHiddenProp:
      if (!stubInfo || MatchesInitPropFixedSlot(stubInfo)) {
        return InlineICRecipe::InitProp_FixedSlot;
      }
      break;
    case JSOp::Lt:
      if (!stubInfo || MatchesCompareInt32(stubInfo, JSOp::Lt)) {
        return InlineICRecipe::Compare_Int32_Lt;
      }
      break;
    case JSOp::ToNumeric:
      if (!stubInfo || MatchesToNumericInt32(stubInfo)) {
        return InlineICRecipe::ToNumeric_Int32;
      }
      break;
    case JSOp::GetIntrinsic:
      if (!stubInfo || MatchesGetIntrinsicValue(stubInfo)) {
        return InlineICRecipe::GetIntrinsic_Value;
      }
      break;
    case JSOp::Inc:
      if (!stubInfo || MatchesIncInt32(stubInfo)) {
        return InlineICRecipe::Inc_Int32;
      }
      break;
    case JSOp::BitAnd:
      if (!stubInfo || MatchesBitAndInt32(stubInfo)) {
        return InlineICRecipe::BitAnd_Int32;
      }
      break;
    case JSOp::Ge:
      if (!stubInfo || MatchesCompareInt32(stubInfo, JSOp::Ge)) {
        return InlineICRecipe::Compare_Int32_Ge;
      }
      break;
    default:
      break;
  }
  return InlineICRecipe::None;
}
