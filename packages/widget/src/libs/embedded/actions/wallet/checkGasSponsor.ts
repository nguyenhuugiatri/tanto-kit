import { EmbeddedCommunicator } from '../../embedded-communicator';

export type CheckGasSponsorParameters = Record<string, any>;

export interface CheckGasSponsorRawResult {
  payer: {
    address: string;
  };
  hasSponsorQuotaApplied: boolean;
  sponsorQuota?: number;
}

export interface CheckGasSponsorResult {
  isContractInWhiteList: boolean;
  freeSponsoringLeft: number;
}

export async function checkGasSponsor<C extends EmbeddedCommunicator, P extends CheckGasSponsorParameters>(
  communicator: C,
  parameters: P,
) {
  try {
    const { hasSponsorQuotaApplied, sponsorQuota } = await communicator.send<CheckGasSponsorRawResult>({
      eventName: 'waypoint:check-gas-sponsor',
      payload: parameters,
    });
    return {
      isContractInWhiteList: hasSponsorQuotaApplied === false,
      freeSponsoringLeft: sponsorQuota ?? 0,
    };
  } catch {
    return {
      isContractInWhiteList: false,
      freeSponsoringLeft: 0,
    };
  }
}
