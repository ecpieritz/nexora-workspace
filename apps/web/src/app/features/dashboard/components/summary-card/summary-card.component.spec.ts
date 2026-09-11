import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryCardComponent } from './summary-card.component';

describe('SummaryCardComponent', () => {
  let fixture: ComponentFixture<SummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SummaryCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(SummaryCardComponent);
    fixture.componentRef.setInput('label', 'Saved products');
    fixture.componentRef.setInput('value', 178);
    fixture.componentRef.setInput('suffix', '+');
    fixture.componentRef.setInput('icon', 'saved');
    fixture.componentRef.setInput('tone', 'blue');
    fixture.detectChanges();
  });

  it('should render its value and label', () => {
    expect(fixture.nativeElement.textContent).toContain('178+');
    expect(fixture.nativeElement.textContent).toContain('Saved products');
  });
});
