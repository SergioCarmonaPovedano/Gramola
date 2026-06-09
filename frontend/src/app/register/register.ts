import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  barName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  clientId: string = '';
  clientSecret: string = '';

  message: string = '';
  hasError: boolean = false;

  constructor(
    private userService: UserService, 
    private cdr: ChangeDetectorRef
  ) {} 

  register(): void {
    this.message = '';
    this.hasError = false;

    if (
      !this.barName ||
      !this.email ||
      !this.password ||
      !this.confirmPassword ||
      !this.clientId ||
      !this.clientSecret
    ) {
      this.hasError = true;
      this.message = 'Error: Debes rellenar todos los campos.';
      this.cdr.detectChanges();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.hasError = true;
      this.message = 'Error: Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    this.userService.register(
      this.barName.trim(),
      this.email.trim(),
      this.password,
      this.confirmPassword,
      this.clientId.trim(),
      this.clientSecret.trim()
    ).subscribe({
      next: () => {
        this.hasError = false;
        this.message = '¡Registro exitoso! Revisa tu correo electrónico para confirmar la cuenta.';
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.hasError = true;

        if (err.status === 406) {
          this.message = err.error?.message || 'Error: Los datos no son válidos o las contraseñas no coinciden.';
        } else if (err.status === 409) {
          this.message = err.error?.message || 'Error: Este usuario ya está registrado o ha ocurrido un conflicto.';
        } else {
          this.message = err.error?.message || 'Error al conectar con el servidor.';
        }

        this.cdr.detectChanges(); 
      }
    });
  }
}