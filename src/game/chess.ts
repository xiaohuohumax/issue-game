export type ChessEmoji = ':black_circle:'
  | ':white_circle:'
  | ':brown_circle:'
  | ':purple_circle:'
  | ':green_circle:'
  | ':yellow_circle:'
  | ':orange_circle:'
  | ':red_circle:';

export const chess_emojis: ChessEmoji[] = [
  ':black_circle:',
  ':white_circle:',
  ':brown_circle:',
  ':purple_circle:',
  ':green_circle:',
  ':yellow_circle:',
  ':orange_circle:',
  ':red_circle:'
];

export type SizeArray<T, S extends number> = Array<T> & { length: S };

export type SizeArrayGroup<T, X extends number, Y extends number> = SizeArray<SizeArray<T, X>, Y>;

export interface Coordinates {
  x: number;
  y: number;
}

export type CoordinatesWithOrigin = Coordinates & {
  ox: string;
  oy: string;
}