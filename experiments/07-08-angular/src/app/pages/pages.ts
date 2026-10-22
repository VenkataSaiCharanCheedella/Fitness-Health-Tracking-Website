import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkoutService } from '../workout.service';

// ── /dashboard
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Your week at a glance.</p>
      </div>
      <a class="btn btn-primary" routerLink="/register">Register a member</a>
    </div>

    <div class="stats">
      <div class="card stat"><span class="muted">Workouts</span><strong>{{ s.workouts().length }}</strong></div>
      <div class="card stat"><span class="muted">Minutes</span><strong>{{ totalMinutes() }}</strong></div>
      <div class="card stat"><span class="muted">Calories burned</span><strong>{{ totalCalories() }}</strong></div>
      <div class="card stat"><span class="muted">Members</span><strong>{{ s.members().length }}</strong></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Latest workouts</h2>
        <a class="card-link" routerLink="/workouts">View all</a>
      </div>
      @for (w of s.workouts().slice(0, 3); track w.id) {
        <a class="list-item" [routerLink]="['/workouts', w.id]">
          <span class="li-badge">{{ w.type.charAt(0) }}</span>
          <span class="li-body"><strong>{{ w.type }}</strong><br /><span class="muted">{{ w.duration }} min</span></span>
          <span class="tag {{ w.intensity }}">{{ w.intensity }}</span>
        </a>
      }
    </div>
  `
})
export class DashboardComponent {
  s = inject(WorkoutService);
  totalMinutes  = computed(() => this.s.workouts().reduce((t, w) => t + w.duration, 0));
  totalCalories = computed(() => this.s.workouts().reduce((t, w) => t + w.calories, 0));
}

// ── /workouts
@Component({
  selector: 'app-workouts',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Workouts</h1>
        <p class="page-subtitle">Select a workout to open its detail page (route parameter <code>:id</code>).</p>
      </div>
    </div>
    <div class="card">
      @for (w of s.workouts(); track w.id) {
        <a class="list-item" [routerLink]="['/workouts', w.id]">
          <span class="li-badge">{{ w.type.charAt(0) }}</span>
          <span class="li-body"><strong>{{ w.type }}</strong><br />
            <span class="muted">{{ w.duration }} min · {{ w.calories }} kcal · {{ w.date | date:'MMM d' }}</span></span>
          <span class="tag {{ w.intensity }}">{{ w.intensity }}</span>
        </a>
      }
    </div>
  `
})
export class WorkoutsComponent {
  s = inject(WorkoutService);
}

// ── /workouts/:id  (the id arrives as an input thanks to withComponentInputBinding)
@Component({
  selector: 'app-workout-detail',
  imports: [RouterLink, DatePipe],
  template: `
    <a class="back" routerLink="/workouts">← All workouts</a>
    @if (workout(); as w) {
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ w.type }}</h1>
          <p class="page-subtitle">Workout #{{ w.id }} · {{ w.date | date:'EEEE, MMMM d' }}</p>
        </div>
        <span class="tag {{ w.intensity }}">{{ w.intensity }} intensity</span>
      </div>
      <div class="stats three">
        <div class="card stat"><span class="muted">Duration</span><strong>{{ w.duration }} min</strong></div>
        <div class="card stat"><span class="muted">Calories</span><strong>{{ w.calories }} kcal</strong></div>
        <div class="card stat"><span class="muted">Burn rate</span><strong>{{ (w.calories / w.duration).toFixed(1) }} kcal/min</strong></div>
      </div>
    } @else {
      <div class="card empty">No workout found with id {{ id() }}.</div>
    }
  `
})
export class WorkoutDetailComponent {
  private s = inject(WorkoutService);
  id = input.required<string>();
  workout = computed(() => this.s.getById(Number(this.id())));
}

// ── /about
@Component({
  selector: 'app-about',
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">About</h1>
        <p class="page-subtitle">How this Angular app is organised.</p>
      </div>
    </div>
    <div class="card">
      <p>Every page is a standalone component. The router swaps components inside
         <code>&lt;router-outlet&gt;</code> without reloading the browser, and a shared
         service keeps data the same across pages.</p>
    </div>
  `
})
export class AboutComponent {}

// ── ** (any unknown URL)
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="card empty">
      <h1 class="page-title">404</h1>
      <p class="muted">This page does not exist.</p>
      <a class="btn btn-primary" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `
})
export class NotFoundComponent {}
