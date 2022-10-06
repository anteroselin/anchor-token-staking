mod constant;
mod instructions;
mod state;
mod utils;

use anchor_lang::prelude::*;
use instructions::*;


declare_id!("DxrvjScsVADM9UQXTHrrv6k7vX61uZU1Dm6SBuUp63T7");

#[program]
pub mod token_staking {
    use super::*;

    pub fn create_vault(
        ctx: Context<CreateVault>,
        reward_bump: u8,
        reward_duration: u64,
        stake_token_count: u32,
    ) -> Result<()> {
        create_vault::create_vault(ctx, reward_bump, reward_duration, stake_token_count)
    }

    pub fn authroize_funder(ctx: Context<ControlFunder>, funder: Pubkey) -> Result<()> {
        control_funder::authroize_funder(ctx, funder)
    }

    pub fn unauthorize_funder(ctx: Context<ControlFunder>, funder: Pubkey) -> Result<()> {
        control_funder::unauthorize_funder(ctx, funder)
    }

    pub fn fund(ctx: Context<Fund>, amount: u64) -> Result<()> {
        fund::fund(ctx, amount)
    }

    pub fn create_user(ctx: Context<CreateUser>, user_bump: u8) -> Result<()> {
        create_user::create_user(ctx, user_bump)
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        stake::stake(ctx)
    }

    pub fn unstake(ctx: Context<Unstake>, vault_stake_bump: u8) -> Result<()> {
        unstake::unstake(ctx, vault_stake_bump)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim::claim(ctx)
    }

    pub fn close_user(ctx: Context<CloseUser>) -> Result<()> {
        close_user::close_user(ctx)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        close_vault::close_vault(ctx)
    }
}

