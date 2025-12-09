import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCallListComponent } from './service-call-list.component';

describe('ServiceCallListComponent', () => {
  let component: ServiceCallListComponent;
  let fixture: ComponentFixture<ServiceCallListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceCallListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceCallListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
