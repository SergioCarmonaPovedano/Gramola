import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'http://127.0.0.1:8080/users';

  constructor(private http: HttpClient) {}

  register(
    bar: string,
    email: string,
    password: string,
    confirmPassword: string,
    clientId: string,
    clientSecret: string
  ): Observable<any> {
    const body = {
      bar,
      email,
      pwd1: password,
      pwd2: confirmPassword,
      clientId,
      clientSecret
    };

    return this.http.post<any>(`${this.apiUrl}/register`, body);
  }
  
  login(email: string, password: string): Observable<any> {
    const body = {
      email,
      pwd: password
    };

    return this.http.post<any>(`${this.apiUrl}/login`, body);
  }

  validateOwnerPassword(email: string, password: string): Observable<any> {
    const body = {
      email,
      password
    };

    return this.http.post<any>(`${this.apiUrl}/validateOwnerPassword`, body);
  }
}
