import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private apiUrl = environment.AuthUrl + 'Authentication';

  constructor(private http: HttpClient) {}

  getAuthentication(): Observable<any> {
    return this.http.get(this.apiUrl, {
      withCredentials: true
    });
  }
}
