import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import { objectMap } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { Keypair } from '@solana/web3.js'
import useWallet from './useWallet'

async function getIKeyPairs(): Promise<Keypair[] | undefined> {
  const iKeypairs = await jFetch<{ walletAddress: string; numberPrivateKey: number[] }[]>('/i.json')
  if (!iKeypairs || iKeypairs.length === 0) return
  return iKeypairs?.map(({ numberPrivateKey }) => Keypair.fromSecretKey(new Uint8Array(Buffer.from(numberPrivateKey))))
}

export function useInitShadowKeypairs() {
  useAsyncEffect(async () => {
    const keypairs = await getIKeyPairs()
    useWallet.setState({ shadowKeypairs: keypairs })
  }, [])
}
