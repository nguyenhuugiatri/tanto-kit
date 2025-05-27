export const queryKeys = {
  whoAmI: () => ['whoAmI'],
} as const;

export const mutationKeys = {
  sendOTP: () => ['sendOTP'],
  loginWithOTP: () => ['loginWithOTP'],
  logout: () => ['logout'],
  createWallet: () => ['createWallet'],
  signMessage: () => ['signMessage'],
  sendTransaction: () => ['sendTransaction'],
  checkGasSponsor: () => ['checkGasSponsor'],
} as const;
