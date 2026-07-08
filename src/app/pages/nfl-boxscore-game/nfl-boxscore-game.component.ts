import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  NflBoxScoreGameState,
  NflBoxScoreGuess,
} from '../../models/nfl-boxscore.models';
import { NflBoxscoreService } from '../../services/nfl-boxscore.service';

@Component({
  selector: 'app-nfl-boxscore-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './nfl-boxscore-game.component.html',
  styleUrl: './nfl-boxscore-game.component.scss',
})
export class NflBoxscoreGameComponent implements OnInit {
  state: NflBoxScoreGameState = {
    game: null,
    actual: null,
    guess: this.emptyGuess(),
    submitted: false,
    breakdown: null,
    loading: true,
    error: null,
  };

  showLeaders = false;

  constructor(private nflBoxscoreService: NflBoxscoreService) {}

  ngOnInit() {
    this.loadGame();
  }

  async loadGame() {
    this.state.loading = true;
    this.state.error = null;
    this.state.submitted = false;
    this.state.breakdown = null;
    this.state.guess = this.emptyGuess();
    this.showLeaders = false;

    try {
      const { game, actual } = await this.nflBoxscoreService.fetchRandomGame();
      this.state.game = game;
      this.state.actual = actual;
      this.state.loading = false;
    } catch {
      this.state.error = 'Failed to load game. Try again!';
      this.state.loading = false;
    }
  }

  submitGuess() {
    if (!this.state.actual) return;
    this.state.breakdown = this.nflBoxscoreService.calculateScore(this.state.guess, this.state.actual);
    this.state.submitted = true;
  }

  toggleLeaders() {
    this.showLeaders = !this.showLeaders;
  }

  get isGuessComplete(): boolean {
    return this.state.guess.awayPoints !== null && this.state.guess.homePoints !== null;
  }

  get scorePercent(): number {
    if (!this.state.breakdown) return 0;
    return Math.round((this.state.breakdown.totalPoints / this.state.breakdown.maxPoints) * 100);
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

  private emptyGuess(): NflBoxScoreGuess {
    return {
      awayPoints: null,
      homePoints: null,
      awayTotalYards: null,
      homeTotalYards: null,
      awayTurnovers: null,
      homeTurnovers: null,
      awayPassYards: null,
      homePassYards: null,
      awayRushYards: null,
      homeRushYards: null,
    };
  }
}
