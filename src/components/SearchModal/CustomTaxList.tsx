import { Currency, CurrencyAmount, currencyEquals, ETHER, Token } from '@pancakeswap-libs/sdk'
import { CSSProperties, MutableRefObject, useCallback, useMemo } from 'react'
import { FixedSizeList } from 'react-window'
import styled from 'styled-components'
import { Text } from '@pancakeswap-libs/uikit'
import { useActiveWeb3React } from '../../hooks'
import { useSelectedTokenList, WrappedTokenInfo } from '../../state/lists/hooks'
import { useIsUserAddedToken } from '../../hooks/Tokens'
import Column from '../Column'
import ListLogo from '../ListLogo'
import { MouseoverTooltip } from '../Tooltip'
import { FadedSpan, MenuItem } from './styleds'
import { isTokenOnList } from '../../utils'

interface Wallet {
  address: string,
  symbol: string,
  name: string,
  logo: string,
  mission: string,
  category: string,
}

function walletKey(wallet: Wallet): string {
  return wallet ? wallet.address + Math.random().toString() : Math.random().toString()
}

const StyledBalanceText = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  max-width: 5rem;
  text-overflow: ellipsis;
`

const Tag = styled.div`
  background-color: ${({ theme }) => theme.colors.tertiary};
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 14px;
  border-radius: 4px;
  padding: 0.25rem 0.3rem 0.25rem 0.3rem;
  max-width: 6rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-self: flex-end;
  margin-right: 4px;
`

const TagContainer = styled.div`
  display: flex;
  justify-content: flex-end;
`

function TokenTags({ currency }: { currency: Currency }) {
  if (!(currency instanceof WrappedTokenInfo)) {
    return <span />
  }

  const { tags } = currency
  if (!tags || tags.length === 0) return <span />

  const tag = tags[0]

  return (
    <TagContainer>
      <MouseoverTooltip text={tag.description}>
        <Tag key={tag.id}>{tag.name}</Tag>
      </MouseoverTooltip>
      {tags.length > 1 ? (
        <MouseoverTooltip
          text={tags
            .slice(1)
            .map(({ name, description }) => `${name}: ${description}`)
            .join('; \n')}
        >
          <Tag>...</Tag>
        </MouseoverTooltip>
      ) : null}
    </TagContainer>
  )
}

function WalletTag({ wallet }: { wallet: Wallet | undefined }) {
  if (!wallet) {
    return <span />
  }

  const { mission } = wallet
  if (!mission) return <span />

  return (
    <TagContainer>
      <MouseoverTooltip text={mission}>
        <Tag key={mission}>{mission}</Tag>
      </MouseoverTooltip>
    </TagContainer>
  )
}

function WalletRow({
  currency,
  wallet,
  onSelect,
  isSelected,
  otherSelected,
  style,
}: {
  wallet: Wallet | undefined
  currency: Currency
  onSelect: () => void
  isSelected: boolean
  otherSelected: boolean
  style: CSSProperties
}) {
  const key = wallet ? walletKey(wallet) : Math.random()
  const selectedTokenList = useSelectedTokenList()
  const isOnSelectedList = isTokenOnList(selectedTokenList, currency)
  const customAdded = useIsUserAddedToken(currency)

  // only show add or remove buttons if not on selected list
  return (
    <MenuItem
      style={{...style, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      className={`token-item-${key}`}
      onClick={() => (isSelected ? null : onSelect())}
      disabled={isSelected}
      selected={otherSelected}
    >
      <div style={{ minWidth: '24px', minHeight: '24px' }}>
        <MouseoverTooltip text={wallet?.category || ''}>
          <ListLogo logoURI={wallet?.logo || 'https://etherscan.io/images/main/empty-token.png'} size="24px" />
        </MouseoverTooltip>
      </div>
      <Column style={{ flexGrow: '3',  }}>
        <Text style={{ display: 'flex', justifyContent: 'flex-start' }} title={wallet?.name}></Text>
        <FadedSpan>
          <Text>
            {wallet?.name}
          </Text>
        </FadedSpan>
      </Column>
      <WalletTag wallet={wallet} />
    </MenuItem>
  )
}

export default function CustomTaxList({
  height,
  currencies,
  selectedCurrency,
  onCurrencySelect,
  onWalletSelect,
  otherCurrency,
  fixedListRef,
  showETH,
}: {
  height: number
  currencies: Wallet[] | undefined
  wallets: Wallet[] | undefined
  selectedCurrency?: Currency | null
  onCurrencySelect: (currency: Currency) => void
  onWalletSelect: (wallet: Wallet) => void
  otherCurrency?: Currency | null
  fixedListRef?: MutableRefObject<FixedSizeList | undefined>
  showETH: boolean
}) {
  if (!currencies) return (<></>)
  const itemData = useMemo(() => (showETH ? [Currency.ETHER, ...currencies] : [...currencies]), [currencies, showETH])

  const Row = useCallback(
    ({ data, index, style }) => {
      const currency: Currency = data[index]
      const wallet: Wallet = data[index]
      const isSelected = Boolean(selectedCurrency && currencyEquals(selectedCurrency, currency))
      const otherSelected = Boolean(otherCurrency && currencyEquals(otherCurrency, currency))
      const handleWalletSelect = () => onWalletSelect(wallet)
      return (
        <WalletRow
          style={style}
          wallet={wallet}
          currency={currency}
          isSelected={isSelected}
          onSelect={handleWalletSelect}
          otherSelected={otherSelected}
        />
      )
    },
    [onCurrencySelect, otherCurrency, selectedCurrency]
  )

  const itemKey = useCallback((index: number, data: any) => walletKey(data[index]), [])

  return (
    <FixedSizeList
      height={height}
      ref={fixedListRef as any}
      width="100%"
      itemData={itemData}
      itemCount={itemData.length}
      itemSize={56}
      itemKey={itemKey}
    >
      {Row}
    </FixedSizeList>
  )
}
