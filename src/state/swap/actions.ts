import { createAction } from '@reduxjs/toolkit'

export enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT'
}

export const selectCurrency = createAction<{ field: Field; currencyId: string }>('swap/selectCurrency')
export const switchCurrencies = createAction<void>('swap/switchCurrencies')
export const typeInput = createAction<{ field: Field; typedValue: string }>('swap/typeInput')
export const replaceSwapState = createAction<{
  field: Field
  typedValue: string
  totalTax: string
  taxes: Array<{
    name: string,
    buyAmount: string,
    sellAmount: string,
    isTotal: boolean,
    isCustom: boolean,
    isLiquidityTax: boolean
  }>
  inputCurrencyId?: string
  outputCurrencyId?: string
  recipient: string | null
}>('swap/replaceSwapState')
export const setRecipient = createAction<{ recipient: string | null }>('swap/setRecipient')
export const setTotalTax = createAction<{ totalTax: string }>('swap/setTotalTax')
export const setTaxes = createAction<{ taxes: Array<{
  name: string,
  buyAmount: string,
  sellAmount: string,
  isTotal: boolean,
  isCustom: boolean,
  isLiquidityTax: boolean
}> }>('swap/setTaxes')