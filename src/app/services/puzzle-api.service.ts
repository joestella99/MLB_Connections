import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { Category, Puzzle } from '../models/game.models';

interface JsonPuzzle {
  id: number;
  date: string;
  categories: {
    name: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'tricky';
    words: string[];
  }[];
}

interface ApiPuzzle {
  id: number;
  date: string;
  title: string;
  categories: {
    name: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'tricky';
    words: string[];
    stats: { word: string; value: string }[];
  }[];
}

interface ApiPuzzleListItem {
  puzzle_id: number;
  puzzle_date: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class PuzzleApiService {
  private apiUrl = 'http://localhost:3000/api';
  private jsonUrl = 'data/puzzles.json'; // generated JSON in public/data/

  private jsonCache: JsonPuzzle[] | null = null;

  constructor(private http: HttpClient) {}

  /** Load the static JSON file (generated from MLB API) */
  private loadJsonPuzzles(): Observable<JsonPuzzle[]> {
    if (this.jsonCache) return of(this.jsonCache);
    return this.http.get<JsonPuzzle[]>(this.jsonUrl).pipe(
      map((data) => {
        this.jsonCache = data;
        return data;
      }),
      catchError(() => of([]))
    );
  }

  getTodayPuzzle(): Observable<Puzzle | null> {
    // Try API server first, then fall back to static JSON
    return this.http.get<ApiPuzzle>(`${this.apiUrl}/puzzles/today`).pipe(
      map((data) => this.mapApiPuzzle(data)),
      catchError(() =>
        this.loadJsonPuzzles().pipe(
          map((puzzles) => {
            if (puzzles.length === 0) return null;
            const today = new Date().toISOString().slice(0, 10);
            const match = puzzles.find((p) => p.date === today) ?? puzzles[0];
            return this.mapJsonPuzzle(match);
          })
        )
      )
    );
  }

  getPuzzleById(id: number): Observable<Puzzle | null> {
    return this.http.get<ApiPuzzle>(`${this.apiUrl}/puzzles/${id}`).pipe(
      map((data) => this.mapApiPuzzle(data)),
      catchError(() =>
        this.loadJsonPuzzles().pipe(
          map((puzzles) => {
            const match = puzzles.find((p) => p.id === id);
            return match ? this.mapJsonPuzzle(match) : null;
          })
        )
      )
    );
  }

  getPuzzleList(): Observable<{ id: number; date: string; title: string }[]> {
    return this.http.get<ApiPuzzleListItem[]>(`${this.apiUrl}/puzzles`).pipe(
      map((items) =>
        items.map((item) => ({
          id: item.puzzle_id,
          date: item.puzzle_date,
          title: item.title,
        }))
      ),
      catchError(() =>
        this.loadJsonPuzzles().pipe(
          map((puzzles) =>
            puzzles.map((p) => ({
              id: p.id,
              date: p.date,
              title: `MLB Connections #${p.id}`,
            }))
          )
        )
      )
    );
  }

  private mapApiPuzzle(data: ApiPuzzle): Puzzle {
    return {
      id: data.id,
      date: data.date,
      categories: data.categories.map(
        (cat): Category => ({
          name: cat.name,
          difficulty: cat.difficulty,
          words: cat.words,
        })
      ),
    };
  }

  private mapJsonPuzzle(data: JsonPuzzle): Puzzle {
    return {
      id: data.id,
      date: data.date,
      categories: data.categories.map(
        (cat): Category => ({
          name: cat.name,
          difficulty: cat.difficulty,
          words: cat.words,
        })
      ),
    };
  }
}
