import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { environment } from '../../environments/environment';
import { Chart, ChartConfiguration } from 'chart.js/auto';

/**
 * Model returned from API: /api/ServiceCallsDashboard
 * (names here must match JSON casing from backend)
 */
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

  // =========================
  // UI state
  // =========================
  isLoading = true;
  errorMessage = '';

  // =========================
  // Filters
  // =========================
  filterForm: FormGroup;

  // =========================
  // Data
  // =========================
  allRows: ServiceCallDashboardModel[] = [];       // full dataset from server
  filteredRows: ServiceCallDashboardModel[] = [];  // after filters (date + main + sub1)

  // dropdown lists
  mainCategories: string[] = [];
  subCategory1Options: string[] = [];

  // =========================
  // Summary cards (KPIs)
  // =========================
  totalCalls = 0;      // total after filters
  todayCalls = 0;      // total today (ignores date range, but respects selected category filters)
  monthCalls = 0;      // total this month (same logic)

  todayGaugeMax = 10;  // gauge max (dynamic)
  monthGaugeMax = 100;

  // Summary per status (after filters)
  statusSummary: { status: string; count: number; pct: number }[] = [];

  // =========================
  // Charts
  // =========================
  private mainChart: Chart | null = null;
  private sub1Chart: Chart | null = null;

  @ViewChild('mainBarCanvas') mainBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sub1BarCanvas') sub1BarCanvas!: ElementRef<HTMLCanvasElement>;

  private sub?: Subscription;

  // =========================
  // Colors (pastel palette)
  // =========================
  private palette: string[] = [
    '#6AA9FF', '#73C7A6', '#FFC27A', '#C6A5FF', '#FF9DB5',
    '#7BC7D6', '#B9C27A', '#A9B4C2', '#FFB3A1', '#8BA0FF'
  ];

  /**
   * Plugin: draw values on top of each bar
   */
  private valueLabelPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw: (chart: any) => {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      chart.data.datasets.forEach((dataset: any, i: number) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((bar: any, index: number) => {
          const val = dataset.data[index];
          if (val == null) return;
          const p = bar.tooltipPosition();
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillText(String(val), p.x, p.y - 4);
        });
      });

      ctx.restore();
    }
  };

  // =========================
  // Constructor
  // =========================
  constructor(private http: HttpClient, private fb: FormBuilder) {
    // Build reactive form used by filter card
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      mainCategoryNames: [[]],  // multi-select
      subCategory1Names: [[]]   // multi-select
    });
  }

  // =========================
  // Lifecycle
  // =========================
  ngOnInit(): void {
    // Load from server once
    this.loadData();

    // React when filters change:
    // 1) calculate filteredRows + dropdown options
    // 2) update KPI cards
    // 3) update charts
    this.sub = this.filterForm.valueChanges.subscribe(() => {
      this.applyFiltersAndOptions();
      this.updateSummaryCards();
      this.updateCharts();
    });
  }

  ngAfterViewInit(): void {
    // Canvases exist only after view init -> create charts here
    this.initCharts();
    // if data is already loaded, charts will show; if not, update later
    this.updateCharts();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyCharts();
  }

  // =========================
  // Data loading from backend
  // =========================
  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // ✅ correct URL format you fixed
    const url = `${environment.apiBaseUrl}/api/ServiceCallsDashboard`;

    this.http.get<ServiceCallDashboardModel[]>(url).subscribe({
      next: (rows) => {
        this.allRows = rows || [];

        // Build main category options (distinct)
        this.mainCategories = this.getDistinct(this.allRows.map(x => x.mainCategoryName));

        // Default date range = last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);

        // Set default filters without triggering valueChanges twice
        this.filterForm.patchValue(
          { startDate: start, endDate: end, mainCategoryNames: [], subCategory1Names: [] },
          { emitEvent: false }
        );

        // Apply everything once after load
        this.applyFiltersAndOptions();
        this.updateSummaryCards();
        this.updateCharts();

        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת נתונים';
        this.isLoading = false;
      }
    });
  }

  // =========================
  // Filter logic
  // =========================
  /**
   * Applies:
   * - Date range + MainCategory -> builds SubCategory1 options
   * - then applies SubCategory1 -> creates filteredRows
   *
   * This keeps SubCategory1 dropdown relevant to selected main categories.
   */
  private applyFiltersAndOptions(): void {
    const { startDate, endDate, mainCategoryNames, subCategory1Names } = this.filterForm.value;

    const start: Date | null = startDate ? new Date(startDate) : null;
    const end: Date | null = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const selectedMains: string[] = Array.isArray(mainCategoryNames) ? mainCategoryNames.map((x: any) => this.norm(x)) : [];
    const selectedSub1: string[] = Array.isArray(subCategory1Names) ? subCategory1Names.map((x: any) => this.norm(x)) : [];

    // Step 1: filter by date + main only (drives SubCategory1 options and sub1 chart scope)
    const rowsDateMain = this.allRows.filter(r => {
      const dt = r.entryTime ? new Date(r.entryTime) : null;

      const okDate =
        (!start || (dt && dt >= start)) &&
        (!end || (dt && dt <= end));

      const mainName = this.norm(r.mainCategoryName);
      const okMain = selectedMains.length === 0 ? true : selectedMains.includes(mainName);

      return okDate && okMain;
    });

    // Update SubCategory1 options
    this.subCategory1Options = this.getDistinct(rowsDateMain.map(x => x.subCategory1Name));

    // Keep only selected sub1 that still exists in options
    const validSub1 = selectedSub1.filter(x => this.subCategory1Options.includes(x));
    if (validSub1.length !== selectedSub1.length) {
      this.filterForm.patchValue({ subCategory1Names: validSub1 }, { emitEvent: false });
    }

    // Step 2: apply sub1 filter too (final filtered rows)
    this.filteredRows = rowsDateMain.filter(r => {
      const s1 = this.norm(r.subCategory1Name);
      return validSub1.length === 0 ? true : validSub1.includes(s1);
    });
  }

  /**
   * Clears filters (user action)
   */
  clearFilters(): void {
    this.filterForm.patchValue({
      startDate: null,
      endDate: null,
      mainCategoryNames: [],
      subCategory1Names: []
    });
  }

  // =========================
  // Summary cards logic (KPIs)
  // =========================
  /**
   * Updates:
   * - totalCalls + statusSummary from filteredRows
   * - todayCalls + monthCalls from category-only filtering (ignores date range)
   */
  private updateSummaryCards(): void {
    // --- Total + status distribution (AFTER filters)
    this.totalCalls = this.filteredRows.length;

    const statusMap = new Map<string, number>();
    for (const r of this.filteredRows) {
      const key = this.norm(r.statusName) || 'ללא סטטוס';
      statusMap.set(key, (statusMap.get(key) || 0) + 1);
    }

    const total = this.totalCalls || 1;
    this.statusSummary = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        pct: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // --- Gauges (TODAY + THIS MONTH):
    // ignore date-range but respect selected main/sub1
    const rowsByCategoryOnly = this.getRowsByCategoryOnly();
    const now = new Date();

    let today = 0;
    let month = 0;

    for (const r of rowsByCategoryOnly) {
      if (!r.entryTime) continue;
      const d = new Date(r.entryTime);
      if (this.isSameDay(d, now)) today++;
      if (this.isSameMonth(d, now)) month++;
    }

    this.todayCalls = today;
    this.monthCalls = month;
    this.todayGaugeMax = this.roundGaugeMax(today);
    this.monthGaugeMax = this.roundGaugeMax(month);
  }

  /**
   * Returns rows filtered ONLY by selected MainCategory/SubCategory1 (no date filter)
   * Used for "today/month" gauges.
   */
  private getRowsByCategoryOnly(): ServiceCallDashboardModel[] {
    const selectedMains: string[] = Array.isArray(this.filterForm.value.mainCategoryNames)
      ? this.filterForm.value.mainCategoryNames.map((x: any) => this.norm(x))
      : [];

    const selectedSub1: string[] = Array.isArray(this.filterForm.value.subCategory1Names)
      ? this.filterForm.value.subCategory1Names.map((x: any) => this.norm(x))
      : [];

    return this.allRows.filter(r => {
      const main = this.norm(r.mainCategoryName);
      const sub1 = this.norm(r.subCategory1Name);

      const okMain = selectedMains.length === 0 ? true : selectedMains.includes(main);
      const okSub1 = selectedSub1.length === 0 ? true : selectedSub1.includes(sub1);

      return okMain && okSub1;
    });
  }

  // =========================
  // Charts creation + updates
  // =========================
  /**
   * Creates charts once (after view init).
   * Updates are done by updateCharts().
   */
  private initCharts(): void {
    // MAIN chart (by MainCategoryName)
    if (this.mainBarCanvas?.nativeElement) {
      const cfg: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'כמות קריאות לפי קטגוריה ראשית',
            data: [],
            backgroundColor: [] as any
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
              suggestedMax: 1  // will be overwritten on update
            },
            x: { ticks: { autoSkip: false } }
          }
        }
        ,
        plugins: [this.valueLabelPlugin] // ✅ numbers on top
      };
      this.mainChart = new Chart(this.mainBarCanvas.nativeElement, cfg);
    }

    // SUB1 chart (by SubCategory1Name)
    if (this.sub1BarCanvas?.nativeElement) {
      const cfg: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'כמות קריאות לפי תת-קטגוריה 1',
            data: [],
            backgroundColor: [] as any
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { autoSkip: false } }
          }
        },
        plugins: [this.valueLabelPlugin] // ✅ numbers on top
      };
      this.sub1Chart = new Chart(this.sub1BarCanvas.nativeElement, cfg);
    }
  }

  /**
   * Updates charts:
   * - Main chart uses filteredRows (respects date+main+sub1)
   * - Sub1 chart uses date+main only (shows all sub1 under chosen main)
   *   but highlights selected sub1 values.
   */
  private updateCharts(): void {
    if (!this.mainChart || !this.sub1Chart) return;

    // MAIN chart respects SubCategory1 filter
    this.updateMainChart(this.filteredRows);

    // SUB1 chart shows ALL under selected main (but highlights selection)
    const rowsDateMain = this.getRowsByDateAndMainOnly();
    this.updateSub1Chart(rowsDateMain);
  }

  /**
   * Used for Sub1 chart scope: date range + selected main only
   */
  private getRowsByDateAndMainOnly(): ServiceCallDashboardModel[] {
    const { startDate, endDate, mainCategoryNames } = this.filterForm.value;

    const start: Date | null = startDate ? new Date(startDate) : null;
    const end: Date | null = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const selectedMains: string[] = Array.isArray(mainCategoryNames)
      ? mainCategoryNames.map((x: any) => this.norm(x))
      : [];

    return this.allRows.filter(r => {
      const dt = r.entryTime ? new Date(r.entryTime) : null;

      const okDate =
        (!start || (dt && dt >= start)) &&
        (!end || (dt && dt <= end));

      const mainName = this.norm(r.mainCategoryName);
      const okMain = selectedMains.length === 0 ? true : selectedMains.includes(mainName);

      return okDate && okMain;
    });
  }

  /**
   * Builds main chart data: counts per MainCategoryName
   */
  private updateMainChart(rows: ServiceCallDashboardModel[]): void {
    if (!this.mainChart) return;

    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = this.norm(r.mainCategoryName) || 'ללא קטגוריה';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
    const yMax = this.getNiceYAxisMax(values);
    (this.mainChart.options.scales as any).y.suggestedMax = yMax;
    (this.mainChart.options.scales as any).y.max = yMax;   // force
    this.mainChart.update();
    
    const colors = labels.map(l => this.hexToRgba(this.getColorForMain(l), 0.55));

    this.mainChart.data.labels = labels;
    this.mainChart.data.datasets[0].data = values as any;
    (this.mainChart.data.datasets[0] as any).backgroundColor = colors;
    this.mainChart.update();
  }

  /**
   * Builds sub1 chart data: counts per SubCategory1Name,
   * highlights selected SubCategory1 values (if any).
   */
  private updateSub1Chart(rows: ServiceCallDashboardModel[]): void {
    if (!this.sub1Chart) return;

    const selectedSub1: string[] = Array.isArray(this.filterForm.value.subCategory1Names)
      ? this.filterForm.value.subCategory1Names.map((x: any) => this.norm(x))
      : [];

    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = this.norm(r.subCategory1Name) || 'ללא תת-קטגוריה';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
    const yMax = this.getNiceYAxisMax(values);
    (this.sub1Chart.options.scales as any).y.suggestedMax = yMax;
    (this.sub1Chart.options.scales as any).y.max = yMax;   // force
    this.sub1Chart.update();
    
    const colors = labels.map(lbl => {
      if (selectedSub1.length === 0) return this.hexToRgba('#6AA9FF', 0.55);
      return selectedSub1.includes(this.norm(lbl))
        ? this.hexToRgba('#73C7A6', 0.70)
        : this.hexToRgba('#A9B4C2', 0.25);
    });

    this.sub1Chart.data.labels = labels;
    this.sub1Chart.data.datasets[0].data = values as any;
    (this.sub1Chart.data.datasets[0] as any).backgroundColor = colors;
    this.sub1Chart.update();
  }

  /**
   * Destroy chart instances on component destroy
   */
  private destroyCharts(): void {
    if (this.mainChart) { this.mainChart.destroy(); this.mainChart = null; }
    if (this.sub1Chart) { this.sub1Chart.destroy(); this.sub1Chart = null; }
  }

  // =========================
  // Helper functions (strings + lists)
  // =========================
  private getDistinct(values: Array<string | null | undefined>): string[] {
    const set = new Set<string>();
    for (const v of values) {
      const s = this.norm(v);
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private norm(v: any): string {
    return (v ?? '').toString().trim();
  }

  // =========================
  // Color helpers for chips/options
  // =========================
  getColorForMain(mainName: string): string {
    const name = this.norm(mainName);
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return this.palette[hash % this.palette.length];
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /**
   * Used by template for dot color in dropdown options
   */
  public getDotColor(mainName: string): string {
    const base = this.getColorForMain(mainName);
    return this.hexToRgba(base, 0.8);
  }

  /**
   * Used by template for selected chips look (soft pastel)
   */
  getChipStyle(mainName: string) {
    const c = this.getColorForMain(mainName);
    return {
      'background-color': this.hexToRgba(c, 0.18),
      'border': `1px solid ${this.hexToRgba(c, 0.35)}`,
      'color': c
    };
  }

  // =========================
  // Date helpers for today/month gauges
  // =========================
  private isSameDay(d: Date, base: Date): boolean {
    return d.getFullYear() === base.getFullYear() &&
           d.getMonth() === base.getMonth() &&
           d.getDate() === base.getDate();
  }

  private isSameMonth(d: Date, base: Date): boolean {
    return d.getFullYear() === base.getFullYear() &&
           d.getMonth() === base.getMonth();
  }

  /**
   * Make gauge max "nice" and not too small
   */
  private roundGaugeMax(v: number): number {
    if (v <= 10) return 10;
    if (v <= 50) return Math.ceil(v * 1.3 / 10) * 10;
    if (v <= 200) return Math.ceil(v * 1.2 / 25) * 25;
    return Math.ceil(v * 1.15 / 100) * 100;
  }
  private getNiceYAxisMax(values: number[]): number {
    const max = Math.max(0, ...(values || []));
    return max + 1; // exactly +1 as you asked
  }
  
}
