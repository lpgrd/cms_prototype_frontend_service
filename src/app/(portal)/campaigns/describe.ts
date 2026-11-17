import { inrShort } from "@/lib/format";
import type { Campaign, ValueType } from "@/lib/types";

const value = (type: ValueType, v: number, unit: "₹" | "pts") =>
  type === "PERCENTAGE" ? `${v}%` : unit === "₹" ? inrShort(v) : `${v} pts`;

export function describeOffer(
  c: Pick<Campaign, "discountType" | "discountValue" | "discountBase" | "maxDiscountAmount" | "minBillAmount">,
) {
  const on = c.discountType === "PERCENTAGE" && c.discountBase === "MAKING_CHARGES" ? " on making" : "";
  const cap = c.maxDiscountAmount ? `, up to ${inrShort(c.maxDiscountAmount)}` : "";
  const min = c.minBillAmount ? `, on bills above ${inrShort(c.minBillAmount)}` : "";
  return `${value(c.discountType, c.discountValue, "₹")} off${on}${cap}${min}`;
}

export function describeReward(c: Pick<Campaign, "rewardType" | "rewardValue" | "rewardBase" | "maxRewardPoints">) {
  if (c.rewardType === "FLAT") return `Partner earns ${c.rewardValue} pts per bill`;
  const on = c.rewardBase === "MAKING_CHARGES" ? "making charges" : "bill amount";
  const cap = c.maxRewardPoints ? `, max ${c.maxRewardPoints} pts` : "";
  return `Partner earns ${c.rewardValue}% of ${on} as points${cap}`;
}
