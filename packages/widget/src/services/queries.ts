import { httpService } from './HttpService';

export const query = {} as const;

export const mutation = {
  generateNonce: () => ({
    mutationKey: ['tantoGenerateNonce'],
    mutationFn: httpService.generateNonceAPI,
  }),
  createAccount: () => ({
    mutationKey: ['tantoCreateAccount'],
    mutationFn: httpService.authenticateWithSiweAPI,
  }),
  initOTPPasswordless: () => ({
    mutationKey: ['tantoInitOTPPasswordless'],
    mutationFn: httpService.initOTPPasswordlessAPI,
  }),
  authenticateWithOTP: () => ({
    mutationKey: ['tantoAuthenticateWithOTP'],
    mutationFn: httpService.authenticateWithOtpAPI,
  }),
  getUserProfile: () => ({
    mutationKey: ['tantoGetUserProfileAPI'],
    mutationFn: httpService.getUserProfileAPI,
  }),
  createKeylessWallet: () => ({
    mutationKey: ['tantoCreateKeylessWallet'],
    mutationFn: httpService.createKeylessWalletAPI,
  }),
} as const;
