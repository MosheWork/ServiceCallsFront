import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface LookupItem {
  id: number;
  name: string;
}

@Component({
  selector: 'app-service-call-form',
  templateUrl: './service-call-form.component.html',
  styleUrls: ['./service-call-form.component.scss']
})
export class ServiceCallFormComponent implements OnInit {

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
  
    let list = this.mainCategories;
    if (term) {
      list = list.filter(mc =>
        (mc.name || '').toLowerCase().includes(term)
      );
    }
  
    // לשים "אחר" בראש הרשימה
    const sorted = [...list];
    sorted.sort((a, b) => {
      const aIsOther = (a.name || '').trim() === 'אחר';
      const bIsOther = (b.name || '').trim() === 'אחר';
  
      if (aIsOther && !bIsOther) return -1;
      if (!aIsOther && bIsOther) return 1;
      return 0;
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
    private http: HttpClient
  ) { }

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
}
