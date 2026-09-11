import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountCreatedComponent } from './account-created.component';

describe('AccountCreatedComponent', () => {
  let fixture: ComponentFixture<AccountCreatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountCreatedComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountCreatedComponent);
    fixture.detectChanges();
  });

  it('should announce that the account was created', () => {
    const heading: HTMLHeadingElement = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('created successfully');
  });

  it('should provide a link to sign in', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Continue to sign in');
  });
});
