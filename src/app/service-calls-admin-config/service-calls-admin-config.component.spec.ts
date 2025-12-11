import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCallsAdminConfigComponent } from './service-calls-admin-config.component';

describe('ServiceCallsAdminConfigComponent', () => {
  let component: ServiceCallsAdminConfigComponent;
  let fixture: ComponentFixture<ServiceCallsAdminConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceCallsAdminConfigComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceCallsAdminConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
