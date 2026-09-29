import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('should publish and automatically dismiss a notification', fakeAsync(() => {
    const service = TestBed.inject(ToastService);
    service.success('Saved');
    expect(service.messages()[0].message).toBe('Saved');
    tick(4000);
    expect(service.messages()).toEqual([]);
  }));

  it('should avoid stacking simultaneous error notifications', () => {
    const service = TestBed.inject(ToastService);

    service.error('API error');
    service.error('Fallback page error');

    expect(service.messages().length).toBe(1);
    expect(service.messages()[0].message).toBe('API error');
  });
});
