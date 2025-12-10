import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCallEditComponent } from './service-call-edit.component';

describe('ServiceCallEditComponent', () => {
  let component: ServiceCallEditComponent;
  let fixture: ComponentFixture<ServiceCallEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceCallEditComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceCallEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
