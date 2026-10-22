import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/register.component';
import {
  AboutComponent, DashboardComponent, NotFoundComponent, WorkoutDetailComponent, WorkoutsComponent
} from './pages/pages';

export const routes: Routes = [
  { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',    component: DashboardComponent,     title: 'Dashboard · FitLife' },
  { path: 'workouts',     component: WorkoutsComponent,      title: 'Workouts · FitLife' },
  { path: 'workouts/:id', component: WorkoutDetailComponent, title: 'Workout · FitLife' },
  { path: 'register',     component: RegisterComponent,      title: 'Register · FitLife' },
  { path: 'about',        component: AboutComponent,         title: 'About · FitLife' },
  { path: '**',           component: NotFoundComponent,      title: 'Not found · FitLife' }
];
