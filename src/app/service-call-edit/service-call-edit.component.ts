import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ServiceCallModel {
  serviceCallID: number;
  title: string | null;
  description: string | null;
  solutionText: string | null;

  requestUser: string | null;
  callbackPhone: string | null;
  location: string | null;
  computerName: string | null;

  mainCategoryID: number | null;
  subCategory1ID: number | null;
  subCategory2ID: number | null;
  subCategory3ID: number | null;
  statusID: number | null;
  priorityID: number | null;
  userInChargeID: number | null;
  teamInChargeID: number | null;
  serviceRequestTypeID: number | null;

  entryTime?: string | null;

  // Backend Update+Log
  updatedBy?: string | null;
  logLocation?: string | null;
}

export interface ServiceCallChangeLogModel {
  changeTime: string;               // DateTime from server
  changedBy: string | null;
  logAction: string | null;         // UPDATE/...
  fieldName: string | null;         // "כותרת" etc.
  oldValueText: string | null;      // already translated text
  newValueText: string | null;      // already translated text
}

export interface UserInChargeModel {
  userInChargeID: number;
  displayName: string;
  id_No: string | null;
  teamInChargeID: number | null;
}

export interface LookupItem {
  id: number;
  name: string;
}

@Component({
  selector: 'app-service-call-edit',
  templateUrl: './service-call-edit.component.html',
  styleUrls: ['./service-call-edit.component.scss']
})
export class ServiceCallEditComponent implements OnInit {

  form!: FormGroup;

  isLoading = true;
  errorMessage = '';

  loggedUser: string | null = null;
  UserName: string | null = null;
  profilePictureUrl: string | null = null;

  callId!: number;

  // Lookups
  mainCategories: LookupItem[] = [];
  sub1: LookupItem[] = [];
  sub2: LookupItem[] = [];
  statuses: LookupItem[] = [];
  priorities: LookupItem[] = [];
  teams: LookupItem[] = [];

  usersAll: UserInChargeModel[] = [];
  usersFiltered: UserInChargeModel[] = [];

  // Changes (logs)
  changesLoading = false;
  changesError = '';
  changes: ServiceCallChangeLogModel[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.callId = +(this.route.snapshot.paramMap.get('id') || 0);

    // Defaults
    this.loggedUser = 'אורח';
    this.UserName = 'אורח';
    this.profilePictureUrl = 'assets/default-user.png';

    this.buildForm();
    this.loadLookups();
    this.loadServiceCall();
    this.loadChanges(); // ✅ load timeline
  }

  private buildForm(): void {
    this.form = this.fb.group({
      title: [null],
      description: [null],
      solutionText: [null],

      requestUser: [null],
      callbackPhone: [null],
      location: [null],
      computerName: [null],

      mainCategoryID: [null],
      subCategory1ID: [null],
      subCategory2ID: [null],
      subCategory3ID: [null],
      statusID: [null],
      priorityID: [null],
      userInChargeID: [null],
      teamInChargeID: [null],
      serviceRequestTypeID: [null]
    });
  }

  private loadServiceCall(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<ServiceCallModel>(`${environment.apiBaseUrl}/api/ServiceCalls/${this.callId}`)
      .subscribe({
        next: (call) => {
          this.form.patchValue(call);

          if (call.mainCategoryID) {
            this.loadSub1(call.mainCategoryID, () => {
              if (call.subCategory1ID) {
                this.loadSub2(call.subCategory1ID);
              }
            });
          }

          this.applyUsersFilter();
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'שגיאה בטעינת הקריאה';
          this.isLoading = false;
        }
      });
  }

  /* ---------- Lookups ---------- */

  private loadLookups(): void {
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/MainCategories`)
      .subscribe(l => this.mainCategories = l || []);

    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Statuses`)
      .subscribe(l => this.statuses = l || []);

    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/Priorities`)
      .subscribe(l => this.priorities = l || []);

    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/TeamsInCharge`)
      .subscribe(l => this.teams = l || []);

    this.http.get<UserInChargeModel[]>(`${environment.apiBaseUrl}/api/ServiceCalls/UsersInCharge`)
      .subscribe(list => {
        this.usersAll = list || [];
        this.applyUsersFilter();
      });
  }

  onMainCategoryChange(id: number): void {
    this.form.patchValue({
      subCategory1ID: null,
      subCategory2ID: null,
      subCategory3ID: null
    });

    if (id) {
      this.loadSub1(id);
    } else {
      this.sub1 = [];
      this.sub2 = [];
    }
  }

  private loadSub1(mainCategoryId: number, callback?: () => void): void {
    const params = new HttpParams().set('mainCategoryId', mainCategoryId.toString());
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/SubCategory1`, { params })
      .subscribe(list => {
        this.sub1 = list || [];
        if (callback) callback();
      });
  }

  onSubCategory1Change(id: number): void {
    this.form.patchValue({
      subCategory2ID: null,
      subCategory3ID: null
    });

    if (id) {
      this.loadSub2(id);
    } else {
      this.sub2 = [];
    }
  }

  private loadSub2(subCategory1Id: number, callback?: () => void): void {
    const params = new HttpParams().set('subCategory1Id', subCategory1Id.toString());
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/api/ServiceCalls/SubCategory2`, { params })
      .subscribe(list => {
        this.sub2 = list || [];
        if (callback) callback();
      });
  }

  /* ---------- Team/User filtering ---------- */

  private applyUsersFilter(): void {
    const teamId: number | null = this.form?.value?.teamInChargeID ?? null;

    if (!teamId) {
      this.usersFiltered = this.usersAll.slice();
    } else {
      this.usersFiltered = this.usersAll.filter(u => u.teamInChargeID === teamId);
    }
  }

  onTeamInChargeChange(teamId: number | null): void {
    this.form.patchValue({
      teamInChargeID: teamId,
      userInChargeID: null
    });
    this.applyUsersFilter();
  }

  onUserInChargeChange(userId: number | null): void {
    this.form.patchValue({ userInChargeID: userId });

    // Optional: sync team with user
    const u = this.usersAll.find(x => x.userInChargeID === userId);
    if (u && u.teamInChargeID) {
      this.form.patchValue({ teamInChargeID: u.teamInChargeID });
      this.applyUsersFilter();
    }
  }

  /* ---------- Save / Cancel ---------- */

  save(): void {
    if (this.form.invalid) return;

    const body: ServiceCallModel = {
      serviceCallID: this.callId,
      ...this.form.value,
      updatedBy: (this.loggedUser || this.UserName || 'אורח'),
      logLocation: 'WEB'
    };

    this.isLoading = true;
    this.errorMessage = '';

    this.http.put(`${environment.apiBaseUrl}/api/ServiceCalls/${this.callId}`, body)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/service-calls']);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'שגיאה בשמירת הקריאה';
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/service-calls']);
  }

  /* ---------- Changes / Logs ---------- */

  loadChanges(): void {
    this.changesLoading = true;
    this.changesError = '';

    this.http
      .get<ServiceCallChangeLogModel[]>(`${environment.apiBaseUrl}/api/ServiceCalls/${this.callId}/Changes`)
      .subscribe({
        next: (list) => {
          this.changes = list || [];
          this.changesLoading = false;
        },
        error: () => {
          this.changesError = 'שגיאה בטעינת היסטוריית שינויים';
          this.changesLoading = false;
        }
      });
  }
}
