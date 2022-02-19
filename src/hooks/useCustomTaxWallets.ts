import { useEffect, useState } from 'react'
import { PAWTH_CHARITY_WALLET } from '../constants'

interface Wallet {
  address: string,
  symbol: string,
  name: string,
  logo: string,
  mission: string,
  category: string,
}

type ApiResponse = {
  nonprofits: Wallet[],
  page: string
}

/**
 * Due to Cors the api was forked and a proxy was created
 * @see https://github.com/pancakeswap/gatsby-pancake-api/commit/e811b67a43ccc41edd4a0fa1ee704b2f510aa0ba
 */
const api = `https://api.getchange.io/api/v1/nonprofits?public_key=${process.env.REACT_APP_CHANGE_API_KEY}&search_term=`

const useGetCustomWallets = (searchQuery, selectedCategories) => {
  const [data, setData] = useState<ApiResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        let categoryString = ''
        if (selectedCategories.length > 0) {
          categoryString = '&categories[]='
          selectedCategories.forEach((c,i) => {
            if (i === 0) {
              categoryString += c
            } else {
              categoryString += '\u0026categories[]=' + c
            }
          })
        }
        const response = await fetch(api + searchQuery + categoryString)
        const json = await response.json()
        const wallets = json.nonprofits.filter(n => n.crypto.ethereum_address).map(n => {
          const wallet: Wallet = {
            address: n.crypto.ethereum_address,
            symbol: n.socials.twitter || n.socials.instagram || n.name.match(/[A-Z]/g).join(''), // fallback to abbr.
            name: n.name,
            logo: n.icon_url,
            mission: n.mission,
            category: n.category
          }
          return wallet
        })
        const pawthCharity: Wallet = {
          address: PAWTH_CHARITY_WALLET,
          symbol: 'PAWTH Charity',
          name: 'Pawthereum Charity Wallet',
          logo: 'https://pawthereum.com/wp-content/uploads/shared-files/pawth-logo-transparent.png',
          mission: 'Pawthereum is a decentralized, community-run charity cryptocurrency project that gives back to animal shelters and advocates for the well-being of animals in need!',
          category: 'animals'
        }
        wallets.unshift(pawthCharity)
        const formattedJson = {
          nonprofits: wallets,
          page: json.page
        }
        const res: ApiResponse = formattedJson
        
        setData(res)
      } catch (error) {
        console.error('Unable to fetch custom wallet data:', error)
      }
    }

    fetchData()
  }, [setData, searchQuery, selectedCategories])

  return data?.nonprofits
}

export default useGetCustomWallets
