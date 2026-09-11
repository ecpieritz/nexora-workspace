import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.componentRef.setInput('title', 'Delete item?');
    fixture.componentRef.setInput('message', 'This action cannot be undone.');
    fixture.detectChanges();
  });
  it('should expose alert dialog semantics and require confirmation', () => {
    const confirmed = jasmine.createSpy();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(confirmed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('.confirmation-dialog__confirm').click();
    expect(confirmed).toHaveBeenCalled();
  });
});
