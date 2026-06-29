import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  Category,
  DIFFICULTY_COLORS,
  DIFFICULTY_ORDER,
  GameState,
  Tile,
} from '../../models/game.models';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
export class GameBoardComponent implements OnInit {
  state!: GameState;
  message = '';
  messageType: 'info' | 'error' | 'success' = 'info';
  animatingSolve = false;
  shareText = '';
  showShare = false;

  loading = true;

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const puzzleId = idParam ? parseInt(idParam, 10) : undefined;

    this.gameService.getPuzzleFromApi(puzzleId).subscribe((puzzle) => {
      this.state = this.gameService.createInitialState(puzzle);
      this.loading = false;
    });
  }

  get selectedTiles(): Tile[] {
    return this.state.tiles.filter((t) => t.selected && !t.solved);
  }

  get unsolvedTiles(): Tile[] {
    return this.state.tiles.filter((t) => !t.solved);
  }

  get sortedSolvedCategories(): Category[] {
    return this.gameService.sortSolvedCategories(this.state.solvedCategories);
  }

  get mistakesDots(): boolean[] {
    return Array(this.state.mistakesRemaining).fill(true);
  }

  toggleTile(tile: Tile): void {
    if (tile.solved || this.state.gameOver || this.animatingSolve) return;

    if (tile.selected) {
      tile.selected = false;
    } else if (this.selectedTiles.length < 4) {
      tile.selected = true;
    }
    this.message = '';
  }

  deselectAll(): void {
    this.state.tiles.forEach((t) => {
      if (!t.solved) t.selected = false;
    });
    this.message = '';
  }

  shuffle(): void {
    this.state = this.gameService.shuffleTiles(this.state);
  }

  submit(): void {
    const selected = this.selectedTiles;
    if (selected.length !== 4) {
      this.message = 'Select exactly 4 items';
      this.messageType = 'error';
      return;
    }

    const selectedWords = selected.map((t) => t.word);
    const result = this.gameService.checkGuess(selectedWords, this.state);

    if (result.correct && result.category) {
      this.animatingSolve = true;
      this.message = 'Correct!';
      this.messageType = 'success';

      // Mark tiles as solved
      selected.forEach((t) => {
        t.solved = true;
        t.selected = false;
      });

      this.state.solvedCategories.push(result.category);

      setTimeout(() => {
        this.animatingSolve = false;

        if (this.state.solvedCategories.length === 4) {
          this.state.gameWon = true;
          this.state.gameOver = true;
          this.message = 'You got it! Great job!';
          this.messageType = 'success';
          this.generateShareText();
        }
      }, 600);
    } else {
      if (result.offByOne) {
        this.message = 'So close! One away...';
      } else if (result.bestMatch === 2) {
        this.message = 'Two away — keep looking!';
      } else {
        this.message = `Not quite (${result.bestMatch ?? 0} of 4 matched a group)`;
      }
      this.messageType = 'error';
      this.state.mistakesRemaining--;

      // Deselect after wrong guess
      selected.forEach((t) => (t.selected = false));

      if (this.state.mistakesRemaining <= 0) {
        this.state.gameOver = true;
        this.message = 'Game Over!';
        this.revealAll();
        this.generateShareText();
      }
    }
  }

  private revealAll(): void {
    const unsolved = this.state.puzzle.categories.filter(
      (cat) => !this.state.solvedCategories.includes(cat)
    );
    unsolved.forEach((cat) => {
      this.state.solvedCategories.push(cat);
      this.state.tiles.forEach((t) => {
        if (cat.words.includes(t.word)) {
          t.solved = true;
          t.selected = false;
        }
      });
    });
  }

  getCategoryColor(category: Category): string {
    return DIFFICULTY_COLORS[category.difficulty];
  }

  getCategoryTextColor(category: Category): string {
    return '#fff';
  }

  getDifficultyEmoji(category: Category): string {
    const emojis = { easy: '🟩', medium: '🟨', hard: '🟥', tricky: '🟦' };
    return emojis[category.difficulty];
  }

  private generateShareText(): void {
    const header = `MLB Connections #${this.state.puzzle.id}`;
    const emojis = { easy: '🟨', medium: '🟩', hard: '🟦', tricky: '🟪' };

    // Build a guess history — simplified version showing final state
    const lines = this.state.solvedCategories.map((cat) => {
      const emoji = emojis[cat.difficulty];
      return `${emoji}${emoji}${emoji}${emoji}`;
    });

    this.shareText = `${header}\n${lines.join('\n')}`;
    this.showShare = true;
  }

  copyShare(): void {
    navigator.clipboard.writeText(this.shareText);
    this.message = 'Copied to clipboard!';
    this.messageType = 'success';
  }

  trackByWord(_index: number, tile: Tile): string {
    return tile.word;
  }

  trackByCategory(_index: number, cat: Category): string {
    return cat.name;
  }
}
