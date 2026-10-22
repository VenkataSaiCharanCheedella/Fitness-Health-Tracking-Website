import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topnav">
      <a class="brand" routerLink="/dashboard">
        <span class="logo-mark">
          <svg class="icon" viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>
        </span>
        FitLife
      </a>
      <nav>
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="active">{{ link.label }}</a>
        }
      </nav>
    </header>

    <!-- Shows the current route, so it is visible which URL the router matched -->
    <div class="route-bar">Route: <code>{{ url() }}</code></div>

    <main class="container">
      <router-outlet />
    </main>
  `
})
export class AppComponent {
  private router = inject(Router);

  links = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/workouts',  label: 'Workouts' },
    { path: '/register',  label: 'Register' },
    { path: '/about',     label: 'About' }
  ];

  url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: '/' }
  );
}
