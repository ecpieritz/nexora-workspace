import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiActivityComponent } from './api-activity.component';
import { ApiLoadingService } from './api-loading.service';

describe('ApiActivityComponent', () => {
  let fixture: ComponentFixture<ApiActivityComponent>;
  let loading: ApiLoadingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ApiActivityComponent] }).compileComponents();
    fixture = TestBed.createComponent(ApiActivityComponent);
    loading = TestBed.inject(ApiLoadingService);
    fixture.detectChanges();
  });

  it('should expose an accessible status while API requests are pending', () => {
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

    loading.start();
    fixture.detectChanges();

    const status: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(status.textContent).toContain('Loading workspace data');
  });
});
