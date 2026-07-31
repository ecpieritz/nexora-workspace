import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputDirective } from './input.directive';

@Component({
  imports: [InputDirective],
  template: `<input appInput [invalid]="invalid" />`,
})
class TestHostComponent {
  invalid = false;
}

describe('InputDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('should apply the shared input class', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').classList).toContain('ui-input');
  });

  it('should expose its invalid state', () => {
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').getAttribute('aria-invalid')).toBe('true');
  });
});
