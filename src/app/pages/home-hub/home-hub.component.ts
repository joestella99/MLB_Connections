import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-hub.component.html',
  styleUrl: './home-hub.component.scss',
})
export class HomeHubComponent {
  readonly modes = [
    {
      eyebrow: 'Daily',
      title: 'MLB Connections',
      description: 'Group four MLB players by shared stats and accolades.',
      route: '/daily',
      cta: "Play today's grid",
      accent: 'mlb',
      status: 'Live',
    },
    {
      eyebrow: 'Daily',
      title: 'NFL Connections',
      description: 'Group four NFL players by shared season stat lines.',
      route: '/nfl',
      cta: "Play today's grid",
      accent: 'nfl',
      status: 'Live',
    },
    {
      eyebrow: 'Challenge',
      title: 'MLB Box Score',
      description: 'Guess the line of a random MLB game.',
      route: '/boxscore',
      cta: 'Open box score',
      accent: 'boxscore-mlb',
      status: 'Live',
    },
    {
      eyebrow: 'Challenge',
      title: 'NFL Box Score',
      description: 'Guess the score of a random completed NFL game.',
      route: '/nfl/boxscore',
      cta: 'Open box score',
      accent: 'boxscore-nfl',
      status: 'Live',
    },
  ] as const;
}
