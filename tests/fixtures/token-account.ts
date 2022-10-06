import * as anchor from "@project-serum/anchor";
import { Mint } from "./mint";
import { TokenStaking } from "../../target/types/token_staking";

export class TokenAccount<
  T extends anchor.web3.PublicKey | anchor.web3.Keypair
> {
  constructor(
    public program: anchor.Program<TokenStaking>,
    public key: anchor.web3.PublicKey,
    public mint: Mint,
    public owner: T
  ) {}
}
