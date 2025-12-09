import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCallFormComponent } from './service-call-form.component';

describe('ServiceCallFormComponent', () => {
  let component: ServiceCallFormComponent;
  let fixture: ComponentFixture<ServiceCallFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceCallFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceCallFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
