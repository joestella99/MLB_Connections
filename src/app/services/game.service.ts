import { Injectable } from '@angular/core';
import {
  Category,
  DIFFICULTY_ORDER,
  GameState,
  Puzzle,
  Tile,
} from '../models/game.models';
import { PUZZLES } from '../data/puzzles';
import { PuzzleApiService } from './puzzle-api.service';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GameService {
  private fallbackPuzzles = PUZZLES;

  constructor(private puzzleApi: PuzzleApiService) {}

  /** Try API first, fall back to local data */
  getPuzzleFromApi(id?: number): Observable<Puzzle> {
    const apiCall = id !== undefined
      ? this.puzzleApi.getPuzzleById(id)
      : this.puzzleApi.getTodayPuzzle();

    return apiCall.pipe(
      map((puzzle) => puzzle ?? this.getLocalPuzzle(id)),
      catchError(() => of(this.getLocalPuzzle(id)))
    );
  }

  getPuzzleListFromApi(): Observable<{ id: number; date: string; title?: string }[]> {
    return this.puzzleApi.getPuzzleList().pipe(
      map((list) => list.length > 0 ? list : this.getLocalPuzzleList()),
      catchError(() => of(this.getLocalPuzzleList()))
    );
  }

  /** Local fallback */
  private getLocalPuzzle(id?: number): Puzzle {
    if (id !== undefined) {
      return this.fallbackPuzzles.find((p) => p.id === id) ?? this.fallbackPuzzles[0];
    }
    const today = new Date().toISOString().slice(0, 10);
    return this.fallbackPuzzles.find((p) => p.date === today) ?? this.fallbackPuzzles[0];
  }

  private getLocalPuzzleList(): { id: number; date: string }[] {
    return this.fallbackPuzzles.map((p) => ({ id: p.id, date: p.date }));
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
    };
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
      if (state.solvedCategories.includes(category)) continue;

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
}
