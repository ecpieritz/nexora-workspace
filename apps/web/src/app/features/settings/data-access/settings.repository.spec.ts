import { TestBed } from '@angular/core/testing';
import { MockApiService } from '@core/mock-api';
import { SettingsRepository } from './settings.repository';

class MockApiStub {
  async execute<T>(operation: () => T | Promise<T>): Promise<T> {
    return operation();
  }
}

describe('SettingsRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [SettingsRepository, { provide: MockApiService, useClass: MockApiStub }],
    });
  });
  it('should persist user settings separately', async () => {
    const repository = TestBed.inject(SettingsRepository);
    const settings = await repository.get('one', 'Jane Doe', 'jane');
    await repository.save('one', { ...settings, role: 'Designer', compactSidebar: true });
    expect((await repository.get('one', 'Jane Doe', 'jane')).role).toBe('Designer');
    expect(localStorage.getItem('nexora:compact-sidebar')).toBe('true');
  });
});
