import { Account } from '../embedded-auth';
import { EmbeddedCommunicator } from '../embedded-communicator';

export interface WhoAmIResult {
  account: Account | null;
}

export async function whoAmI<C extends EmbeddedCommunicator>(communicator: C) {
  // TODO
  await communicator.waitForConnected();
  const { account } = await communicator.send<WhoAmIResult>({
    eventName: 'waypoint:whoami',
  });
  return account;
}
