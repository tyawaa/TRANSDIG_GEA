/** Status satu POI pada sesi ini; disimpan di App agar tetap ada saat kembali ke daftar. */
export type PoiProgress = {
  readonly closed: boolean;
  readonly verifiedUntil: number | null;
  readonly completed: boolean;
  readonly attempts: number;
};

export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
  attempts: 0,
};
