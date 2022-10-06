import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TokenStaking } from "../../target/types/token_staking";
import { Mint } from "./mint";
import { Vault } from "./vault";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const VAULT_REWARD_SEED = "x_token_vault_reward";
const VAULT_USER_SEED = "x_token_vault_user";

function toPublicKey<T extends PublicKey | Keypair>(val: T): PublicKey {
  if ("publicKey" in val) {
    return val.publicKey;
  } else {
    return val;
  }
}

async function getRewardAddress(
  source: PublicKey,
  program: Program<TokenStaking>
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_REWARD_SEED), source.toBuffer()],
    program.programId
  );
}

async function getUserAddress(
  vault: PublicKey,
  authority: PublicKey,
  program: Program<TokenStaking>
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_USER_SEED), vault.toBuffer(), authority.toBuffer()],
    program.programId
  );
}

async function spawnMoney(
  program: anchor.Program<TokenStaking>,
  to: PublicKey,
  sol: number
): Promise<anchor.web3.TransactionSignature> {
  const lamports = sol * anchor.web3.LAMPORTS_PER_SOL;
  const transaction = new anchor.web3.Transaction();
  transaction.add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: program.provider.wallet.publicKey,
      lamports,
      toPubkey: to,
    })
  );
  return await program.provider.sendAndConfirm(transaction, [], {
    commitment: "confirmed",
  });
}

async function createVault(program: Program<TokenStaking>): Promise<{
  mint: Mint;
  authority: Keypair;
  vault: Vault;
}> {
  // create reward token
  const mint = await Mint.create(program);

  // create vault
  const { authority, vault } = await Vault.create({
    program,
    mint,
    duration: 1,
    stakeTokenCount: 500000,
  });

  return {
    mint,
    authority,
    vault,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkTokenAccounts(
  program: Program<TokenStaking>,
  owner: PublicKey,
  tokenAccount: PublicKey
): Promise<boolean> {
  const { value: accounts } =
    await program.provider.connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey(TOKEN_PROGRAM_ID),
    });

  const checkedAccounts = accounts.filter(
    (t) => t.pubkey.toString() === tokenAccount.toString()
  );

  return checkedAccounts.length > 0;
}

async function getTokenAmounts(
  program: Program<TokenStaking>,
  owner: PublicKey,
  tokenAccount: PublicKey
): Promise<number> {
  const { value: accounts } =
    await program.provider.connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey(TOKEN_PROGRAM_ID),
    });

  const checkedAccounts = accounts.filter(
    (t) => t.pubkey.toString() === tokenAccount.toString()
  );

  if (checkedAccounts.length > 0) {
    console.log(checkedAccounts[0].account.data.parsed.info.tokenAmount);
    return checkedAccounts[0].account.data.parsed.info.tokenAmount as number;
  }

  return 0;
}

export {
  toPublicKey,
  getRewardAddress,
  getUserAddress,
  spawnMoney,
  createVault,
  sleep,
  checkTokenAccounts,
  getTokenAmounts,
};
