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
      this.puzzles = list;
      this.loading = false;
    });
  }
}
