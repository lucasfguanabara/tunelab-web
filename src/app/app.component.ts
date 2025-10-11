import { Component } from '@angular/core';
import { TunerComponent } from './tuner/tuner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ TunerComponent ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  template: `
  <main style="display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;">
  <app-tuner></app-tuner>
  </main>`,
})


export class AppComponent {}