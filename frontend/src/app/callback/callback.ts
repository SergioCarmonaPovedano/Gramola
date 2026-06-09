import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotiService } from '../services/spoti.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './callback.html',
  styleUrl: './callback.css'
})
export class CallbackComponent implements OnInit {
  title: string = 'Conectando con Spotify';
  message: string = 'Estamos preparando la música de tu bar. En unos segundos entrarás al panel.';
  errorMessage: string = '';
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public spoti: SpotiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const queryParams = this.route.snapshot.queryParamMap;
    const code = queryParams.get('code');
    const error = queryParams.get('error');

    if (error) {
      this.showErrorAndReturnToLogin('Spotify ha cancelado o rechazado la autorización.');
      return;
    }

    if (!code) {
      this.showErrorAndReturnToLogin('No se ha recibido el código de autorización de Spotify.');
      return;
    }

    history.replaceState({}, '', '/callback');

    this.spoti.getAuthorizationToken(code).subscribe({
      next: (data) => {
        const finalToken = data.access_token || data.accessToken;

        if (!finalToken) {
          this.showErrorAndReturnToLogin('El backend no ha devuelto un token válido de Spotify.');
          return;
        }

        this.spoti.spotiToken = finalToken;
        sessionStorage.setItem('spotiToken', finalToken);

        this.loading = true;
        this.title = 'Conexión completada';
        this.message = 'Todo listo. Entrando al panel de La Gramola...';

        setTimeout(() => {
          this.router.navigateByUrl('/music');
        }, 2500);
      },
      error: (err) => {
        console.error('Error al obtener el token de Java:', err);
        this.showErrorAndReturnToLogin('No se ha podido conectar con Spotify. Revisa la consola del backend.');
      }
    });
  }

  private showErrorAndReturnToLogin(message: string): void {
    this.loading = false;
    this.errorMessage = message;
    this.title = 'Error de conexión';
    this.message = 'Volviendo al inicio de sesión...';

    setTimeout(() => {
      this.router.navigateByUrl('/login');
    }, 3000);
  }
}

  
