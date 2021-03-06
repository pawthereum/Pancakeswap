import React, { useState, useCallback } from 'react'
import { Currency, Pair } from 'plugins/pawswap-libs/sdk'
import { Button, ChevronDownIcon, Tag, Text } from 'plugins/pawswap-libs/uikit'
import styled from 'styled-components'
import { darken } from 'polished'
import useI18n from 'hooks/useI18n'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import CustomTaxSearchModal from '../SearchModal/CustomTaxSearchModal'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween } from '../Row'
import { Input as NumericalInput } from '../NumericalInput'
import { useActiveWeb3React } from '../../hooks'
import Tooltip from '../Tooltip'
import ListLogo from 'components/ListLogo'
import { useSwapState } from 'state/swap/hooks'
import { Heart } from 'react-feather'

const InputRow = styled.div<{ selected: boolean }>`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  padding: ${({ selected }) => (selected ? '0.75rem 0.5rem 0.75rem 1rem' : '0.75rem 0.75rem 0.75rem 1rem')};
`
const CurrencySelect = styled.button<{ selected: boolean }>`
  align-items: center;
  height: 34px;
  font-size: 16px;
  font-weight: 500;
  background-color: transparent;
  color: ${({ selected, theme }) => (selected ? theme.colors.text : '#FFFFFF')};
  border-radius: 12px;
  outline: none;
  cursor: pointer;
  user-select: none;
  border: none;
  padding: 0 0.5rem;
  :focus,
  :hover {
    background-color: ${({ theme }) => darken(0.05, theme.colors.input)};
  }
`
const LabelRow = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.75rem 1rem 0 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => darken(0.2, theme.colors.textSubtle)};
  }
`
const Aligner = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
`
const InputPanel = styled.div<{ hideInput?: boolean }>`
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  border-radius: ${({ hideInput }) => (hideInput ? '8px' : '20px')};
  background-color: ${({ theme }) => theme.colors.background};
  z-index: 1;
`
const Container = styled.div<{ hideInput: boolean }>`
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.input};
  box-shadow: ${({ theme }) => theme.shadows.inset};
`
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

interface Wallet {
  address: string,
  symbol: string,
  name: string,
  logo: string,
  mission: string,
  category: string,
}

interface CustomTaxInputPanelProps {
  value: string
  onUserInput: (value: string) => void
  onMax?: () => void
  label?: string
  onCurrencySelect?: (currency: Currency) => void
  onWalletSelect: (wallet: Wallet) => void
  currency?: Currency | null
  disableCurrencySelect?: boolean
  hideBalance?: boolean
  pair?: Pair | null
  hideInput?: boolean
  otherCurrency?: Currency | null
  id: string
  showCommonBases?: boolean
}
export default function CustomTaxInputPanel({
  value,
  onUserInput,
  onMax,
  label,
  onCurrencySelect,
  onWalletSelect,
  currency,
  disableCurrencySelect = false,
  hideBalance = false,
  pair = null, // used for double token logo
  hideInput = false,
  otherCurrency,
  id,
  showCommonBases,
}: CustomTaxInputPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { account } = useActiveWeb3React()
  const { customTaxInput } = useSwapState()
  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
  const TranslateString = useI18n()
  const translatedLabel = label || TranslateString(132, 'Input')
  const handleDismissSearch = useCallback(() => {
    setModalOpen(false)
  }, [setModalOpen])

  const [show, setShow] = useState<boolean>(false)
  const open = useCallback(() => setShow(true), [setShow])
  const close = useCallback(() => setShow(false), [setShow])

  const [wallet, setWallet] = useState<Wallet>()
  const handleWalletSelect = (wallet: Wallet) => {
    onWalletSelect(wallet)
    setWallet(wallet)
  }

  const walletLogo = wallet ? wallet.logo : null

  return (
    <InputPanel id={id}>
      <Container hideInput={hideInput}>
        {!hideInput && (
          <LabelRow>
            <RowBetween>
              <Text fontSize="14px">{translatedLabel}</Text>
              {account && !customTaxInput ? (
                <>
                  <Tooltip 
                    text='Optionally send a percentage of your transaction to the wallet specified' 
                    show={show}
                  >
                    <TagWrapper onClick={open} onMouseEnter={open} onMouseLeave={close}>
                      <Tag scale="sm" variant='primary' outline>Optional</Tag>
                    </TagWrapper>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip 
                    text='We believe that charitable crypto giving can change the world and it looks like you do too!' 
                    show={show}
                  >
                    <TagWrapper onClick={open} onMouseEnter={open} onMouseLeave={close}>
                      <Tag startIcon={<Heart size="14px" style={{ marginRight: '5px' }} />} scale="sm" variant='primary'>You are amazing!</Tag>
                    </TagWrapper>
                  </Tooltip>
                </>
              ) }
            </RowBetween>
          </LabelRow>
        )}
        <InputRow style={hideInput ? { padding: '0', borderRadius: '8px' } : {}} selected={disableCurrencySelect}>
          {!hideInput && (
            <>
              <NumericalInput
                className="token-amount-input"
                value={value}
                onUserInput={(val) => {
                  onUserInput(val)
                }}
              />
            </>
          )}
          <CurrencySelect
            selected={!!currency}
            className="open-currency-select-button"
            onClick={() => {
              if (!disableCurrencySelect) {
                setModalOpen(true)
              }
            }}
          >
            <Aligner>
              {
                walletLogo
                  ?
                    <ListLogo logoURI={walletLogo} size="24px" style={{ marginRight: '8px' }}/>
                  :
                    <CurrencyLogo currency={undefined} size="24px" style={{ marginRight: '8px' }} />
              }
                <Text>
                  {
                    wallet ? wallet.symbol : TranslateString(1196, 'Select a cause')
                  }
                </Text>
              {!disableCurrencySelect && <ChevronDownIcon />}
            </Aligner>
          </CurrencySelect>
        </InputRow>
      </Container>
      {!disableCurrencySelect && onCurrencySelect && (
        <CustomTaxSearchModal
          isOpen={modalOpen}
          onDismiss={handleDismissSearch}
          onCurrencySelect={onCurrencySelect}
          onWalletSelect={handleWalletSelect}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          showCommonBases={showCommonBases}
        />
      )}
    </InputPanel>
  )
}
