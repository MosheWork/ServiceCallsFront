import {
  AfterViewInit,
  Component,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

/* ========= Interfaces – must match backend models ========= */

export interface TeamInCharge {
  teamInChargeID: number;
  teamName: string;
}

export interface DepartmentInCharge {
  departmentInChargeID: number;
  departmentName: string;
}

export interface ServiceCallStatus {
  statusID: number;
  statusName: string;
}

export interface ServiceCallUserInCharge {
  userInChargeID: number;
  displayName: string;
  teamInChargeID: number | null;
  ID_No?: string | null;
}

export interface MainCategory {
  mainCategoryID: number;
  name: string;
  departmentInChargeID: number;
  teamInChargeID: number;
}

export interface SubCategory1 {
  subCategory1ID: number;
  mainCategoryID: number;
  name: string;
}

export interface SubCategory2 {
  subCategory2ID: number;
  subCategory1ID: number;
  name: string;
}

// export interface SubCategory3 {
//   subCategory3ID: number;
//   mainCategoryID: number;
//   name: string;
// }

type SimpleEntityType = 'team' | 'department' | 'status';

type SubCatLevel = 1 | 2 | 3;

@Component({
  selector: 'app-service-calls-admin-config',
  templateUrl: './service-calls-admin-config.component.html',
  styleUrls: ['./service-calls-admin-config.component.scss']
})
export class ServiceCallsAdminConfigComponent implements OnInit, AfterViewInit {
  isLoading = true;
  errorMessage = '';

  private baseUrl = `${environment.apiBaseUrl}/ServiceCallsAdminConfig`;

  /* ====== data sources ====== */
  teamsDS = new MatTableDataSource<TeamInCharge>([]);
  departmentsDS = new MatTableDataSource<DepartmentInCharge>([]);
  statusesDS = new MatTableDataSource<ServiceCallStatus>([]);
  usersDS = new MatTableDataSource<ServiceCallUserInCharge>([]);
  mainCatDS = new MatTableDataSource<MainCategory>([]);
  subCat1DS = new MatTableDataSource<SubCategory1>([]);
  subCat2DS = new MatTableDataSource<SubCategory2>([]);
  //subCat3DS = new MatTableDataSource<SubCategory3>([]);

  /* ====== columns ====== */
  displayedColumnsTeams = ['id', 'name', 'actions'];
  displayedColumnsDepartments = ['id', 'name', 'actions'];
  displayedColumnsStatuses = ['id', 'name', 'actions'];

  displayedColumnsUsers = ['id', 'displayName', 'team', 'idNo', 'actions'];

  displayedColumnsMainCat = ['id', 'name', 'department', 'team', 'actions'];

  displayedColumnsSubCat1 = ['id', 'name', 'parent', 'actions'];
  displayedColumnsSubCat2 = ['id', 'name', 'parent', 'actions'];
  displayedColumnsSubCat3 = ['id', 'name', 'parent', 'actions'];

  /* ====== paginators ====== */
  @ViewChild('teamsPaginator') teamsPaginator!: MatPaginator;
  @ViewChild('departmentsPaginator') departmentsPaginator!: MatPaginator;
  @ViewChild('statusesPaginator') statusesPaginator!: MatPaginator;
  @ViewChild('usersPaginator') usersPaginator!: MatPaginator;
  @ViewChild('mainCatPaginator') mainCatPaginator!: MatPaginator;
  @ViewChild('sc1Paginator') sc1Paginator!: MatPaginator;
  @ViewChild('sc2Paginator') sc2Paginator!: MatPaginator;
  @ViewChild('sc3Paginator') sc3Paginator!: MatPaginator;

  /* ====== dialog templates ====== */
  @ViewChild('simpleEditDialog') simpleEditDialog!: TemplateRef<any>;
  @ViewChild('userEditDialog') userEditDialog!: TemplateRef<any>;
  @ViewChild('mainCatEditDialog') mainCatEditDialog!: TemplateRef<any>;
  @ViewChild('subCatEditDialog') subCatEditDialog!: TemplateRef<any>;

  /* ====== forms for dialogs ====== */
  simpleForm!: FormGroup;
  simpleType: SimpleEntityType | null = null;

  userForm!: FormGroup;
  mainCatForm!: FormGroup;
  subCatForm!: FormGroup;
  subCatLevel: SubCatLevel = 1; // 1/2/3

  private dialogRef?: MatDialogRef<any>;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    this.teamsDS.paginator = this.teamsPaginator;
    this.departmentsDS.paginator = this.departmentsPaginator;
    this.statusesDS.paginator = this.statusesPaginator;
    this.usersDS.paginator = this.usersPaginator;
    this.mainCatDS.paginator = this.mainCatPaginator;
    this.subCat1DS.paginator = this.sc1Paginator;
    this.subCat2DS.paginator = this.sc2Paginator;
    //this.subCat3DS.paginator = this.sc3Paginator;
  }

  /* =======================================================================
   *                                 LOAD
   * ======================================================================= */

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teams: this.http.get<TeamInCharge[]>(`${this.baseUrl}/Teams`),
      departments: this.http.get<DepartmentInCharge[]>(`${this.baseUrl}/Departments`),
      statuses: this.http.get<ServiceCallStatus[]>(`${this.baseUrl}/Statuses`),
      users: this.http.get<ServiceCallUserInCharge[]>(`${this.baseUrl}/Users`),
      main: this.http.get<MainCategory[]>(`${this.baseUrl}/MainCategories`),
      sc1: this.http.get<SubCategory1[]>(`${this.baseUrl}/SubCategory1`),
      sc2: this.http.get<SubCategory2[]>(`${this.baseUrl}/SubCategory2`),
    //  sc3: this.http.get<SubCategory3[]>(`${this.baseUrl}/SubCategory3`)
    }).subscribe({
      next: (res) => {
        this.teamsDS.data = res.teams;
        this.departmentsDS.data = res.departments;
        this.statusesDS.data = res.statuses;
        this.usersDS.data = res.users;
        this.mainCatDS.data = res.main;
        this.subCat1DS.data = res.sc1;
        this.subCat2DS.data = res.sc2;
       //this.subCat3DS.data = res.sc3;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בטעינת נתוני קונפיגורציה';
      },
      complete: () => (this.isLoading = false)
    });
  }

  /* =======================================================================
   *                           SIMPLE ENTITIES
   * ======================================================================= */

  openAddSimple(type: SimpleEntityType): void {
    this.simpleType = type;
    this.simpleForm = this.fb.group({
      id: [0],
      name: ['', Validators.required]
    });
    this.dialogRef = this.dialog.open(this.simpleEditDialog, {
      width: '420px'
    });
  }

  openEditSimple(type: SimpleEntityType, row: any): void {
    this.simpleType = type;

    const name =
      type === 'team'
        ? row.teamName
        : type === 'department'
        ? row.departmentName
        : row.statusName;

    const id =
      type === 'team'
        ? row.teamInChargeID
        : type === 'department'
        ? row.departmentInChargeID
        : row.statusID;

    this.simpleForm = this.fb.group({
      id: [id],
      name: [name, Validators.required]
    });

    this.dialogRef = this.dialog.open(this.simpleEditDialog, {
      width: '420px'
    });
  }

  saveSimple(): void {
    if (!this.simpleType || this.simpleForm.invalid) {
      return;
    }

    const value = this.simpleForm.value;
    let url = '';
    let payload: any = {};

    switch (this.simpleType) {
      case 'team':
        url = `${this.baseUrl}/SaveTeam`;
        payload = {
          teamInChargeID: value.id,
          teamName: value.name
        };
        break;
      case 'department':
        url = `${this.baseUrl}/SaveDepartment`;
        payload = {
          departmentInChargeID: value.id,
          departmentName: value.name
        };
        break;
      case 'status':
        url = `${this.baseUrl}/SaveStatus`;
        payload = {
          statusID: value.id,
          statusName: value.name
        };
        break;
    }

    this.http.post(url, payload).subscribe({
      next: () => {
        this.dialogRef?.close();
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת נתונים';
      }
    });
  }

  /* =======================================================================
   *                               USERS
   * ======================================================================= */

  openAddUser(): void {
    this.userForm = this.fb.group({
      userInChargeID: [0],
      displayName: ['', Validators.required],
      teamInChargeID: [null],
      ID_No: ['']
    });

    this.dialogRef = this.dialog.open(this.userEditDialog, {
      width: '480px'
    });
  }

  openEditUser(row: ServiceCallUserInCharge): void {
    this.userForm = this.fb.group({
      userInChargeID: [row.userInChargeID],
      displayName: [row.displayName, Validators.required],
      teamInChargeID: [row.teamInChargeID],
      ID_No: [row.ID_No || '']
    });

    this.dialogRef = this.dialog.open(this.userEditDialog, {
      width: '480px'
    });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      return;
    }

    const value = this.userForm.value as ServiceCallUserInCharge;

    this.http.post(`${this.baseUrl}/SaveUser`, value).subscribe({
      next: () => {
        this.dialogRef?.close();
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת משתמש';
      }
    });
  }

  /* =======================================================================
   *                           MAIN CATEGORY
   * ======================================================================= */

  openAddMainCategory(): void {
    this.mainCatForm = this.fb.group({
      mainCategoryID: [0],
      name: ['', Validators.required],
      departmentInChargeID: [
        this.departmentsDS.data[0]?.departmentInChargeID || null,
        Validators.required
      ],
      teamInChargeID: [
        this.teamsDS.data[0]?.teamInChargeID || null,
        Validators.required
      ]
    });

    this.dialogRef = this.dialog.open(this.mainCatEditDialog, {
      width: '520px'
    });
  }

  openEditMainCategory(row: MainCategory): void {
    this.mainCatForm = this.fb.group({
      mainCategoryID: [row.mainCategoryID],
      name: [row.name, Validators.required],
      departmentInChargeID: [row.departmentInChargeID, Validators.required],
      teamInChargeID: [row.teamInChargeID, Validators.required]
    });

    this.dialogRef = this.dialog.open(this.mainCatEditDialog, {
      width: '520px'
    });
  }

  saveMainCategory(): void {
    if (this.mainCatForm.invalid) {
      return;
    }

    const value = this.mainCatForm.value as MainCategory;

    this.http.post(`${this.baseUrl}/SaveMainCategory`, value).subscribe({
      next: () => {
        this.dialogRef?.close();
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת קטגוריה';
      }
    });
  }

  /* =======================================================================
   *                            SUBCATEGORIES
   * ======================================================================= */

  openAddSubCategory(level: SubCatLevel): void {
    this.subCatLevel = level;

    const base: any =
      level === 1
        ? { subCategory1ID: 0, mainCategoryID: this.mainCatDS.data[0]?.mainCategoryID || null }
        : level === 2
        ? { subCategory2ID: 0, subCategory1ID: this.subCat1DS.data[0]?.subCategory1ID || null }
        : { subCategory3ID: 0, mainCategoryID: this.mainCatDS.data[0]?.mainCategoryID || null };

    this.buildSubCatForm(base);
    this.dialogRef = this.dialog.open(this.subCatEditDialog, {
      width: '480px'
    });
  }

  openEditSubCategory(level: SubCatLevel, row: any): void {
    this.subCatLevel = level;
    this.buildSubCatForm(row);
    this.dialogRef = this.dialog.open(this.subCatEditDialog, {
      width: '480px'
    });
  }

  private buildSubCatForm(row: any): void {
    if (this.subCatLevel === 1) {
      this.subCatForm = this.fb.group({
        id: [row.subCategory1ID],
        name: [row.name, Validators.required],
        parentId: [row.mainCategoryID, Validators.required]
      });
    } else if (this.subCatLevel === 2) {
      this.subCatForm = this.fb.group({
        id: [row.subCategory2ID],
        name: [row.name, Validators.required],
        parentId: [row.subCategory1ID, Validators.required]
      });
    } else {
      this.subCatForm = this.fb.group({
        id: [row.subCategory3ID],
        name: [row.name, Validators.required],
        parentId: [row.mainCategoryID, Validators.required]
      });
    }
  }

  saveSubCategory(): void {
    if (this.subCatForm.invalid) return;

    const value = this.subCatForm.value;
    let url = '';
    let payload: any = {};

    if (this.subCatLevel === 1) {
      url = `${this.baseUrl}/SaveSubCategory1`;
      payload = {
        subCategory1ID: value.id,
        name: value.name,
        mainCategoryID: value.parentId
      } as SubCategory1;
    } else if (this.subCatLevel === 2) {
      url = `${this.baseUrl}/SaveSubCategory2`;
      payload = {
        subCategory2ID: value.id,
        name: value.name,
        subCategory1ID: value.parentId
      } as SubCategory2;
    } 
    this.http.post(url, payload).subscribe({
      next: () => {
        this.dialogRef?.close();
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'שגיאה בשמירת תת קטגוריה';
      }
    });
  }

  /* =======================================================================
   *                             HELPERS
   * ======================================================================= */

  getTeamName(id: number | null): string {
    if (!id) return '';
    const t = this.teamsDS.data.find((x) => x.teamInChargeID === id);
    return t ? t.teamName : '';
  }

  getDepartmentName(id: number | null): string {
    if (!id) return '';
    const d = this.departmentsDS.data.find(
      (x) => x.departmentInChargeID === id
    );
    return d ? d.departmentName : '';
  }

  getMainCategoryName(id: number | null): string {
    if (!id) return '';
    const m = this.mainCatDS.data.find((x) => x.mainCategoryID === id);
    return m ? m.name : '';
  }
}
