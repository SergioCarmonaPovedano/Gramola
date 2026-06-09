import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, interval, Subscription } from 'rxjs';

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

  private readonly endThresholdMs = 2500;
  private readonly libraryIndexKey = 'gramola_current_library_index';

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
  private currentGramolaTrack: any = null;
  private currentLibraryIndex: number = -1;
  private transitionInProgress: boolean = false;
  private transitionScheduled: boolean = false;

  /**
 * Guarda la canción que está sonando porque venía de la cola prioritaria.
 * Aunque también esté en libraryTracks, no debe mover el índice de la rotación normal.
 */
private priorityPlaybackSpotifyId: string | null = null;

  constructor(
    private spoti: SpotiService,
    private queueService: QueueService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    if (!this.isBrowser()) {
      return;
    }

    this.isOwner = sessionStorage.getItem('isOwner') === 'true';
    this.currentLibraryIndex = this.readLibraryIndexFromSession();

    this.loadInitialData();

    this.autoRefresh = interval(3000).subscribe(() => {
      this.refreshGramolaPlaybackState();
    });
  }

  ngOnDestroy(): void {
    this.autoRefresh?.unsubscribe();
  }

  private loadInitialData(): void {
    this.getDevices();
    this.loadTrackPrice();
    this.refreshGramolaPlaybackState();
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
    this.inspectSpotifyPlaybackAndAdvanceIfNeeded();
  }

  private refreshGramolaPlaybackState(): void {
    if (!this.isBrowser()) {
      return;
    }

    const barEmail = this.getBarEmail();

    if (!barEmail) {
      this.songError = 'No se ha encontrado el email del bar en la sesión.';
      return;
    }

    forkJoin({
      queue: this.queueService.getQueue(barEmail),
      library: this.queueService.getLibrary(barEmail)
    }).subscribe({
      next: ({ queue, library }) => {
        this.queue = queue || [];
        this.libraryTracks = library || [];
        this.inspectSpotifyPlaybackAndAdvanceIfNeeded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando estado de gramola:', err);
        this.songError = 'No se ha podido cargar la cola o la lista del bar.';
      }
    });
  }

  private inspectSpotifyPlaybackAndAdvanceIfNeeded(): void {
    this.spoti.getCurrentlyPlaying().subscribe({
      next: (result) => {
        if (result?.item && result.is_playing) {
          this.updateNowPlaying(result.item);
          this.synchroniseBackendWithSpotify(result.item, result.progress_ms || 0);
          this.cdr.detectChanges();
          return;
        }

        this.clearNowPlaying();
        this.playNextGramolaTrack('Spotify está parado o no hay canción activa.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error obteniendo canción actual:', err);
        this.songError = 'No se ha podido obtener la canción actual de Spotify.';
      }
    });
  }

  private updateNowPlaying(item: any): void {
    this.title = item.name || '';
    this.artist = item.artists?.[0]?.name || '';
    this.albumCover = item.album?.images?.[1]?.url || item.album?.images?.[0]?.url || '';
  }

  private clearNowPlaying(): void {
    this.title = '';
    this.artist = '';
    this.albumCover = '';
  }

  private synchroniseBackendWithSpotify(item: any, progressMs: number): void {
  const spotifyId = item?.id;

  if (!spotifyId) {
    return;
  }

  const queuedTrack = this.findQueuedTrackBySpotifyId(spotifyId);
  const libraryTrack = this.findLibraryTrackBySpotifyId(spotifyId);

  if (queuedTrack) {
    this.currentGramolaTrack = queuedTrack;
    this.priorityPlaybackSpotifyId = spotifyId;
    this.markQueuedTrackAsConsumed(queuedTrack);

  } else if (libraryTrack) {
    this.currentGramolaTrack = libraryTrack;

    /*
     * Caso importante:
     * Una canción pagada también está en la biblioteca normal porque librarySong = true.
     * Pero si está sonando ahora porque venía de la cola prioritaria, NO debe actualizar
     * el índice de la rotación normal.
     */
    if (this.priorityPlaybackSpotifyId !== spotifyId) {
      this.priorityPlaybackSpotifyId = null;
      this.updateCurrentLibraryIndex(libraryTrack);
    }

  } else if (!this.transitionInProgress) {
    this.priorityPlaybackSpotifyId = null;
    this.playNextGramolaTrack('Spotify ha cambiado a una canción externa a la gramola.');
    return;
  }

  const durationMs = item.duration_ms || 0;
  const remainingMs = durationMs - progressMs;

  if (durationMs > 0 && remainingMs <= this.endThresholdMs) {
    this.scheduleNextTrack(Math.max(remainingMs + 400, 400));
  }
}

  private scheduleNextTrack(delayMs: number): void {
    if (this.transitionScheduled || this.transitionInProgress) {
      return;
    }

    this.transitionScheduled = true;

    setTimeout(() => {
      this.transitionScheduled = false;
      this.playNextGramolaTrack('La canción actual ha terminado.');
    }, delayMs);
  }

  private playNextGramolaTrack(reason: string): void {
  if (this.transitionInProgress) {
    return;
  }

  const nextTrack = this.selectNextTrack();

  if (!nextTrack) {
    return;
  }

  if (!nextTrack.spotifyUri) {
    this.songError = 'La siguiente canción no tiene URI válida de Spotify.';
    return;
  }

  const isPriorityTrack = nextTrack.queued === true && !nextTrack.playedAt;

  this.transitionInProgress = true;

  this.spoti.playTrack(nextTrack.spotifyUri).subscribe({
    next: () => {
      this.currentGramolaTrack = nextTrack;

      if (isPriorityTrack) {
        this.priorityPlaybackSpotifyId = nextTrack.spotifyId;
        this.markQueuedTrackAsConsumed(nextTrack);
      } else {
        this.priorityPlaybackSpotifyId = null;
        this.updateCurrentLibraryIndex(nextTrack);
      }

      this.transitionInProgress = false;
      this.songError = undefined;
      this.updateDisplayedTrackFromBackendTrack(nextTrack);
      this.refreshGramolaListsOnly();

      console.log('Gramola reproduce siguiente canción:', reason, nextTrack.title);
    },
    error: (err) => {
      console.error('Error reproduciendo siguiente canción de la gramola:', err);
      this.transitionInProgress = false;
      this.songError = 'No se ha podido reproducir la siguiente canción. Abre Spotify en un dispositivo activo y comprueba que la cuenta sea Premium.';
      this.cdr.detectChanges();
    }
  });
}

  private selectNextTrack(): any | null {
  const nextPaidTrack = this.queue.find(track =>
    track.queued === true &&
    !track.playedAt
  );

  if (nextPaidTrack) {
    /*
     * Antes de saltar a una prioritaria, guardamos bien la posición normal actual.
     * Así, cuando termine la prioritaria, continuamos por la siguiente normal.
     */
    this.lockCurrentLibraryPositionBeforePriority();

    return nextPaidTrack;
  }

  return this.selectNextLibraryTrack();
}

  private lockCurrentLibraryPositionBeforePriority(): void {
  if (this.currentLibraryIndex >= 0) {
    return;
  }

  const index = this.findLibraryIndexByCurrentTrack();

  if (index >= 0) {
    this.currentLibraryIndex = index;
    this.writeLibraryIndexToSession(index);
  }
}

  private selectNextLibraryTrack(): any | null {
    if (!this.libraryTracks || this.libraryTracks.length === 0) {
      return null;
    }

    const safeCurrentIndex = this.currentLibraryIndex >= 0
      ? this.currentLibraryIndex
      : this.findLibraryIndexByCurrentTrack();

    const nextIndex = (safeCurrentIndex + 1) % this.libraryTracks.length;

    return this.libraryTracks[nextIndex];
  }

  private findLibraryIndexByCurrentTrack(): number {
  if (!this.currentGramolaTrack?.spotifyId) {
    return -1;
  }

  /*
   * Si la canción actual venía de la cola prioritaria, aunque también esté
   * en la biblioteca, no debe usarse como referencia para la rotación normal.
   */
  if (this.priorityPlaybackSpotifyId === this.currentGramolaTrack.spotifyId) {
    return -1;
  }

  return this.libraryTracks.findIndex(track =>
    track.spotifyId === this.currentGramolaTrack.spotifyId
  );
}

  private findQueuedTrackBySpotifyId(spotifyId: string): any | null {
    return this.queue.find(track =>
      track.spotifyId === spotifyId &&
      track.queued === true &&
      !track.playedAt
    ) || null;
  }

  private findLibraryTrackBySpotifyId(spotifyId: string): any | null {
    return this.libraryTracks.find(track =>
      track.spotifyId === spotifyId
    ) || null;
  }

  private updateCurrentLibraryIndex(track: any): void {
    const index = this.libraryTracks.findIndex(libraryTrack =>
      libraryTrack.id === track.id
    );

    if (index >= 0) {
      this.currentLibraryIndex = index;
      this.writeLibraryIndexToSession(index);
    }
  }

  private updateDisplayedTrackFromBackendTrack(track: any): void {
    this.title = track.title || '';
    this.artist = track.artist || '';
    this.albumCover = '';
    this.cdr.detectChanges();
  }

  private markQueuedTrackAsConsumed(track: any): void {
    if (!track?.id || track.playedAt) {
      return;
    }

    track.playedAt = Date.now();
    track.queued = false;

    this.queueService.markAsPlayed(track.id).subscribe({
      next: () => {
        this.refreshGramolaListsOnly();
      },
      error: (err) => {
        console.error('Error marcando canción pagada como reproducida:', err);
      }
    });
  }

  private refreshGramolaListsOnly(): void {
    const barEmail = this.getBarEmail();

    if (!barEmail) {
      return;
    }

    forkJoin({
      queue: this.queueService.getQueue(barEmail),
      library: this.queueService.getLibrary(barEmail)
    }).subscribe({
      next: ({ queue, library }) => {
        this.queue = queue || [];
        this.libraryTracks = library || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error refrescando listas de gramola:', err);
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

        this.refreshGramolaPlaybackState();
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
        this.refreshGramolaPlaybackState();

        if (isCurrentUserOwner) {
          this.showSuccessMessage('Canción añadida gratis a la lista normal del bar.');
          return;
        }

        this.showSuccessMessage('Canción pagada y añadida a la cola prioritaria. Sonará cuando termine la actual.');
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

  cancelPayment(): void {
    this.isPaying = false;
    this.trackPendingPayment = null;

    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
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

  const barEmail = this.getBarEmail();

  this.autoRefresh?.unsubscribe();

  const finishLogout = () => {
    sessionStorage.clear();
    this.spoti.spotiToken = '';
    this.router.navigateByUrl('/login');
  };

  this.spoti.pausePlayback().subscribe({
    next: () => {
      if (!barEmail) {
        finishLogout();
        return;
      }

      this.queueService.clearPendingQueue(barEmail).subscribe({
        next: () => finishLogout(),
        error: (err) => {
          console.error('No se pudo limpiar la cola prioritaria:', err);
          finishLogout();
        }
      });
    },
    error: (err) => {
      console.error('No se pudo pausar Spotify:', err);

      if (!barEmail) {
        finishLogout();
        return;
      }

      this.queueService.clearPendingQueue(barEmail).subscribe({
        next: () => finishLogout(),
        error: () => finishLogout()
      });
    }
  });
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
    this.showSuccessMessage('Modo bar activado. Las canciones se añadirán gratis a la lista normal del bar.', 3500);
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

  private readLibraryIndexFromSession(): number {
    const rawValue = sessionStorage.getItem(this.libraryIndexKey);
    const parsedValue = rawValue !== null ? Number(rawValue) : -1;

    return Number.isFinite(parsedValue) ? parsedValue : -1;
  }

  private writeLibraryIndexToSession(index: number): void {
    sessionStorage.setItem(this.libraryIndexKey, String(index));
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