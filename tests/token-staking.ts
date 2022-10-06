import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { expect } from "chai";
import { TokenStaking } from "../target/types/token_staking";
import { PublicKey } from '@solana/web3.js';
import {
  checkTokenAccounts,
  createVault,
  getRewardAddress,
  getTokenAmounts,
  sleep,
} from "./fixtures/lib";
import { UserData, VaultData } from "./fixtures/vault";
import { Keypair } from '@solana/web3.js';

describe("token-staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenStaking as Program<TokenStaking>;

  it("Create Vault", async () => {
    const { vault } = await createVault(program);

    // fetch vault data
    const vaultData = await vault.fetch();

    // check the resultz
    expect(vaultData.rewardDuration.toNumber()).to.equal(1);
    expect(vaultData.stakeTokenCount).to.equal(500000);
    expect(vaultData.rewardMintAccount.toString()).to.equal(
      vault.mintAccount.toString()
    );
    expect(vaultData.funders.length).to.equal(5);
    expect(vaultData.status.initialized !== null).to.be.true;
  });

  it("Authorize and Unathorize Funder", async () => {
    const { authority, vault } = await createVault(program);

    // add funder
    const { funderAdded } = await vault.addFunder(authority);
    
    // fetch vault data
    let vaultData = await vault.fetch();

    // check added funder
    expect(vaultData.funders[0].toString()).to.equal(
      funderAdded.publicKey.toString()
    );

    // remove funder
    await vault.removeFunder(authority, funderAdded.publicKey);

    // fetch vault data
    vaultData = await vault.fetch();

    // check removed funder
    expect(vaultData.funders[0].toString()).to.equal(
      PublicKey.default.toString()
    );
  });

  it("Fund Amount", async () => {
    const { authority, vault, mint } = await createVault(program);

    // add funder
    const { funderAdded } = await vault.addFunder(authority);
    const funderAddedAccount = await mint.createAssociatedAccount(
      funderAdded.publicKey
    );

    const amount = new anchor.BN("1000000");
    await mint.mintTokens(funderAddedAccount, amount.toNumber());

    // fund
    await vault.fund({ 
      authority, 
      funder: funderAdded, 
      funderAccount: funderAddedAccount.key, 
      amount: new anchor.BN("1000000"), 
    });

    let vaultData = await vault.fetch();

    const rightSide = "1".padEnd(66, "0");
    // console.log(rightSide, vaultData.rewardRate);
    expect(vaultData.rewardRate.toString()).to.equal(
      new anchor.BN(rightSide, 2).toString()
    );
  });

  it("Creat User", async () => {
    const { vault, authority } = await createVault(program);

    // create user
    const { authority: userAuthrity, user } = await vault.createUser();
    const userData = await vault.fetchUser(user);
    const vaultData = await vault.fetch();

    expect(vaultData.userCount).to.equal(1);
    expect(userData.vault.toString()).to.equal(vault.key.toString());
    expect(userData.mintAccounts.length).to.equal(0);
    expect(userData.key.toString()).to.equal(
      userAuthrity.publicKey.toString()
    );
    expect(userData.rewardEarnedClaimed.toNumber()).to.equal(0);
    expect(userData.rewardEarnedPending.toNumber()).to.equal(0);
  });

  it("Stake and Unstake", async () => {
    let userData: UserData;
    let vaultData: VaultData;

    // create vault
    const { mint, authority, vault } = await createVault(program);
  
    // add funder
    const { funderAdded } = await vault.addFunder(authority);
    const funderTokenAccount = await mint.createAssociatedAccount(funderAdded.publicKey);
    
    const amount = new anchor.BN("1000000");
    await mint.mintTokens(funderTokenAccount, amount.toNumber());

    // fund
    await vault.fund({
      authority,
      funder: funderAdded,
      funderAccount: funderTokenAccount.key,
      amount: new anchor.BN("1000000"),
    });

    // create user and stake
    const { userAuthority, user, stakeAccount } = await vault.stake();

    // get user and vault data
    vaultData = await vault.fetch();
    userData = await vault.fetchUser(user);

    // check staked account is not owned by user anymore
    let stakeAccountOwned = await checkTokenAccounts(
      program,
      userAuthority.publicKey,
      stakeAccount.key,
    );

    expect(!stakeAccountOwned).to.be.true;

    // check user data and vault data
    expect(userData.mintStakedCount).to.equal(1);
    expect(userData.mintAccounts.length).to.equal(1);
    expect(userData.mintAccounts[0].toString()).to.equal(stakeAccount.key.toString());
    expect(vaultData.stakedCount).to.equal(1);

    // uncheck after 5 seconds
    await sleep(5000);
    await vault.unstake(userAuthority, user, stakeAccount);

    expect(
      await checkTokenAccounts(
        program,
        userAuthority.publicKey,
        stakeAccount.key,
      )
    ).to.be.true;
    
    // check user and vault data
    userData = await vault.fetchUser(user);
    vaultData = await vault.fetch();

    expect(userData.mintStakedCount).to.equal(0);
    expect(userData.mintAccounts.length).to.equal(0);
    expect(vaultData.stakedCount).to.equal(0);
    const firstEarned = userData.rewardEarnedPending.toNumber();

    // stake again after 5 seconds
    await sleep(5000);
    // console.log("Now staking again");
    const { stakeAccount: secondStakeAccount } = await vault.stake(userAuthority, user);
    userData = await vault.fetchUser(user);
    vaultData = await vault.fetch();

    expect(userData.mintStakedCount).to.equal(1);
    expect(userData.mintAccounts.length).to.equal(1);
    expect(userData.mintAccounts[0].toString()).to.equal(secondStakeAccount.key.toString());
    expect(vaultData.stakedCount).to.equal(1);
    expect(userData.rewardEarnedPending.toNumber()).to.equal(firstEarned);
  });

  it("Claim", async () => {
    let userData: UserData;
    // create vault
    const { mint, authority, vault } = await createVault(program);
    // add funder and fund
    const { funderAdded } = await vault.addFunder(authority);
    const funderTokenAccount = await mint.createAssociatedAccount(funderAdded.publicKey);

    const amount = new anchor.BN("1000000");
    await mint.mintTokens(funderTokenAccount, amount.toNumber());

    // fund
    await vault.fund({
      authority,
      funder: funderAdded,
      funderAccount: funderTokenAccount.key,
      amount: new anchor.BN("1000000"),
    });

    // create user and stake
    const { userAuthority, user, stakeAccount } = await vault.stake();
    // claim after 5 seconds
    await sleep(5000);
    await vault.claim(authority.publicKey, userAuthority, user);
    userData = await vault.fetchUser(user);

    expect(userData.rewardEarnedPending.toNumber()).to.equal(0);
    expect(userData.rewardEarnedClaimed.toNumber()).to.above(0);
  });

  it("Close User", async () => {
    const { vault } = await createVault(program);
    // create user
    const { authority: userAuthority, user} = await vault.createUser();
    // close user
    await vault.closeUser(userAuthority, user);
    const vaultData = await vault.fetch();
    expect(vaultData.userCount).to.equal(0);
  });

  it("Close Vault", async () => {
    // create vault
    const { authority, vault, mint } = await createVault(program);
    // add funder and fund
    const { funderAdded } = await vault.addFunder(authority);
    const funderTokenAccount = await mint.createAssociatedAccount(funderAdded.publicKey);
    
    const amount = new anchor.BN("1000000");
    await mint.mintTokens(funderTokenAccount, amount.toNumber());

    // fund
    await vault.fund({
      authority,
      funder: funderAdded,
      funderAccount: funderTokenAccount.key,
      amount: new anchor.BN("1000000"),
    });

    const refundee = Keypair.generate();
    const refundeeAccount = await vault.mint.getAssociatedTokenAddress(refundee.publicKey);

    // close program
    await vault.close(authority, refundee, refundeeAccount);
    const [reward, _] = await getRewardAddress(vault.key, program);
    const rewardTokenAccounts = await checkTokenAccounts(
      program,
      reward,
      vault.mintAccount
    );
    // expect(!rewardTokenAccounts).to.be.true;
    // expect(
    //   await getTokenAmounts(program, refundee.publicKey, refundeeAccount)
    // ).to.equal(1000000);
  });
});
