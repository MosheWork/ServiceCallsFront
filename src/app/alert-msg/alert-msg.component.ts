import { Component, Input, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AlertMSGModel {
  alertId: number;
  componentKey: string;
  messageText: string;
  isEnabled: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-alert-msg',
  templateUrl: './alert-msg.component.html',
  styleUrls: ['./alert-msg.component.scss']
})
export class AlertMsgComponent implements OnInit {

  /** which page/component wants to show alerts */
  @Input() componentKey: string = '';

  isLoading = false;
  errorMessage = '';
  alerts: AlertMSGModel[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const url = `${environment.apiBaseUrl}/api/AlertMSG`;
    const params = new HttpParams().set('componentKey', this.componentKey || '');

    this.http.get<AlertMSGModel[]>(url, { params }).subscribe({
      next: (rows) => {
        this.alerts = rows || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת הודעות מערכת';
        this.isLoading = false;
      }
    });
  }

  trackById(_: number, a: AlertMSGModel) {
    return a.alertId;
  }
}
