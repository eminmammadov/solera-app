import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';

export function getAssociatedTokenAddressSync(input: {
  mint: PublicKey;
  owner: PublicKey;
  allowOwnerOffCurve?: boolean;
  tokenProgramId: PublicKey;
  associatedTokenProgramId: PublicKey;
}): PublicKey {
  const {
    mint,
    owner,
    allowOwnerOffCurve = false,
    tokenProgramId,
    associatedTokenProgramId,
  } = input;

  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('Associated token account owner must be on curve.');
  }

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId,
  );
  return address;
}

export function createAssociatedTokenAccountIdempotentInstruction(input: {
  payer: PublicKey;
  associatedToken: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
  associatedTokenProgramId: PublicKey;
}): TransactionInstruction {
  const {
    payer,
    associatedToken,
    owner,
    mint,
    tokenProgramId,
    associatedTokenProgramId,
  } = input;

  return new TransactionInstruction({
    programId: associatedTokenProgramId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}
