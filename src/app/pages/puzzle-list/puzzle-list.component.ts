import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-puzzle-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './puzzle-list.component.html',
  styleUrl: './puzzle-list.component.scss',
})
export class PuzzleListComponent implements OnInit {
  puzzles: { id: number; date: string; title?: string }[] = [];
  loading = true;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameService.getPuzzleListFromApi().subscribe((list) => {
      // Sort newest first
      this.puzzles = list.sort((a, b) => b.date.localeCompare(a.date));
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
}
