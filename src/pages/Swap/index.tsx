import { Currency, CurrencyAmount, JSBI, Token, Trade, TradeType } from 'plugins/pawswap-libs/sdk'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown, CheckCircle, MoreHorizontal } from 'react-feather'
import { Tag, CardBody, ArrowDownIcon, Button, IconButton, Text } from 'plugins/pawswap-libs/uikit'
import { ThemeContext } from 'styled-components'
import AddressInputPanel from 'components/AddressInputPanel'
import Card, { GreyCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import ConfirmSwapModal from 'components/swap/ConfirmSwapModal'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import CustomTaxInputPanel from 'components/CustomTaxInputPanel'
import CardNav from 'components/CardNav'
import { AutoRow, RowBetween } from 'components/Row'
import AdvancedSwapDetailsDropdown from 'components/swap/AdvancedSwapDetailsDropdown'
import confirmPriceImpactWithoutFee from 'components/swap/confirmPriceImpactWithoutFee'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from 'components/swap/styleds'
import TradePrice from 'components/swap/TradePrice'
import TokenWarningModal from 'components/TokenWarningModal'
import SyrupWarningModal from 'components/SyrupWarningModal'
import ProgressSteps from 'components/ProgressSteps'

import { INITIAL_ALLOWED_SLIPPAGE } from 'constants/index'
import { useActiveWeb3React } from 'hooks'
import { useCurrency } from 'hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from 'hooks/useApproveCallback'
import { useSwapCallback } from 'hooks/useSwapCallback'
import useWrapCallback, { WrapType } from 'hooks/useWrapCallback'
import { Field } from 'state/swap/actions'
import { useDefaultsFromURLSearch, useDerivedSwapInfo, useSwapActionHandlers, useSwapState } from 'state/swap/hooks'
import { useExpertModeManager, useUserDeadline, useUserSlippageTolerance } from 'state/user/hooks'
import { LinkStyledButton } from 'components/Shared'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { computeTradePriceBreakdown, warningSeverity } from 'utils/prices'
import Loader from 'components/Loader'
import useI18n from 'hooks/useI18n'
import PageHeader from 'components/PageHeader'
import ConnectWalletButton from 'components/ConnectWalletButton'
import AppBody from '../AppBody'
import { useAddPopup } from '../../state/application/hooks'
import defaultTokenJson from '../../constants/token/pancakeswap.json'
import Tooltip from '../../components/Tooltip'
import styled from 'styled-components'

interface TokenData {
  name: string;
  symbol: string;
  typicalBuyTax: number;
  typicalSellTax: number;
}

const TagWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border: none;
  background: none;
  outline: none;
  cursor: default;
  border-radius: 36px;
  background-color: ${({ theme }) => theme.colors.invertedContrast};
  color: ${({ theme }) => theme.colors.textSubtle};

  :hover,
  :focus {
    opacity: 0.7;
  }
`

const Swap = () => {
  const loadedUrlParams = useDefaultsFromURLSearch()
  const TranslateString = useI18n()
  const testnetBnb = '0xae13d989dac2f0debff460ac112a837c89baa7cd'

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const [isSyrup, setIsSyrup] = useState<boolean>(false)
  const [syrupTransactionType, setSyrupTransactionType] = useState<string>('')
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  const handleConfirmSyrupWarning = useCallback(() => {
    setIsSyrup(false)
    setSyrupTransactionType('')
  }, [])

  const { account } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [deadline] = useUserDeadline()
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const { independentField, typedValue, customTaxInput, customTaxWallet, recipient, taxes } = useSwapState()
  const { v2Trade, v2TradeWithTax, currencyBalances, parsedAmount, currencies, inputError: swapInputError } = useDerivedSwapInfo()
  const { wrapType, execute: onWrap, inputError: wrapInputError } = useWrapCallback(
    currencies[Field.INPUT],
    currencies[Field.OUTPUT],
    typedValue
  )
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const trade = showWrap ? undefined : v2Trade
  const tradeWithTax = showWrap ? undefined : v2TradeWithTax

  const parsedAmounts = showWrap
    ? {
        [Field.INPUT]: parsedAmount,
        [Field.OUTPUT]: parsedAmount,
      }
    : {
        [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : tradeWithTax?.inputAmount,
        [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : tradeWithTax?.outputAmount,
      }

  const { onSwitchTokens, onCurrencySelection, onCustomTaxWalletSelection, onUserInput, onCustomTaxInput, onChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts2 = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : trade?.tradeType === TradeType.EXACT_OUTPUT 
        ? trade?.inputAmount.toSignificant(6) ?? ''
        : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  const route = trade?.route
  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const noRoute = !route

  // check whether the user has approved the router on the input token
  const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  const [customTax, setCustomTax] = useState<{
    name: string
    exists: boolean
  }>({
    name: 'Custom Tax',
    exists: false
  })
  
  const addPopup = useAddPopup()
  const handleCustomTaxInput = useCallback(
    (value: string) => {
      // max out your custom tax to 50%
      const amt = parseFloat(value)
      console.log('[~~~~~~~~~~~~~] before i send this off...', taxes)
      if (amt > 50) {
        addPopup(
          {
            message: {
              success: false,
              body: 'Maximum custom tax amount is 50%',
            },
          },
          'https://pawthereum.com'
        )
        return onCustomTaxInput('50')
      }
      onCustomTaxInput(value)
    },
    [onCustomTaxInput]
  )

  useEffect(() => {
    const custom = taxes.find(t => t['isCustom'])
    !custom
      ? setCustomTax({ name: '', exists: false })
      : custom['name'] !== '0' && custom['name'] !== '' ? setCustomTax({ name: custom['name'], exists: true }) : setCustomTax({ name: '', exists: false })
  }, [taxes])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  console.log('customTaxInput', customTaxInput)
  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    tradeWithTax,
    allowedSlippage,
    deadline,
    customTaxInput,
    customTaxWallet,
    recipient
  )

  const { priceImpactWithoutFee } = computeTradePriceBreakdown(tradeWithTax)

  const handleSwap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }

    setSwapState((prevState) => ({ ...prevState, attemptingTxn: true, swapErrorMessage: undefined, txHash: undefined }))
    swapCallback()
      .then((hash) => {
        setSwapState((prevState) => ({
          ...prevState,
          attemptingTxn: false,
          swapErrorMessage: undefined,
          txHash: hash,
        }))
      })
      .catch((error) => {
        console.log('error', error)
        setSwapState((prevState) => ({
          ...prevState,
          attemptingTxn: false,
          swapErrorMessage: error.message,
          txHash: undefined,
        }))
      })
  }, [priceImpactWithoutFee, swapCallback, setSwapState])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on slippage
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState((prevState) => ({ ...prevState, showConfirm: false }))

    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '')
    }
  }, [onUserInput, txHash, setSwapState])

  const handleAcceptChanges = useCallback(() => {
    setSwapState((prevState) => ({ ...prevState, tradeToConfirm: trade }))
  }, [trade])

  // This will check to see if the user has selected Syrup to either buy or sell.
  // If so, they will be alerted with a warning message.
  const checkForSyrup = useCallback(
    (selected: string, purchaseType: string) => {
      if (selected === 'syrup') {
        setIsSyrup(true)
        setSyrupTransactionType(purchaseType)
      }
    },
    [setIsSyrup, setSyrupTransactionType]
  )

  const [nonNativeToken, setNonNativeToken] = useState<TokenData>({
    name: '',
    symbol: '',
    typicalBuyTax: 0,
    typicalSellTax: 0,
  })

  const [isBuyingNonNativeToken, setIsBuyingNonNativeToken] = useState(false)

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
      toggleHideSavings(false)
      console.log('input currenc', inputCurrency)
      if (inputCurrency.symbol.toLowerCase() !== 'bnb' && inputCurrency.address.toLowerCase() !== testnetBnb) {
        const tokenData = defaultTokenJson.tokens.find(t => t.symbol === inputCurrency.symbol)
        if (tokenData) { setNonNativeToken({
          name: tokenData.name,
          typicalBuyTax: tokenData.typicalBuyTax,
          typicalSellTax: tokenData.typicalSellTax,
          symbol: tokenData.symbol
        })}
        // do not allowing swapping to anything else other than BNB
        if (currencies[Field.OUTPUT]?.symbol !== 'BNB' && currencies[Field.OUTPUT]?.symbol !== 'WBNB') {
          onCurrencySelection(Field.OUTPUT, Currency.ETHER)
        }
        setIsBuyingNonNativeToken(false)
      }
      if (inputCurrency.symbol.toLowerCase() === 'syrup') {
        checkForSyrup(inputCurrency.symbol.toLowerCase(), 'Selling')
      }
    },
    [onCurrencySelection, setApprovalSubmitted, checkForSyrup]
  )

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      onUserInput(Field.INPUT, maxAmountInput.toExact())
    }
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency)
      toggleHideSavings(false)
      if (outputCurrency.symbol.toLowerCase() !== 'bnb' && outputCurrency.address.toLowerCase() !== testnetBnb) {
        const tokenData = defaultTokenJson.tokens.find(t => t.symbol === outputCurrency.symbol)
        if (tokenData) { setNonNativeToken({
          name: tokenData.name,
          typicalBuyTax: tokenData.typicalBuyTax,
          typicalSellTax: tokenData.typicalSellTax,
          symbol: tokenData.symbol
        })}
        // do not allowing swapping to anything else other than BNB
        if (currencies[Field.INPUT]?.symbol !== 'BNB' && currencies[Field.INPUT]?.symbol !== 'WBNB') {
          onCurrencySelection(Field.INPUT, Currency.ETHER)
        }
        setIsBuyingNonNativeToken(true)
      }
      if (outputCurrency.symbol.toLowerCase() === 'syrup') {
        checkForSyrup(outputCurrency.symbol.toLowerCase(), 'Buying')
      }
    },
    [onCurrencySelection, checkForSyrup]
  )

  const handleCustomTaxSelect = useCallback(
    (customTaxWallet) => {
      console.log('they decided to go to', customTaxWallet)
      onCustomTaxWalletSelection(customTaxWallet.address)
    },
    [onCustomTaxWalletSelection]
  )

  const [taxSavings, setTaxSavings] = useState(0)

  useEffect(() => {
    if (isBuyingNonNativeToken) {
      const tax = taxes.find(t => t['isTotal'])
      const taxAmount = tax ? tax['buyAmount'].replace('%', '') : '0'
      return setTaxSavings(nonNativeToken.typicalBuyTax - parseFloat(taxAmount))
    }
    const tax = taxes.find(t => t['isTotal'])
    const taxAmount = tax ? tax['sellAmount'].replace('%', '') : '0'
    return setTaxSavings(nonNativeToken.typicalSellTax - parseFloat(taxAmount))
  }, [taxes, isBuyingNonNativeToken, trade])

  const taxSavingsText = () => {
    if (!nonNativeToken) return ''
    let text = `${nonNativeToken?.symbol} usually has a `
    const pawSwapTotalTax = taxes.find(t => t['isTotal'])
    if (isBuyingNonNativeToken) {
      const pawSwapTotalTaxAmt = pawSwapTotalTax ? pawSwapTotalTax['buyAmount'] : '0%'
      text += `buy tax of ${nonNativeToken.typicalBuyTax}% but you only pay ${pawSwapTotalTaxAmt} on PawSwap! `
    } else {
      const pawSwapTotalTaxAmt = pawSwapTotalTax ? pawSwapTotalTax['sellAmount'] : '0%'
      text += `sell tax of ${nonNativeToken.typicalSellTax}%.  but you only pay ${pawSwapTotalTaxAmt} on PawSwap! `
    }
    text += `Would you consider donating a portion of your transaction to a good cause?`
    return text
  }

  const [hideSavings, setHideSavings] = useState(false)

  function toggleHideSavings(toggle) {
    setHideSavings(toggle)
  }

  const showCustomTax = () => {
    return !hideSavings && taxSavings > 0 && trade !== undefined
  }

  const [show, setShow] = useState<boolean>(false)
  const open = useCallback(() => setShow(true), [setShow])
  const close = useCallback(() => setShow(false), [setShow])

  return (
    <>
      <TokenWarningModal
        isOpen={urlLoadedTokens.length > 0 && !dismissTokenWarning}
        tokens={urlLoadedTokens}
        onConfirm={handleConfirmTokenWarning}
      />
      <SyrupWarningModal
        isOpen={isSyrup}
        transactionType={syrupTransactionType}
        onConfirm={handleConfirmSyrupWarning}
      />
      <CardNav />
      <AppBody>
        <Wrapper id="swap-page">
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={trade}
            tradeWithTax={tradeWithTax}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />
          <PageHeader
            title={TranslateString(8, 'PawSwap')}
            description={TranslateString(1192, 'by Pawthereum')}
          />
          <CardBody>
            <AutoColumn gap="md">
              <CurrencyInputPanel
                label={
                  independentField === Field.OUTPUT && !showWrap && trade
                    ? TranslateString(194, 'From (estimated)')
                    : TranslateString(76, 'From')
                }
                value={formattedAmounts[Field.INPUT]}
                showMaxButton={!atMaxAmountInput}
                currency={currencies[Field.INPUT]}
                onUserInput={handleTypeInput}
                onMax={handleMaxInput}
                onCurrencySelect={handleInputSelect}
                otherCurrency={currencies[Field.OUTPUT]}
                id="swap-currency-input"
              />
              <AutoColumn justify="space-between">
                <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable>
                    <IconButton
                      variant="tertiary"
                      onClick={() => {
                        setApprovalSubmitted(false) // reset 2 step UI for approvals
                        onSwitchTokens()
                        setIsBuyingNonNativeToken(!isBuyingNonNativeToken)
                      }}
                      style={{ borderRadius: '50%' }}
                      scale="sm"
                    >
                      <ArrowDownIcon color="primary" width="24px" />
                    </IconButton>
                  </ArrowWrapper>
                  {recipient === null && !showWrap && isExpertMode ? (
                    <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                      + Add a send (optional)
                    </LinkStyledButton>
                  ) : null}
                </AutoRow>
              </AutoColumn>
              <CurrencyInputPanel
                value={formattedAmounts[Field.OUTPUT]}
                onUserInput={handleTypeOutput}
                label={
                  independentField === Field.INPUT && !showWrap && trade
                    ? TranslateString(196, 'To (estimated)')
                    : TranslateString(80, 'To')
                }
                showMaxButton={false}
                currency={currencies[Field.OUTPUT]}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                id="swap-currency-output"
              />
              {
                !customTax.exists ? '' :
                <>
                  <AutoColumn justify="space-between">
                    <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 1rem' }}>
                      {showCustomTax() ? (
                        <Tooltip 
                          text={taxSavingsText()} 
                          show={show}
                        >
                          <TagWrapper onClick={open} onMouseEnter={open} onMouseLeave={close}>
                            <Tag 
                              variant='success' 
                              startIcon={<CheckCircle style={{ fill: 'none', marginRight: '5px' }} />}
                            >
                              {`You're saving ${taxSavings}%!`}
                            </Tag>
                          </TagWrapper>
                        </Tooltip>
                      ) : (
                        <ArrowWrapper clickable>
                          <IconButton variant="tertiary"
                            style={{ borderRadius: '50%' }}
                            scale="sm"
                          >
                            <MoreHorizontal />
                          </IconButton>
                        </ArrowWrapper> 
                      )}
                    </AutoRow>
                  </AutoColumn>
                  <CustomTaxInputPanel
                    value={customTaxInput}
                    onUserInput={handleCustomTaxInput}
                    label={customTax?.name + ' %'}
                    currency={currencies[Field.OUTPUT]}
                    onCurrencySelect={handleCustomTaxSelect}
                    onWalletSelect={handleCustomTaxSelect}
                    otherCurrency={currencies[Field.INPUT]}
                    id="swap-currency-output"
                  />
                  {showWrap ? null : (
                    <Card padding=".25rem .75rem 0 .75rem" borderRadius="20px">
                      <AutoColumn gap="4px">
                        {Boolean(trade) && (
                          <RowBetween align="center">
                            <Text fontSize="14px">{TranslateString(1182, 'Price')}</Text>
                            <TradePrice
                              price={trade?.executionPrice}
                              showInverted={showInverted}
                              setShowInverted={setShowInverted}
                            />
                          </RowBetween>
                        )}
                        {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                          <RowBetween align="center">
                            <Text fontSize="14px">{TranslateString(88, 'Slippage Tolerance')}</Text>
                            <Text fontSize="14px">{allowedSlippage / 100}%</Text>
                          </RowBetween>
                        )}
                      </AutoColumn>
                    </Card>
                  )}
                </>
              }

              {recipient !== null && !showWrap ? (
                <>
                  <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                    <ArrowWrapper clickable={false}>
                      <ArrowDown size="16" color={theme.colors.textSubtle} />
                    </ArrowWrapper>
                    <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                      - Remove send
                    </LinkStyledButton>
                  </AutoRow>
                  <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
                </>
              ) : null}

            </AutoColumn>
            <BottomGrouping>
              {!account ? (
                <ConnectWalletButton width="100%" />
              ) : showWrap ? (
                <Button disabled={Boolean(wrapInputError)} onClick={onWrap} width="100%">
                  {wrapInputError ??
                    (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
                </Button>
              ) : noRoute && userHasSpecifiedInputOutput ? (
                <GreyCard style={{ textAlign: 'center' }}>
                  <Text mb="4px">{TranslateString(1194, 'Insufficient liquidity for this trade.')}</Text>
                </GreyCard>
              ) : showApproveFlow ? (
                <RowBetween>
                  <Button
                    onClick={approveCallback}
                    disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                    style={{ width: '48%' }}
                    variant={approval === ApprovalState.APPROVED ? 'success' : 'primary'}
                  >
                    {approval === ApprovalState.PENDING ? (
                      <AutoRow gap="6px" justify="center">
                        Approving <Loader stroke="white" />
                      </AutoRow>
                    ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                      'Approved'
                    ) : (
                      `Approve ${currencies[Field.INPUT]?.symbol}`
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      if (isExpertMode) {
                        handleSwap()
                      } else {
                        setSwapState({
                          tradeToConfirm: trade,
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined,
                        })
                      }
                    }}
                    style={{ width: '48%' }}
                    id="swap-button"
                    disabled={
                      !isValid || approval !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                    }
                    variant={isValid && priceImpactSeverity > 2 ? 'danger' : 'primary'}
                  >
                    {priceImpactSeverity > 3 && !isExpertMode
                      ? `Price Impact High`
                      : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                  </Button>
                </RowBetween>
              ) : (
                <Button
                  onClick={() => {
                    if (isExpertMode) {
                      handleSwap()
                    } else {
                      setSwapState({
                        tradeToConfirm: trade,
                        attemptingTxn: false,
                        swapErrorMessage: undefined,
                        showConfirm: true,
                        txHash: undefined,
                      })
                    }
                  }}
                  id="swap-button"
                  disabled={!isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                  variant={isValid && priceImpactSeverity > 2 && !swapCallbackError ? 'danger' : 'primary'}
                  width="100%"
                >
                  {swapInputError ||
                    (priceImpactSeverity > 3 && !isExpertMode
                      ? `Price Impact Too High`
                      : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`)}
                </Button>
              )}
              {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />}
              {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
            </BottomGrouping>
          </CardBody>
        </Wrapper>
      </AppBody>
      <AdvancedSwapDetailsDropdown trade={trade} tradeWithTax={tradeWithTax} />
    </>
  )
}

export default Swap
