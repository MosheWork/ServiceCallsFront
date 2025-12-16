import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertMsgAdminComponent } from './alert-msg-admin.component';

describe('AlertMsgAdminComponent', () => {
  let component: AlertMsgAdminComponent;
  let fixture: ComponentFixture<AlertMsgAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertMsgAdminComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertMsgAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
