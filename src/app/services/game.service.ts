import { Injectable } from '@angular/core';
import {
  Category,
  DIFFICULTY_ORDER,
  GameState,
  Puzzle,
  Sport,
  Tile,
} from '../models/game.models';
import { PUZZLES } from '../data/puzzles';
import { NFL_PUZZLES } from '../data/nfl-puzzles';
import { PuzzleApiService } from './puzzle-api.service';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GameService {
  private fallbackPuzzles = PUZZLES;
  private nflFallbackPuzzles = NFL_PUZZLES;
  private readonly storagePrefix = 'mlb-connections-state';

  constructor(private puzzleApi: PuzzleApiService) {}

  /** Try API first, fall back to local data */
  getPuzzleFromApi(sport: Sport = 'mlb', id?: number): Observable<Puzzle> {
    if (sport === 'nfl') {
      const jsonCall = id !== undefined
        ? this.puzzleApi.getJsonPuzzleById('nfl', id)
        : this.puzzleApi.getJsonTodayPuzzle('nfl');

      return jsonCall.pipe(
        map((puzzle) => puzzle ?? this.getLocalPuzzle('nfl', id)),
        catchError(() => of(this.getLocalPuzzle('nfl', id)))
      );
    }

    const apiCall = id !== undefined
      ? this.puzzleApi.getPuzzleById(id)
      : this.puzzleApi.getTodayPuzzle();

    return apiCall.pipe(
      map((puzzle) => puzzle ?? this.getLocalPuzzle('mlb', id)),
      catchError(() => of(this.getLocalPuzzle('mlb', id)))
    );
  }

  getPuzzleListFromApi(sport: Sport = 'mlb'): Observable<{ id: number; date: string; title?: string }[]> {
    if (sport === 'nfl') {
      return this.puzzleApi.getJsonPuzzleList('nfl').pipe(
        map((list) => list.length > 0 ? list : this.getLocalPuzzleList('nfl')),
        catchError(() => of(this.getLocalPuzzleList('nfl')))
      );
    }

    return this.puzzleApi.getPuzzleList().pipe(
      map((list) => list.length > 0 ? list : this.getLocalPuzzleList('mlb')),
      catchError(() => of(this.getLocalPuzzleList('mlb')))
    );
  }

  /** Local fallback */
  private getLocalPuzzle(sport: Sport, id?: number): Puzzle {
    const source = sport === 'nfl' ? this.nflFallbackPuzzles : this.fallbackPuzzles;
    if (id !== undefined) {
      return source.find((p) => p.id === id) ?? source[0];
    }
    const today = new Date().toISOString().slice(0, 10);
    return source.find((p) => p.date === today) ?? source[source.length - 1];
  }

  private getLocalPuzzleList(sport: Sport): { id: number; date: string }[] {
    const source = sport === 'nfl' ? this.nflFallbackPuzzles : this.fallbackPuzzles;
    return source.map((p) => ({ id: p.id, date: p.date }));
  }

  createInitialState(puzzle: Puzzle): GameState {
    const allWords = puzzle.categories.flatMap((cat) =>
      cat.words.map((word) => ({ word, category: cat }))
    );
    const shuffled = this.shuffle(allWords);

    const tiles: Tile[] = shuffled.map((item) => ({
      word: item.word,
      selected: false,
      solved: false,
      category: item.category,
    }));

    return {
      puzzle,
      tiles,
      solvedCategories: [],
      mistakesRemaining: 4,
      gameOver: false,
      gameWon: false,
      yearRevealed: false,
    };
  }

  loadPersistedState(puzzle: Puzzle): GameState | null {
    if (typeof localStorage === 'undefined') return null;

    const raw = localStorage.getItem(this.getStorageKey(puzzle));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        tiles?: Array<{ word: string; selected: boolean; solved: boolean; categoryName?: string }>;
        solvedCategoryNames?: string[];
        mistakesRemaining?: number;
        gameOver?: boolean;
        gameWon?: boolean;
        yearRevealed?: boolean;
      };

      const categoryByName = new Map(puzzle.categories.map((category) => [category.name, category]));
      const defaultCategoryByWord = new Map(
        puzzle.categories.flatMap((category) => category.words.map((word) => [word, category] as const))
      );
      const expectedWords = new Set(puzzle.categories.flatMap((category) => category.words));
      const tiles = parsed.tiles?.map((tile) => ({
        word: tile.word,
        selected: !!tile.selected,
        solved: !!tile.solved,
        category: (tile.categoryName ? categoryByName.get(tile.categoryName) : undefined)
          ?? defaultCategoryByWord.get(tile.word),
      }));

      if (!tiles || tiles.length !== expectedWords.size) return null;
      if (new Set(tiles.map((tile) => tile.word)).size !== expectedWords.size) return null;
      if (tiles.some((tile) => !expectedWords.has(tile.word) || !tile.category)) return null;

      const solvedCategories = (parsed.solvedCategoryNames ?? [])
        .map((name) => categoryByName.get(name))
        .filter((category): category is Category => !!category);

      return {
        puzzle,
        tiles,
        solvedCategories,
        mistakesRemaining: Math.max(0, Math.min(4, parsed.mistakesRemaining ?? 4)),
        gameOver: !!parsed.gameOver,
        gameWon: !!parsed.gameWon,
        yearRevealed: !!parsed.yearRevealed,
      };
    } catch {
      return null;
    }
  }

  saveState(state: GameState): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(
      this.getStorageKey(state.puzzle),
      JSON.stringify({
        tiles: state.tiles.map((tile) => ({
          word: tile.word,
          selected: tile.selected,
          solved: tile.solved,
          categoryName: tile.category?.name,
        })),
        solvedCategoryNames: state.solvedCategories.map((category) => category.name),
        mistakesRemaining: state.mistakesRemaining,
        gameOver: state.gameOver,
        gameWon: state.gameWon,
        yearRevealed: state.yearRevealed,
      })
    );
  }

  getPuzzleCompletion(puzzle: Pick<Puzzle, 'id' | 'date' | 'sport'>): { complete: boolean; won: boolean } {
    if (typeof localStorage === 'undefined') {
      return { complete: false, won: false };
    }

    const raw = localStorage.getItem(this.getStorageKey(puzzle));
    if (!raw) {
      return { complete: false, won: false };
    }

    try {
      const parsed = JSON.parse(raw) as { gameOver?: boolean; gameWon?: boolean };
      return {
        complete: !!parsed.gameOver,
        won: !!parsed.gameWon,
      };
    } catch {
      return { complete: false, won: false };
    }
  }

  checkGuess(
    selectedWords: string[],
    state: GameState
  ): { correct: boolean; category?: Category; offByOne?: boolean; bestMatch?: number } {
    if (selectedWords.length !== 4) {
      return { correct: false, bestMatch: 0 };
    }

    let bestMatch = 0;

    for (const category of state.puzzle.categories) {
      if (state.solvedCategories.some((solved) => solved.name === category.name)) continue;

      const categoryWords = category.words.map((w) => w.toUpperCase());
      const selected = selectedWords.map((w) => w.toUpperCase());

      if (
        selected.length === categoryWords.length &&
        selected.every((w) => categoryWords.includes(w))
      ) {
        return { correct: true, category, bestMatch: 4 };
      }

      const matching = selected.filter((w) => categoryWords.includes(w));
      if (matching.length > bestMatch) {
        bestMatch = matching.length;
      }
    }

    return { correct: false, offByOne: bestMatch === 3, bestMatch };
  }

  shuffleTiles(state: GameState): GameState {
    const unsolvedTiles = state.tiles.filter((t) => !t.solved);
    const solvedTiles = state.tiles.filter((t) => t.solved);
    const shuffledUnsolved = this.shuffle([...unsolvedTiles]);

    return {
      ...state,
      tiles: [...solvedTiles, ...shuffledUnsolved],
    };
  }

  sortSolvedCategories(categories: Category[]): Category[] {
    return [...categories].sort(
      (a, b) =>
        DIFFICULTY_ORDER.indexOf(a.difficulty) -
        DIFFICULTY_ORDER.indexOf(b.difficulty)
    );
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private getStorageKey(puzzle: Pick<Puzzle, 'id' | 'date' | 'sport'>): string {
    const sport = puzzle.sport ?? 'mlb';
    return `${this.storagePrefix}:${sport}:${puzzle.id}:${puzzle.date}`;
  }
}
