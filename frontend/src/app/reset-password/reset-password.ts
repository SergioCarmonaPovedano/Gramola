import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { UserService } from '../services/user.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';
  message: string = '';
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.errorMessage = 'El enlace de recuperación no es válido.';
      }
    });
  }

  resetPassword(): void {
    this.message = '';
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage = 'Falta el token de recuperación.';
      return;
    }

    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Introduce y confirma la nueva contraseña.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;

    this.userService.resetPassword(
      this.token,
      this.password,
      this.confirmPassword
    ).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'No se ha podido cambiar la contraseña.';
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }
}
