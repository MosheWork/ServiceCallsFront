import { Component, Input, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AlertMSGModel {
  alertId: number;
  componentKey: string;
  messageText: string;
  isEnabled: boolean;
  createdAt: string;

  // optional advanced fields (so it won't break if API doesn't return them)
  priority?: number;
  color?: string | null;
  startAt?: string | null;
  stopAt?: string | null;
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.alerts = [];

    const url = `${environment.apiBaseUrl}/api/AlertMSG`;
    const params = new HttpParams().set('componentKey', this.componentKey || '');

    this.http.get<any[]>(url, { params }).subscribe({
      next: (rows) => {
        const normalized: AlertMSGModel[] = (rows || []).map((x: any) => ({
          alertId: x.alertId ?? x.AlertId,
          componentKey: x.componentKey ?? x.ComponentKey,
          messageText: x.messageText ?? x.MessageText,
          isEnabled: x.isEnabled ?? x.IsEnabled,
          createdAt: x.createdAt ?? x.CreatedAt,

          priority: x.priority ?? x.Priority ?? 2,
          color: x.color ?? x.Color ?? null,
          startAt: x.startAt ?? x.StartAt ?? null,
          stopAt: x.stopAt ?? x.StopAt ?? null,
        }));

        this.alerts = normalized
          .filter(a => this.shouldShowAlert(a))
          .sort((a, b) => {
            const pa = a.priority ?? 0;
            const pb = b.priority ?? 0;
            if (pb !== pa) return pb - pa;
            return (this.toTime(b.createdAt) ?? 0) - (this.toTime(a.createdAt) ?? 0);
          });

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

  // ===== helpers (same logic you used in the form) =====
  private now(): number { return Date.now(); }

  private toTime(v?: string | null): number | null {
    if (!v) return null;
    const t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }

  shouldShowAlert(a: AlertMSGModel): boolean {
    const start = this.toTime(a.startAt);
    const stop = this.toTime(a.stopAt);
    const n = this.now();

    if (start !== null && start > n) return false;
    if (stop !== null && stop < n) return false;
    return (a.messageText || '').trim().length > 0;
  }

  priorityColor(p?: number): string {
    switch (p) {
      case 5: return '#b91c1c';
      case 4: return '#ea580c';
      case 3: return '#ca8a04';
      case 2: return '#2563eb';
      case 1: return '#16a34a';
      default: return '#2563eb';
    }
  }

  alertBorderColor(a: AlertMSGModel): string {
    const c = (a.color || '').trim();
    return c ? c : this.priorityColor(a.priority);
  }

  formatRange(a: AlertMSGModel): string {
    const hasStart = !!a.startAt;
    const hasStop = !!a.stopAt;
    if (!hasStart && !hasStop) return '';

    const startStr = hasStart ? new Date(a.startAt as string).toLocaleString('he-IL') : '';
    const stopStr = hasStop ? new Date(a.stopAt as string).toLocaleString('he-IL') : '';

    if (hasStart && hasStop) return `מוצג מ־${startStr} עד ${stopStr}`;
    if (hasStart) return `מוצג החל מ־${startStr}`;
    return `מוצג עד ${stopStr}`;
  }
}
