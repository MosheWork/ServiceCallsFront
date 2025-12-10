import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ServiceCallModel {
  serviceCallID: number;
  title: string | null;
  description: string | null;
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

  callId!: number;

  // lookups
  mainCategories: LookupItem[] = [];
  sub1: LookupItem[] = [];
  sub2: LookupItem[] = [];
  statuses: LookupItem[] = [];
  priorities: LookupItem[] = [];
  // you can add: usersInCharge, teams, requestTypes...

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.callId = +this.route.snapshot.paramMap.get('id')!;

    this.buildForm();
    this.loadLookups();

    this.http.get<ServiceCallModel>(`${environment.apiBaseUrl}/ServiceCalls/${this.callId}`)
      .subscribe({
        next: call => {
          this.form.patchValue(call);

          // load sub categories based on mainCategory if needed
          if (call.mainCategoryID) {
            this.loadSub1(call.mainCategoryID, () => {
              if (call.subCategory1ID) {
                // ⭐ עכשיו יש לנו loadSub2 אמיתי
                this.loadSub2(call.subCategory1ID);
              }
            });
          }

          this.isLoading = false;
        },
        error: err => {
          this.errorMessage = 'שגיאה בטעינת הקריאה';
          this.isLoading = false;
        }
      });
  }

  private buildForm() {
    this.form = this.fb.group({
      title: [null],
      description: [null],
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

  /* ---------- lookups ---------- */

  private loadLookups() {
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/ServiceCalls/MainCategories`)
      .subscribe(l => this.mainCategories = l);

    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/ServiceCalls/Statuses`)
      .subscribe(l => this.statuses = l);

    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/ServiceCalls/Priorities`)
      .subscribe(l => this.priorities = l);

    // TODO: add GETs for users/teams/request types if you create endpoints
  }

  onMainCategoryChange(id: number) {
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

  private loadSub1(mainCategoryId: number, callback?: () => void) {
    const params = new HttpParams().set('mainCategoryId', mainCategoryId.toString());
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/ServiceCalls/SubCategory1`, { params })
      .subscribe(list => {
        this.sub1 = list;
        if (callback) callback();
      });
  }

  onSubCategory1Change(id: number) {
    this.form.patchValue({
      subCategory2ID: null,
      subCategory3ID: null
    });

    if (id) {
      // ⭐ שימוש בפונקציה המשותפת
      this.loadSub2(id);
    } else {
      this.sub2 = [];
    }
  }

  // ⭐ פונקציה חדשה לטעינת SubCategory2
  private loadSub2(subCategory1Id: number, callback?: () => void) {
    const params = new HttpParams().set('subCategory1Id', subCategory1Id.toString());
    this.http.get<LookupItem[]>(`${environment.apiBaseUrl}/ServiceCalls/SubCategory2`, { params })
      .subscribe(list => {
        this.sub2 = list;
        if (callback) callback();
      });
  }

  /* ---------- save / cancel ---------- */

  save() {
    if (this.form.invalid) return;

    const body: ServiceCallModel = {
      serviceCallID: this.callId,
      ...this.form.value
    };

    this.isLoading = true;

    this.http.put(`${environment.apiBaseUrl}/ServiceCalls/${this.callId}`, body)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/service-calls']); // back to list
        },
        error: err => {
          this.isLoading = false;
          this.errorMessage = 'שגיאה בשמירת הקריאה';
        }
      });
  }

  cancel() {
    this.router.navigate(['/service-calls']);
  }
}
