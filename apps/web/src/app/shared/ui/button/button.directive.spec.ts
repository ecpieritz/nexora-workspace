import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonDirective } from './button.directive';

@Component({
  imports: [ButtonDirective],
  template: `<button appButton [loading]="loading" loadingLabel="Saving changes">
    Save changes
  </button>`,
})
class TestHostComponent {
  loading = false;
}

describe('ButtonDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('should preserve the native button label', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Save changes');
  });

  it('should disable and identify the button while loading', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Saving changes');
  });
});
