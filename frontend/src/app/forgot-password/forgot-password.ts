import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { UserService } from '../services/user.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  email: string = '';
  message: string = '';
  errorMessage: string = '';
  loading: boolean = false;
  emailSent: boolean = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  sendEmail(): void {
    this.message = '';
    this.errorMessage = '';
    this.emailSent = false;

    if (!this.email || this.email.trim() === '') {
      this.errorMessage = 'Introduce tu correo electrónico.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const requestedEmail = this.email.trim();

    const safetyTimer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.emailSent = true;
        this.message = 'Solicitud enviada. Revisa tu bandeja de entrada o la carpeta de spam.';
        this.errorMessage = '';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.emailSent = false;
          this.cdr.detectChanges();
        }, 6000);
      }
    }, 6000);

    this.userService.forgotPassword(requestedEmail).subscribe({
      next: (res) => {
        clearTimeout(safetyTimer);

        this.loading = false;
        this.emailSent = true;
        this.message = res?.message || 'Correo de recuperación enviado correctamente. Revisa tu bandeja de entrada o spam.';
        this.errorMessage = '';

        this.cdr.detectChanges();

        setTimeout(() => {
          this.emailSent = false;
          this.cdr.detectChanges();
        }, 6000);
      },
      error: (err) => {
        clearTimeout(safetyTimer);

        this.loading = false;
        this.emailSent = false;
        this.errorMessage = err.error?.message || 'No se ha podido enviar el correo de recuperación.';
        this.message = '';

        this.cdr.detectChanges();
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}