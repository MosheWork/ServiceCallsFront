import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ServiceCallFormComponent } from './service-call-form/service-call-form.component';
import { HttpClientModule } from '@angular/common/http';
import { ServiceCallListComponent } from './service-call-list/service-call-list.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceCallEditComponent } from './service-call-edit/service-call-edit.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ServiceCallsAdminConfigComponent } from './service-calls-admin-config/service-calls-admin-config.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { ServiceCallsDashboardComponent } from './service-calls-dashboard/service-calls-dashboard.component';
import { MatChipsModule } from '@angular/material/chips';
import { NgxGaugeModule } from 'ngx-gauge';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AlertMsgComponent } from './alert-msg/alert-msg.component';
import { AlertMsgAdminComponent } from './alert-msg-admin/alert-msg-admin.component';




@NgModule({
  declarations: [
    AppComponent,
    ServiceCallFormComponent,
    ServiceCallListComponent,
    ServiceCallEditComponent,
    ServiceCallsAdminConfigComponent,
    ServiceCallsDashboardComponent,
    AlertMsgComponent,
    AlertMsgAdminComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    BrowserAnimationsModule,
    FormsModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDividerModule,
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatDialogModule,
    MatChipsModule,
    NgxGaugeModule ,MatToolbarModule,MatSidenavModule,MatListModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
