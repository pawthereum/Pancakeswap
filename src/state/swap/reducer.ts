import { createReducer } from '@reduxjs/toolkit'
import { Field, replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput, setTotalTax, setTaxes, customTaxInput, selectCustomTaxWallet } from './actions'

export interface SwapState {
  readonly independentField: Field
  readonly totalTax: string
  readonly typedValue: string
  readonly customTaxInput: string
  readonly customTaxWallet: string
  readonly taxes: Array<{}>
  readonly [Field.INPUT]: {
    readonly currencyId: string | undefined
  }
  readonly [Field.OUTPUT]: {
    readonly currencyId: string | undefined
  }
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

const initialState: SwapState = {
  independentField: Field.INPUT,
  totalTax: '0',
  taxes: [],
  typedValue: '',
  customTaxInput: '',
  customTaxWallet: '',
  [Field.INPUT]: {
    currencyId: '',
  },
  [Field.OUTPUT]: {
    currencyId: '',
  },
  recipient: null,
}

export default createReducer<SwapState>(initialState, (builder) =>
  builder
    .addCase(
      replaceSwapState,
      (state, { payload: { totalTax, taxes, typedValue, customTaxInput, customTaxWallet, recipient, field, inputCurrencyId, outputCurrencyId } }) => {
        console.log('replace state', totalTax)
        return {
          [Field.INPUT]: {
            currencyId: inputCurrencyId,
          },
          [Field.OUTPUT]: {
            currencyId: outputCurrencyId,
          },
          independentField: field,
          totalTax,
          taxes,
          typedValue,
          recipient,
          customTaxInput,
          customTaxWallet,
        }
      }
    )
    .addCase(selectCurrency, (state, { payload: { currencyId, field } }) => {
      console.log('select currency', {
        ...state,
      })
      const otherField = field === Field.INPUT ? Field.OUTPUT : Field.INPUT
      if (currencyId === state[otherField].currencyId) {
        // the case where we have to swap the order
        return {
          ...state,
          independentField: state.independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT,
          [field]: { currencyId },
          [otherField]: { currencyId: state[field].currencyId },
        }
      }
      // the normal case
      return {
        ...state,
        [field]: { currencyId },
      }
    })
    .addCase(switchCurrencies, (state) => {
      console.log('switchCurrencies',{
        ...state
      })
      return {
        ...state,
        independentField: state.independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT,
        [Field.INPUT]: { currencyId: state[Field.OUTPUT].currencyId },
        [Field.OUTPUT]: { currencyId: state[Field.INPUT].currencyId },
      }
    })
    .addCase(typeInput, (state, { payload: { field, typedValue } }) => {
      console.log('typeInput',{
        ...state,
        independentField: field,
        typedValue,
      })
      return {
        ...state,
        independentField: field,
        typedValue,
      }
    })
    .addCase(customTaxInput, (state, { payload: { typedCustomTaxValue } }) => {
      console.log('setting custom tax', customTaxInput)
      state.customTaxInput = typedCustomTaxValue
    })
    .addCase(selectCustomTaxWallet, (state, { payload: { customTaxWallet } }) => {
      console.log('setting custom tax wallet', customTaxWallet)
      state.customTaxWallet = customTaxWallet
    })
    .addCase(setRecipient, (state, { payload: { recipient } }) => {
      console.log('setRecipient')
      state.recipient = recipient
    })
    .addCase(setTotalTax, (state, { payload: { totalTax } }) => {
      console.log('settotaltax')
      state.totalTax = totalTax
    })
    .addCase(setTaxes, (state, { payload: { taxes } }) => {
      console.log('setting all taxes in state', taxes)
      state.taxes = taxes
      console.log('state taxes', state.taxes)
    })
)
