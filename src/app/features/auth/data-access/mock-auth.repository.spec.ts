import { TestBed } from '@angular/core/testing';

import { AuthConflictError, AuthenticationError, MockAuthRepository } from './mock-auth.repository';

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

  it('should authenticate a registered user', async () => {
    await repository.register(registration);

    const user = await repository.authenticate({
      email: registration.email,
      password: registration.password,
    });

    expect(user.username).toBe(registration.username);
  });

  it('should reject invalid credentials without revealing which field failed', async () => {
    await repository.register(registration);

    await expectAsync(
      repository.authenticate({ email: registration.email, password: 'WrongPassword1' }),
    ).toBeRejectedWith(jasmine.any(AuthenticationError));
  });
});
