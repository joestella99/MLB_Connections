import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { LeaderboardEntry } from '../models/boxscore.models';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private _initialized = false;

  get isConfigured(): boolean {
    return !!environment.firebase.apiKey && !!environment.firebase.projectId;
  }

  private init() {
    if (this._initialized) return;
    this._initialized = true;
    if (!this.isConfigured) return;
    this.app = initializeApp(environment.firebase);
    this.db = getFirestore(this.app);
  }

  async submitScore(entry: LeaderboardEntry): Promise<void> {
    this.init();
    if (!this.db) {
      // Store locally if Firebase not configured
      this.storeLocal(entry);
      return;
    }
    try {
      await addDoc(collection(this.db, 'leaderboard'), entry);
    } catch {
      this.storeLocal(entry);
    }
  }

  async getLeaderboard(count = 50): Promise<LeaderboardEntry[]> {
    this.init();
    if (!this.db) {
      return this.getLocalLeaderboard();
    }
    try {
      const q = query(
        collection(this.db, 'leaderboard'),
        orderBy('score', 'desc'),
        limit(count)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LeaderboardEntry));
    } catch {
      return this.getLocalLeaderboard();
    }
  }

  private storeLocal(entry: LeaderboardEntry) {
    const existing = this.getLocalLeaderboard();
    existing.push(entry);
    existing.sort((a, b) => b.score - a.score);
    localStorage.setItem('boxscore_leaderboard', JSON.stringify(existing.slice(0, 100)));
  }

  private getLocalLeaderboard(): LeaderboardEntry[] {
    try {
      return JSON.parse(localStorage.getItem('boxscore_leaderboard') || '[]');
    } catch {
      return [];
    }
  }
}
