import { Component, ChangeDetectorRef, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core'; 
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit, AfterViewInit {
  email: string = '';
  pwd: string = '';
  rememberMe: boolean = false;
  errorMsg: string = '';

  private readonly rememberEmailKey = 'gramola_remember_email';

  constructor(
    private userService: UserService, 
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadRememberedEmail();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.loadRememberedEmail();
      this.pwd = '';
      this.cdr.detectChanges();
    }, 300);

    setTimeout(() => {
      this.pwd = '';
      this.cdr.detectChanges();
    }, 900);
  }

  private loadRememberedEmail(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rememberedEmail = localStorage.getItem(this.rememberEmailKey);

    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    } else {
      this.email = '';
      this.rememberMe = false;
    }

    this.pwd = '';
  }

  login(): void {
    if (!this.email || !this.pwd) {
      this.errorMsg = 'Por favor, rellena todos los campos.';
      return;
    }

    this.errorMsg = ''; 

    const cleanEmail = this.email.trim();

    this.userService.login(cleanEmail, this.pwd).subscribe({
      next: (response: any) => { 
        const data = response;

        if (isPlatformBrowser(this.platformId)) {
          if (this.rememberMe) {
            localStorage.setItem(this.rememberEmailKey, cleanEmail);
          } else {
            localStorage.removeItem(this.rememberEmailKey);
          }

          sessionStorage.setItem('userEmail', cleanEmail);

          // El login siempre entra como bar. 
          // Después el propietario puede cambiar manualmente a modo cliente.
          sessionStorage.setItem('isOwner', 'true');
        }
        
        this.connectWithSpotify(data.clientId);
      },
      error: (err) => {
        console.error('Error en el login:', err);
        
        if (err.error && typeof err.error === 'string') {
          try {
            this.errorMsg = JSON.parse(err.error).message;
          } catch (e) {
            this.errorMsg = 'Credenciales incorrectas.';
          }
        } else {
          this.errorMsg = err.error?.message || 'Error al iniciar sesión.';
        }
        
        this.cdr.detectChanges(); 
      }
    });
  }

  private connectWithSpotify(clientId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    sessionStorage.setItem('clientId', clientId);

    const redirectUri = 'http://127.0.0.1:4200/callback'; 
    const scopes = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
    const authorizeUrl = 'https://accounts.spotify.com/authorize';

    const spotifyUrl =
      `${authorizeUrl}` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}`;
    
    window.location.href = spotifyUrl;
  }
}
