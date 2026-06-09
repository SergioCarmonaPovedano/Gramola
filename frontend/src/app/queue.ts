import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private readonly apiUrl = 'http://127.0.0.1:8080/api/tracks';

  constructor(private http: HttpClient) {}

  getQueue(barEmail: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/queue?barEmail=${encodeURIComponent(barEmail)}`
    );
  }

  getLibrary(barEmail: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/library?barEmail=${encodeURIComponent(barEmail)}`
    );
  }

  addTrackToQueue(track: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add`, track);
  }

  markAsPlayed(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/played/${id}`, {});
  }
}
