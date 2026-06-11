export type TradeSide = 'long' | 'short'

export type OrderKind = 'market' | 'limit' | 'stop'

export type ExitReason = 'take-profit' | 'stop-loss' | 'manual-close'

export type PropStatus = 'active' | 'passed' | 'failed'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ExecutionSettings {
  spread: number
  slippage: number
  commissionPerMillion: number
}

export interface PropFirmRules {
  enabled: boolean
  targetProfit: number
  maxDrawdown: number
  dailyLossLimit: number
  minTradingDays: number
}

export interface OrderTicket {
  side: TradeSide
  kind: OrderKind
  entryPrice: number
  riskPercent: number
  stopDistance: number
  rewardRisk: number
  setup: string
  tags: string
  notes: string
}

export interface PendingOrder {
  id: string
  side: TradeSide
  kind: Exclude<OrderKind, 'market'>
  requestedPrice: number
  createdIndex: number
  createdTime: number
  riskPercent: number
  stopDistance: number
  rewardRisk: number
  setup: string
  tags: string[]
  notes: string
}

export interface Position {
  id: string
  side: TradeSide
  orderKind: OrderKind
  setup: string
  tags: string[]
  notes: string
  entryIndex: number
  entryTime: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  quantity: number
  riskAmount: number
  entryFee: number
}

export interface Trade extends Position {
  exitIndex: number
  exitTime: number
  exitPrice: number
  exitFee: number
  grossPnl: number
  pnl: number
  rMultiple: number
  holdCandles: number
  reason: ExitReason
}

export interface BacktestMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  netPnl: number
  grossProfit: number
  grossLoss: number
  fees: number
  profitFactor: number
  expectancyR: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  maxDrawdown: number
  averageHoldCandles: number
  tradingDays: number
}

export interface PropFirmStatus {
  status: PropStatus
  targetProgress: number
  currentDrawdown: number
  maxDrawdown: number
  worstDailyLoss: number
  tradingDays: number
  violations: string[]
}

export interface PersistedSession {
  serverSessionId?: string | null
  candles: Candle[]
  cursor: number
  balance: number
  activePosition: Position | null
  pendingOrders: PendingOrder[]
  trades: Trade[]
  ticket: OrderTicket
  execution: ExecutionSettings
  propRules: PropFirmRules
  dataLabel: string
}
