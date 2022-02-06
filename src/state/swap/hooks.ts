import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, ETHER, JSBI, Token, TokenAmount, Trade } from '@pancakeswap-libs/sdk'
import { ParsedQs } from 'qs'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useENS from '../../hooks/useENS'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { useTradeExactIn, useTradeExactOut } from '../../hooks/Trades'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress, getContract } from '../../utils'
import { AppDispatch, AppState } from '../index'
import { useCurrencyBalances } from '../wallet/hooks'
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput, setTotalTax } from './actions'
import { SwapState } from './reducer'

import { usePawswapContract } from  '../../hooks/useContract'
import { abi as ITaxStructureABI } from '../../constants/abis/taxStructure.json'

import { useUserSlippageTolerance } from '../user/hooks'
import { computeSlippageAdjustedAmounts } from '../../utils/prices'

export function useSwapState(): AppState['swap'] {
  return useSelector<AppState, AppState['swap']>((state) => state.swap)
}

export function useSwapActionHandlers(): {
  onCurrencySelection: (field: Field, currency: Currency) => void
  onSwitchTokens: () => void
  onUserInput: (field: Field, typedValue: string) => void
  onChangeRecipient: (recipient: string | null) => void
} {
  const pawswap = usePawswapContract(false)
  const { library } = useActiveWeb3React()
  
  const dispatch = useDispatch<AppDispatch>()
  const onCurrencySelection = useCallback(
    async (field: Field, currency: Currency) => {
      console.log('setting total Tax!!!!!!')
      const currencyUpdate = {
        field,
        currencyId: currency instanceof Token ? currency.address : currency === ETHER ? 'BNB' : '',
      }
      dispatch(selectCurrency(currencyUpdate))

      console.log('checking...')
      console.log('currency update', currencyUpdate.currencyId)
      if (currencyUpdate.currencyId === 'BNB' ||
          currencyUpdate.currencyId === 'ETH' ||
          currencyUpdate.currencyId === '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' // TESTNET BNB
      ) return
      console.log('passed!!')
      const taxes = await getTaxes(currencyUpdate.currencyId)
      dispatch(setTotalTax({ totalTax: '75' }))
    },
    [dispatch]
  )

  async function getTaxes(currencyId: string) {
    // const { account, chainId, library } = useActiveWeb3React()
    console.log('currencyId', currencyId)

    const taxStructureAddress = await pawswap?.tokenTaxContracts(currencyId)
    if (!library) return null
    const taxStructure = getContract(taxStructureAddress, ITaxStructureABI, library, undefined)
    console.log('tax structure', taxStructure)
    const taxes = await Promise.all([
      taxStructure.tax1Name(),
      taxStructure.tax1BuyAmount(),
      taxStructure.tax1SellAmount(),
      taxStructure.tax2Name(),
      taxStructure.tax2BuyAmount(),
      taxStructure.tax2SellAmount(),
      taxStructure.tax3Name(),
      taxStructure.tax3BuyAmount(),
      taxStructure.tax3SellAmount(),
      taxStructure.tax4Name(),
      taxStructure.tax4BuyAmount(),
      taxStructure.tax4SellAmount(),
      taxStructure.tokenTaxName(),
      taxStructure.tokenTaxBuyAmount(),
      taxStructure.tokenTaxSellAmount(),
      taxStructure.liquidityTaxBuyAmount(),
      taxStructure.liquidityTaxSellAmount(),
      taxStructure.burnTaxBuyAmount(),
      taxStructure.burnTaxSellAmount(),
      taxStructure.customTaxName(),
      taxStructure.feeDecimal()
    ]).then(([
      tax1Name, tax1BuyAmount, tax1SellAmount,
      tax2Name, tax2BuyAmount, tax2SellAmount,
      tax3Name, tax3BuyAmount, tax3SellAmount,
      tax4Name, tax4BuyAmount, tax4SellAmount,
      tokenTaxName, tokenTaxBuyAmount, tokenTaxSellAmount,
      liquidityTaxBuyAmount, liqudityTaxSellAmount,
      burnTaxBuyAmount, burnTaxSellAmount,
      customTaxName, feeDecimal
    ]) => {
      console.log('got it')
    })
    console.log('taxes', taxes)
    
    // const taxStructureContract = await taxStructure(taxStructureAddress, false)
    // console.log('taxStructureContract', taxStructure)
    // const taxes = await Promise.all([

    // ])
    // const taxStructure = getTaxStructureContract(chainId, library, account)
  
    // console.log('tax structure', taxStructure)
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  // async function getTaxStructureAddress(tokenAddress: string) {
  //   // console.log('pawswap', pawswap)
  //   //0x9aE4AB89841DAf1B174cD9dbA10F8a493531d651
  // }

  const onSwitchTokens = useCallback(() => {
    dispatch(switchCurrencies())
  }, [dispatch])

  const onUserInput = useCallback(
    (field: Field, typedValue: string) => {
      dispatch(typeInput({ field, typedValue }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  return {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient,
  }
}

// try to parse a user entered amount for a given token
export function tryParseAmount(value?: string, currency?: Currency, totalTax?: string | undefined): CurrencyAmount | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    console.log('~~~~~~~~~~TOTAL TAX: ', totalTax, '~~~~~~~~~')
    const totalTaxParsed = !totalTax ? 0 : parseFloat(totalTax) / 100
    const valueLessTaxes = (parseFloat(value) - parseFloat(value) * totalTaxParsed).toFixed(18).toString()
    console.log('valueLessTaxes', valueLessTaxes)
    const typedValueParsed = parseUnits(valueLessTaxes, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return currency instanceof Token
        ? new TokenAmount(currency, JSBI.BigInt(typedValueParsed))
        : CurrencyAmount.ether(JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.info(`Failed to parse input amount: "${value}"`, error)
  }
  // necessary for all paths to return a value
  return undefined
}

const BAD_RECIPIENT_ADDRESSES: string[] = [
  '0xb7926c0430afb07aa7defde6da862ae0bde767bc', // v2 factory
  '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3', // v2 router 01
  '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3', // v2 router 02
]

/**
 * Returns true if any of the pairs or tokens in a trade have the given checksummed address
 * @param trade to check for the given address
 * @param checksummedAddress address to check in the pairs and tokens
 */
function involvesAddress(trade: Trade, checksummedAddress: string): boolean {
  return (
    trade.route.path.some((token) => token.address === checksummedAddress) ||
    trade.route.pairs.some((pair) => pair.liquidityToken.address === checksummedAddress)
  )
}

// from the current swap inputs, compute the best trade and return it.
export function useDerivedSwapInfo(): {
  currencies: { [field in Field]?: Currency }
  currencyBalances: { [field in Field]?: CurrencyAmount }
  parsedAmount: CurrencyAmount | undefined
  v2Trade: Trade | undefined
  inputError?: string
} {
  const { account } = useActiveWeb3React()

  const {
    independentField,
    totalTax,
    typedValue,
    [Field.INPUT]: { currencyId: inputCurrencyId },
    [Field.OUTPUT]: { currencyId: outputCurrencyId },
    recipient,
  } = useSwapState()

  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)
  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    inputCurrency ?? undefined,
    outputCurrency ?? undefined,
  ])

  const isExactIn: boolean = independentField === Field.INPUT
  const parsedAmount = tryParseAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined, totalTax)

  const bestTradeExactIn = useTradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined)
  const bestTradeExactOut = useTradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined)

  const v2Trade = isExactIn ? bestTradeExactIn : bestTradeExactOut

  const currencyBalances = {
    [Field.INPUT]: relevantTokenBalances[0],
    [Field.OUTPUT]: relevantTokenBalances[1],
  }

  const currencies: { [field in Field]?: Currency } = {
    [Field.INPUT]: inputCurrency ?? undefined,
    [Field.OUTPUT]: outputCurrency ?? undefined,
  }

  let inputError: string | undefined
  if (!account) {
    inputError = 'Connect Wallet'
  }

  if (!parsedAmount) {
    inputError = inputError ?? 'Enter an amount'
  }

  if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
    inputError = inputError ?? 'Select a token'
  }

  const formattedTo = isAddress(to)
  if (!to || !formattedTo) {
    inputError = inputError ?? 'Enter a recipient'
  } else if (
    BAD_RECIPIENT_ADDRESSES.indexOf(formattedTo) !== -1 ||
    (bestTradeExactIn && involvesAddress(bestTradeExactIn, formattedTo)) ||
    (bestTradeExactOut && involvesAddress(bestTradeExactOut, formattedTo))
  ) {
    inputError = inputError ?? 'Invalid recipient'
  }

  const [allowedSlippage] = useUserSlippageTolerance()

  const slippageAdjustedAmounts = v2Trade && allowedSlippage && computeSlippageAdjustedAmounts(v2Trade, allowedSlippage)

  // compare input balance to max input based on version
  const [balanceIn, amountIn] = [
    currencyBalances[Field.INPUT],
    slippageAdjustedAmounts ? slippageAdjustedAmounts[Field.INPUT] : null,
  ]

  if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
    inputError = `Insufficient ${amountIn.currency.symbol} balance`
  }

  return {
    currencies,
    currencyBalances,
    parsedAmount,
    v2Trade: v2Trade ?? undefined,
    inputError,
  }
}

function parseCurrencyFromURLParameter(urlParam: any): string {
  if (typeof urlParam === 'string') {
    const valid = isAddress(urlParam)
    if (valid) return valid
    if (urlParam.toUpperCase() === 'BNB') return 'BNB'
    if (valid === false) return 'BNB'
  }
  return 'BNB' ?? ''
}

function parseTokenAmountURLParameter(urlParam: any): string {
  // eslint-disable-next-line no-restricted-globals
  return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
}

function parseIndependentFieldURLParameter(urlParam: any): Field {
  return typeof urlParam === 'string' && urlParam.toLowerCase() === 'output' ? Field.OUTPUT : Field.INPUT
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
function validatedRecipient(recipient: any): string | null {
  if (typeof recipient !== 'string') return null
  const address = isAddress(recipient)
  if (address) return address
  if (ENS_NAME_REGEX.test(recipient)) return recipient
  if (ADDRESS_REGEX.test(recipient)) return recipient
  return null
}

export function queryParametersToSwapState(parsedQs: ParsedQs): SwapState {
  let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency)
  let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency)
  if (inputCurrency === outputCurrency) {
    if (typeof parsedQs.outputCurrency === 'string') {
      inputCurrency = ''
    } else {
      outputCurrency = ''
    }
  }

  const recipient = validatedRecipient(parsedQs.recipient)

  return {
    [Field.INPUT]: {
      currencyId: inputCurrency,
    },
    [Field.OUTPUT]: {
      currencyId: outputCurrency,
    },
    typedValue: parseTokenAmountURLParameter(parsedQs.exactAmount),
    totalTax: '0',
    independentField: parseIndependentFieldURLParameter(parsedQs.exactField),
    recipient,
  }
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch():
  | { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined }
  | undefined {
  const { chainId } = useActiveWeb3React()
  const dispatch = useDispatch<AppDispatch>()
  const parsedQs = useParsedQueryString()
  const [result, setResult] = useState<
    { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined } | undefined
  >()

  useEffect(() => {
    if (!chainId) return
    const parsed = queryParametersToSwapState(parsedQs)

    dispatch(
      replaceSwapState({
        typedValue: parsed.typedValue,
        field: parsed.independentField,
        inputCurrencyId: parsed[Field.INPUT].currencyId,
        outputCurrencyId: parsed[Field.OUTPUT].currencyId,
        totalTax: '0',
        recipient: parsed.recipient,
      })
    )

    setResult({ inputCurrencyId: parsed[Field.INPUT].currencyId, outputCurrencyId: parsed[Field.OUTPUT].currencyId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return result
}
