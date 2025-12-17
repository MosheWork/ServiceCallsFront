import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlertMsgAdminComponent } from './alert-msg-admin/alert-msg-admin.component';
import { AlertMsgComponent } from './alert-msg/alert-msg.component';
import { ServiceCallEditComponent } from './service-call-edit/service-call-edit.component';
import { ServiceCallFormComponent } from './service-call-form/service-call-form.component';
import { ServiceCallListComponent } from './service-call-list/service-call-list.component';
import { ServiceCallsAdminConfigComponent } from './service-calls-admin-config/service-calls-admin-config.component';
import { ServiceCallsDashboardComponent } from './service-calls-dashboard/service-calls-dashboard.component';
// אם יצרת בתיקייה אחרת – עדכן את ה-path בהתאם

const routes: Routes = [
  { path: '', redirectTo: 'service-call/new', pathMatch: 'full' },

// טופס פתיחת קריאת שירות
{ path: 'service-call/new', component: ServiceCallFormComponent, data: { title: 'פתיחת קריאה' } },

{ path: 'service-call-list', component: ServiceCallListComponent, data: { title: 'רשימת קריאות' } },

{ path: 'service-calls/:id', component: ServiceCallEditComponent, data: { title: 'עריכת קריאה' } },

{ path: 'ServiceCallsAdminConfig', component: ServiceCallsAdminConfigComponent, data: { title: 'הגדרות' } },

{ path: 'serviceCallsDashboard', component: ServiceCallsDashboardComponent, data: { title: 'דשבורד קריאות' } },

{ path: 'alert-msg-admin', component: AlertMsgAdminComponent, data: { title: 'הודעות מערכת' } },

  // אופציונלי – דף 404
  { path: '**', redirectTo: 'service-call-list' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
