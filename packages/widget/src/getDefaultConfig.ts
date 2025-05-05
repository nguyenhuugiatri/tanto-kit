import { IWaypointProviderConfigs } from '@sky-mavis/tanto-connect';
import { roninWallet, waypoint } from '@sky-mavis/tanto-wagmi';
import { Chain, ronin, saigon } from 'viem/chains';
import { Config, createConfig, CreateConfigParameters, http } from 'wagmi';
import { walletConnect } from 'wagmi/connectors';

import { WEB_WALLET_LINK } from './constants';

const DEFAULT_WALLETCONNECT_CONFIGS = {
  projectId: 'd2ef97836db7eb390bcb2c1e9847ecdc',
  metadata: {
    name: 'Ronin Wallet',
    description: 'Your passport into a digital nation',
    icons: ['https://cdn.skymavis.com/wallet/web-app/logo/ronin.png'],
    url: WEB_WALLET_LINK,
  },
};

interface DefaultConfigProps
  extends Partial<Omit<CreateConfigParameters, 'client' | 'connectors' | 'transports' | 'chains'>> {
  appName?: string;
  appIcon?: string;
  appDescription?: string;
  appUrl?: string;
  walletConnectProjectId?: string;
  keylessWalletConfigs: IWaypointProviderConfigs & { clientId: string };
  chains?: readonly [Chain, ...Chain[]];
}

const createTransports = (chains: readonly [Chain, ...Chain[]]): CreateConfigParameters['transports'] =>
  Object.fromEntries(chains.map(chain => [chain.id, http()]));

const createConnectors = ({
  appName = DEFAULT_WALLETCONNECT_CONFIGS.metadata.name,
  appIcon = DEFAULT_WALLETCONNECT_CONFIGS.metadata.icons[0],
  appDescription = DEFAULT_WALLETCONNECT_CONFIGS.metadata.description,
  appUrl = DEFAULT_WALLETCONNECT_CONFIGS.metadata.url,
  walletConnectProjectId = DEFAULT_WALLETCONNECT_CONFIGS.projectId,
  keylessWalletConfigs,
}: DefaultConfigProps) => [
  roninWallet(),
  waypoint(keylessWalletConfigs),
  walletConnect({
    showQrModal: false,
    projectId: walletConnectProjectId,
    metadata: {
      name: appName,
      description: appDescription,
      icons: [appIcon],
      url: appUrl,
    },
  }),
];

export const getDefaultConfig = ({
  appName,
  appIcon,
  appDescription,
  appUrl,
  walletConnectProjectId,
  keylessWalletConfigs,
  chains = [ronin, saigon],
  multiInjectedProviderDiscovery = true,
  ...rest
}: DefaultConfigProps): Config => {
  const config = {
    chains,
    transports: createTransports(chains),
    connectors: createConnectors({
      appName,
      appIcon,
      appDescription,
      appUrl,
      walletConnectProjectId,
      keylessWalletConfigs,
    }),
    multiInjectedProviderDiscovery,
    ...rest,
  };

  // @ts-ignore
  return createConfig(config);
};
