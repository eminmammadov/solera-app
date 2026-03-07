import { create } from 'zustand'

export interface Stake {
  id: number | string
  name: string
  logo: string
  stakedAmount: string
  apr: string
  earned: string
  status: string
  endTime: number
}

export interface Transaction {
  id: string
  type: string
  amount: string
  date: string
  status: string
}

export interface TokenBalance {
  id: string
  ticker: string
  name: string
  amount: number
  priceUsd: number
  logoUrl: string
  change24h: number
}

interface UserDataState {
  availableBalance: number
  stakedBalance: number
  totalEarned: number
  totalEarnedUsd: number
  portfolioValue: number
  portfolioChange: number
  activeStakings: Stake[]
  transactions: Transaction[]
  portfolio: TokenBalance[]
  claimStake: (stakeId: number | string) => void
  convertSmallBalances: () => void
}

const getEndTime = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.getTime()
}

const INITIAL_STAKINGS: Stake[] = [
  {
    id: 1,
    name: "PEPE 3M Locked",
    logo: "https://cryptologos.cc/logos/pepe-pepe-logo.png",
    stakedAmount: "10,000,000 PEPE",
    apr: "25.0%",
    earned: "450 RA",
    status: "Locked",
    endTime: getEndTime(90),
  },
  {
    id: 2,
    name: "WIF 7D Locked",
    logo: "https://cryptologos.cc/logos/dogwifhat-wif-logo.png",
    stakedAmount: "500 WIF",
    apr: "18.2%",
    earned: "85 RA",
    status: "Locked",
    endTime: getEndTime(7),
  },
  {
    id: 3,
    name: "DOGE 1M Locked",
    logo: "https://cryptologos.cc/logos/dogecoin-doge-logo.png",
    stakedAmount: "5,000 DOGE",
    apr: "12.0%",
    earned: "120 RA",
    status: "Locked",
    endTime: new Date().getTime() - 10000,
  }
]

// Generate more items
const EXTENDED_STAKINGS = Array.from({ length: 15 }).map((_, i) => ({
  ...INITIAL_STAKINGS[i % INITIAL_STAKINGS.length],
  id: i + 1,
  endTime: i === 2 ? new Date().getTime() - 10000 : getEndTime(i % 2 === 0 ? 30 : 90)
}))

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    type: "Claim",
    amount: "+150 RA",
    date: "2026-03-04 10:23",
    status: "Completed",
  },
  {
    id: "tx-2",
    type: "Stake",
    amount: "-500 WIF",
    date: "2026-03-03 14:45",
    status: "Pending",
  },
  {
    id: "tx-3",
    type: "Withdraw",
    amount: "-1,000 USDC",
    date: "2026-03-01 09:12",
    status: "Failed",
  },
  {
    id: "tx-4",
    type: "Deposit",
    amount: "+10,000,000 PEPE",
    date: "2026-02-28 18:30",
    status: "Completed",
  },
  {
    id: "tx-5",
    type: "Withdraw",
    amount: "-2,000 USDT",
    date: "2026-02-25 11:05",
    status: "Completed",
  }
]

const EXTENDED_TRANSACTIONS = Array.from({ length: 15 }).map((_, i) => ({
  ...INITIAL_TRANSACTIONS[i % INITIAL_TRANSACTIONS.length],
  id: `tx-${i + 1}`,
}))

const INITIAL_PORTFOLIO: TokenBalance[] = [
  {
    id: "ra",
    ticker: "RA",
    name: "RA Token",
    amount: 5000,
    priceUsd: 0.10,
    logoUrl: "https://e.radikal.host/2026/03/02/ra-white.jpg",
    change24h: 5.2,
  },
  {
    id: "sol",
    ticker: "SOL",
    name: "Solana",
    amount: 12.5,
    priceUsd: 145.20,
    logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
    change24h: 2.4,
  },
  {
    id: "usdc",
    ticker: "USDC",
    name: "USD Coin",
    amount: 250.00,
    priceUsd: 1.00,
    logoUrl: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    change24h: 0.01,
  },
  {
    id: "bonk",
    ticker: "BONK",
    name: "Bonk",
    amount: 1500000,
    priceUsd: 0.000025,
    logoUrl: "https://cryptologos.cc/logos/bonk1-bonk-logo.png",
    change24h: -1.5,
  },
  {
    id: "wif",
    ticker: "WIF",
    name: "dogwifhat",
    amount: 0.5,
    priceUsd: 1.85,
    logoUrl: "https://cryptologos.cc/logos/dogwifhat-wif-logo.png",
    change24h: 12.5,
  },
  {
    id: "pepe",
    ticker: "PEPE",
    name: "Pepe",
    amount: 50000,
    priceUsd: 0.000008,
    logoUrl: "https://cryptologos.cc/logos/pepe-pepe-logo.png",
    change24h: -3.2,
  },
  {
    id: "shib",
    ticker: "SHIB",
    name: "Shiba Inu",
    amount: 15000,
    priceUsd: 0.000025,
    logoUrl: "https://cryptologos.cc/logos/shiba-inu-shib-logo.png",
    change24h: 1.1,
  }
]

const calculateStakedBalance = (stakings: Stake[]) => {
  return stakings.reduce((total, stake) => {
    const earned = parseFloat(stake.earned.replace(/[^0-9.]/g, '')) || 0
    return total + earned
  }, 0)
}

const calculatePortfolioValue = (portfolio: TokenBalance[]) => {
  return portfolio.reduce((total, token) => total + (token.amount * token.priceUsd), 0)
}

const calculatePortfolioChange = (portfolio: TokenBalance[]) => {
  const totalValue = calculatePortfolioValue(portfolio)
  if (totalValue === 0) return 0
  
  const totalChange = portfolio.reduce((total, token) => {
    const value = token.amount * token.priceUsd
    const weight = value / totalValue
    return total + (token.change24h * weight)
  }, 0)
  
  return totalChange
}

export const useUserData = create<UserDataState>((set) => ({
  availableBalance: INITIAL_PORTFOLIO.find(t => t.id === 'ra')?.amount || 0,
  stakedBalance: calculateStakedBalance(EXTENDED_STAKINGS),
  totalEarned: 1250,
  totalEarnedUsd: 125,
  portfolioValue: calculatePortfolioValue(INITIAL_PORTFOLIO),
  portfolioChange: calculatePortfolioChange(INITIAL_PORTFOLIO),
  activeStakings: EXTENDED_STAKINGS,
  transactions: EXTENDED_TRANSACTIONS,
  portfolio: INITIAL_PORTFOLIO,
  
  claimStake: (stakeId) => set((state) => {
    const stakeToClaim = state.activeStakings.find(s => s.id === stakeId)
    if (!stakeToClaim) return state

    const earnedAmountStr = stakeToClaim.earned.replace(/[^0-9.]/g, '')
    const earnedAmount = parseFloat(earnedAmountStr) || 0
    const earnedUsd = earnedAmount * 0.1 // Assuming 1 RA = $0.10 for mock

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`

    const newTransaction: Transaction = {
      id: `tx-claim-${Date.now()}`,
      type: "Claim",
      amount: `+${earnedAmount} RA`,
      date: dateStr,
      status: "Completed",
    }

    const newActiveStakings = state.activeStakings.filter(s => s.id !== stakeId)
    
    // Update RA token in portfolio
    const newPortfolio = state.portfolio.map(token => {
      if (token.id === 'ra') {
        return { ...token, amount: token.amount + earnedAmount }
      }
      return token
    })

    return {
      activeStakings: newActiveStakings,
      transactions: [newTransaction, ...state.transactions],
      availableBalance: state.availableBalance + earnedAmount,
      stakedBalance: calculateStakedBalance(newActiveStakings),
      totalEarned: state.totalEarned + earnedAmount,
      totalEarnedUsd: state.totalEarnedUsd + earnedUsd,
      portfolio: newPortfolio,
      portfolioValue: calculatePortfolioValue(newPortfolio),
      portfolioChange: calculatePortfolioChange(newPortfolio),
    }
  }),
  
  convertSmallBalances: () => set((state) => {
    let totalUsdConverted = 0
    const raToken = state.portfolio.find(t => t.id === 'ra')
    const raPrice = raToken?.priceUsd || 0.10
    
    const newPortfolio = state.portfolio.map(token => {
      // Don't convert RA itself
      if (token.id === 'ra') return token
      
      const valueUsd = token.amount * token.priceUsd
      // Convert if value is less than $1.00
      if (valueUsd > 0 && valueUsd < 1.00) {
        totalUsdConverted += valueUsd
        return { ...token, amount: 0 }
      }
      return token
    }).filter(token => token.amount > 0 || token.id === 'ra') // Keep RA even if 0, remove others if 0
    
    const raGained = totalUsdConverted / raPrice
    
    const finalPortfolio = newPortfolio.map(token => {
      if (token.id === 'ra') {
        return { ...token, amount: token.amount + raGained }
      }
      return token
    })
    
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`

    const newTransaction: Transaction = {
      id: `tx-convert-${Date.now()}`,
      type: "Convert",
      amount: `+${raGained.toFixed(2)} RA`,
      date: dateStr,
      status: "Completed",
    }
    
    return {
      portfolio: finalPortfolio,
      availableBalance: state.availableBalance + raGained,
      portfolioValue: calculatePortfolioValue(finalPortfolio),
      portfolioChange: calculatePortfolioChange(finalPortfolio),
      transactions: totalUsdConverted > 0 ? [newTransaction, ...state.transactions] : state.transactions
    }
  })
}))
