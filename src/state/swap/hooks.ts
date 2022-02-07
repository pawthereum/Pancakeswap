import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, ETHER, Fraction, JSBI, Token, TokenAmount, Trade } from '@pancakeswap-libs/sdk'
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
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput, setTotalTax, setTaxes } from './actions'
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
      const currencyUpdate = {
        field,
        currencyId: currency instanceof Token ? currency.address : currency === ETHER ? 'BNB' : '',
      }
      dispatch(selectCurrency(currencyUpdate))

      if (currencyUpdate.currencyId === 'BNB' ||
          currencyUpdate.currencyId === 'ETH' ||
          currencyUpdate.currencyId === '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' // TESTNET BNB
      ) return
      const taxes = await getTaxes(currencyUpdate.currencyId)
      console.log('taxes', taxes)
      const totalTax = taxes.find(t => t.isTotal)
      dispatch(setTotalTax({ totalTax: field == 'INPUT' ? totalTax.sellAmount.replace('%', '') : totalTax.buyAmount.replace('%', '') }))
      dispatch(setTaxes({ taxes }))
      // dispatch(setTaxes({ taxes: field === 'INPUT' ? taxes.filter(t => {
      //   t.
      // })}))
    },
    [dispatch]
  )

  async function getTaxes(currencyId: string) {
    const taxStructureAddress = await pawswap?.tokenTaxContracts(currencyId)
    if (!library) return null
    const taxStructure = getContract(taxStructureAddress, ITaxStructureABI, library, undefined)
    return await Promise.all([
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
      liquidityTaxBuyAmount, liquidityTaxSellAmount,
      burnTaxBuyAmount, burnTaxSellAmount,
      customTaxName, feeDecimal
    ]) => {
      console.log('got it')
      const taxes = [
        {
          name: tax1Name,
          buyAmount: parseFloat(tax1BuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(tax1SellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: tax2Name,
          buyAmount: parseFloat(tax2BuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(tax2SellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: tax3Name,
          buyAmount: parseFloat(tax3BuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(tax3SellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: tax4Name,
          buyAmount: parseFloat(tax4BuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(tax4SellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: tokenTaxName,
          buyAmount: parseFloat(tokenTaxBuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(tokenTaxSellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          isLiquidityTax: true,
          name: 'Liquidity Tax',
          buyAmount: parseFloat(liquidityTaxBuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(liquidityTaxSellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: 'Burn Tax',
          buyAmount: parseFloat(burnTaxBuyAmount) / 10**parseInt(feeDecimal) + '%',
          sellAmount: parseFloat(burnTaxSellAmount) / 10**parseInt(feeDecimal) + '%',
          isTotal: false,
          isCustom: false
        },
        {
          name: customTaxName,
          isCustom: true,
          isTotal: false,
          buyAmount: '0%',
          sellAmount: '0%',
        }
      ]
      const totals = {
        name: 'Total Tax',
        isCustom: false,
        isTotal: true,
        buyAmount: taxes.reduce(function (p, t) {
          if (!t.buyAmount) return p + 0
          return p + parseFloat(t?.buyAmount?.replace('%', ''))
        }, 0) + '%',
        sellAmount: taxes.reduce(function (p, t) {
          if (!t.sellAmount) return p + 0
          return p + parseFloat(t?.sellAmount?.replace('%', ''))
        }, 0) + '%',
      }
      taxes.push(totals)
      return taxes
    })
    .catch(err => err)
  }

  const onSwitchTokens = useCallback(() => {
    dispatch(switchCurrencies())
    // TODO: flip buy and sell taxes
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
    // console.log('~~~~~~~~~~TOTAL TAX: ', totalTax, '~~~~~~~~~')
    // const totalTaxParsed = !totalTax ? 0 : parseFloat(totalTax) / 100
    // const valueLessTaxes = (parseFloat(value) - parseFloat(value) * totalTaxParsed).toFixed(18).toString()
    // console.log('valueLessTaxes', valueLessTaxes)
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    console.log('typed parse', typedValueParsed)
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
  v2TradeWithTax: Trade | undefined
  inputError?: string
} {
  const { account } = useActiveWeb3React()

  const {
    independentField,
    totalTax,
    taxes,
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

  // do the same thing but account for tax -- get rid of above when we can
  const totalTaxNumber = totalTax ? parseFloat(totalTax.replace('%','')) : 0
  const typedValueAfterTax = !typedValue ? '0' : (parseFloat(typedValue) * ((100 - totalTaxNumber) / 100)).toFixed(9).toString()

  const parsedAmountPostTax = tryParseAmount(typedValueAfterTax, (isExactIn ? inputCurrency : outputCurrency) ?? undefined, totalTax)
  const bestTradeTaxedExactIn = useTradeExactIn(isExactIn ? parsedAmountPostTax : undefined, outputCurrency ?? undefined)
  const bestTradeTaxedExactOut = useTradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmountPostTax : undefined)
  const v2TradeWithTax = isExactIn ? bestTradeTaxedExactIn : bestTradeTaxedExactOut
  // end of doing the same thing
  // const newTrade = useTradeExactOut(inputCurrency ?? undefined, !isExactIn ? remainingAfterTax : undefined)
  // console.log('total tax num', totalTaxNumber)
  // console.log(totalTaxFraction)
  // console.log('remaining', remainingAfterTax)
  // console.log('parsed amount', parsedAmount)

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
  const totalTaxBips = totalTaxNumber * 100

  const slippageAdjustedAmounts = v2Trade && allowedSlippage && computeSlippageAdjustedAmounts(v2Trade, allowedSlippage + totalTaxBips)
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
    v2TradeWithTax: v2TradeWithTax ?? undefined,
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
    taxes: [],
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
        taxes: [],
        recipient: parsed.recipient,
      })
    )

    setResult({ inputCurrencyId: parsed[Field.INPUT].currencyId, outputCurrencyId: parsed[Field.OUTPUT].currencyId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return result
}
