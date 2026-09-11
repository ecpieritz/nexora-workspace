import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandComponent } from './brand.component';

describe('BrandComponent', () => {
  let component: BrandComponent;
  let fixture: ComponentFixture<BrandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the brand name by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nexora');
  });

  it('should expose an accessible name when the visual name is hidden', () => {
    fixture.componentRef.setInput('showName', false);
    fixture.detectChanges();

    const accessibleName = fixture.nativeElement.querySelector('.brand__accessible-name');
    expect(accessibleName.textContent).toBe('Nexora');
  });
});
