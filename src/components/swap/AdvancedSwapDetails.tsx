import React from 'react'
import { Trade, TradeType } from '@pancakeswap-libs/sdk'
import { Card, CardBody, Text } from '@pancakeswap-libs/uikit'
import useI18n from 'hooks/useI18n'
import { Field } from '../../state/swap/actions'
import { useUserSlippageTolerance } from '../../state/user/hooks'
import { computeSlippageAdjustedAmounts, computeTradePriceBreakdown } from '../../utils/prices'
import { AutoColumn } from '../Column'
import QuestionHelper from '../QuestionHelper'
import { RowBetween, RowFixed } from '../Row'
import FormattedPriceImpact from './FormattedPriceImpact'
import { SectionBreak } from './styleds'
import SwapRoute from './SwapRoute'
import { useSwapState } from 'state/swap/hooks'
import styled from 'styled-components'

const StyledRowDivider = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderColor};
  padding: 5px;
  margin-bottom: 10px;
`

function TradeSummary({ trade, allowedSlippage }: { trade: Trade; allowedSlippage: number }) {
  const { priceImpactWithoutFee, realizedLPFee } = computeTradePriceBreakdown(trade)
  const isExactIn = trade.tradeType === TradeType.EXACT_INPUT
  const { totalTax, taxes, INPUT, OUTPUT } = useSwapState()
  const totalTaxNumber = totalTax ? parseFloat(totalTax.replace('%','')) * 100 : 0
  const slippageAdjustedAmounts = computeSlippageAdjustedAmounts(trade, allowedSlippage + totalTaxNumber)
  const TranslateString = useI18n()
  const testnetBnb = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
  let isBuy = true
  if (INPUT.currencyId !== testnetBnb) {
    isBuy = false
  }
  const taxType = isBuy ? 'buyAmount' : 'sellAmount'

  return (
    <Card>
      <CardBody>
        <RowBetween>
          <RowFixed>
            <Text fontSize="14px">
              {isExactIn ? TranslateString(1210, 'Minimum received') : TranslateString(220, 'Maximum sold')}
            </Text>
            <QuestionHelper
              text={TranslateString(
                202,
                'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.'
              )}
            />
          </RowFixed>
          <RowFixed>
            <Text fontSize="14px">
              {isExactIn
                ? `${slippageAdjustedAmounts[Field.OUTPUT]?.toSignificant(4)} ${trade.outputAmount.currency.symbol}` ??
                  '-'
                : `${slippageAdjustedAmounts[Field.INPUT]?.toSignificant(4)} ${trade.inputAmount.currency.symbol}` ??
                  '-'}
            </Text>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <RowFixed>
            <Text fontSize='14px'>{TranslateString(226, 'Price Impact')}</Text>
            <QuestionHelper
              text={TranslateString(
                224,
                'The difference between the market price and estimated price due to trade size.'
              )}
            />
          </RowFixed>
          <FormattedPriceImpact priceImpact={priceImpactWithoutFee} />
        </RowBetween>

        <RowBetween>
          <RowFixed>
            <Text fontSize="14px">{TranslateString(228, 'Liquidity Provider Fee')}</Text>
            <QuestionHelper
              text={TranslateString(
                230,
                'For each trade a 0.2% fee is paid. 0.17% goes to liquidity providers and 0.03% goes to the PawSwap treasury.'
              )}
            />
          </RowFixed>
          <Text fontSize="14px">
            {realizedLPFee ? `${realizedLPFee.toSignificant(4)} ${trade.inputAmount.currency.symbol}` : '-'}
          </Text>
        </RowBetween>
        <StyledRowDivider></StyledRowDivider>
        { !taxes ? '' : taxes.filter(t => t[taxType] !== '0%').map((t, i) => {
            return (
              <RowBetween key={i}>
                <RowFixed>
                  <Text fontSize={t['isTotal'] ? "16px" : "14px"}>
                    { TranslateString(1210, t['name']) }
                  </Text>
                </RowFixed>
                <RowFixed>
                  <Text fontSize={t['isTotal'] ? "16px" : "14px"}>
                    { t[taxType] }
                  </Text>
                </RowFixed>
              </RowBetween>
            )
          })}
      </CardBody>
    </Card>
  )
}

export interface AdvancedSwapDetailsProps {
  trade?: Trade
}

export function AdvancedSwapDetails({ trade }: AdvancedSwapDetailsProps) {
  const [allowedSlippage] = useUserSlippageTolerance()
  const TranslateString = useI18n()
  const showRoute = Boolean(trade && trade.route.path.length > 2)

  return (
    <AutoColumn gap="md">
      {trade && (
        <>
          <TradeSummary trade={trade} allowedSlippage={allowedSlippage} />
          {showRoute && (
            <>
              <SectionBreak />
              <AutoColumn style={{ padding: '0 24px' }}>
                <RowFixed>
                  <Text fontSize="14px">Route</Text>
                  <QuestionHelper
                    text={TranslateString(
                      999,
                      'Routing through these tokens resulted in the best price for your trade.'
                    )}
                  />
                </RowFixed>
                <SwapRoute trade={trade} />
              </AutoColumn>
            </>
          )}
        </>
      )}
    </AutoColumn>
  )
}
