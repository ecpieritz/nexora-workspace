import { hash } from 'bcryptjs';

import type { RegisterInput } from './auth.schemas.js';
import type { AuthRegistrationRepository, RegisteredAccount } from './auth.types.js';

export interface AuthRegistrationService {
  register(input: RegisterInput): Promise<RegisteredAccount>;
}

export class AuthService implements AuthRegistrationService {
  constructor(
    private readonly repository: AuthRegistrationRepository,
    private readonly passwordHashRounds: number,
  ) {}

  async register(input: RegisterInput): Promise<RegisteredAccount> {
    const passwordHash = await hash(input.password, this.passwordHashRounds);

    return this.repository.createAccount({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      username: input.username,
    });
  }
}
