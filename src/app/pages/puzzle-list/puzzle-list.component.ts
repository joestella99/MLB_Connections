import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GameService } from '../../services/game.service';
import { Sport } from '../../models/game.models';

@Component({
  selector: 'app-puzzle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './puzzle-list.component.html',
  styleUrl: './puzzle-list.component.scss',
})
export class PuzzleListComponent implements OnInit {
  puzzles: Array<{ id: number; date: string; title?: string; complete: boolean; won: boolean }> = [];
  loading = true;
  sport: Sport = 'mlb';
  pageTitle = 'MLB Puzzle Archive';
  playRoutePrefix = '/play';

  constructor(private gameService: GameService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.sport = (this.route.snapshot.data['sport'] as Sport | undefined) ?? 'mlb';
    this.pageTitle = this.route.snapshot.data['title'] ?? 'MLB Puzzle Archive';
    this.playRoutePrefix = this.route.snapshot.data['playRoutePrefix'] ?? '/play';

    this.gameService.getPuzzleListFromApi(this.sport).subscribe((list) => {
      // Sort newest first
      this.puzzles = list
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((puzzle) => ({
          ...puzzle,
          ...this.gameService.getPuzzleCompletion(puzzle),
        }));
      this.loading = false;
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  isToday(dateStr: string): boolean {
    return dateStr === new Date().toISOString().slice(0, 10);
  }

  getStatusLabel(puzzle: { complete: boolean; won: boolean }): string | null {
    if (!puzzle.complete) return null;
    return puzzle.won ? 'Won' : 'Complete';
  }

  getPuzzleLink(id: number): string[] {
    return ['/', ...this.playRoutePrefix.split('/').filter(Boolean), String(id)];
  }
}
