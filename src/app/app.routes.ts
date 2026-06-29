import { Routes } from '@angular/router';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { HowToPlayComponent } from './pages/how-to-play/how-to-play.component';
import { PuzzleListComponent } from './pages/puzzle-list/puzzle-list.component';

export const routes: Routes = [
  { path: '', component: GameBoardComponent },
  { path: 'play/:id', component: GameBoardComponent },
  { path: 'puzzles', component: PuzzleListComponent },
  { path: 'how-to-play', component: HowToPlayComponent },
  { path: '**', redirectTo: '' },
];
