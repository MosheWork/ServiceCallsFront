import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCallsDashboardComponent } from './service-calls-dashboard.component';

describe('ServiceCallsDashboardComponent', () => {
  let component: ServiceCallsDashboardComponent;
  let fixture: ComponentFixture<ServiceCallsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceCallsDashboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceCallsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
