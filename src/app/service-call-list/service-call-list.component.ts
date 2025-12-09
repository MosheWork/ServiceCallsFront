import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

export interface ServiceCallFullModel {
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
  selector: 'app-service-call-list',
  templateUrl: './service-call-list.component.html',
  styleUrls: ['./service-call-list.component.scss']
})
export class ServiceCallListComponent implements OnInit {

  displayedColumns: string[] = [
    'index',
    'entryTime',
    'title',
    'requestUser',
    'callbackPhone',
    'mainCategoryName',
    'subCategory1Name',
    'subCategory2Name',
    'statusName',
    'priorityName',
    'teamInChargeName',
    'userInChargeName'
  ];

  dataSource = new MatTableDataSource<ServiceCallFullModel>([]);
  allCalls: ServiceCallFullModel[] = [];

  isLoading = false;
  errorMessage = '';

  searchText = '';
  selectedStatus = '';
  selectedMainCategory = '';

  distinctStatuses: string[] = [];
  distinctMainCategories: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<ServiceCallFullModel[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Full`)
      .subscribe({
        next: data => {
          this.allCalls = data || [];
          this.buildFilterLists();
          this.applyFilter();    // ימלא את dataSource.data

          this.isLoading = false;
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'אירעה שגיאה בטעינת הקריאות';
          this.isLoading = false;
        }
      });
  }

  buildFilterLists(): void {
    const statusSet = new Set<string>();
    const mainSet = new Set<string>();

    this.allCalls.forEach(c => {
      if (c.statusName) {
        statusSet.add(c.statusName);
      }
      if (c.mainCategoryName) {
        mainSet.add(c.mainCategoryName);
      }
    });

    this.distinctStatuses = Array.from(statusSet).sort();
    this.distinctMainCategories = Array.from(mainSet).sort();
  }

  applyFilter(): void {
    const text = (this.searchText || '').toLowerCase();
    const status = this.selectedStatus || '';
    const mainCat = this.selectedMainCategory || '';

    const filtered = this.allCalls.filter(c => {
      let ok = true;

      if (text) {
        const blob = [
          c.title,
          c.description,
          c.requestUser,
          c.computerName,
          c.location
        ].join(' ').toLowerCase();

        if (!blob.includes(text)) {
          ok = false;
        }
      }

      if (ok && status) {
        if ((c.statusName || '') !== status) {
          ok = false;
        }
      }

      if (ok && mainCat) {
        if ((c.mainCategoryName || '') !== mainCat) {
          ok = false;
        }
      }

      return ok;
    });

    this.dataSource.data = filtered;

    // לוודא פאג’ינייטור וסורט מחוברים
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedStatus = '';
    this.selectedMainCategory = '';
    this.applyFilter();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) {
      return '';
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr;
    }
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
