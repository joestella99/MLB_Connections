import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BoxScoreGame,
  BoxScoreActual,
  BoxScoreGuess,
  BoxScoreGameState,
  ScoreBreakdown,
} from '../../models/boxscore.models';
import { BoxScoreService } from '../../services/boxscore.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-boxscore-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './boxscore-game.component.html',
  styleUrl: './boxscore-game.component.scss',
})
export class BoxScoreGameComponent implements OnInit {
  state: BoxScoreGameState = {
    game: null,
    actual: null,
    guess: this.emptyGuess(),
    submitted: false,
    breakdown: null,
    loading: true,
    error: null,
  };

  playerName = '';
  scoreSubmitted = false;
  showLineups = false;

  constructor(
    private boxScoreService: BoxScoreService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.loadGame();
  }

  async loadGame() {
    this.state.loading = true;
    this.state.error = null;
    this.state.submitted = false;
    this.state.breakdown = null;
    this.state.guess = this.emptyGuess();
    this.scoreSubmitted = false;
    this.showLineups = false;

    try {
      const { game, actual } = await this.boxScoreService.fetchRandomGame();
      this.state.game = game;
      this.state.actual = actual;
      this.state.loading = false;
    } catch (e: any) {
      this.state.error = 'Failed to load game. Try again!';
      this.state.loading = false;
    }
  }

  submitGuess() {
    if (!this.state.actual) return;
    this.state.breakdown = this.boxScoreService.calculateScore(
      this.state.guess,
      this.state.actual
    );
    this.state.submitted = true;
  }

  async submitToLeaderboard() {
    if (!this.state.game || !this.state.breakdown || !this.playerName.trim()) return;
    const entry = {
      playerName: this.playerName.trim(),
      score: this.state.breakdown.totalPoints,
      maxScore: this.state.breakdown.maxPoints,
      accuracy: Math.round((this.state.breakdown.totalPoints / this.state.breakdown.maxPoints) * 100),
      correctWinner: this.state.breakdown.correctWinner,
      gamePk: this.state.game.gamePk,
      gameDate: this.state.game.gameDate,
      matchup: `${this.state.game.awayTeam.name} @ ${this.state.game.homeTeam.name}`,
      submittedAt: new Date().toISOString(),
    };
    await this.firebaseService.submitScore(entry);
    this.scoreSubmitted = true;
  }

  toggleLineups() {
    this.showLineups = !this.showLineups;
  }

  get isGuessComplete(): boolean {
    const g = this.state.guess;
    return g.awayRuns !== null && g.homeRuns !== null;
  }

  get scorePercent(): number {
    if (!this.state.breakdown) return 0;
    return Math.round(
      (this.state.breakdown.totalPoints / this.state.breakdown.maxPoints) * 100
    );
  }

  get scoreGrade(): string {
    const pct = this.scorePercent;
    if (pct >= 90) return 'S';
    if (pct >= 75) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 45) return 'C';
    if (pct >= 30) return 'D';
    return 'F';
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private emptyGuess(): BoxScoreGuess {
    return {
      awayRuns: null,
      homeRuns: null,
      awayHits: null,
      homeHits: null,
      awayErrors: null,
      homeErrors: null,
      awayHR: null,
      homeHR: null,
      awayStrikeouts: null,
      homeStrikeouts: null,
    };
  }
}
