import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = 'http://127.0.0.1:8080';

  constructor(private http: HttpClient) {}

  getPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/subscriptions/plans`);
  }

  prepay(plan: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payments/prepay`, { plan });
  }

  confirm(transactionId: string, token: string, plan: string): Observable<any> {
    const body = {
      transactionId,
      token,
      plan
    };

    return this.http.post<any>(`${this.baseUrl}/payments/confirm`, body);
  }
}