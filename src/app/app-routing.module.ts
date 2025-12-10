import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceCallEditComponent } from './service-call-edit/service-call-edit.component';
import { ServiceCallFormComponent } from './service-call-form/service-call-form.component';
import { ServiceCallListComponent } from './service-call-list/service-call-list.component';
// אם יצרת בתיקייה אחרת – עדכן את ה-path בהתאם

const routes: Routes = [
  { path: '', redirectTo: 'service-call/new', pathMatch: 'full' },

  // טופס פתיחת קריאת שירות
  { path: 'service-call/new', component: ServiceCallFormComponent },
  { path: 'service-call-list', component: ServiceCallListComponent },
  { path: 'service-calls/:id', component: ServiceCallEditComponent } ,

  // אופציונלי – דף 404
  { path: '**', redirectTo: 'service-call/new' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
