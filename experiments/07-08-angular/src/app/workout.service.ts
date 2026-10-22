import { Injectable, signal } from '@angular/core';

export interface Workout {
  id: number;
  type: string;
  duration: number;   // minutes
  calories: number;
  intensity: 'Low' | 'Medium' | 'High';
  date: string;       // YYYY-MM-DD
}

export interface Member {
  name: string;
  email: string;
  age: number;
  goal: string;
}

// Shared data for all pages, so navigating between routes keeps the same state
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  readonly workouts = signal<Workout[]>([
    { id: 1, type: 'Running',         duration: 35, calories: 380, intensity: 'High',   date: '2026-10-22' },
    { id: 2, type: 'Weight Training', duration: 50, calories: 300, intensity: 'Medium', date: '2026-10-21' },
    { id: 3, type: 'Yoga',            duration: 30, calories: 120, intensity: 'Low',    date: '2026-10-20' },
    { id: 4, type: 'Cycling',         duration: 45, calories: 410, intensity: 'High',   date: '2026-10-18' }
  ]);

  readonly members = signal<Member[]>([]);

  getById(id: number): Workout | undefined {
    return this.workouts().find(w => w.id === id);
  }

  addMember(member: Member): void {
    this.members.update(list => [...list, member]);
  }
}
