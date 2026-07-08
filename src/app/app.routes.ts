import { Routes } from '@angular/router';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { HowToPlayComponent } from './pages/how-to-play/how-to-play.component';
import { PuzzleListComponent } from './pages/puzzle-list/puzzle-list.component';
import { BoxScoreGameComponent } from './pages/boxscore-game/boxscore-game.component';
import { HomeHubComponent } from './pages/home-hub/home-hub.component';
import { NflBoxscoreGameComponent } from './pages/nfl-boxscore-game/nfl-boxscore-game.component';

export const routes: Routes = [
  { path: '', component: HomeHubComponent },
  {
    path: 'daily',
    component: GameBoardComponent,
    data: { sport: 'mlb', title: 'MLB Connections', archiveRoute: '/puzzles', secondaryRoute: '/boxscore', secondaryLabel: 'Open MLB box score' },
  },
  {
    path: 'play/:id',
    component: GameBoardComponent,
    data: { sport: 'mlb', title: 'MLB Connections', archiveRoute: '/puzzles', secondaryRoute: '/boxscore', secondaryLabel: 'Open MLB box score' },
  },
  {
    path: 'puzzles',
    component: PuzzleListComponent,
    data: { sport: 'mlb', title: 'MLB Puzzle Archive', playRoutePrefix: 'play' },
  },
  { path: 'boxscore', component: BoxScoreGameComponent },
  {
    path: 'nfl',
    component: GameBoardComponent,
    data: { sport: 'nfl', title: 'NFL Connections', archiveRoute: '/nfl/puzzles', secondaryRoute: '/nfl/boxscore', secondaryLabel: 'Open NFL box score' },
  },
  {
    path: 'nfl/play/:id',
    component: GameBoardComponent,
    data: { sport: 'nfl', title: 'NFL Connections', archiveRoute: '/nfl/puzzles', secondaryRoute: '/nfl/boxscore', secondaryLabel: 'Open NFL box score' },
  },
  {
    path: 'nfl/puzzles',
    component: PuzzleListComponent,
    data: { sport: 'nfl', title: 'NFL Puzzle Archive', playRoutePrefix: 'nfl/play' },
  },
  { path: 'nfl/boxscore', component: NflBoxscoreGameComponent },
  { path: 'how-to-play', component: HowToPlayComponent },
  { path: '**', redirectTo: '' },
];
