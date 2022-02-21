import { ChainId, JSBI, Percent, Token, WETH } from '@pancakeswap-libs/sdk'

export const ROUTER_ADDRESS = '0x9a322c33F0A7290700AEfE962B3a6173e63e2b64'
export const PAWSWAP_ADDRESS = '0xb670d81a3123672b9e41225c88bdc50973cf1d86'

export const PAWTH_CHARITY_WALLET = '0x9e84fe006aa1c290f4cbcd78be32131cbf52cb23'

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[]
}

const swapChainId = ChainId.BSCTESTNET;

export const DAI = new Token(swapChainId, '0x8a9424745056Eb399FD19a0EC26A14316684e274', 18, 'DAI', 'Dai Stablecoin');
export const BUSD = new Token(swapChainId, '0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7', 18, 'BUSD', 'Binance USD');
export const USDT = new Token(swapChainId, '0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684', 18, 'USDT', 'Tether USD');
export const ETH = new Token(swapChainId, '0x8babbb98678facc7342735486c851abd7a0d17ca', 18, 'ETH', 'Ethereum');
export const WBNB = new Token(swapChainId, '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', 18, 'WBNB', 'Wrapped BNB');
export const PAWTH = new Token(swapChainId, '0x409e215738E31d8aB252016369c2dd9c2008Fee0', 9, 'PAWTH', 'Pawthereum')

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.BSCTESTNET]: [WETH[ChainId.BSCTESTNET]],
}

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [swapChainId]: [...WETH_ONLY[swapChainId], PAWTH, DAI, BUSD, USDT, ETH],
}

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [swapChainId]: {},
}

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [swapChainId]: [...WETH_ONLY[swapChainId], PAWTH, DAI, BUSD, USDT],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [swapChainId]: [...WETH_ONLY[swapChainId], PAWTH, DAI, BUSD, USDT],
}

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [swapChainId]: [
    [ PAWTH, WBNB ],
    [ BUSD, WBNB ],
    [ WBNB, PAWTH],
    [ USDT, BUSD ],
    [ USDT, WBNB ],
    [ DAI, USDT ],
    [ DAI, WBNB ],
  ],
}

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 80
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE) // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH