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
      eyebrow: 'Today',
      title: 'MLB Connections',
      description: 'Daily grid.',
      route: '/daily',
      cta: 'Play Today\'s Grid',
      accent: 'mlb',
      status: 'Live',
    },
    {
      eyebrow: 'Challenge',
      title: 'Box Score Guess',
      description: 'Predict the line.',
      route: '/boxscore',
      cta: 'Open Box Score',
      accent: 'boxscore',
      status: 'Live',
    },
    {
      eyebrow: 'Today',
      title: 'NFL Connections',
      description: 'NFL grid.',
      route: '/nfl',
      cta: 'Open NFL Grid',
      accent: 'nfl',
      status: 'Live',
    },
  ] as const;
}
