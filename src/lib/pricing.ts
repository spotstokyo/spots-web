export function priceTierToSymbol(value: number | null | undefined) {
  if (!value) return null;
  if (value <= 1) return "¥";
  if (value === 2) return "¥¥";
  return "¥¥¥";
}

export function formatPriceTier(value: number | null | undefined, fallback = "Not specified") {
  return priceTierToSymbol(value) ?? fallback;
}

export function resolvePriceIcon(
  priceIcon: string | null | undefined,
  priceTier: number | null | undefined,
) {
  const icon = priceIcon?.trim();
  if (icon) return icon;
  return priceTierToSymbol(priceTier);
}
