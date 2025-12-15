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
  subCategory1Options: string[] = [];

  private mainChart: Chart | null = null;
  private sub1Chart: Chart | null = null;

  private sub?: Subscription;

  @ViewChild('mainBarCanvas') mainBarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sub1BarCanvas') sub1BarCanvas!: ElementRef<HTMLCanvasElement>;

  // palette for chips + bars (repeatable, stable)
  private palette: string[] = [
    '#6AA9FF', '#73C7A6', '#FFC27A', '#C6A5FF', '#FF9DB5',
    '#7BC7D6', '#B9C27A', '#A9B4C2', '#FFB3A1', '#8BA0FF'
  ];
  private norm(v: any): string {
    return (v ?? '').toString().trim();
  }
  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  
 
  
  // nice chip style (soft bg + colored text)
  getChipStyle(mainName: string) {
    const c = this.getColorForMain(mainName);
    return {
      'background-color': this.hexToRgba(c, 0.18),
      'border': `1px solid ${this.hexToRgba(c, 0.35)}`,
      'color': c
    };
  }
  
  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      startDate: [null],
      endDate: [null],
      mainCategoryNames: [[]],     // ✅ multi
      subCategory1Names: [[]]      // ✅ multi
    });
  }

  ngOnInit(): void {
    this.loadData();

    this.sub = this.filterForm.valueChanges.subscribe(() => {
      this.applyFiltersAndOptions();
      this.updateCharts();
    });
  }

  ngAfterViewInit(): void {
    this.initCharts();     // canvases exist
    this.updateCharts();   // safe even if no data yet
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.destroyCharts();
  }

  private loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const url = `${environment.apiBaseUrl}/api/ServiceCallsDashboard`;


    this.http.get<ServiceCallDashboardModel[]>(url).subscribe({
      next: (rows) => {
        this.allRows = rows || [];

        this.mainCategories = this.getDistinct(this.allRows.map(x => x.mainCategoryName));
        // default date last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);

        this.filterForm.patchValue(
          { startDate: start, endDate: end, mainCategoryNames: [], subCategory1Names: [] },
          { emitEvent: false }
        );

        this.applyFiltersAndOptions();
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
  // Filters + options
  // =========================

  private applyFiltersAndOptions(): void {
    const { startDate, endDate, mainCategoryNames, subCategory1Names } = this.filterForm.value;

    const start: Date | null = startDate ? new Date(startDate) : null;
    const end: Date | null = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const selectedMains: string[] = Array.isArray(mainCategoryNames) ? mainCategoryNames : [];
    const selectedSub1: string[] = Array.isArray(subCategory1Names) ? subCategory1Names : [];

    // first filter by date + main ONLY (this drives charts + subcategory options)
    const rowsDateMain = this.allRows.filter(r => {
      const dt = r.entryTime ? new Date(r.entryTime) : null;

      const okDate =
        (!start || (dt && dt >= start)) &&
        (!end || (dt && dt <= end));

      const mainName = (r.mainCategoryName || '').trim();
      const okMain = selectedMains.length === 0 ? true : selectedMains.includes(mainName);

      return okDate && okMain;
    });

    // update SubCategory1 options based on selected mains + date
    this.subCategory1Options = this.getDistinct(rowsDateMain.map(x => x.subCategory1Name));

    // keep selected sub1 that still exists
    const validSub1 = selectedSub1.filter(x => this.subCategory1Options.includes(x));
    if (validSub1.length !== selectedSub1.length) {
      this.filterForm.patchValue({ subCategory1Names: validSub1 }, { emitEvent: false });
    }

    // final filtered rows for table (apply sub1 filter too)
    this.filteredRows = rowsDateMain.filter(r => {
      const s1 = (r.subCategory1Name || '').trim();
      return validSub1.length === 0 ? true : validSub1.includes(s1);
    });
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      startDate: null,
      endDate: null,
      mainCategoryNames: [],
      subCategory1Names: []
    });
  }

  // =========================
  // Charts
  // =========================

  private initCharts(): void {
    // MAIN chart
    if (this.mainBarCanvas?.nativeElement) {
      const cfg: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'כמות קריאות לפי קטגוריה ראשית', data: [], backgroundColor: [] as any }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { autoSkip: false } }
          }
        }
      };
      this.mainChart = new Chart(this.mainBarCanvas.nativeElement, cfg);
    }

    // SUB1 chart
    if (this.sub1BarCanvas?.nativeElement) {
      const cfg: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'כמות קריאות לפי תת-קטגוריה 1', data: [], backgroundColor: [] as any }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { autoSkip: false } }
          }
        }
      };
      this.sub1Chart = new Chart(this.sub1BarCanvas.nativeElement, cfg);
    }
  }

  private updateCharts(): void {
    // MAIN chart should respect SubCategory1 filter -> use filteredRows
    this.updateMainChart(this.filteredRows);
  
    // Sub1 chart shows ALL under selected mains, but highlights selected Sub1
    const rowsDateMain = this.getRowsByDateAndMainOnly();
    this.updateSub1Chart(rowsDateMain);
  }
  

  private getRowsByDateAndMainOnly(): ServiceCallDashboardModel[] {
    const { startDate, endDate, mainCategoryNames } = this.filterForm.value;

    const start: Date | null = startDate ? new Date(startDate) : null;
    const end: Date | null = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const selectedMains: string[] = Array.isArray(mainCategoryNames) ? mainCategoryNames : [];

    return this.allRows.filter(r => {
      const dt = r.entryTime ? new Date(r.entryTime) : null;

      const okDate =
        (!start || (dt && dt >= start)) &&
        (!end || (dt && dt <= end));

      const mainName = (r.mainCategoryName || '').trim();
      const okMain = selectedMains.length === 0 ? true : selectedMains.includes(mainName);

      return okDate && okMain;
    });
  }

  private updateMainChart(rows: ServiceCallDashboardModel[]): void {
    if (!this.mainChart) return;
  
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = this.norm(r.mainCategoryName) || 'ללא קטגוריה';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
  
    const colors = labels.map(l => this.hexToRgba(this.getColorForMain(l), 0.55));
  
    this.mainChart.data.labels = labels;
    this.mainChart.data.datasets[0].data = values as any;
    (this.mainChart.data.datasets[0] as any).backgroundColor = colors;
    this.mainChart.update();
  }
  
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
  
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const labels = sorted.map(x => x[0]);
    const values = sorted.map(x => x[1]);
  
    // show all, but if user selected Sub1 -> highlight selected and fade others
    const colors = labels.map(lbl => {
      if (selectedSub1.length === 0) return this.hexToRgba('#6AA9FF', 0.55);         // normal pastel
      return selectedSub1.includes(this.norm(lbl))
        ? this.hexToRgba('#73C7A6', 0.70)                                            // highlight
        : this.hexToRgba('#A9B4C2', 0.25);                                           // faded
    });
  
    this.sub1Chart.data.labels = labels;
    this.sub1Chart.data.datasets[0].data = values as any;
    (this.sub1Chart.data.datasets[0] as any).backgroundColor = colors;
    this.sub1Chart.update();
  }
  

  private destroyCharts(): void {
    if (this.mainChart) { this.mainChart.destroy(); this.mainChart = null; }
    if (this.sub1Chart) { this.sub1Chart.destroy(); this.sub1Chart = null; }
  }

  // =========================
  // Helpers + UI colors
  // =========================

  private getDistinct(values: Array<string | null | undefined>): string[] {
    const set = new Set<string>();
    for (const v of values) {
      const s = (v || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  getColorForMain(mainName: string): string {
    const name = this.norm(mainName);
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return this.palette[hash % this.palette.length];
  }
  public getDotColor(mainName: string): string {
    const base = this.getColorForMain(mainName);
    return this.hexToRgba(base, 0.8); // you can keep hexToRgba private
  }
}
