import useWallet from '@/application/wallet/useWallet'

export async function getEphemeralSigners() {
  const { adapter } = useWallet.getState()
  return adapter &&
    'standard' in adapter &&
    'fuse:getEphemeralSigners' in adapter.wallet.features &&
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    adapter.wallet.features['fuse:getEphemeralSigners'].getEphemeralSigners
}