import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication-service/authentication-service.service';

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

  // יש לך גם IdNo אם תרצה בעתיד עמודה נפרדת
  userInChargeIdNo: string | null;

  serviceRequestTypeName: string | null;
}

interface EmployeeInfo {
  userName: string | null;
  profilePicture: string | null;
  idNo: string | null;
}

interface ServiceCallClosedStatsModel {
  id_No: string | null;
  userInChargeID: number | null;
  displayName: string | null;
  closedToday: number;
  closedThisMonth: number;
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
  newCallsCount = 0; 
// 🔹 Date range filter for תאריך פתיחה

UserName: string = 'אורח';
profilePictureUrl: string = 'assets/default-user.png';
loggedUser: string = '';
closedTodayCount: number = 0;
closedMonthCount: number = 0;

// כדי שהגייג' לא יהיה תמיד max=100
closedTodayMax: number = 10;
closedMonthMax: number = 50;
userInfoError = '';

userStatsError = '';
  isLoading = false;
  errorMessage = '';
  entryDateFrom: Date | null = null;
  entryDateTo: Date | null = null;
  // 🔎 חיפוש חופשי
  searchText = '';
  defaultIdNo: string = '039558382';

  // 🔽 מערכי בחירה לכל עמודה (multi-select)
  selectedTitles: string[] = [];
  selectedRequestUsers: string[] = [];
  selectedCallbackPhones: string[] = [];
  selectedMainCategories: string[] = [];
  selectedSubCategory1: string[] = [];
  selectedSubCategory2: string[] = [];
  selectedStatuses: string[] = [];
  selectedPriorities: string[] = [];
  selectedTeams: string[] = [];
  selectedUsersInCharge: string[] = [];

  // 🔽 ערכים אפשריים לכל עמודה (distinct lists)
  distinctTitles: string[] = [];
  distinctRequestUsers: string[] = [];
  distinctCallbackPhones: string[] = [];
  distinctMainCategories: string[] = [];
  distinctSubCategory1: string[] = [];
  distinctSubCategory2: string[] = [];
  distinctStatuses: string[] = [];
  distinctPriorities: string[] = [];
  distinctTeams: string[] = [];
  distinctUsersInCharge: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authenticationService: AuthenticationService
    ) {}
  

    ngOnInit(): void {
      // טוען טבלה
      this.loadData();
    
      // טוען סטטיסטיקה עם ברירת מחדל
      this.loadUserClosedStats(this.defaultIdNo);
      

      // אם ה-auth מצליח בהמשך ומביא idNo אמיתי, אפשר להחליף (כרגע נשאיר דיפולט)
      this.authenticationService.getAuthentication().subscribe(
        (response) => {
          const raw = response?.message || '';
          const user = raw.includes('\\') ? raw.split('\\')[1] : raw;
    
          this.loggedUser = (user || '').toUpperCase();
          this.getUserDetailsFromDBByUserName(this.loggedUser);
        },
        (error) => {
          console.error('❌ Authentication Failed:', error);
        }
      );
      this.loadLoggedUser(); 
    }
    
    loadLoggedUser(): void {
      this.userInfoError = '';
      this.loggedUser = '';
      this.UserName = 'אורח';
      this.profilePictureUrl = 'assets/default-user.png';
    
      this.authenticationService.getAuthentication().subscribe({
        next: (response) => {
          const raw = (response?.message || '');
          const user = raw.includes('\\') ? raw.split('\\')[1] : raw;
    
          this.loggedUser = (user || '').toUpperCase();
    
          if (this.loggedUser) {
            this.getUserDetailsFromDBByUserName(this.loggedUser);
          } else {
            // fallback: להשאיר "אורח"
            this.UserName = 'אורח';
          }
        },
        error: (err) => {
          console.error('❌ Authentication Failed:', err);
          this.userInfoError = 'לא ניתן לזהות משתמש מחובר';
        }
      });
    }
    getUserDetailsFromDBByUserName(username: string): void {
      this.http.get<EmployeeInfo>(`${environment.apiBaseUrl}/api/ServiceCRM/GetEmployeeInfo`, {
        params: { username: username.toUpperCase() }
      }).subscribe({
        next: (data) => {
          this.UserName = data?.userName || username || 'אורח';
          this.profilePictureUrl = data?.profilePicture || 'assets/default-user.png';
    
          const idNo = (data?.idNo || '').trim();
          if (idNo) {
            this.loadUserClosedStats(idNo);
          } else {
            this.userStatsError = 'לא נמצא ID למשתמש (idNo)';
          }
        },
        error: (error) => {
          console.error('Error fetching employee info:', error);
          this.UserName = username || 'אורח';
          this.profilePictureUrl = 'assets/default-user.png';
          this.userStatsError = 'לא ניתן לטעון פרטי משתמש';
        }
      });
    }
    
    
  
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
  
    this.http.get<ServiceCallFullModel[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Full`)
      .subscribe({
        next: data => {
          this.allCalls = data || [];
  
          // 🔹 ספירת קריאות חדשות (סטטוס = "חדש")
          this.newCallsCount = this.allCalls.filter(c => c.statusName === 'חדש').length;
  
          this.buildFilterLists();
          this.applyFilter();
          this.isLoading = false;
        },
        error: err => {
          console.error(err);
          this.errorMessage = 'אירעה שגיאה בטעינת הקריאות';
          this.isLoading = false;
        }
      });
  }
  

  /** בונה רשימות distinct לכל עמודה */
  buildFilterLists(): void {
    const titleSet = new Set<string>();
    const requestUserSet = new Set<string>();
    const callbackPhoneSet = new Set<string>();
    const mainCatSet = new Set<string>();
    const subCat1Set = new Set<string>();
    const subCat2Set = new Set<string>();
    const statusSet = new Set<string>();
    const prioritySet = new Set<string>();
    const teamSet = new Set<string>();
    const userInChargeSet = new Set<string>();

    this.allCalls.forEach(c => {
      if (c.title)                { titleSet.add(c.title); }
      if (c.requestUser)          { requestUserSet.add(c.requestUser); }
      if (c.callbackPhone)        { callbackPhoneSet.add(c.callbackPhone); }
      if (c.mainCategoryName)     { mainCatSet.add(c.mainCategoryName); }
      if (c.subCategory1Name)     { subCat1Set.add(c.subCategory1Name); }
      if (c.subCategory2Name)     { subCat2Set.add(c.subCategory2Name); }
      if (c.statusName)           { statusSet.add(c.statusName); }
      if (c.priorityName)         { prioritySet.add(c.priorityName); }
      if (c.teamInChargeName)     { teamSet.add(c.teamInChargeName); }
      if (c.userInChargeName)     { userInChargeSet.add(c.userInChargeName); }
    });

    this.distinctTitles          = Array.from(titleSet).sort();
    this.distinctRequestUsers    = Array.from(requestUserSet).sort();
    this.distinctCallbackPhones  = Array.from(callbackPhoneSet).sort();
    this.distinctMainCategories  = Array.from(mainCatSet).sort();
    this.distinctSubCategory1    = Array.from(subCat1Set).sort();
    this.distinctSubCategory2    = Array.from(subCat2Set).sort();
    this.distinctStatuses        = Array.from(statusSet).sort();
    this.distinctPriorities      = Array.from(prioritySet).sort();
    this.distinctTeams           = Array.from(teamSet).sort();
    this.distinctUsersInCharge   = Array.from(userInChargeSet).sort();
  }

 /** מיישם את כל הפילטרים ביחד */
  /** מיישם את כל הפילטרים (חיפוש, עמודות, תאריכים) */
  applyFilter(): void {
    const text = (this.searchText || '').toLowerCase();
  
    const filtered = this.allCalls.filter(c => {
      // --- חיפוש חופשי ---
      if (text) {
        const blob = [
          c.title,
          c.description,
          c.requestUser,
          c.computerName,
          c.location,
          c.callbackPhone
        ]
          .join(' ')
          .toLowerCase();
  
        if (!blob.includes(text)) {
          return false;
        }
      }
  
      // --- פילטרים לפי ערכי עמודות (multi select) ---
      if (!this.fieldMatches(c.title,            this.selectedTitles))         return false;
      if (!this.fieldMatches(c.requestUser,      this.selectedRequestUsers))   return false;
      if (!this.fieldMatches(c.callbackPhone,    this.selectedCallbackPhones)) return false;
      if (!this.fieldMatches(c.mainCategoryName, this.selectedMainCategories)) return false;
      if (!this.fieldMatches(c.subCategory1Name, this.selectedSubCategory1))   return false;
      if (!this.fieldMatches(c.subCategory2Name, this.selectedSubCategory2))   return false;
      if (!this.fieldMatches(c.statusName,       this.selectedStatuses))       return false;
      if (!this.fieldMatches(c.priorityName,     this.selectedPriorities))     return false;
      if (!this.fieldMatches(c.teamInChargeName, this.selectedTeams))          return false;
      if (!this.fieldMatches(c.userInChargeName, this.selectedUsersInCharge))  return false;
  
      // --- פילטר טווח תאריכים על entryTime ---
      if (this.entryDateFrom || this.entryDateTo) {
        if (!c.entryTime) {
          return false;
        }
  
        const d = new Date(c.entryTime);
        if (isNaN(d.getTime())) {
          return false;
        }
  
        // תאריך בלבד (בלילה 00:00)
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
        if (this.entryDateFrom) {
          const start = new Date(
            this.entryDateFrom.getFullYear(),
            this.entryDateFrom.getMonth(),
            this.entryDateFrom.getDate()
          );
          if (day < start) {
            return false;
          }
        }
  
        if (this.entryDateTo) {
          const end = new Date(
            this.entryDateTo.getFullYear(),
            this.entryDateTo.getMonth(),
            this.entryDateTo.getDate()
          );
          if (day > end) {
            return false;
          }
        }
      }
  
      return true;
    });
  
    // מעדכן טבלה
    this.dataSource.data = filtered;
  
    // מעדכן "קריאות חדשות" לפי הרשימה המסוננת
    this.newCallsCount = filtered.filter(c => c.statusName === 'חדש').length;
  
    // פאג'ינייטור וסורט
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }
  

  
  /** איפוס כל הפילטרים */
  clearFilters(): void {
    this.searchText = '';
  
    this.selectedTitles = [];
    this.selectedRequestUsers = [];
    this.selectedCallbackPhones = [];
    this.selectedMainCategories = [];
    this.selectedSubCategory1 = [];
    this.selectedSubCategory2 = [];
    this.selectedStatuses = [];
    this.selectedPriorities = [];
    this.selectedTeams = [];
    this.selectedUsersInCharge = [];
  
    // 🔹 reset date range
    this.entryDateFrom = null;
    this.entryDateTo = null;
  
    this.applyFilter();
  }
  
  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  openDetails(row: ServiceCallFullModel) {
    this.router.navigate(['/service-calls', row.serviceCallID]);
  }

  // ======== handlers לכל עמודה – checkbox change + בחר הכל + אפס סנן ========

  private toggleInArray(checked: boolean, value: string, arr: string[]): string[] {
    if (checked) {
      return arr.includes(value) ? arr : [...arr, value];
    } else {
      return arr.filter(v => v !== value);
    }
  }

  // כותרת
  onTitleCheckboxChange(checked: boolean, value: string): void {
    this.selectedTitles = this.toggleInArray(checked, value, this.selectedTitles);
    this.applyFilter();
  }
  selectAllTitles(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedTitles = [...this.distinctTitles];
    this.applyFilter();
  }
  clearTitleFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedTitles = [];
    this.applyFilter();
  }

  // משתמש פותח
  onRequestUserCheckboxChange(checked: boolean, value: string): void {
    this.selectedRequestUsers = this.toggleInArray(checked, value, this.selectedRequestUsers);
    this.applyFilter();
  }
  selectAllRequestUsers(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedRequestUsers = [...this.distinctRequestUsers];
    this.applyFilter();
  }
  clearRequestUserFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedRequestUsers = [];
    this.applyFilter();
  }

  // טלפון
  onCallbackPhoneCheckboxChange(checked: boolean, value: string): void {
    this.selectedCallbackPhones = this.toggleInArray(checked, value, this.selectedCallbackPhones);
    this.applyFilter();
  }
  selectAllCallbackPhones(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedCallbackPhones = [...this.distinctCallbackPhones];
    this.applyFilter();
  }
  clearCallbackPhoneFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedCallbackPhones = [];
    this.applyFilter();
  }

  // קטגוריה ראשית
  onMainCategoryCheckboxChange(checked: boolean, value: string): void {
    this.selectedMainCategories = this.toggleInArray(checked, value, this.selectedMainCategories);
    this.applyFilter();
  }
  selectAllMainCategories(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedMainCategories = [...this.distinctMainCategories];
    this.applyFilter();
  }
  clearMainCategoryFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedMainCategories = [];
    this.applyFilter();
  }

  // תת־קטגוריה 1
  onSubCategory1CheckboxChange(checked: boolean, value: string): void {
    this.selectedSubCategory1 = this.toggleInArray(checked, value, this.selectedSubCategory1);
    this.applyFilter();
  }
  selectAllSubCategory1(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedSubCategory1 = [...this.distinctSubCategory1];
    this.applyFilter();
  }
  clearSubCategory1Filter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedSubCategory1 = [];
    this.applyFilter();
  }

  // תת־קטגוריה 2
  onSubCategory2CheckboxChange(checked: boolean, value: string): void {
    this.selectedSubCategory2 = this.toggleInArray(checked, value, this.selectedSubCategory2);
    this.applyFilter();
  }
  selectAllSubCategory2(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedSubCategory2 = [...this.distinctSubCategory2];
    this.applyFilter();
  }
  clearSubCategory2Filter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedSubCategory2 = [];
    this.applyFilter();
  }

  // סטטוס
  onStatusCheckboxChange(checked: boolean, value: string): void {
    this.selectedStatuses = this.toggleInArray(checked, value, this.selectedStatuses);
    this.applyFilter();
  }
  selectAllStatuses(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedStatuses = [...this.distinctStatuses];
    this.applyFilter();
  }
  clearStatusFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedStatuses = [];
    this.applyFilter();
  }

  // עדיפות
  onPriorityCheckboxChange(checked: boolean, value: string): void {
    this.selectedPriorities = this.toggleInArray(checked, value, this.selectedPriorities);
    this.applyFilter();
  }
  selectAllPriorities(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedPriorities = [...this.distinctPriorities];
    this.applyFilter();
  }
  clearPriorityFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedPriorities = [];
    this.applyFilter();
  }

  // צוות מטפל
  onTeamCheckboxChange(checked: boolean, value: string): void {
    this.selectedTeams = this.toggleInArray(checked, value, this.selectedTeams);
    this.applyFilter();
  }
  selectAllTeams(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedTeams = [...this.distinctTeams];
    this.applyFilter();
  }
  clearTeamFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedTeams = [];
    this.applyFilter();
  }

  // משתמש מטפל
  onUserInChargeCheckboxChange(checked: boolean, value: string): void {
    this.selectedUsersInCharge = this.toggleInArray(checked, value, this.selectedUsersInCharge);
    this.applyFilter();
  }
  selectAllUsersInCharge(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedUsersInCharge = [...this.distinctUsersInCharge];
    this.applyFilter();
  }
  clearUserInChargeFilter(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedUsersInCharge = [];
    this.applyFilter();
  }



  onEntryDateRangeChange(): void {
    this.applyFilter();
  }

  clearEntryDateRange(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.entryDateFrom = null;
    this.entryDateTo = null;
    this.applyFilter();
  }
    /** מחזיר true אם הערך עובר פילטר־ריבוי בחירה */
    private fieldMatches(value: string | null, selected: string[]): boolean {
      if (!selected.length) {
        // אין פילטר – הכול עובר
        return true;
      }
      const v = value || '';
      return selected.includes(v);
    }
    private loadUserClosedStats(idNo: string): void {
      this.userStatsError = '';
    
      const url = `${environment.apiBaseUrl}/api/ServiceCalls/ClosedStatsByIdNo`;
      this.http.get<ServiceCallClosedStatsModel>(url, { params: { idNo } })
        .subscribe({
          next: (res) => {
            this.closedTodayCount = res?.closedToday ?? 0;
            this.closedMonthCount = res?.closedThisMonth ?? 0;
    
            // כדי שהגייג' לא ייתקע על מקס קטן/גדול מדי
            this.closedTodayMax = Math.max(5, this.closedTodayCount);
            this.closedMonthMax = Math.max(10, this.closedMonthCount);
          },
          error: (err) => {
            console.error('ClosedStatsByIdNo failed', err);
            this.closedTodayCount = 0;
            this.closedMonthCount = 0;
            this.userStatsError = 'לא ניתן לטעון סטטיסטיקה אישית';
          }
        });
    }

    
}
