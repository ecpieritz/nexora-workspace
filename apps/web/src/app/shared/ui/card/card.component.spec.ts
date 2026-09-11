import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardComponent } from './card.component';

@Component({
  imports: [CardComponent],
  template: `<app-card elevated>Projected content</app-card>`,
})
class TestHostComponent {}

describe('CardComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('should project content and apply elevation', () => {
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('app-card');
    expect(card.textContent).toContain('Projected content');
    expect(card.classList).toContain('ui-card--elevated');
  });
});
