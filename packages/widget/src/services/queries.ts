import { headlessInjector } from './headlessInjector';

const authApi = headlessInjector.resolve('authApi');
const walletApi = headlessInjector.resolve('walletApi');

export const query = {} as const;

export const mutation = {
  generateNonce: () => ({
    mutationKey: ['tantoGenerateNonce'],
    mutationFn: authApi.generateNonce,
  }),
  createAccount: () => ({
    mutationKey: ['tantoCreateAccount'],
    mutationFn: authApi.authenticateWithSiwe,
  }),
  initOTPPasswordless: () => ({
    mutationKey: ['tantoInitOTPPasswordless'],
    mutationFn: authApi.initOTPPasswordless,
  }),
  authenticateWithOTP: () => ({
    mutationKey: ['tantoAuthenticateWithOTP'],
    mutationFn: authApi.authenticateWithOtp,
  }),
  getUserProfile: () => ({
    mutationKey: ['tantoGetUserProfileAPI'],
    mutationFn: walletApi.getUserProfile,
  }),
  createKeylessWallet: () => ({
    mutationKey: ['tantoCreateKeylessWallet'],
    mutationFn: walletApi.createKeylessWallet,
  }),
} as const;
