# data flow

step1: jsonInfo

basic info from CDN. use `fetch()`

⬇

step2: sdkParsedInfo

use SDK method: `Liquidity.getInfo()`

from `string` -> `publicKey` , `number` -> `BN`

⬇

step3: hydratedInfo

add some costomized computed info

they are helper functions or convenient data for UI

### overview (Hooks)

- [useLiquidityCache](./src/application/liquidity/useLiquidityCache.ts) (don't use it in UI)
  - store for all liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo)
- [useLiquidity](./src/application/liquidity/useLiquidity.ts)
  - access hydratedInfo
  - refresh info
- [useLiquidityInitAction](./src/application/liquidity/useLiquidityInitAction.ts)
  - fetch json info
  - base on user's balance, sdk parse the json info
  - base on sdk parsed info, generate hydrated info

### overview (tools)

- [getPairTokenAmount](./src/application/liquidity/tools/getPairTokenAmount.ts)

# application overview

## zustand stores

- useWallet
  ```ts
  type WalletStore = {
    // owner
    owner: PublicKey | null
    wallets: Wallet[]
    adapter: WalletAdapter | SignerWalletAdapter | MessageSignerWalletAdapter | null
    connected: boolean
    disconnecting: boolean
    connecting: boolean
    select(walletName: WalletName): void
    disconnect(): Promise<unknown>
    /** HexAddress is token account address */
    balances: Record<HexAddress, TokenAmount>
    /** it's key is [RpcUrl]+[owner] */
    tokenAccountsCache: Record<`${RpcUrl}+${WalletOwner}`, TokenAccount[]>
    tokenAccounts: TokenAccount[]
  }
  ```
- usePairInfo

  ```ts
  type PairInfoStore = {
    pairInfo: Record<HexAddress, PairInfoResponseItem>
    lpPrices: Record<HexAddress, Price | null>
  }
  ```

## features

- \[wallet\]

external:

- useEffect in [PopSystemStack](./src/components/PopSystemStack.tsx)
  upload pop functions
  if must access `PopSystemStack`'s state. so can't isolate the function
