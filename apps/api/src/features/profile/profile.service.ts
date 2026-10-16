import { ApiError } from '../../errors/api-error.js';
import type { AuthPrincipal } from '../auth/index.js';
import type { UpdateProfileInput } from './profile.schemas.js';
import type { UserProfile, UserProfileChanges, UserProfileRepository } from './profile.types.js';

export interface UserProfileService {
  get(principal: AuthPrincipal): Promise<UserProfile>;
  update(principal: AuthPrincipal, input: UpdateProfileInput): Promise<UserProfile>;
}

export class ProfileService implements UserProfileService {
  constructor(private readonly repository: UserProfileRepository) {}

  async get(principal: AuthPrincipal): Promise<UserProfile> {
    const profile = await this.repository.findById(principal.userId, principal.workspaceId);
    if (!profile) throw ApiError.notFound('User profile was not found.');
    return profile;
  }

  async update(principal: AuthPrincipal, input: UpdateProfileInput): Promise<UserProfile> {
    const current = await this.get(principal);
    if (input.taxId !== undefined && current.taxId !== null && input.taxId !== current.taxId) {
      throw new ApiError(409, 'TAX_ID_IMMUTABLE', 'CPF/CNPJ cannot be changed after it is set.');
    }

    const { taxId, ...mutableChanges } = input;
    const changes = {
      ...mutableChanges,
      ...(taxId === undefined || taxId === current.taxId ? {} : { taxId }),
    } as UserProfileChanges;
    const profile = await this.repository.update(
      principal.userId,
      principal.workspaceId,
      current.taxId,
      changes,
    );

    if (!profile) {
      throw new ApiError(
        409,
        'PROFILE_UPDATE_CONFLICT',
        'The profile changed during this request. Reload it and try again.',
      );
    }
    return profile;
  }
}
