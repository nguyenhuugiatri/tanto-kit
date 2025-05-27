export interface Account {
  sub: string;
  name: string;
  email: string;
  wallet?:
    | {
        identity: `0x${string}` | undefined;
        secondary: `0x${string}` | undefined;
        defaultWallet: `0x${string}` | undefined;
      }
    | undefined;
  is_guest?: boolean | undefined;
  is_wallet_unlocked: boolean;
}
