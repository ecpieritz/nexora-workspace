import { TestBed } from '@angular/core/testing';

import { AuthConflictError, MockAuthRepository } from './mock-auth.repository';

describe('MockAuthRepository', () => {
  let repository: MockAuthRepository;

  const registration = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    username: 'janedoe',
    password: 'Nexora123',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(MockAuthRepository);
  });

  afterEach(() => localStorage.clear());

  it('should persist a normalized user without the plain-text password', async () => {
    const user = await repository.register(registration);
    const storedValue = localStorage.getItem('nexora:mock-users') ?? '';

    expect(user.email).toBe('jane@example.com');
    expect(storedValue).toContain('passwordHash');
    expect(storedValue).not.toContain(registration.password);
  });

  it('should reject duplicate email addresses', async () => {
    await repository.register(registration);

    await expectAsync(
      repository.register({ ...registration, username: 'another-user' }),
    ).toBeRejectedWith(jasmine.any(AuthConflictError));
  });
});
