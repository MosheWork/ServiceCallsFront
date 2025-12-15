import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { environment } from '../../environments/environment';

import { Chart, ChartConfiguration } from 'chart.js/auto';
import { Subscription } from 'rxjs';

export interface ServiceCallDashboardModel {
  serviceCallID: number;
  entryTime: string | null;

  title: string | null;
  description: string | null;
  requestUser: string | null;
  callbackPhone: string | null;
  location: string | null;
  computerName: string | null;

  mainCategoryName: string | null;
  subCategory1Name: string | null;
  subCategory2Name: string | null;
  subCategory3Name: string | null;

  statusName: string | null;
  priorityName: string | null;

  departmentInChargeName: string | null;
  teamInChargeName: string | null;
  userInChargeName: string | null;

  serviceRequestTypeName: string | null;
}

@Component({
  selector: 'app-service-calls-dashboard',
  templateUrl: './service-calls-dashboard.component.html',
  styleUrls: ['./service-calls-dashboard.component.scss']
})
export class ServiceCallsDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  isLoading = true;
  errorMessage = '';

  filterForm: FormGroup;

  allRows: ServiceCallDashboardModel[] = [];
  filteredRows: ServiceCallDashboardModel[] = [];

  mainCategories: string[] = [];

  private chart: Chart | null = null;
  private sub?: Subscription;

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      mainCategoryName: ['ALL']
    });
  }

  ngOnInit(): void {
    this.loadData();

    // live filtering
    this.sub = this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
      this.updateChart();
    });
  }

  ngAfterViewInit(): void {
    this.initChart();      // canvas exists now
    this.updateChart();    // in case filteredRows already ready
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyChart();
  }

  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const url = `${environment.apiBaseUrl}/api/ServiceCallsDashboard`;

    this.http.get<ServiceCallDashboardModel[]>(url).subscribe({
      next: (rows) => {
        this.allRows = rows || [];
        this.filteredRows = [...this.allRows];

        this.mainCategories = this.getDistinctMainCategories(this.allRows);

        // default: last 30 days (optional – remove if you don't want)
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);

        this.filterForm.patchValue(
          { startDate: start, endDate: end, mainCategoryName: 'ALL' },
          { emitEvent: false }
        );

        this.applyFilters();
        this.updateChart();

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת נתונים';
        this.isLoading = false;
      }
    });
  }

  private getDistinctMainCategories(rows: ServiceCallDashboardModel[]): string[] {
    const set = new Set<string>();
    for (const r of rows) {
      const name = (r.mainCategoryName || '').trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  applyFilters(): void {
    const { startDate, endDate, mainCategoryName } = this.filterForm.value;

    const start: Date | null = startDate ? new Date(startDate) : null;
    const end: Date | null = endDate ? new Date(endDate) : null;

    // include end day (23:59:59)
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    this.filteredRows = this.allRows.filter(r => {
      const entry = r.entryTime ? new Date(r.entryTime) : null;

      const okDate =
        (!start || (entry && entry >= start)) &&
        (!end || (entry && entry <= end));

      const okMain =
        !mainCategoryName || mainCategoryName === 'ALL'
          ? true
          : (r.mainCategoryName || '') === mainCategoryName;

      return okDate && okMain;
    });
  }

  private initChart(): void {
    if (!this.barCanvas) return;

    const cfg: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'כמות קריאות',
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            ticks: { autoSkip: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    };

    this.destroyChart();
    this.chart = new Chart(this.barCanvas.nativeElement, cfg);
  }

  private updateChart(): void {
    if (!this.chart) return;

    // Count by MainCategoryName from filtered rows
    const counts = new Map<string, number>();

    for (const r of this.filteredRows) {
      const key = (r.mainCategoryName || 'ללא קטגוריה').trim() || 'ללא קטגוריה';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // sort desc by count
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);

    // optional: top 12
    const top = sorted.slice(0, 12);

    const labels = top.map(x => x[0]);
    const values = top.map(x => x[1]);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = values;
    this.chart.update();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      startDate: null,
      endDate: null,
      mainCategoryName: 'ALL'
    });
  }
}
