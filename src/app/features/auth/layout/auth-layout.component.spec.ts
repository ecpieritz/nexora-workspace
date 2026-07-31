import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthLayoutComponent } from './auth-layout.component';

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<AuthLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
  });

  it('should render the Nexora brand and authentication outlet', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('app-brand')?.textContent).toContain('Nexora');
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('should provide meaningful alternative text for the illustration', () => {
    const illustration: HTMLImageElement = fixture.nativeElement.querySelector(
      '.auth-layout__illustration',
    );

    expect(illustration.alt).toContain('Nexora workspace');
  });
});
