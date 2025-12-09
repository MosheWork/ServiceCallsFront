import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServiceCallFormComponent } from './service-call-form/service-call-form.component';
// אם יצרת בתיקייה אחרת – עדכן את ה-path בהתאם

const routes: Routes = [
  { path: '', redirectTo: 'service-call/new', pathMatch: 'full' },

  // טופס פתיחת קריאת שירות
  { path: 'service-call/new', component: ServiceCallFormComponent },

  // אופציונלי – דף 404
  { path: '**', redirectTo: 'service-call/new' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
