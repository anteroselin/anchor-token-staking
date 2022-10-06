use anchor_lang::prelude::*;
use crate::{
  state::{Vault, User, VaultStatus, ErrorCode},
  utils::update_rewards,
};

#[derive(Accounts)]
pub struct CloseUser<'info> {
  #[account(mut)]
  authority: Signer<'info>,
  
  #[account(
    mut,
    constraint = vault.status == VaultStatus::Initialized,
  )]
  vault: Account<'info, Vault>,

  #[account(
    mut,
    constraint = user.key == *authority.key,
    constraint = user.vault == *vault.to_account_info().key,
  )]
  user: Account<'info, User>
}

pub fn close_user(ctx: Context<CloseUser>) -> Result<()> {
  let vault = &mut ctx.accounts.vault;
  if vault.status != VaultStatus::Initialized {
    return Err(ErrorCode::VaultNotReady.into());
  }
  let user = &mut ctx.accounts.user;
  if user.reward_earned_pending > 0 {
    return Err(ErrorCode::EarnedPendingExist.into());
  }

  vault.user_count = vault.user_count.checked_sub(1).unwrap();
  update_rewards(vault, user).unwrap();
  Ok(())
}