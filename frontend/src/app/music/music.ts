import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

import { SpotiService } from '../spoti';
import { QueueService } from '../queue';
import { UserService } from '../user';

declare var Stripe: any;

@Component({
  selector: 'app-music',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './music.html',
  styleUrls: ['./music.css']
})
export class MusicComponent implements OnInit, OnDestroy {
  private readonly backendUrl = 'http://127.0.0.1:8080';
  private readonly stripePublicKey = 'pk_test_51Tc8UDJX5eRLV69oXaS33MzSgxXxOC2TmP7zd5DXINOXj9FjnbodD183t63CCmJxmkMr8HtxW8LYDf1IDuhowafJ00celKzaA2';

  devices: any[] = [];
  queue: any[] = [];
  searchResults: any[] = [];
  libraryTracks: any[] = [];

  title: string = '';
  artist: string = '';
  albumCover: string = '';

  deviceError?: string;
  songError?: string;

  isPaying: boolean = false;
  trackPendingPayment: any = null;

  stripe: any;
  cardElement: any;

  currentPrice: number = 0;
  newTrackPrice: number = 0;
  priceMessage: string | null = null;
  priceError: string | null = null;

  isOwner: boolean = false;
  successMessage: string | null = null;

  showOwnerPasswordModal: boolean = false;
  ownerPassword: string = '';
  ownerPasswordError: string | null = null;
  ownerPasswordLoading: boolean = false;

  private autoRefresh?: Subscription;
  private barMusicStarted: boolean = false;
  private barMusicRestarting: boolean = false;

  constructor(
    private spoti: SpotiService,
    private queueService: QueueService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!this.isBrowser()) {
      return;
    }

    this.isOwner = sessionStorage.getItem('isOwner') === 'true';

    this.loadInitialData();

    this.autoRefresh = interval(3000).subscribe(() => {
      this.loadQueue();
      this.getCurrentSong();
    });
  }

  ngOnDestroy(): void {
    this.autoRefresh?.unsubscribe();
  }

  private loadInitialData(): void {
    this.getDevices();
    this.getCurrentSong();
    this.loadQueue();
    this.loadTrackPrice();
    this.loadLibrary();
  }

  getDevices(): void {
    this.spoti.getDevices().subscribe({
      next: (response) => {
        this.devices = response?.devices || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando dispositivos:', err);
        this.deviceError = 'No se han podido cargar los dispositivos.';
      }
    });
  }

  getCurrentSong(): void {
  this.spoti.getCurrentlyPlaying().subscribe({
    next: (result) => {
      if (result?.item && result.is_playing) {
        this.title = result.item.name;
        this.artist = result.item.artists?.[0]?.name || '';
        this.albumCover = result.item.album?.images?.[1]?.url || '';

        this.markCurrentTrackAsPlayedIfNeeded(result.item.id);
        this.cdr.detectChanges();
        return;
      }

      this.title = '';
      this.artist = '';
      this.albumCover = '';

      this.restartBarMusicIfNeeded();

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error obteniendo canción actual:', err);
      this.songError = 'No se ha podido obtener la canción actual de Spotify.';
    }
  });
}
  private restartBarMusicIfNeeded(): void {
  if (this.barMusicRestarting) {
    return;
  }

  if (!this.libraryTracks || this.libraryTracks.length === 0) {
    return;
  }

  if (this.queue && this.queue.length > 0) {
    return;
  }

  const uris = this.libraryTracks
    .map(track => track.spotifyUri)
    .filter(uri => !!uri);

  if (uris.length === 0) {
    return;
  }

  this.barMusicRestarting = true;

  this.spoti.playUris(uris).subscribe({
    next: () => {
      this.barMusicRestarting = false;
      this.showSuccessMessage('La lista del bar vuelve a empezar.', 2500);
      this.getCurrentSong();
    },
    error: (err) => {
      this.barMusicRestarting = false;
      console.error('Error reiniciando la lista del bar:', err);
    }
  });
}

  private markCurrentTrackAsPlayedIfNeeded(currentSpotifyId: string): void {
    const queuedTrack = this.queue.find(track =>
      track.spotifyId === currentSpotifyId &&
      track.queued === true &&
      !track.playedAt
    );

    if (!queuedTrack) {
      return;
    }

    this.queueService.markAsPlayed(queuedTrack.id).subscribe({
      next: () => {
        this.loadQueue();
        this.loadLibrary();
      },
      error: (err) => {
        console.error('Error marcando canción como reproducida:', err);
      }
    });
  }

  loadQueue(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    this.queueService.getQueue(barEmail).subscribe({
      next: (data) => {
        this.queue = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando la cola del bar:', err);
        this.songError = 'No se ha podido cargar la cola del bar.';
      }
    });
  }

  loadLibrary(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    this.queueService.getLibrary(barEmail).subscribe({
      next: (data) => {
        this.libraryTracks = data || [];
        this.cdr.detectChanges();
        this.startBarMusicIfNeeded();
      },
      error: (err) => {
        console.error('Error cargando la lista del bar:', err);
        this.songError = 'No se ha podido cargar la lista de canciones del bar.';
      }
    });
  }

  onSearchInputChange(value: string): void {
    if (!value || value.trim() === '') {
      this.searchResults = [];
      this.songError = undefined;
      this.cdr.detectChanges();
    }
  }

  search(query: string): void {
    this.songError = undefined;

    if (!query || query.trim() === '') {
      this.songError = 'Escribe el nombre de una canción o artista.';
      return;
    }

    this.spoti.searchTracks(query.trim()).subscribe({
      next: (result) => {
        if (!result?.tracks?.items) {
          this.searchResults = [];
          this.songError = 'No se han encontrado canciones.';
          this.cdr.detectChanges();
          return;
        }

        this.searchResults = result.tracks.items;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error buscando canciones:', err);
        this.searchResults = [];
        this.songError = 'Error buscando canciones. Revisa el backend o el token de Spotify.';
      }
    });
  }

  addToQueue(spotifyTrack: any): void {
    if (!this.isBrowser()) {
      return;
    }

    this.isOwner = sessionStorage.getItem('isOwner') === 'true';

    if (this.isOwner) {
      this.saveTrackInDatabase(spotifyTrack);
      return;
    }

    this.trackPendingPayment = spotifyTrack;
    this.isPaying = true;
    this.songError = undefined;

    setTimeout(() => {
      this.prepareStripeForm();
    }, 0);
  }

  private prepareStripeForm(): void {
    if (typeof Stripe === 'undefined') {
      this.songError = 'Stripe no está cargado. Revisa que el script esté en index.html.';
      return;
    }

    if (!this.stripe) {
      this.stripe = Stripe(this.stripePublicKey);
    }

    const cardContainer = document.getElementById('card-element');

    if (!cardContainer) {
      this.songError = 'No se ha encontrado el contenedor de tarjeta.';
      return;
    }

    cardContainer.innerHTML = '';

    const elements = this.stripe.elements();

    this.cardElement = elements.create('card', {
      hidePostalCode: true
    });

    this.cardElement.mount('#card-element');

    this.cardElement.on('change', (event: any) => {
      const displayError = document.getElementById('card-error');

      if (displayError) {
        displayError.textContent = event.error ? event.error.message : '';
      }
    });
  }

  processPayment(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    if (!this.trackPendingPayment) {
      this.songError = 'No hay ninguna canción pendiente de pago.';
      return;
    }

    if (!this.stripe || !this.cardElement) {
      this.songError = 'El formulario de pago no está preparado.';
      return;
    }

    this.songError = undefined;

    this.http.post<any>(`${this.backendUrl}/payments/prepayTrack`, {
      barEmail: barEmail
    }).subscribe({
      next: (transaction) => {
        this.confirmStripePayment(transaction, barEmail);
      },
      error: (err) => {
        console.error('Error preparando pago de canción:', err);
        this.songError = 'No se ha podido iniciar el pago.';
      }
    });
  }

  private confirmStripePayment(transaction: any, barEmail: string): void {
    let transactionData = transaction.data;

    if (typeof transactionData === 'string') {
      transactionData = JSON.parse(transactionData);
    }

    const clientSecret = transactionData.client_secret;

    if (!clientSecret) {
      this.songError = 'Stripe no ha devuelto client_secret.';
      return;
    }

    this.stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.cardElement
      }
    }).then((response: any) => {
      if (response.error) {
        this.songError = response.error.message;
        this.cdr.detectChanges();
        return;
      }

      if (response.paymentIntent?.status !== 'succeeded') {
        this.songError = 'El pago no se ha completado correctamente.';
        this.cdr.detectChanges();
        return;
      }

      this.confirmPaymentInBackend(transaction.id, barEmail);
    });
  }

  private confirmPaymentInBackend(transactionId: string, barEmail: string): void {
    this.http.post(`${this.backendUrl}/payments/confirmTrack`, {
      transactionId: transactionId,
      barEmail: barEmail
    }).subscribe({
      next: () => {
        const paidTrack = this.trackPendingPayment;

        this.cancelPayment();
        this.saveTrackInDatabase(paidTrack);

        this.successMessage = 'Pago confirmado. Canción añadida a la cola.';

        setTimeout(() => {
          this.successMessage = null;
          this.cdr.detectChanges();
        }, 3000);

        this.loadQueue();
        this.loadLibrary();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error confirmando pago de canción en backend:', err);
        this.songError = 'El pago se hizo en Stripe, pero no se pudo confirmar en el backend.';
      }
    });
  }

  private saveTrackInDatabase(spotifyTrack: any): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    if (!spotifyTrack) {
      this.songError = 'No se ha encontrado la canción seleccionada.';
      return;
    }

    const isCurrentUserOwner = sessionStorage.getItem('isOwner') === 'true';
    const track = this.buildTrackForDatabase(spotifyTrack, barEmail, isCurrentUserOwner);

    this.queueService.addTrackToQueue(track).subscribe({
      next: () => {
        this.loadLibrary();
        this.loadQueue();

        if (isCurrentUserOwner) {
          this.showSuccessMessage('Canción añadida gratis a la lista del bar.');
          return;
        }

        this.sendPaidTrackToSpotifyQueue(spotifyTrack);
      },
      error: (err) => {
        console.error('Error guardando canción en base de datos:', err);
        this.songError = 'No se ha podido guardar la canción.';
        this.cdr.detectChanges();
      }
    });
  }

  private buildTrackForDatabase(spotifyTrack: any, barEmail: string, isCurrentUserOwner: boolean): any {
    return {
      spotifyId: spotifyTrack.id,
      spotifyUri: spotifyTrack.uri,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists?.[0]?.name || 'Artista desconocido',
      barEmail: barEmail,
      amountPaid: isCurrentUserOwner ? 0 : this.currentPrice,
      paid: !isCurrentUserOwner,
      queued: !isCurrentUserOwner,
      librarySong: true,
      requestedAt: Date.now(),
      playedAt: null
    };
  }

  private sendPaidTrackToSpotifyQueue(spotifyTrack: any): void {
    this.spoti.addToSpotifyQueue(spotifyTrack.uri).subscribe({
      next: () => {
        this.showSuccessMessage('Canción pagada y añadida para sonar a continuación.');
        this.loadLibrary();
        this.loadQueue();
      },
      error: (err) => {
        console.error('Canción guardada en BD, pero no se pudo añadir a la cola de Spotify:', err);
        this.songError = 'La canción se guardó, pero no se pudo enviar a Spotify. Comprueba que haya un dispositivo activo.';
        this.loadLibrary();
        this.loadQueue();
        this.cdr.detectChanges();
      }
    });
  }

  cancelPayment(): void {
    this.isPaying = false;
    this.trackPendingPayment = null;

    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
  }

  private startBarMusicIfNeeded(): void {
    if (this.barMusicStarted) {
      return;
    }

    if (!this.libraryTracks || this.libraryTracks.length === 0) {
      return;
    }

    const uris = this.libraryTracks
      .map(track => track.spotifyUri)
      .filter(uri => !!uri);

    if (uris.length === 0) {
      this.songError = 'La lista del bar no tiene URIs válidas de Spotify.';
      return;
    }

    this.barMusicStarted = true;

    this.spoti.playUris(uris).subscribe({
      next: () => {
        this.showSuccessMessage('Reproduciendo la lista del bar.');
        this.getCurrentSong();
      },
      error: (err) => {
        console.error('Error iniciando la lista del bar:', err);
        this.barMusicStarted = false;
        this.songError = 'No se ha podido iniciar la música del bar. Abre Spotify en un dispositivo y vuelve a intentarlo.';
      }
    });
  }

  logout(): void {
    if (!this.isBrowser()) {
      return;
    }

    const isCurrentUserOwner = sessionStorage.getItem('isOwner') === 'true';

    if (!isCurrentUserOwner) {
      this.songError = 'Solo el propietario puede cerrar la sesión del bar.';
      this.successMessage = null;
      this.cdr.detectChanges();
      return;
    }

    this.autoRefresh?.unsubscribe();

    sessionStorage.clear();
    this.spoti.spotiToken = '';

    this.router.navigateByUrl('/login');
  }

  toggleUserMode(): void {
    if (!this.isBrowser()) {
      return;
    }

    if (this.isOwner) {
      this.switchToClientMode();
      return;
    }

    this.openOwnerPasswordModal();
  }

  confirmOwnerMode(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    this.ownerPasswordError = null;

    if (!barEmail) {
      this.ownerPasswordError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    if (!this.ownerPassword || this.ownerPassword.trim() === '') {
      this.ownerPasswordError = 'Introduce la contraseña del bar.';
      return;
    }

    this.ownerPasswordLoading = true;
    this.cdr.detectChanges();

    this.userService.validateOwnerPassword(barEmail, this.ownerPassword).subscribe({
      next: () => {
        this.ownerPasswordLoading = false;
        this.switchToOwnerMode();
        this.closeOwnerPasswordModal();
      },
      error: (err) => {
        this.ownerPasswordLoading = false;
        this.ownerPasswordError = err.error?.message || 'Contraseña incorrecta.';
        this.cdr.detectChanges();
      }
    });
  }

  closeOwnerPasswordModal(): void {
    this.showOwnerPasswordModal = false;
    this.ownerPassword = '';
    this.ownerPasswordError = null;
    this.ownerPasswordLoading = false;
    this.cdr.detectChanges();
  }

  private openOwnerPasswordModal(): void {
  this.ownerPassword = '';
  this.ownerPasswordError = null;
  this.ownerPasswordLoading = false;
  this.showOwnerPasswordModal = true;
  this.cdr.detectChanges();

  setTimeout(() => {
    this.ownerPassword = '';
    this.cdr.detectChanges();
  }, 150);

  setTimeout(() => {
    this.ownerPassword = '';
    this.cdr.detectChanges();
  }, 500);
}

  private switchToClientMode(): void {
    this.isOwner = false;
    sessionStorage.setItem('isOwner', 'false');

    this.cancelPayment();
    this.showSuccessMessage('Modo cliente activado. Las canciones requerirán pago para colarse.', 3500);
  }

  private switchToOwnerMode(): void {
    this.isOwner = true;
    sessionStorage.setItem('isOwner', 'true');

    this.cancelPayment();
    this.showSuccessMessage('Modo bar activado. Las canciones se añadirán gratis a la lista del bar.', 3500);
  }

  loadTrackPrice(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar para cargar el precio.';
      return;
    }

    this.http.get<number>(
      `${this.backendUrl}/payments/trackPrice?barEmail=${encodeURIComponent(barEmail)}`
    ).subscribe({
      next: (price: number) => {
        this.currentPrice = price;
        this.newTrackPrice = price;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando precio de canción:', err);
        this.songError = 'No se ha podido cargar el precio de las canciones.';
      }
    });
  }

  saveTrackPrice(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.priceError = 'No se ha encontrado el email del bar.';
      return;
    }

    if (!this.newTrackPrice || this.newTrackPrice <= 0) {
      this.priceError = 'El precio debe ser mayor que 0.';
      return;
    }

    this.priceMessage = null;
    this.priceError = null;

    this.http.put<any>(`${this.backendUrl}/payments/trackPrice`, {
      barEmail: barEmail,
      trackPrice: String(this.newTrackPrice)
    }).subscribe({
      next: (res) => {
        this.currentPrice = res.trackPrice;
        this.newTrackPrice = res.trackPrice;

        this.priceMessage = res.message || 'Precio actualizado correctamente.';
        this.showSuccessMessage('Precio por canción actualizado.');

        setTimeout(() => {
          this.priceMessage = null;
          this.cdr.detectChanges();
        }, 3000);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error actualizando precio por canción:', err);
        this.priceError = err.error?.message || 'No se ha podido actualizar el precio.';
        this.cdr.detectChanges();
      }
    });
  }

  trackBySpotifyId(index: number, track: any): string {
    return track.spotifyId || track.id || index.toString();
  }

  private showSuccessMessage(message: string, duration: number = 3000): void {
    this.successMessage = message;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.successMessage = null;
      this.cdr.detectChanges();
    }, duration);
  }

  private getBarEmail(): string {
    if (!this.isBrowser()) {
      return '';
    }

    return sessionStorage.getItem('userEmail') || '';
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}