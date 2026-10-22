import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Member, WorkoutService } from '../workout.service';

// Group-level validator: password and confirm password must match
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm  = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, JsonPipe, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Member registration</h1>
        <p class="page-subtitle">A reactive form built with Angular's FormBuilder and validators.</p>
      </div>
    </div>

    <div class="grid-2">
      @if (!registered) {
        <form class="card" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="name">Full name</label>
              <input id="name" class="form-input" formControlName="name" placeholder="Alex Kumar"
                     [class.invalid]="showError('name')" />
              @if (showError('name')) {
                <div class="field-error">
                  @if (f.name.errors?.['required']) { Name is required }
                  @else if (f.name.errors?.['minlength']) { Name must be at least 2 characters }
                  @else if (f.name.errors?.['pattern']) { Name can only contain letters and spaces }
                </div>
              }
            </div>
            <div class="form-group">
              <label class="form-label" for="age">Age</label>
              <input id="age" type="number" class="form-input" formControlName="age" placeholder="21"
                     [class.invalid]="showError('age')" />
              @if (showError('age')) {
                <div class="field-error">
                  @if (f.age.errors?.['required']) { Age is required }
                  @else if (f.age.errors?.['min']) { You must be at least 13 }
                  @else if (f.age.errors?.['max']) { Enter a realistic age }
                </div>
              }
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input id="email" type="email" class="form-input" formControlName="email" placeholder="alex@example.com"
                   [class.invalid]="showError('email')" />
            @if (showError('email')) {
              <div class="field-error">
                @if (f.email.errors?.['required']) { Email is required } @else { Enter a valid email address }
              </div>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input id="password" type="password" class="form-input" formControlName="password"
                     [class.invalid]="showError('password')" />
              @if (showError('password')) {
                <div class="field-error">
                  @if (f.password.errors?.['required']) { Password is required }
                  @else if (f.password.errors?.['minlength']) { At least 8 characters }
                  @else if (f.password.errors?.['pattern']) { Use letters and numbers }
                </div>
              }
            </div>
            <div class="form-group">
              <label class="form-label" for="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" class="form-input" formControlName="confirmPassword"
                     [class.invalid]="f.confirmPassword.touched && (f.confirmPassword.invalid || form.errors?.['passwordMismatch'])" />
              @if (f.confirmPassword.touched && form.errors?.['passwordMismatch']) {
                <div class="field-error">Passwords do not match</div>
              } @else if (showError('confirmPassword')) {
                <div class="field-error">Please confirm your password</div>
              }
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="goal">Fitness goal</label>
            <select id="goal" class="form-input" formControlName="goal" [class.invalid]="showError('goal')">
              <option value="">Choose a goal</option>
              @for (g of goals; track g) { <option [value]="g">{{ g }}</option> }
            </select>
            @if (showError('goal')) { <div class="field-error">Please choose a goal</div> }
          </div>

          <label class="check">
            <input type="checkbox" formControlName="terms" />
            I agree that my data is used to track my fitness progress
          </label>
          @if (showError('terms')) { <div class="field-error">You must accept to continue</div> }

          <button class="btn btn-primary btn-full" type="submit" style="margin-top:1rem;">Register</button>
        </form>
      } @else {
        <div class="card success-card">
          <div class="success-icon">✓</div>
          <h2 class="card-title">Registration successful</h2>
          <p class="muted">Welcome, {{ lastMember?.name }}. Your goal is <strong>{{ lastMember?.goal }}</strong>.</p>
          <div class="actions">
            <a class="btn btn-primary" routerLink="/dashboard">Go to dashboard</a>
            <button class="btn btn-secondary" (click)="registerAnother()">Register another</button>
          </div>
        </div>
      }

      <!-- Live view of the form model, to show how reactive forms track state -->
      <div class="card">
        <h2 class="card-title">Form state</h2>
        <div class="state-row"><span>Status</span>
          <span class="tag" [class.ok]="form.valid" [class.bad]="form.invalid">{{ form.status }}</span></div>
        <div class="state-row"><span>Touched</span><strong>{{ form.touched }}</strong></div>
        <div class="state-row"><span>Dirty</span><strong>{{ form.dirty }}</strong></div>
        <div class="state-row"><span>Members registered</span><strong>{{ service.members().length }}</strong></div>
        <p class="form-label" style="margin-top:1rem;">form.value (password hidden)</p>
        <pre class="code">{{ safeValue | json }}</pre>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  service = inject(WorkoutService);

  goals = ['Lose weight', 'Build muscle', 'Improve stamina', 'Stay healthy'];
  registered = false;
  lastMember?: Member;

  form = this.fb.nonNullable.group({
    name:            ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z][A-Za-z .'-]*$/)]],
    age:             [null as number | null, [Validators.required, Validators.min(13), Validators.max(100)]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    confirmPassword: ['', Validators.required],
    goal:            ['', Validators.required],
    terms:           [false, Validators.requiredTrue]
  }, { validators: passwordsMatch });

  get f() { return this.form.controls; }

  get safeValue() {
    const { password, confirmPassword, ...rest } = this.form.getRawValue();
    return { ...rest, password: password ? '••••••••' : '' };
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // reveal every error at once
      return;
    }
    const v = this.form.getRawValue();
    this.lastMember = { name: v.name.trim(), email: v.email, age: Number(v.age), goal: v.goal };
    this.service.addMember(this.lastMember);
    this.registered = true;
  }

  registerAnother(): void {
    this.form.reset();
    this.registered = false;
  }
}
