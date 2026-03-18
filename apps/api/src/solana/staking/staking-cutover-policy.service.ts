import { BadRequestException, Injectable } from '@nestjs/common';
import { readOptionalEnv } from '../../common/env';
import type { StakingCutoverPolicySnapshot } from './staking.types';

const parseBooleanEnv = (name: string): boolean => {
  const raw = readOptionalEnv(name);
  if (!raw) return false;

  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

@Injectable()
export class StakingCutoverPolicyService {
  getSnapshot(): StakingCutoverPolicySnapshot {
    const migrationWindowActive = parseBooleanEnv(
      'STAKING_MIGRATION_WINDOW_ACTIVE',
    );
    const freezeLegacyStakeWrites = parseBooleanEnv(
      'STAKING_LEGACY_STAKE_WRITE_FREEZE',
    );
    const freezeLegacyClaimWrites = parseBooleanEnv(
      'STAKING_LEGACY_CLAIM_WRITE_FREEZE',
    );
    const customReason = readOptionalEnv('STAKING_CUTOVER_NOTICE');

    const reason =
      customReason ??
      (migrationWindowActive ||
      freezeLegacyStakeWrites ||
      freezeLegacyClaimWrites
        ? 'Staking cutover is in progress. Legacy staking writes are temporarily disabled.'
        : null);

    return {
      migrationWindowActive,
      freezeLegacyStakeWrites,
      freezeLegacyClaimWrites,
      reason,
    };
  }

  isLegacyStakeWriteFrozen(): boolean {
    return this.getSnapshot().freezeLegacyStakeWrites;
  }

  isLegacyClaimWriteFrozen(): boolean {
    return this.getSnapshot().freezeLegacyClaimWrites;
  }

  assertLegacyStakeWriteAllowed() {
    if (!this.isLegacyStakeWriteFrozen()) {
      return;
    }

    throw new BadRequestException(
      this.getSnapshot().reason ??
        'Legacy stake writes are frozen for the staking migration window.',
    );
  }

  assertLegacyClaimWriteAllowed() {
    if (!this.isLegacyClaimWriteFrozen()) {
      return;
    }

    throw new BadRequestException(
      this.getSnapshot().reason ??
        'Legacy claim writes are frozen for the staking migration window.',
    );
  }
}
