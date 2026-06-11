import type {
  BacktestMetrics,
  Candle,
  ExecutionSettings,
  ExitReason,
  OrderTicket,
  PendingOrder,
  Position,
  PropFirmRules,
  PropFirmStatus,
  Trade,
  TradeSide,
} from '../types'

export const defaultExecutionSettings: ExecutionSettings = {
  spread: 0.00012,
  slippage: 0.00002,
  commissionPerMillion: 35,
}

export const defaultPropFirmRules: PropFirmRules = {
  enabled: true,
  targetProfit: 800,
  maxDrawdown: 1_000,
  dailyLossLimit: 500,
  minTradingDays: 5,
}

export function createPendingOrder(
  candle: Candle,
  candleIndex: number,
  ticket: OrderTicket,
): PendingOrder {
  if (ticket.kind === 'market') {
    throw new Error('Un ordre market ne peut pas etre ajoute comme pending.')
  }

  return {
    id: crypto.randomUUID(),
    side: ticket.side,
    kind: ticket.kind,
    requestedPrice: roundPrice(ticket.entryPrice),
    createdIndex: candleIndex,
    createdTime: candle.time,
    riskPercent: ticket.riskPercent,
    stopDistance: ticket.stopDistance,
    rewardRisk: ticket.rewardRisk,
    setup: ticket.setup.trim(),
    tags: parseTags(ticket.tags),
    notes: ticket.notes.trim(),
  }
}

export function openPosition(
  candle: Candle,
  candleIndex: number,
  balance: number,
  ticket: OrderTicket,
  execution: ExecutionSettings,
  fillPrice = candle.close,
): Position {
  return buildPosition({
    id: crypto.randomUUID(),
    side: ticket.side,
    orderKind: ticket.kind,
    setup: ticket.setup.trim(),
    tags: parseTags(ticket.tags),
    notes: ticket.notes.trim(),
    candle,
    candleIndex,
    balance,
    riskPercent: ticket.riskPercent,
    stopDistance: ticket.stopDistance,
    rewardRisk: ticket.rewardRisk,
    execution,
    fillPrice,
  })
}

export function evaluatePendingOrder(
  candle: Candle,
  candleIndex: number,
  balance: number,
  order: PendingOrder,
  execution: ExecutionSettings,
): Position | null {
  const touched =
    order.kind === 'limit'
      ? order.side === 'long'
        ? candle.low <= order.requestedPrice
        : candle.high >= order.requestedPrice
      : order.side === 'long'
        ? candle.high >= order.requestedPrice
        : candle.low <= order.requestedPrice

  if (!touched) {
    return null
  }

  return buildPosition({
    id: order.id,
    side: order.side,
    orderKind: order.kind,
    setup: order.setup,
    tags: order.tags,
    notes: order.notes,
    candle,
    candleIndex,
    balance,
    riskPercent: order.riskPercent,
    stopDistance: order.stopDistance,
    rewardRisk: order.rewardRisk,
    execution,
    fillPrice: order.requestedPrice,
  })
}

export function evaluatePosition(
  candle: Candle,
  candleIndex: number,
  position: Position,
  execution: ExecutionSettings,
): Trade | null {
  if (position.side === 'long') {
    const stopHit = candle.low <= position.stopLoss
    const targetHit = candle.high >= position.takeProfit

    if (stopHit) {
      return closePosition(position, candle, candleIndex, position.stopLoss, 'stop-loss', execution)
    }

    if (targetHit) {
      return closePosition(position, candle, candleIndex, position.takeProfit, 'take-profit', execution)
    }
  }

  if (position.side === 'short') {
    const stopHit = candle.high >= position.stopLoss
    const targetHit = candle.low <= position.takeProfit

    if (stopHit) {
      return closePosition(position, candle, candleIndex, position.stopLoss, 'stop-loss', execution)
    }

    if (targetHit) {
      return closePosition(position, candle, candleIndex, position.takeProfit, 'take-profit', execution)
    }
  }

  return null
}

export function closePosition(
  position: Position,
  candle: Candle,
  candleIndex: number,
  requestedExitPrice: number,
  reason: ExitReason,
  execution: ExecutionSettings,
): Trade {
  const exitPrice = applyExecutionCost(requestedExitPrice, position.side, 'exit', execution)
  const exitFee = calculateFee(exitPrice, position.quantity, execution)
  const direction = position.side === 'long' ? 1 : -1
  const grossPnl = (exitPrice - position.entryPrice) * direction * position.quantity
  const pnl = grossPnl - position.entryFee - exitFee

  return {
    ...position,
    exitIndex: candleIndex,
    exitTime: candle.time,
    exitPrice: roundPrice(exitPrice),
    exitFee: roundMoney(exitFee),
    grossPnl: roundMoney(grossPnl),
    pnl: roundMoney(pnl),
    rMultiple: position.riskAmount > 0 ? roundMetric(pnl / position.riskAmount) : 0,
    holdCandles: Math.max(0, candleIndex - position.entryIndex),
    reason,
  }
}

export function calculateMetrics(trades: Trade[], initialBalance: number): BacktestMetrics {
  const totalTrades = trades.length
  const winners = trades.filter((trade) => trade.pnl > 0)
  const losers = trades.filter((trade) => trade.pnl < 0)
  const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0))
  const netPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const fees = trades.reduce((sum, trade) => sum + trade.entryFee + trade.exitFee, 0)
  const equityCurve = buildEquityCurve(trades, initialBalance)
  const tradingDays = new Set(trades.map((trade) => dayKey(trade.exitTime))).size

  return {
    totalTrades,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: totalTrades > 0 ? roundMetric((winners.length / totalTrades) * 100) : 0,
    netPnl: roundMoney(netPnl),
    grossProfit: roundMoney(grossProfit),
    grossLoss: roundMoney(grossLoss),
    fees: roundMoney(fees),
    profitFactor:
      grossLoss > 0 ? roundMetric(grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0,
    expectancyR:
      totalTrades > 0
        ? roundMetric(trades.reduce((sum, trade) => sum + trade.rMultiple, 0) / totalTrades)
        : 0,
    averageWin: winners.length > 0 ? roundMoney(grossProfit / winners.length) : 0,
    averageLoss: losers.length > 0 ? roundMoney(grossLoss / losers.length) : 0,
    largestWin: winners.length > 0 ? roundMoney(Math.max(...winners.map((trade) => trade.pnl))) : 0,
    largestLoss: losers.length > 0 ? roundMoney(Math.min(...losers.map((trade) => trade.pnl))) : 0,
    maxDrawdown: roundMoney(equityCurve.maxDrawdown),
    averageHoldCandles:
      totalTrades > 0
        ? roundMetric(trades.reduce((sum, trade) => sum + trade.holdCandles, 0) / totalTrades)
        : 0,
    tradingDays,
  }
}

export function calculatePropFirmStatus(
  trades: Trade[],
  initialBalance: number,
  rules: PropFirmRules,
): PropFirmStatus {
  if (!rules.enabled) {
    return {
      status: 'active',
      targetProgress: 0,
      currentDrawdown: 0,
      maxDrawdown: 0,
      worstDailyLoss: 0,
      tradingDays: 0,
      violations: [],
    }
  }

  const netPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)
  const equityCurve = buildEquityCurve(trades, initialBalance)
  const dailyPnl = new Map<string, number>()

  for (const trade of trades) {
    const key = dayKey(trade.exitTime)
    dailyPnl.set(key, (dailyPnl.get(key) ?? 0) + trade.pnl)
  }

  const worstDailyLoss = Math.min(0, ...dailyPnl.values())
  const tradingDays = dailyPnl.size
  const violations: string[] = []

  if (Math.abs(worstDailyLoss) > rules.dailyLossLimit) {
    violations.push('Daily loss limit depasse')
  }

  if (equityCurve.maxDrawdown > rules.maxDrawdown) {
    violations.push('Max drawdown depasse')
  }

  const targetReached = netPnl >= rules.targetProfit
  const enoughDays = tradingDays >= rules.minTradingDays

  return {
    status: violations.length > 0 ? 'failed' : targetReached && enoughDays ? 'passed' : 'active',
    targetProgress: rules.targetProfit > 0 ? roundMetric(Math.min(100, (netPnl / rules.targetProfit) * 100)) : 0,
    currentDrawdown: roundMoney(equityCurve.currentDrawdown),
    maxDrawdown: roundMoney(equityCurve.maxDrawdown),
    worstDailyLoss: roundMoney(Math.abs(worstDailyLoss)),
    tradingDays,
    violations,
  }
}

export function buildEquityCurve(trades: Trade[], initialBalance: number) {
  let equity = initialBalance
  let peak = initialBalance
  let maxDrawdown = 0
  const points = trades.map((trade) => {
    equity += trade.pnl
    peak = Math.max(peak, equity)
    const drawdown = peak - equity
    maxDrawdown = Math.max(maxDrawdown, drawdown)

    return {
      time: trade.exitTime,
      equity: roundMoney(equity),
      drawdown: roundMoney(drawdown),
    }
  })

  return {
    points,
    currentDrawdown: roundMoney(peak - equity),
    maxDrawdown: roundMoney(maxDrawdown),
  }
}

export function exportTradesCsv(trades: Trade[]) {
  const headers = [
    'entry_time',
    'exit_time',
    'side',
    'order_kind',
    'setup',
    'tags',
    'entry',
    'exit',
    'stop_loss',
    'take_profit',
    'quantity',
    'gross_pnl',
    'fees',
    'net_pnl',
    'r_multiple',
    'reason',
    'notes',
  ]

  const rows = trades.map((trade) => [
    new Date(trade.entryTime * 1000).toISOString(),
    new Date(trade.exitTime * 1000).toISOString(),
    trade.side,
    trade.orderKind,
    trade.setup,
    trade.tags.join('|'),
    trade.entryPrice,
    trade.exitPrice,
    trade.stopLoss,
    trade.takeProfit,
    roundMetric(trade.quantity),
    trade.grossPnl,
    roundMoney(trade.entryFee + trade.exitFee),
    trade.pnl,
    trade.rMultiple,
    trade.reason,
    trade.notes,
  ])

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

export function parseCandlesCsv(csv: string): Candle[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('Le CSV doit contenir un header et au moins une ligne de donnees.')
  }

  const headers = splitCsvLine(lines[0]).map((header) => normalizeHeader(header))
  const findColumn = (...candidates: string[]) =>
    headers.findIndex((header) => candidates.includes(header))

  const timeIndex = findColumn('time', 'timestamp', 'date', 'datetime')
  const openIndex = findColumn('open', 'o')
  const highIndex = findColumn('high', 'h')
  const lowIndex = findColumn('low', 'l')
  const closeIndex = findColumn('close', 'c', 'price', 'adjclose')
  const volumeIndex = findColumn('volume', 'vol', 'v')

  if (timeIndex < 0 || closeIndex < 0) {
    throw new Error('Colonnes requises: timestamp/date/time et close.')
  }

  const candles = lines.slice(1).map((line, rowIndex) => {
    const row = splitCsvLine(line)
    const close = parseNumber(row[closeIndex], rowIndex)
    const open = openIndex >= 0 ? parseNumber(row[openIndex], rowIndex) : close
    const high = highIndex >= 0 ? parseNumber(row[highIndex], rowIndex) : Math.max(open, close)
    const low = lowIndex >= 0 ? parseNumber(row[lowIndex], rowIndex) : Math.min(open, close)
    const volume = volumeIndex >= 0 ? parseNumber(row[volumeIndex], rowIndex) : 0

    return {
      time: parseTimestamp(row[timeIndex], rowIndex),
      open,
      high,
      low,
      close,
      volume,
    }
  })

  return candles.sort((left, right) => left.time - right.time)
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPrice(value: number) {
  return value.toFixed(5)
}

function buildPosition({
  id,
  side,
  orderKind,
  setup,
  tags,
  notes,
  candle,
  candleIndex,
  balance,
  riskPercent,
  stopDistance,
  rewardRisk,
  execution,
  fillPrice,
}: {
  id: string
  side: TradeSide
  orderKind: OrderTicket['kind']
  setup: string
  tags: string[]
  notes: string
  candle: Candle
  candleIndex: number
  balance: number
  riskPercent: number
  stopDistance: number
  rewardRisk: number
  execution: ExecutionSettings
  fillPrice: number
}) {
  const entryPrice = applyExecutionCost(fillPrice, side, 'entry', execution)
  const riskAmount = Math.max(0, balance * (riskPercent / 100))
  const safeStopDistance = Math.max(stopDistance, 0.00001)
  const targetDistance = safeStopDistance * Math.max(rewardRisk, 0.1)
  const quantity = riskAmount / safeStopDistance
  const entryFee = calculateFee(entryPrice, quantity, execution)
  const isLong = side === 'long'

  return {
    id,
    side,
    orderKind,
    setup,
    tags,
    notes,
    entryIndex: candleIndex,
    entryTime: candle.time,
    entryPrice: roundPrice(entryPrice),
    stopLoss: roundPrice(isLong ? entryPrice - safeStopDistance : entryPrice + safeStopDistance),
    takeProfit: roundPrice(isLong ? entryPrice + targetDistance : entryPrice - targetDistance),
    quantity: roundMetric(quantity),
    riskAmount: roundMoney(riskAmount),
    entryFee: roundMoney(entryFee),
  }
}

function applyExecutionCost(
  price: number,
  side: TradeSide,
  phase: 'entry' | 'exit',
  execution: ExecutionSettings,
) {
  const halfSpread = Math.max(0, execution.spread) / 2
  const slippage = Math.max(0, execution.slippage)
  const direction =
    phase === 'entry'
      ? side === 'long'
        ? 1
        : -1
      : side === 'long'
        ? -1
        : 1

  return roundPrice(price + direction * (halfSpread + slippage))
}

function calculateFee(price: number, quantity: number, execution: ExecutionSettings) {
  const notional = Math.abs(price * quantity)
  return (notional / 1_000_000) * Math.max(0, execution.commissionPerMillion)
}

function parseTimestamp(value: string, rowIndex: number) {
  const trimmed = value.trim()
  const numeric = Number(trimmed)

  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric)
  }

  const parsed = Date.parse(trimmed)

  if (Number.isNaN(parsed)) {
    throw new Error(`Timestamp invalide ligne ${rowIndex + 2}: ${value}`)
  }

  return Math.floor(parsed / 1000)
}

function parseNumber(value: string, rowIndex: number) {
  const parsed = Number(value.replace(',', '.'))

  if (!Number.isFinite(parsed)) {
    throw new Error(`Nombre invalide ligne ${rowIndex + 2}: ${value}`)
  }

  return parsed
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function splitCsvLine(line: string) {
  return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((cell) => cell.replace(/^"|"$/g, ''))
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[\s_-]/g, '')
}

function dayKey(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function roundPrice(value: number) {
  return Number(value.toFixed(5))
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function roundMetric(value: number) {
  return Number(value.toFixed(2))
}
