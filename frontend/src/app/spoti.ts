import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpotiService {
  private readonly backendSpotiUrl = 'http://127.0.0.1:8080/spoti';
  private readonly spotifyApiUrl = 'https://api.spotify.com/v1';

  spotiToken: string = '';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getAuthorizationToken(code: string): Observable<any> {
    const clientId = this.getFromSession('clientId');

    if (!clientId) {
      console.warn('No hay Client ID de Spotify guardado en sesión.');
      return EMPTY;
    }

    const url =
      `${this.backendSpotiUrl}/getAuthorizationToken` +
      `?code=${encodeURIComponent(code)}` +
      `&clientId=${encodeURIComponent(clientId)}`;

    return this.http.get<any>(url);
  }

  getDevices(): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    return this.http.get<any>(
      `${this.spotifyApiUrl}/me/player/devices`,
      { headers }
    );
  }

  getCurrentlyPlaying(): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    return this.http.get<any>(
      `${this.spotifyApiUrl}/me/player/currently-playing`,
      { headers }
    );
  }

  searchTracks(query: string): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    if (!query || query.trim() === '') {
      console.warn('La búsqueda está vacía.');
      return EMPTY;
    }

    const url = `${this.backendSpotiUrl}/search?q=${encodeURIComponent(query.trim())}`;

    return this.http.get<any>(url, { headers });
  }

  addToSpotifyQueue(trackUri: string): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    if (!trackUri) {
      console.warn('No se ha recibido URI de canción para añadir a la cola.');
      return EMPTY;
    }

    const url = `${this.spotifyApiUrl}/me/player/queue?uri=${encodeURIComponent(trackUri)}`;

    return this.http.post<any>(
      url,
      {},
      { headers, responseType: 'text' as 'json' }
    );
  }

  playTrack(trackUri: string): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    if (!trackUri) {
      console.warn('No se ha recibido URI de canción para reproducir.');
      return EMPTY;
    }

    const body = {
      uris: [trackUri]
    };

    return this.http.put<any>(
      `${this.spotifyApiUrl}/me/player/play`,
      body,
      { headers, responseType: 'text' as 'json' }
    );
  }

  playUris(trackUris: string[]): Observable<any> {
    const headers = this.createSpotifyHeaders();

    if (!headers) {
      return EMPTY;
    }

    if (!trackUris || trackUris.length === 0) {
      console.warn('No hay URIs para reproducir.');
      return EMPTY;
    }

    const body = {
      uris: trackUris
    };

    return this.http.put<any>(
      `${this.spotifyApiUrl}/me/player/play`,
      body,
      { headers, responseType: 'text' as 'json' }
    );
  }

  pausePlayback(): Observable<any> {
  const headers = this.createSpotifyHeaders();

  if (!headers) {
    return EMPTY;
  }

  return this.http.put<any>(
    `${this.spotifyApiUrl}/me/player/pause`,
    {},
    { headers, responseType: 'text' as 'json' }
  );
}

  private createSpotifyHeaders(): HttpHeaders | null {
    const token = this.getSpotifyToken();

    if (!token) {
      console.warn('No hay token de Spotify disponible.');
      return null;
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private getSpotifyToken(): string {
    return this.spotiToken || this.getFromSession('spotiToken');
  }

  private getFromSession(key: string): string {
    if (!this.isBrowser()) {
      return '';
    }

    return sessionStorage.getItem(key) || '';
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
