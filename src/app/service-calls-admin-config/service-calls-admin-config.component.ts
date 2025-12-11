import {
  Component,
  OnInit,
  ViewChild,
  TemplateRef
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TeamModel {
  teamInChargeID: number;
  teamName: string;
}

export interface DepartmentModel {
  departmentInChargeID: number;
  departmentName: string;
}

export interface StatusModel {
  statusID: number;
  statusName: string;
}

export interface UserInChargeModel {
  userInChargeID: number;
  displayName: string;
  teamInChargeID: number | null;
  iD_No: string | null;
}

export interface MainCategoryModel {
  mainCategoryID: number;
  name: string;
  departmentInChargeID: number | null;
  teamInChargeID: number | null;
}

export interface SubCategory1Model {
  subCategory1ID: number;
  name: string;
  mainCategoryID: number;
}

export interface SubCategory2Model {
  subCategory2ID: number;
  name: string;
  subCategory1ID: number;
}

type SimpleType = 'team' | 'department' | 'status';

@Component({
  selector: 'app-service-calls-admin-config',
  templateUrl: './service-calls-admin-config.component.html',
  styleUrls: ['./service-calls-admin-config.component.scss']
})
export class ServiceCallsAdminConfigComponent implements OnInit {
  baseUrl = environment.apiBaseUrl + '/ServiceCallsAdminConfig';

  isLoading = false;
  errorMessage = '';

  // data sources
  teamsDS       = new MatTableDataSource<TeamModel>();
  departmentsDS = new MatTableDataSource<DepartmentModel>();
  statusesDS    = new MatTableDataSource<StatusModel>();
  usersDS       = new MatTableDataSource<UserInChargeModel>();
  mainCatDS     = new MatTableDataSource<MainCategoryModel>();
  subCat1DS     = new MatTableDataSource<SubCategory1Model>();
  subCat2DS     = new MatTableDataSource<SubCategory2Model>();

  // displayed columns
  displayedColumnsTeams       = ['id', 'name', 'actions'];
  displayedColumnsDepartments = ['id', 'name', 'actions'];
  displayedColumnsStatuses    = ['id', 'name', 'actions'];
  displayedColumnsUsers       = ['id', 'displayName', 'team', 'idNo', 'actions'];
  displayedColumnsMainCat     = ['id', 'name', 'department', 'team', 'actions'];
  displayedColumnsSubCat1     = ['id', 'name', 'parent', 'actions'];
  displayedColumnsSubCat2     = ['id', 'name', 'parent', 'actions'];

  // ============= Paginators (wired via setters – works with mat-tab lazy load) =============
  @ViewChild('teamsPaginator', { read: MatPaginator })
  set teamsPaginator(p: MatPaginator | undefined) {
    if (p) this.teamsDS.paginator = p;
  }

  @ViewChild('departmentsPaginator', { read: MatPaginator })
  set departmentsPaginator(p: MatPaginator | undefined) {
    if (p) this.departmentsDS.paginator = p;
  }

  @ViewChild('statusesPaginator', { read: MatPaginator })
  set statusesPaginator(p: MatPaginator | undefined) {
    if (p) this.statusesDS.paginator = p;
  }

  @ViewChild('usersPaginator', { read: MatPaginator })
  set usersPaginator(p: MatPaginator | undefined) {
    if (p) this.usersDS.paginator = p;
  }

  @ViewChild('mainCatPaginator', { read: MatPaginator })
  set mainCatPaginator(p: MatPaginator | undefined) {
    if (p) this.mainCatDS.paginator = p;
  }

  @ViewChild('sc1Paginator', { read: MatPaginator })
  set sc1Paginator(p: MatPaginator | undefined) {
    if (p) this.subCat1DS.paginator = p;
  }

  @ViewChild('sc2Paginator', { read: MatPaginator })
  set sc2Paginator(p: MatPaginator | undefined) {
    if (p) this.subCat2DS.paginator = p;
  }

  // ============= Sorts (also via setters) =============
  @ViewChild('teamsSort', { read: MatSort })
  set teamsSort(s: MatSort | undefined) {
    if (s) this.teamsDS.sort = s;
  }

  @ViewChild('departmentsSort', { read: MatSort })
  set departmentsSort(s: MatSort | undefined) {
    if (s) this.departmentsDS.sort = s;
  }

  @ViewChild('statusesSort', { read: MatSort })
  set statusesSort(s: MatSort | undefined) {
    if (s) this.statusesDS.sort = s;
  }

  @ViewChild('usersSort', { read: MatSort })
  set usersSort(s: MatSort | undefined) {
    if (s) this.usersDS.sort = s;
  }

  @ViewChild('mainCatSort', { read: MatSort })
  set mainCatSort(s: MatSort | undefined) {
    if (s) this.mainCatDS.sort = s;
  }

  @ViewChild('subCat1Sort', { read: MatSort })
  set subCat1Sort(s: MatSort | undefined) {
    if (s) this.subCat1DS.sort = s;
  }

  @ViewChild('subCat2Sort', { read: MatSort })
  set subCat2Sort(s: MatSort | undefined) {
    if (s) this.subCat2DS.sort = s;
  }

  // dialog templates
  @ViewChild('simpleEditDialog') simpleEditDialogTpl!: TemplateRef<any>;
  @ViewChild('userEditDialog') userEditDialogTpl!: TemplateRef<any>;
  @ViewChild('mainCatEditDialog') mainCatEditDialogTpl!: TemplateRef<any>;
  @ViewChild('subCatEditDialog') subCatEditDialogTpl!: TemplateRef<any>;

  // forms
  simpleForm!: FormGroup;
  userForm!: FormGroup;
  mainCatForm!: FormGroup;
  subCatForm!: FormGroup;

  simpleType: SimpleType | null = null;
  subCatLevel: 1 | 2 | null = null;

  // dropdown search state
  teamSelectSearch = '';
  mainCatTeamSelectSearch = '';
  departmentSelectSearch = '';

  parentSubCat1Search = '';
  parentMainCatSearch = '';

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  // =========================================
  // Init
  // =========================================
  ngOnInit(): void {
    this.initForms();
    this.initFilterPredicates();
    this.loadAll();
  }

  private initForms(): void {
    this.simpleForm = this.fb.group({
      id: [null],
      name: ['', Validators.required]
    });

    this.userForm = this.fb.group({
      userInChargeID: [null],
      displayName: ['', Validators.required],
      iD_No: [''],
      teamInChargeID: [null]
    });

    this.mainCatForm = this.fb.group({
      mainCategoryID: [null],
      name: ['', Validators.required],
      departmentInChargeID: [null, Validators.required],
      teamInChargeID: [null]
    });

    this.subCatForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      parentId: [null, Validators.required]
    });
  }

  private initFilterPredicates(): void {
    const textFilter = <T>(data: T, filter: string): boolean => {
      const str = JSON.stringify(data);
      return str.toLowerCase().includes(filter);
    };

    this.teamsDS.filterPredicate       = textFilter;
    this.departmentsDS.filterPredicate = textFilter;
    this.statusesDS.filterPredicate    = textFilter;
    this.usersDS.filterPredicate       = textFilter;
    this.mainCatDS.filterPredicate     = textFilter;
    this.subCat1DS.filterPredicate     = textFilter;
    this.subCat2DS.filterPredicate     = textFilter;
  }

  // =========================================
  // Load all lookup data
  // =========================================
  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teams: this.http.get<TeamModel[]>(`${this.baseUrl}/Teams`),
      departments: this.http.get<DepartmentModel[]>(`${this.baseUrl}/Departments`),
      statuses: this.http.get<StatusModel[]>(`${this.baseUrl}/Statuses`),
      users: this.http.get<UserInChargeModel[]>(`${this.baseUrl}/Users`),
      mainCats: this.http.get<MainCategoryModel[]>(`${this.baseUrl}/MainCategories`),
      subCat1: this.http.get<SubCategory1Model[]>(`${this.baseUrl}/SubCategory1`),
      subCat2: this.http.get<SubCategory2Model[]>(`${this.baseUrl}/SubCategory2`)
    }).subscribe({
      next: res => {
        this.teamsDS.data       = res.teams;
        this.departmentsDS.data = res.departments;
        this.statusesDS.data    = res.statuses;
        this.usersDS.data       = res.users;
        this.mainCatDS.data     = res.mainCats;
        this.subCat1DS.data     = res.subCat1;
        this.subCat2DS.data     = res.subCat2;
        this.isLoading = false;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת נתוני הגדרות';
        this.isLoading = false;
      }
    });
  }

  // =========================================
  // Table filters
  // =========================================
  applyTeamsFilter(value: string): void {
    this.teamsDS.filter = value.trim().toLowerCase();
    this.teamsDS.paginator?.firstPage();
  }

  applyDepartmentsFilter(value: string): void {
    this.departmentsDS.filter = value.trim().toLowerCase();
    this.departmentsDS.paginator?.firstPage();
  }

  applyStatusesFilter(value: string): void {
    this.statusesDS.filter = value.trim().toLowerCase();
    this.statusesDS.paginator?.firstPage();
  }

  applyUsersFilter(value: string): void {
    this.usersDS.filter = value.trim().toLowerCase();
    this.usersDS.paginator?.firstPage();
  }

  applyMainCatFilter(value: string): void {
    this.mainCatDS.filter = value.trim().toLowerCase();
    this.mainCatDS.paginator?.firstPage();
  }

  applySubCat1Filter(value: string): void {
    this.subCat1DS.filter = value.trim().toLowerCase();
    this.subCat1DS.paginator?.firstPage();
  }

  applySubCat2Filter(value: string): void {
    this.subCat2DS.filter = value.trim().toLowerCase();
    this.subCat2DS.paginator?.firstPage();
  }

  // =========================================
  // Lookup name helpers
  // =========================================
  getTeamName(id: number | null | undefined): string {
    if (id == null) return '';
    const t = this.teamsDS.data.find(x => x.teamInChargeID === id);
    return t ? t.teamName : '';
  }

  getDepartmentName(id: number | null | undefined): string {
    if (id == null) return '';
    const d = this.departmentsDS.data.find(x => x.departmentInChargeID === id);
    return d ? d.departmentName : '';
  }

  getMainCategoryName(id: number | null | undefined): string {
    if (id == null) return '';
    let m = this.mainCatDS.data.find(x => x.mainCategoryID === id);
    if (m) return m.name;

    const s = this.subCat1DS.data.find(x => x.subCategory1ID === id);
    return s ? s.name : '';
  }

  // =========================================
  // Dropdown helper getters
  // =========================================
  get filteredTeamsForSelect(): TeamModel[] {
    const term = this.teamSelectSearch.trim().toLowerCase();
    if (!term) return this.teamsDS.data;
    return this.teamsDS.data.filter(t =>
      t.teamName.toLowerCase().includes(term)
    );
  }

  get filteredDepartmentsForSelect(): DepartmentModel[] {
    const term = this.departmentSelectSearch.trim().toLowerCase();
    if (!term) return this.departmentsDS.data;
    return this.departmentsDS.data.filter(d =>
      d.departmentName.toLowerCase().includes(term)
    );
  }

  get filteredSubCat1ForParent(): SubCategory1Model[] {
    const term = this.parentSubCat1Search.trim().toLowerCase();
    if (!term) return this.subCat1DS.data;
    return this.subCat1DS.data.filter(s =>
      s.name.toLowerCase().includes(term)
    );
  }

  get filteredMainCatsForParent(): MainCategoryModel[] {
    const term = this.parentMainCatSearch.trim().toLowerCase();
    if (!term) return this.mainCatDS.data;
    return this.mainCatDS.data.filter(m =>
      m.name.toLowerCase().includes(term)
    );
  }

  // =========================================
  // Simple entities (team/department/status)
  // =========================================

  openAddSimple(type: SimpleType): void {
    this.simpleType = type;
    this.simpleForm.reset({ id: null, name: '' });
    this.dialog.open(this.simpleEditDialogTpl, { width: '400px' });
  }

  openEditSimple(type: SimpleType, row: any): void {
    this.simpleType = type;

    let id: number | null = null;
    let name: string = '';

    switch (type) {
      case 'team':
        id = row.teamInChargeID;
        name = row.teamName;
        break;
      case 'department':
        id = row.departmentInChargeID;
        name = row.departmentName;
        break;
      case 'status':
        id = row.statusID;
        name = row.statusName;
        break;
    }

    this.simpleForm.setValue({ id, name });
    this.dialog.open(this.simpleEditDialogTpl, { width: '400px' });
  }

  saveSimple(): void {
    if (!this.simpleType || this.simpleForm.invalid) return;

    const formValue = this.simpleForm.value;
    const id = formValue.id;
    const name = formValue.name;

    let url = '';
    let body: any = {};

    switch (this.simpleType) {
      case 'team':
        url = `${this.baseUrl}/SaveTeam`;
        body = { teamInChargeID: id, teamName: name };
        break;
      case 'department':
        url = `${this.baseUrl}/SaveDepartment`;
        body = { departmentInChargeID: id, departmentName: name };
        break;
      case 'status':
        url = `${this.baseUrl}/SaveStatus`;
        body = { statusID: id, statusName: name };
        break;
    }

    this.http.post(url, body).subscribe({
      next: () => {
        this.dialog.closeAll();
        this.loadAll();
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת נתון';
      }
    });
  }

  // =========================================
  // UserInCharge
  // =========================================
  openAddUser(): void {
    this.userSelectReset();
    this.userForm.reset({
      userInChargeID: null,
      displayName: '',
      iD_No: '',
      teamInChargeID: null
    });
    this.dialog.open(this.userEditDialogTpl, { width: '480px' });
  }

  openEditUser(row: UserInChargeModel): void {
    this.userSelectReset();
    this.userForm.reset({
      userInChargeID: row.userInChargeID,
      displayName: row.displayName,
      iD_No: row.iD_No,
      teamInChargeID: row.teamInChargeID
    });
    this.dialog.open(this.userEditDialogTpl, { width: '480px' });
  }

  private userSelectReset(): void {
    this.teamSelectSearch = '';
  }

  saveUser(): void {
    if (this.userForm.invalid) return;

    const model = this.userForm.value as UserInChargeModel;

    this.http.post(`${this.baseUrl}/SaveUser`, model).subscribe({
      next: () => {
        this.dialog.closeAll();
        this.loadAll();
      },
      error: err => {
        console.error(err);
        this.errorMessage =
          err.error?.exceptionMessage || 'שגיאה בשמירת משתמש אחראי';
      }
    });
  }

  // =========================================
  // MainCategory
  // =========================================
  openAddMainCategory(): void {
    this.departmentSelectSearch = '';
    this.mainCatTeamSelectSearch = '';

    this.mainCatForm.reset({
      mainCategoryID: null,
      name: '',
      departmentInChargeID: null,
      teamInChargeID: null
    });

    this.dialog.open(this.mainCatEditDialogTpl, { width: '500px' });
  }

  openEditMainCategory(row: MainCategoryModel): void {
    this.departmentSelectSearch = '';
    this.mainCatTeamSelectSearch = '';

    this.mainCatForm.reset({
      mainCategoryID: row.mainCategoryID,
      name: row.name,
      departmentInChargeID: row.departmentInChargeID,
      teamInChargeID: row.teamInChargeID
    });

    this.dialog.open(this.mainCatEditDialogTpl, { width: '500px' });
  }

  saveMainCategory(): void {
    if (this.mainCatForm.invalid) return;

    const model = this.mainCatForm.value as MainCategoryModel;

    this.http.post(`${this.baseUrl}/SaveMainCategory`, model).subscribe({
      next: () => {
        this.dialog.closeAll();
        this.loadAll();
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת קטגוריה ראשית';
      }
    });
  }

  // =========================================
  // SubCategory 1/2
  // =========================================

  openAddSubCategory(level: 1 | 2): void {
    this.subCatLevel = level;
    this.parentSubCat1Search = '';
    this.parentMainCatSearch  = '';

    this.subCatForm.reset({
      id: null,
      name: '',
      parentId: null
    });

    this.dialog.open(this.subCatEditDialogTpl, { width: '500px' });
  }

  openEditSubCategory(level: 1 | 2, row: any): void {
    this.subCatLevel = level;
    this.parentSubCat1Search = '';
    this.parentMainCatSearch  = '';

    if (level === 1) {
      this.subCatForm.reset({
        id: row.subCategory1ID,
        name: row.name,
        parentId: row.mainCategoryID
      });
    } else {
      this.subCatForm.reset({
        id: row.subCategory2ID,
        name: row.name,
        parentId: row.subCategory1ID
      });
    }

    this.dialog.open(this.subCatEditDialogTpl, { width: '500px' });
  }

  saveSubCategory(): void {
    if (this.subCatForm.invalid || !this.subCatLevel) return;

    const formVal = this.subCatForm.value;
    let url = '';
    let body: any = {};

    if (this.subCatLevel === 1) {
      url = `${this.baseUrl}/SaveSubCategory1`;
      body = {
        subCategory1ID: formVal.id,
        name: formVal.name,
        mainCategoryID: formVal.parentId
      };
    } else {
      url = `${this.baseUrl}/SaveSubCategory2`;
      body = {
        subCategory2ID: formVal.id,
        name: formVal.name,
        subCategory1ID: formVal.parentId
      };
    }

    this.http.post(url, body).subscribe({
      next: () => {
        this.dialog.closeAll();
        this.loadAll();
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת תת קטגוריה';
      }
    });
  }
}
