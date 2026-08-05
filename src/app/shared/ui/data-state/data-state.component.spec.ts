import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataStateComponent } from './data-state.component';

describe('DataStateComponent', () => {
  let fixture: ComponentFixture<DataStateComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(DataStateComponent);
  });
  it('should expose an accessible loading state', () => {
    fixture.componentRef.setInput('kind', 'loading');
    fixture.componentRef.setInput('title', 'Loading products');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });
  it('should emit the retry action for errors', () => {
    const action = jasmine.createSpy();
    fixture.componentInstance.action.subscribe(action);
    fixture.componentRef.setInput('kind', 'error');
    fixture.componentRef.setInput('title', 'Failed');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(action).toHaveBeenCalled();
  });
});
