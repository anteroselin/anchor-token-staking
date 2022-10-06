use anchor_lang::prelude::*;
use crate::state::{Vault, VaultStatus, User, USER_SIZE};
use crate::constant::{VAULT_USER_SEED};
use crate::utils::get_now_timestamp;

#[derive(Accounts)]
#[instruction(user_bump: u8)]
pub struct CreateUser<'info> {
  // authority
  #[account(mut)]
  authority: Signer<'info>,

  // vault
  #[account(
    mut,
    constraint = vault.status == VaultStatus::Initialized
  )]
  vault: Account<'info, Vault>,

  // user 
  #[account(
    init,
    payer = authority,
    space = USER_SIZE,
    seeds = [
        VAULT_USER_SEED.as_bytes(), vault.key().as_ref(), authority.key.as_ref()
    ], bump
    // bump = user_bump,
  )]
  user: Account<'info, User>,

  system_program: Program<'info, System>,
}

pub fn create_user(ctx: Context<CreateUser>, user_bump: u8) -> Result<()> {
  let user = &mut ctx.accounts.user;
  user.vault = *ctx.accounts.vault.to_account_info().key;
  user.key = *ctx.accounts.authority.key;
  user.reward_earned_claimed = 0;
  user.reward_earned_pending = 0;
  user.mint_staked_count = 0;
  user.mint_accounts = vec![];
  user.last_stake_time = get_now_timestamp();

  let vault = &mut ctx.accounts.vault;
  vault.user_count = vault.user_count.checked_add(1).unwrap();
  Ok(())
}
