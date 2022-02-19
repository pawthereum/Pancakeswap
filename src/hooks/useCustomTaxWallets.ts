import { useEffect, useState } from 'react'

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

const useGetCustomWallets = (searchQuery) => {
  console.log('search q', searchQuery)
  const [data, setData] = useState<ApiResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(api + searchQuery)
        const json = await response.json()
        const wallets = json.nonprofits.filter(n => n.crypto.ethereum_address).map(n => {
          const wallet: Wallet = {
            address: n.crypto.ethereum_address,
            symbol: n.socials.twitter || n.socials.instagram || n.socials.facebook || n.name.match(/[A-Z]/g).join(''), // fallback to abbr.
            name: n.name,
            logo: n.icon_url,
            mission: n.mission,
            category: n.category
          }
          return wallet
        })
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
  }, [setData, searchQuery])

  return data?.nonprofits
}

export default useGetCustomWallets
