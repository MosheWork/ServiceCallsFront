import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { environment } from '../../environments/environment';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

export interface AlertMSGModel {
  alertId: number;
  componentKey: string;
  messageText: string;
  isEnabled: boolean;
  createdAt: string;

  priority: number;
  color?: string | null;
  startAt?: string | null;
  stopAt?: string | null;

  // UI only
  _isEditing?: boolean;
  _edit?: any;
}

function startStopValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startAt')?.value;
  const stop = group.get('stopAt')?.value;
  if (!start || !stop) return null;

  const s = new Date(start).getTime();
  const e = new Date(stop).getTime();
  if (isNaN(s) || isNaN(e)) return null;

  return s <= e ? null : { startAfterStop: true };
}

@Component({
  selector: 'app-alert-msg-admin',
  templateUrl: './alert-msg-admin.component.html',
  styleUrls: ['./alert-msg-admin.component.scss']
})
export class AlertMsgAdminComponent implements OnInit, AfterViewInit {

  isLoading = true;
  errorMessage = '';

  componentKeys: string[] = [
    'ServiceCallsDashboard',
    'ServiceCallsAdminConfig',
    'ServiceCallListComponent',
    'ServiceCallFormComponent'
  ];

  addForm: FormGroup;

  displayedColumns: string[] = [
    'alertId',
    'componentKey',
    'messageText',
    'priority',
    'startAt',
    'stopAt',
    'isEnabled',
    'createdAt',
    'actions'
  ];

  dataSource = new MatTableDataSource<AlertMSGModel>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private apiBase = `${environment.apiBaseUrl}/api/AlertMSG`;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.addForm = this.fb.group({
      componentKey: ['', Validators.required],
      messageText: ['', [Validators.required, Validators.maxLength(1000)]],
      priority: [2, [Validators.required, Validators.min(1), Validators.max(5)]],
      color: [''],          // optional
      startAt: [null],      // optional (datetime-local string)
      stopAt: [null],       // optional
      isEnabled: [true]
    }, { validators: startStopValidator });
  }

  ngOnInit(): void {
    this.loadAll();
    // filter across many columns
    this.dataSource.filterPredicate = (row: AlertMSGModel, filter: string) => {
      const f = (filter || '').toLowerCase();
      const blob = [
        row.alertId,
        row.componentKey,
        row.messageText,
        row.priority,
        row.color,
        row.startAt,
        row.stopAt,
        row.isEnabled ? 'כן' : 'לא',
        row.createdAt
      ].join(' ').toLowerCase();
      return blob.includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // =========================
  // Helpers
  // =========================
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

  badgeColor(row: AlertMSGModel): string {
    const c = (row.color || '').trim();
    return c ? c : this.priorityColor(row.priority);
  }

  toLocalInputValue(iso?: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // =========================
  // Load
  // =========================
  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<any[]>(`${this.apiBase}/All`).subscribe({
      next: (rows) => {
        // normalize PascalCase/camelCase
        const data: AlertMSGModel[] = (rows || []).map((x: any) => ({
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

        this.dataSource.data = data;

        const fromDb = Array.from(new Set(data.map(x => (x.componentKey || '').trim()).filter(Boolean)));
        for (const k of fromDb) {
          if (!this.componentKeys.includes(k)) this.componentKeys.push(k);
        }
        this.componentKeys.sort((a, b) => a.localeCompare(b));

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת הודעות';
        this.isLoading = false;
      }
    });
  }

  // =========================
  // Add
  // =========================
  create(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const v = this.addForm.value;

    const payload = {
      componentKey: (v.componentKey || '').trim(),
      messageText: (v.messageText || '').trim(),
      isEnabled: !!v.isEnabled,

      priority: Number(v.priority || 2),
      color: (v.color || '').trim() || null,
      startAt: v.startAt || null,
      stopAt: v.stopAt || null
    };

    this.http.post(`${this.apiBase}`, payload).subscribe({
      next: () => {
        this.addForm.patchValue({
          messageText: '',
          priority: 2,
          color: '',
          startAt: null,
          stopAt: null,
          isEnabled: true
        });
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה ביצירת הודעה';
      }
    });
  }

  // =========================
  // Inline Edit
  // =========================
  startEdit(row: AlertMSGModel): void {
    row._isEditing = true;
    row._edit = {
      componentKey: row.componentKey,
      messageText: row.messageText,
      isEnabled: row.isEnabled,

      priority: row.priority ?? 2,
      color: row.color ?? '',
      startAt: this.toLocalInputValue(row.startAt ?? null),
      stopAt: this.toLocalInputValue(row.stopAt ?? null),
    };
  }

  cancelEdit(row: AlertMSGModel): void {
    row._isEditing = false;
    row._edit = null;
  }

  saveEdit(row: AlertMSGModel): void {
    const e = row._edit;
    if (!e) return;

    const startAt = e.startAt || null;
    const stopAt = e.stopAt || null;

    if (startAt && stopAt) {
      const s = new Date(startAt).getTime();
      const t = new Date(stopAt).getTime();
      if (!isNaN(s) && !isNaN(t) && s > t) {
        this.errorMessage = 'StartAt לא יכול להיות אחרי StopAt';
        return;
      }
    }

    const payload = {
      componentKey: (e.componentKey || '').trim(),
      messageText: (e.messageText || '').trim(),
      isEnabled: !!e.isEnabled,

      priority: Number(e.priority || 2),
      color: (e.color || '').trim() || null,
      startAt: startAt,
      stopAt: stopAt
    };

    if (!payload.componentKey || !payload.messageText) {
      this.errorMessage = 'ComponentKey + MessageText חובה';
      return;
    }

    this.http.put(`${this.apiBase}/${row.alertId}`, payload).subscribe({
      next: () => {
        row._isEditing = false;
        row._edit = null;
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירה';
      }
    });
  }

  toggleEnabled(row: AlertMSGModel): void {
    const payload = {
      componentKey: row.componentKey,
      messageText: row.messageText,
      isEnabled: !row.isEnabled,

      priority: row.priority ?? 2,
      color: row.color ?? null,
      startAt: row.startAt ?? null,
      stopAt: row.stopAt ?? null
    };

    this.http.put(`${this.apiBase}/${row.alertId}`, payload).subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בעדכון';
      }
    });
  }

  // =========================
  // Delete
  // =========================
  delete(row: AlertMSGModel): void {
    const ok = confirm(`למחוק הודעה #${row.alertId}?`);
    if (!ok) return;

    this.http.delete(`${this.apiBase}/${row.alertId}`).subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה במחיקה';
      }
    });
  }

  // =========================
  // Table filter
  // =========================
  applyFilter(value: string): void {
    this.dataSource.filter = (value || '').trim().toLowerCase();
  }
}
