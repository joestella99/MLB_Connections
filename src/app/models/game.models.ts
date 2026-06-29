export type Difficulty = 'easy' | 'medium' | 'hard' | 'tricky';

export interface Category {
  name: string;
  difficulty: Difficulty;
  words: string[];
}

export interface Puzzle {
  id: number;
  date: string;
  season?: number;
  categories: Category[];
}

export interface Tile {
  word: string;
  selected: boolean;
  solved: boolean;
  category?: Category;
}

export interface GameState {
  puzzle: Puzzle;
  tiles: Tile[];
  solvedCategories: Category[];
  mistakesRemaining: number;
  gameOver: boolean;
  gameWon: boolean;
  yearRevealed: boolean;
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#2d8c3c',     // outfield grass green
  medium: '#c4953a',   // dirt/gold
  hard: '#b71c1c',     // baseball red
  tricky: '#1a3a6b',   // deep navy
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'tricky'];
