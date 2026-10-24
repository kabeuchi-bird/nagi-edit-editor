import type { FaceId } from "./model";

/** 配置不可のスロット（値は理由）。出力には何も出さない（docs/spec.md D1） */
export const RESERVED: Partial<Record<FaceId, Record<string, string>>> = {
  l1: { E: "でぃ（E J K）" },
};

export const isReserved = (face: FaceId, key: string): boolean => RESERVED[face]?.[key] !== undefined;
