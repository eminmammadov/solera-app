import { BadRequestException, Injectable } from '@nestjs/common';

export interface StakePreparationResolution<TPayload> {
  mode: 'ONCHAIN_PREPARED';
  payload: TPayload;
}

export interface ClaimPreparationResolution<TPayload> {
  payload: TPayload;
}

const toFailureReason = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
};

@Injectable()
export class StakingPreparationModeService {
  async resolveStakePreparation<TPayload>(input: {
    canPrepare: boolean;
    missingReason: string;
    prepare?: () => Promise<TPayload>;
  }): Promise<StakePreparationResolution<TPayload>> {
    if (!input.canPrepare || !input.prepare) {
      throw new BadRequestException(input.missingReason);
    }

    try {
      return {
        mode: 'ONCHAIN_PREPARED',
        payload: await input.prepare(),
      };
    } catch (error) {
      throw new BadRequestException(
        toFailureReason(error, 'On-chain staking envelope is not ready yet.'),
      );
    }
  }

  async resolveClaimPreparation<TPayload>(input: {
    canPrepare: boolean;
    missingReason: string;
    prepare?: () => Promise<TPayload>;
  }): Promise<ClaimPreparationResolution<TPayload>> {
    if (!input.canPrepare || !input.prepare) {
      throw new BadRequestException(input.missingReason);
    }

    try {
      return {
        payload: await input.prepare(),
      };
    } catch (error) {
      throw new BadRequestException(
        toFailureReason(error, 'On-chain claim envelope is not ready yet.'),
      );
    }
  }

  assertStakeWriteAllowedForSource(sourceMode: string) {
    if (sourceMode.trim().toUpperCase() !== 'ONCHAIN_PREPARED') {
      throw new BadRequestException(
        'Legacy staking flow is retired. Prepare and execute the on-chain stake transaction first.',
      );
    }
  }

  assertClaimWriteAllowedForExecution(executionSignature?: string | null) {
    if (!executionSignature) {
      throw new BadRequestException(
        'Legacy claim flow is retired. Execute the on-chain claim transaction first.',
      );
    }
  }
}
