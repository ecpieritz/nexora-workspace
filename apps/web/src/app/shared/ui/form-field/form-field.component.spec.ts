import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFieldComponent } from './form-field.component';

@Component({
  imports: [FormFieldComponent],
  template: `
    <app-form-field label="Email" controlId="email" [error]="error">
      <input id="email" />
    </app-form-field>
  `,
})
class TestHostComponent {
  error: string | undefined;
}

describe('FormFieldComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('should associate the label with the projected control', () => {
    fixture.detectChanges();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.htmlFor).toBe('email');
  });

  it('should announce validation errors', () => {
    fixture.componentInstance.error = 'Enter a valid email';
    fixture.detectChanges();
    const error = fixture.nativeElement.querySelector('[role="alert"]');
    expect(error.textContent).toContain('Enter a valid email');
  });
});
