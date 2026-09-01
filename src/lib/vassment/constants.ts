export const VASSMENT_ONE = {
  organizationId: "00000000-0000-0000-0000-000000000001",
  venueId: "00000000-0000-0000-0000-000000000010",
  spaces: {
    "1F": "00000000-0000-0000-0000-000000000101",
    B1: "00000000-0000-0000-0000-000000000102",
  },
} as const;

export type VassmentSpaceCode = keyof typeof VASSMENT_ONE.spaces;

export function spaceIdsForCodes(codes: VassmentSpaceCode[]) {
  return [...new Set(codes)].map((code) => VASSMENT_ONE.spaces[code]);
}
