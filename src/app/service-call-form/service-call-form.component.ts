import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthenticationService } from '../services/authentication-service/authentication-service.service'; 


interface LookupItem {
  id: number;
  name: string;
  usageCount?: number; // NEW

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

// ✅ AlertMSG model (same as admin page)
export interface AlertMSGModel {
  alertId: number;
  componentKey: string;
  messageText: string;
  isEnabled: boolean;

  createdAt: string;     // ISO string from API

  priority: number;      // NEW
  color?: string | null; // NEW (e.g. '#ef4444')

  startAt?: string | null; // NEW
  stopAt?: string | null;  // NEW


}
interface UsersModel {
  employeeID: number;
  jobTitleDescription: string | null;
  name: string | null;
  adUserName: string | null;
  email: string | null;
  cellNumber: string | null;
  profilePicture: string | null;
  departnentDescripton: string | null;
}



@Component({
  selector: 'app-service-call-form',
  templateUrl: './service-call-form.component.html',
  styleUrls: ['./service-call-form.component.scss']
})
export class ServiceCallFormComponent implements OnInit {

  UserName: string = 'אורח';
  profilePictureUrl: string = 'assets/default-user.png';
  loggedUser: string = '';
  userIdNo: string = '';
  userStatsError = '';
defaultIdNo: string = '039558382';
defaultAdUserName = 'MMAMAN';


jobTitle: string = '';
department: string = '';
userInfoError = '';
cellNumber: string = '';

  alerts: AlertMSGModel[] = [];
  alertsLoading = false;
  alertsError = '';
  usersList: UsersModel[] = [];
  requestUserSearch = '';
  isLoadingAlerts = false;

// choose the key you will use in DB for this page:
private readonly alertComponentKey = 'ServiceCallFormComponent';
  form!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  mainCategories: LookupItem[] = [];
  subCategory1List: LookupItem[] = [];
  subCategory2List: LookupItem[] = [];
  statuses: LookupItem[] = [];
  priorities: LookupItem[] = [];

  // 🔍 חיפוש בדרופדאונים
  mainCategorySearch = '';
  subCategory1Search = '';
  subCategory2Search = '';

  // 🔍 רשימות מסוננות לפי החיפוש
  filteredMainCategories(): LookupItem[] {
    const term = (this.mainCategorySearch || '').toLowerCase().trim();
  
    let list = this.mainCategories || [];
    if (term) {
      list = list.filter(mc => (mc.name || '').toLowerCase().includes(term));
    }
  
    const sorted = [...list];
    sorted.sort((a, b) => {
      const aIsOther = (a.name || '').trim() === 'אחר';
      const bIsOther = (b.name || '').trim() === 'אחר';
      if (aIsOther && !bIsOther) return -1;
      if (!aIsOther && bIsOther) return 1;
  
      const au = a.usageCount ?? 0;
      const bu = b.usageCount ?? 0;
      if (bu !== au) return bu - au;
  
      return (a.name || '').localeCompare(b.name || '', 'he');
    });
  
    return sorted;
  }
  
  
  filteredSubCategory1(): LookupItem[] {
    const term = (this.subCategory1Search || '').toLowerCase().trim();
    if (!term) return this.subCategory1List;
    return this.subCategory1List.filter(sc =>
      (sc.name || '').toLowerCase().includes(term)
    );
  }
  
  filteredSubCategory2(): LookupItem[] {
    const term = (this.subCategory2Search || '').toLowerCase().trim();
    if (!term) return this.subCategory2List;
    return this.subCategory2List.filter(sc =>
      (sc.name || '').toLowerCase().includes(term)
    );
  }
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authenticationService: AuthenticationService
  ) {}
  

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      requestUser: ['', Validators.required],
      callbackPhone: ['', Validators.required],
      location: [''],
      computerName: [''],

      mainCategoryID: [null, Validators.required],
      subCategory1ID: [null],
      subCategory2ID: [null],

      statusID: [null],
      priorityID: [null],
      userInChargeID: [null],
      teamInChargeID: [null],
      serviceRequestTypeID: [null]
    });

    this.loadLookups();
    this.loadAlerts(this.alertComponentKey); // 'ServiceCallForm'
    this.loadLoggedUser();               // ✅ יביא משתמש מחובר + idNo + סטטיסטיקה
  // ✅ TEST: ברירת מחדל MMAMAN מתוך /api/Users
  this.loadUserCardFromUsers('MMAMAN');
  
//לשנות באמיתי לזה 
  //this.loadUserCardFromUsers(this.defaultAdUserName);

  this.loadUsers();


  }
  loadLoggedUser(): void {
    this.loggedUser = '';
    this.UserName = 'אורח';
    this.profilePictureUrl = 'assets/default-user.png';
  
    this.authenticationService.getAuthentication().subscribe({
      next: (response) => {
        const full = (response?.message || '');
        const user = full.includes('\\') ? full.split('\\')[1] : full;
  
        this.loggedUser = (user || '').toUpperCase();
        this.trySetDefaultRequestUser();

        this.UserName = this.loggedUser || 'אורח';
  
        if (this.loggedUser) {
          this.getUserDetailsFromDBByUserName(this.loggedUser);
        }
      },
      error: (err) => {
        console.error('Authentication failed', err);
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
  
        // ✅ למלא אוטומטית "משתמש פותח"
        this.form.patchValue({ requestUser: this.UserName });
  
        const idNo = (data?.idNo || '').trim();
        this.userIdNo = idNo;
  
       
      },
      error: (error) => {
        console.error('Error fetching employee info:', error);
        this.UserName = username || 'אורח';
        this.profilePictureUrl = 'assets/default-user.png';
        this.userStatsError = 'לא ניתן לטעון פרטי משתמש';
  
        // fallback: למלא requestUser ב־AD
        this.form.patchValue({ requestUser: this.UserName });
      }
    });
  }
  loadLookups(): void {
    // Main categories
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/MainCategories`)
      .subscribe(res => {
        this.mainCategories = res || [];
  
        // 🔹 ברירת מחדל: קטגוריה "אחר" בלבד (אם קיימת)
        const defaultMain = this.mainCategories.find(
          x => (x.name || '').trim() === 'אחר'
        );
  
        if (defaultMain) {
          this.form.patchValue({ mainCategoryID: defaultMain.id });
          this.onMainCategoryChange(); // לטעון תת־קטגוריה 1
        } else {
          // אם אין "אחר" – לא בוחרים כלום
          this.form.patchValue({ mainCategoryID: null });
        }
      });
  
    // Statuses
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Statuses`)
      .subscribe(res => {
        this.statuses = res || [];
        const def = this.statuses.find(x => x.name === 'חדש');
        if (def) {
          this.form.patchValue({ statusID: def.id });
        }
      });
  
    // Priorities
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Priorities`)
      .subscribe(res => {
        this.priorities = res || [];
        const def = this.priorities.find(x => x.name === 'רגיל');
        if (def) {
          this.form.patchValue({ priorityID: def.id });
        }
      });
  }
  
  onMainCategoryChange(): void {
    const mainId = this.form.value.mainCategoryID;
    this.subCategory1List = [];
    this.subCategory2List = [];
    this.subCategory1Search = '';
    this.subCategory2Search = '';
    this.form.patchValue({ subCategory1ID: null, subCategory2ID: null });

    if (!mainId) {
      return;
    }

    const params = new HttpParams().set('mainCategoryId', mainId);
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/SubCategory1`, { params })
      .subscribe(res => {
        this.subCategory1List = res || [];
      });
  }

  onSubCategory1Change(): void {
    const sub1Id = this.form.value.subCategory1ID;
    this.subCategory2List = [];
    this.subCategory2Search = '';
    this.form.patchValue({ subCategory2ID: null });

    if (!sub1Id) {
      return;
    }

    const params = new HttpParams().set('subCategory1Id', sub1Id);
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/SubCategory2`, { params })
      .subscribe(res => {
        this.subCategory2List = res || [];
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = this.form.value;

    this.http.post(`${environment.apiBaseUrl}/api/ServiceCalls`, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successMessage = 'הקריאה נפתחה בהצלחה';
          this.errorMessage = '';

          this.form.reset();
          // אם תרצה – אפשר שוב להפעיל loadLookups() או להחזיר דיפולטים ידנית
          this.loadLookups();
        },
        error: err => {
          console.error(err);
          this.isSubmitting = false;
          this.errorMessage = 'אירעה שגיאה בשמירת הקריאה';
          this.successMessage = '';
        }
      });
  }

  loadAlerts(componentKey: string): void {
    this.alertsLoading = true;
    this.alertsError = '';
    this.alerts = [];
  
    const url = `${environment.apiBaseUrl}/api/AlertMSG`;
    const params = new HttpParams().set('componentKey', componentKey);
  
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
  
        const list = normalized
          .filter(a => this.shouldShowAlert(a))
          .sort((a, b) => {
            const pa = a.priority ?? 0;
            const pb = b.priority ?? 0;
            if (pb !== pa) return pb - pa;
            return (this.toTime(b.createdAt) ?? 0) - (this.toTime(a.createdAt) ?? 0);
          });
  
        this.alerts = list;
        this.alertsLoading = false;
      },
      error: (e) => {
        console.error(e);
        this.alertsError = 'שגיאה בטעינת הודעות';
        this.alertsLoading = false;
      }
    });
  }
  

private now(): number {
  return Date.now();
}
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
  // fallback colors if Color is null
  switch (p) {
    case 5: return '#b91c1c'; // red
    case 4: return '#ea580c'; // orange
    case 3: return '#ca8a04'; // amber
    case 2: return '#2563eb'; // blue
    case 1: return '#16a34a'; // green
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

private normalizeAd(v: string | null | undefined): string {
  if (!v) return '';
  let s = (v + '').trim();
  if (s.includes('\\')) s = s.split('\\').pop() || s; // TZMC\MMAMAN -> MMAMAN
  return s.toUpperCase();
}

loadUserCardFromUsers(adUserName: string): void {
  this.userInfoError = '';

  this.http.get<UsersModel[]>(`${environment.apiBaseUrl}/api/Users`).subscribe({
    next: (list) => {
      const target = this.normalizeAd(adUserName);

      const user = (list || []).find(u => this.normalizeAd(u.adUserName) === target);

      if (!user) {
        this.UserName = adUserName || 'אורח';
        this.profilePictureUrl = 'assets/default-user.png';
        this.jobTitle = '';
        this.department = '';
        this.cellNumber = '';
        this.userInfoError = 'לא נמצא משתמש ב־/api/Users';
        return;
      }

      this.UserName = user.name || adUserName || 'אורח';
      this.jobTitle = user.jobTitleDescription || '';
      this.department = user.departnentDescripton || '';
      this.cellNumber = user.cellNumber || '';
      this.profilePictureUrl = this.normalizeProfilePicture(user.profilePicture);

      this.form.patchValue({ requestUser: this.UserName });
    },
    error: (err) => {
      console.error(err);
      this.userInfoError = 'שגיאה בטעינת משתמשים';
    }
  });
}

private normalizeProfilePicture(pic: string | null): string {
  if (!pic) return 'assets/default-user.png';

  const p = pic.trim();

  // אם זה כבר URL
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('/')) return p;

  // אם זה Base64 (בלי prefix)
  if (/^[A-Za-z0-9+/=]+$/.test(p) && p.length > 100) {
    return `data:image/jpeg;base64,${p}`;
  }

  // fallback
  return 'assets/default-user.png';
}
loadUsers(): void {
  this.http.get<UsersModel[]>(`${environment.apiBaseUrl}/api/Users`)
    .subscribe({
      next: (list) => {
        this.usersList = (list || []).map(u => ({
          ...u,
          displayText: this.buildUserDisplayText(u)
        })) as any;

        this.trySetDefaultRequestUser();
      },
      error: (err) => {
        console.error('loadUsers failed', err);
        this.usersList = [];
      }
    });
}
private buildUserDisplayText(u: UsersModel): string {
  const jt = (u.jobTitleDescription || '').trim();
  const nm = (u.name || '').trim();
  const t = `${jt} ${nm}`.trim();
  return t || (u.adUserName || '').trim() || '—';
}
filteredUsers(): any[] {
  const term = (this.requestUserSearch || '').toLowerCase().trim();
  let list: any[] = this.usersList || [];

  if (term) {
    list = list.filter(u => {
      const blob = [
        u.displayText,
        u.name,
        u.jobTitleDescription,
        u.departnentDescripton,
        u.adUserName,
        u.email
      ].join(' ').toLowerCase();

      return blob.includes(term);
    });
  }

  return [...list].sort((a, b) => (a.displayText || '').localeCompare(b.displayText || '', 'he'));
}


private trySetDefaultRequestUser(): void {
  const current = (this.form?.value?.requestUser || '').trim();
  if (current) return;

  const targetAd = (this.loggedUser || this.defaultAdUserName || '').trim().toUpperCase();
  if (!targetAd) return;

  const u: any = (this.usersList || []).find(x => (x.adUserName || '').trim().toUpperCase() === targetAd);
  if (u?.displayText) {
    this.form.patchValue({ requestUser: u.displayText });
  }
}


}
