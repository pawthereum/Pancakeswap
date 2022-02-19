import { Currency, ETHER, Token } from '@pancakeswap-libs/sdk'
import React, { KeyboardEvent, RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Text, CloseIcon } from '@pancakeswap-libs/uikit'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FixedSizeList } from 'react-window'
import { ThemeContext } from 'styled-components'
import AutoSizer from 'react-virtualized-auto-sizer'
import useI18n from 'hooks/useI18n'
import { useActiveWeb3React } from '../../hooks'
import { AppState } from '../../state'
import { useAllTokens, useToken } from '../../hooks/Tokens'
import { useSelectedListInfo } from '../../state/lists/hooks'
import { LinkStyledButton } from '../Shared'
import { isAddress } from '../../utils'
import Card from '../Card'
import Column from '../Column'
import ListLogo from '../ListLogo'
import QuestionHelper from '../QuestionHelper'
import Row, { RowBetween } from '../Row'
import CommonBases from './CommonBases'
import CustomTaxList from './CustomTaxList'
import { filterTokens, filterWallets } from './filtering'
import SortButton from './SortButton'
import { useTokenComparator } from './sorting'
import { PaddedColumn, SearchInput, Separator } from './styleds'
import useGetCustomWallets from 'hooks/useCustomTaxWallets'
import { AutoRow } from '../Row'
import { AutoColumn } from '../Column'
import styled from 'styled-components'

const BaseWrapper = styled.div<{ selected?: boolean }>`
  border: 1px solid ${({ theme, selected }) => (selected ? theme.colors.primary : theme.colors.tertiary)};
  border-radius: 10px;
  display: flex;
  padding: 6px;

  align-items: center;
  :hover {
    cursor: pointer;
    background-color: ${({ theme, selected }) => !selected && theme.colors.invertedContrast};
  }

  background-color: ${({ theme, selected }) => selected && theme.colors.tertiary};
`

interface Wallet {
  address: string,
  symbol: string,
  name: string,
  logo: string,
  mission: string,
  category: string,
}

interface CustomTaxSearchProps {
  isOpen: boolean
  onDismiss: () => void
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  onWalletSelect: (wallet: Wallet) => void
  otherSelectedCurrency?: Currency | null
  showCommonBases?: boolean
  onChangeList: () => void
}

export function CustomTaxSearch({
  selectedCurrency,
  onCurrencySelect,
  onWalletSelect,
  otherSelectedCurrency,
  showCommonBases,
  onDismiss,
  isOpen,
  onChangeList,
}: CustomTaxSearchProps) {
  const { t } = useTranslation()
  const { chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  const fixedList = useRef<FixedSizeList>()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [invertSearchOrder, setInvertSearchOrder] = useState<boolean>(false)
  const categories = [
    'arts and culture', 'education', 'environment', 'animals', 'healthcare',
    'human services', 'international affairs', 'public benefit', 'religion',
    'mutual benefit', 'unclassified'
  ]
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([])
  const customWalletSearchResults = useGetCustomWallets(searchQuery, selectedCategories)
  console.log('customWalletGetter', customWalletSearchResults)
  const allTokens = useAllTokens()

  const allWallets: Wallet[] | undefined = useMemo(() => {
    console.log('customwallet', customWalletSearchResults)
    return customWalletSearchResults
  }, [customWalletSearchResults])

  // const allWallets = CUSTOM_TAX_WALLETS

  // if they input an address, use it
  const isAddressSearch = isAddress(searchQuery)
  const searchToken = useToken(searchQuery)

  const showETH: boolean = useMemo(() => {
    const s = searchQuery.toLowerCase().trim()
    return s === '' || s === 'b' || s === 'bn' || s === 'bnb'
  }, [searchQuery])

  const tokenComparator = useTokenComparator(invertSearchOrder)

  const audioPlay = useSelector<AppState, AppState['user']['audioPlay']>((state) => state.user.audioPlay)

  const filteredTokens: Token[] = useMemo(() => {
    if (isAddressSearch) return searchToken ? [searchToken] : []
    return filterTokens(Object.values(allTokens), searchQuery)
  }, [isAddressSearch, searchToken, allTokens, searchQuery])

  // const filteredWallets: Wallet[] = useMemo(() => {
  //   // if (isAddressSearch) return searchToken ? [searchToken] : []
  //   return filterWallets(Object.values(allWallets), searchQuery)
  // }, [isAddressSearch, allWallets, searchQuery])

  // const filteredSortedWallets: Wallet[] = useMemo(() => {
  //   return filteredWallets
  // }, [filteredWallets, searchQuery])

  const filteredSortedTokens: Token[] = useMemo(() => {
    if (searchToken) return [searchToken]
    const sorted = filteredTokens.sort(tokenComparator)
    const symbolMatch = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((s) => s.length > 0)
    if (symbolMatch.length > 1) return sorted

    return [
      ...(searchToken ? [searchToken] : []),
      // sort any exact symbol matches first
      ...sorted.filter((token) => token.symbol?.toLowerCase() === symbolMatch[0]),
      ...sorted.filter((token) => token.symbol?.toLowerCase() !== symbolMatch[0]),
    ]
  }, [filteredTokens, searchQuery, searchToken, tokenComparator])

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrencySelect(currency)
      onDismiss()
      if (audioPlay) {
        const audio = document.getElementById('bgMusic') as HTMLAudioElement
        if (audio) {
          audio.play()
        }
      }
    },
    [onDismiss, onCurrencySelect, audioPlay]
  )

  const handleWalletSelect = useCallback(
    (wallet: Wallet) => {
      onWalletSelect(wallet)
      onDismiss()
      if (audioPlay) {
        const audio = document.getElementById('bgMusic') as HTMLAudioElement
        if (audio) {
          audio.play()
        }
      }
    },
    [onDismiss, onWalletSelect, audioPlay]
  )

  // clear the input on open
  useEffect(() => {
    if (isOpen) setSearchQuery('')
  }, [isOpen])

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback((event) => {
    const input = event.target.value
    const checksummedInput = isAddress(input)
    setSearchQuery(checksummedInput || input)
    fixedList.current?.scrollTo(0)
  }, [])

  const handleEnter = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const s = searchQuery.toLowerCase().trim()
        if (s === 'bnb') {
          handleCurrencySelect(ETHER)
        } else if (filteredSortedTokens.length > 0) {
          if (
            filteredSortedTokens[0].symbol?.toLowerCase() === searchQuery.trim().toLowerCase() ||
            filteredSortedTokens.length === 1
          ) {
            handleCurrencySelect(filteredSortedTokens[0])
          }
        }
      }
    },
    [filteredSortedTokens, handleCurrencySelect, searchQuery]
  )

  const handleCategorySelect = (category: string) => {
    if (selectedCategories.includes(category)) {
      return setSelectedCategories(selectedCategories.filter(c => c !== category))
    }
    return setSelectedCategories(selectedCategories.concat([category]))
  }

  const selectedListInfo = useSelectedListInfo()
  const TranslateString = useI18n()
  return (
    <Column style={{ width: '100%', flex: '1 1' }}>
      <PaddedColumn gap="14px">
        <RowBetween>
          <Text>
            {TranslateString(82, 'Select a cause')}
            <QuestionHelper
              text={TranslateString(
                128,
                'Find a cause to optionally donate a portion of your transaction to.'
              )}
            />
          </Text>
          <CloseIcon onClick={onDismiss} />
        </RowBetween>
        <SearchInput
          type="text"
          id="token-search-input"
          placeholder={t('Search for a cause')}
          value={searchQuery}
          ref={inputRef as RefObject<HTMLInputElement>}
          onChange={handleInput}
          onKeyDown={handleEnter}
        />
        {showCommonBases && (
          <CommonBases chainId={chainId} onSelect={handleCurrencySelect} selectedCurrency={selectedCurrency} />
        )}
        <RowBetween>
          <AutoColumn gap="md">
            <AutoRow>
              <Text fontSize="14px">Cause categories</Text>
              <QuestionHelper text={TranslateString(1204, 'Filter by categories that you care most about to find a matching cause.')} />
            </AutoRow>
            <AutoRow gap="4px">
              {(categories.map((c, i) => {
                const selected = selectedCategories.includes(c)
                return (
                  <BaseWrapper selected={selected} onClick={() => handleCategorySelect(c)} key={c}>
                    <Text>{c}</Text>
                  </BaseWrapper>
                )
              }))}
            </AutoRow>
          </AutoColumn>
        </RowBetween>
        <RowBetween>
          <Text fontSize="14px">{TranslateString(126, 'Wallet name')}</Text>
          <SortButton ascending={invertSearchOrder} toggleSortOrder={() => setInvertSearchOrder((iso) => !iso)} />
        </RowBetween>
      </PaddedColumn>

      <Separator />

      <div style={{ flex: '1' }}>
        <AutoSizer disableWidth>
          {({ height }) => (
            <CustomTaxList
              height={height}
              showETH={false}
              currencies={allWallets}
              wallets={allWallets}
              onCurrencySelect={handleCurrencySelect}
              onWalletSelect={handleWalletSelect}
              otherCurrency={otherSelectedCurrency}
              selectedCurrency={selectedCurrency}
              fixedListRef={fixedList}
            />
          )}
        </AutoSizer>
      </div>

      {null && (
        <>
          <Separator />
          <Card>
            <RowBetween>
              {selectedListInfo.current ? (
                <Row>
                  {selectedListInfo.current.logoURI ? (
                    <ListLogo
                      style={{ marginRight: 12 }}
                      logoURI={selectedListInfo.current.logoURI}
                      alt={`${selectedListInfo.current.name} list logo`}
                    />
                  ) : null}
                  <Text id="currency-search-selected-list-name">{selectedListInfo.current.name}</Text>
                </Row>
              ) : null}
              <LinkStyledButton
                style={{ fontWeight: 500, color: theme.colors.textSubtle, fontSize: 16 }}
                onClick={onChangeList}
                id="currency-search-change-list-button"
              >
                {selectedListInfo.current ? TranslateString(180, 'Change') : TranslateString(1152, 'Select a list')}
              </LinkStyledButton>
            </RowBetween>
          </Card>
        </>
      )}
    </Column>
  )
}

export default CustomTaxSearch
