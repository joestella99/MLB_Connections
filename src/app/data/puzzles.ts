import { Puzzle } from '../models/game.models';

export const PUZZLES: Puzzle[] = [
  {
    id: 1,
    date: '2026-06-29',
    sport: 'mlb',
    categories: [
      {
        name: 'Yankees Legends',
        difficulty: 'easy',
        words: ['JETER', 'RIVERA', 'MANTLE', 'RUTH'],
      },
      {
        name: 'MLB Team Mascots',
        difficulty: 'medium',
        words: ['PHILLIE PHANATIC', 'MR. MET', 'WALLY', 'ORBIT'],
      },
      {
        name: 'World Series MVPs (2010s)',
        difficulty: 'hard',
        words: ['BUMGARNER', 'SOLER', 'SPRINGER', 'STRASBURG'],
      },
      {
        name: '___ Park (MLB Stadiums)',
        difficulty: 'tricky',
        words: ['FENWAY', 'PETCO', 'ORACLE', 'TRUIST'],
      },
    ],
  },
  {
    id: 2,
    date: '2026-06-30',
    sport: 'mlb',
    categories: [
      {
        name: 'MLB Teams Named After Birds',
        difficulty: 'easy',
        words: ['CARDINALS', 'ORIOLES', 'BLUE JAYS', 'RAVENS'],
      },
      {
        name: '3,000 Hit Club Members',
        difficulty: 'medium',
        words: ['JETER', 'ICHIRO', 'BIGGIO', 'GWYNN'],
      },
      {
        name: 'Cy Young Award Winners (NL 2020s)',
        difficulty: 'hard',
        words: ['DEGROM', 'BURNES', 'ALCANTARA', 'SNELL'],
      },
      {
        name: 'Baseball Slang for Strikeout',
        difficulty: 'tricky',
        words: ['PUNCHOUT', 'WHIFF', 'K', 'FAN'],
      },
    ],
  },
  {
    id: 3,
    date: '2026-07-01',
    sport: 'mlb',
    categories: [
      {
        name: 'Positions on the Diamond',
        difficulty: 'easy',
        words: ['SHORTSTOP', 'CATCHER', 'PITCHER', 'FIRST BASE'],
      },
      {
        name: 'Players with Retired #42',
        difficulty: 'medium',
        words: ['ROBINSON', 'RIVERA', 'CLEMENTE', 'AARON'],
      },
      {
        name: 'MLB Cities with Two Teams',
        difficulty: 'hard',
        words: ['CHICAGO', 'NEW YORK', 'LOS ANGELES', 'BAY AREA'],
      },
      {
        name: 'Types of Pitches',
        difficulty: 'tricky',
        words: ['SLIDER', 'CUTTER', 'CHANGEUP', 'SINKER'],
      },
    ],
  },
  {
    id: 4,
    date: '2026-07-02',
    sport: 'mlb',
    categories: [
      {
        name: 'Baseball Equipment',
        difficulty: 'easy',
        words: ['BAT', 'GLOVE', 'HELMET', 'CLEATS'],
      },
      {
        name: 'Teams That Have Never Won a World Series',
        difficulty: 'medium',
        words: ['MARINERS', 'BREWERS', 'PADRES', 'ROCKIES'],
      },
      {
        name: 'Triple Crown Winners',
        difficulty: 'hard',
        words: ['CABRERA', 'ROBINSON', 'YASTRZEMSKI', 'WILLIAMS'],
      },
      {
        name: '___ Ball (Baseball Terms)',
        difficulty: 'tricky',
        words: ['CURVE', 'FOUL', 'FLY', 'GROUND'],
      },
    ],
  },
  {
    id: 5,
    date: '2026-07-03',
    sport: 'mlb',
    categories: [
      {
        name: 'Active HR Leaders (2020s)',
        difficulty: 'easy',
        words: ['JUDGE', 'OHTANI', 'SCHWARBER', 'ACUNA'],
      },
      {
        name: 'Famous Baseball Movies',
        difficulty: 'medium',
        words: ['MONEYBALL', 'SANDLOT', 'MAJOR LEAGUE', 'BULL DURHAM'],
      },
      {
        name: 'Switch Hitters (All-Time Greats)',
        difficulty: 'hard',
        words: ['MANTLE', 'CHIPPER', 'MURRAY', 'BELTRAN'],
      },
      {
        name: 'Also a Common English Word',
        difficulty: 'tricky',
        words: ['CARDINAL', 'ANGEL', 'RANGER', 'ROYAL'],
      },
    ],
  },
];
