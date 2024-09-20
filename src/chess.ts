export type ChessColor = 'black'
  | 'white'
  | 'brown'
  | 'purple'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red';

export const CHESS_COLORS: ChessColor[] = [
  'black',
  'white',
  'brown',
  'purple',
  'green',
  'yellow',
  'orange',
  'red'
];

export function chessColorToEmoji(color: ChessColor | null): string {
  return color ? `:${color}_circle:` : '';
}

export type ArrayLength<T, S extends number> = Array<T> & { length: S };

export type ArrayTable<T, X extends number, Y extends number> = ArrayLength<ArrayLength<T, X>, Y>;

export interface Coordinates {
  x: number;
  y: number;
}

export type CoordinatesWithOrigin = Coordinates & {
  ox: string;
  oy: string;
}