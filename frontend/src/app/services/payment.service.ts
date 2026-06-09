import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = 'http://127.0.0.1:8080';
  private readonly paymentsUrl = `${this.baseUrl}/payments`;

  constructor(private http: HttpClient) {}

  getPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/subscriptions/plans`);
  }

  prepay(plan: string): Observable<any> {
    return this.http.post<any>(`${this.paymentsUrl}/prepay`, { plan });
  }

  confirm(transactionId: string, token: string, plan: string): Observable<any> {
    const body = {
      transactionId,
      token,
      plan
    };

    return this.http.post<any>(`${this.paymentsUrl}/confirm`, body);
  }

  prepayTrack(barEmail: string): Observable<any> {
    return this.http.post<any>(`${this.paymentsUrl}/prepayTrack`, {
      barEmail: barEmail
    });
  }

  confirmTrack(transactionId: string, barEmail: string): Observable<any> {
    return this.http.post<any>(`${this.paymentsUrl}/confirmTrack`, {
      transactionId: transactionId,
      barEmail: barEmail
    });
  }

  getTrackPrice(barEmail: string): Observable<number> {
    return this.http.get<number>(
      `${this.paymentsUrl}/trackPrice?barEmail=${encodeURIComponent(barEmail)}`
    );
  }

  updateTrackPrice(barEmail: string, trackPrice: number): Observable<any> {
    return this.http.put<any>(`${this.paymentsUrl}/trackPrice`, {
      barEmail: barEmail,
      trackPrice: String(trackPrice)
    });
  }
}