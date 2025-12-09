import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  
      // אפשר להשאיר להכנה לעתיד, אבל לא נשתמש בהם ב-payload כרגע
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
  
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
  
    this.isSubmitting = true;
    this.successMessage = '';
    this.errorMessage = '';
  
    const raw = this.form.value;
  
    // 👇 👇 רק מה שהמשתמש באמת הזין בטופס
    const payload = {
      title: raw.title,
      description: raw.description,
      requestUser: raw.requestUser,
      callbackPhone: raw.callbackPhone,
      location: raw.location,
      computerName: raw.computerName
    };
  
    this.http.post(`${environment.apiBaseUrl}/api/ServiceCalls`, payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.successMessage = 'הקריאה נפתחה בהצלחה';
          this.errorMessage = '';
  
          this.form.reset({
            title: '',
            description: '',
            requestUser: '',
            callbackPhone: '',
            location: '',
            computerName: ''
          });
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
