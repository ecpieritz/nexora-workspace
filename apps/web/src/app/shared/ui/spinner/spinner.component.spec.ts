import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SpinnerComponent] }).compileComponents();
    fixture = TestBed.createComponent(SpinnerComponent);
  });

  it('should expose an accessible loading label', () => {
    fixture.componentRef.setInput('label', 'Saving invoice');
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.textContent).toContain('Saving invoice');
  });
});
