import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Database,
  Download,
  FileJson,
  FileUp,
  RefreshCw,
  Pause,
  Play,
  RotateCcw,
  Save,
  Send,
  SkipForward,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import './App.css'
import { ReplayChart } from './components/ReplayChart'
import { createSampleCandles } from './data/sampleCandles'
import {
  clearAuthToken,
  createServerSessionSnapshot,
  deleteServerDataset,
  deleteServerSessionSnapshot,
  getApiHealth,
  getCurrentUser,
  getServerDatasetCandles,
  getServerSessionSnapshot,
  loginUser,
  listServerDatasets,
  listServerSessionSnapshots,
  logoutUser,
  registerUser,
  setAuthToken,
  updateServerSessionSnapshot,
  uploadServerDataset,
  type AuthUser,
  type ApiStatus,
  type ServerDatasetSummary,
  type ServerSessionSummary,
} from './lib/api'
import {
  calculateMetrics,
  calculatePropFirmStatus,
  closePosition,
  createPendingOrder,
  defaultExecutionSettings,
  defaultPropFirmRules,
  evaluatePendingOrder,
  evaluatePosition,
  exportTradesCsv,
  formatDateTime,
  formatMoney,
  formatPrice,
  openPosition,
  parseCandlesCsv,
} from './lib/replay'
import type {
  ExecutionSettings,
  OrderTicket,
  PendingOrder,
  PersistedSession,
  Position,
  PropFirmRules,
  Trade,
  TradeSide,
} from './types'

const initialBalance = 10_000
const warmupCandles = 90
const storageKey = 'backtest-lab-session-v2'

const speedOptions = [
  { label: '1x', delay: 900 },
  { label: '2x', delay: 450 },
  { label: '5x', delay: 180 },
  { label: '10x', delay: 80 },
]

const defaultTicket: OrderTicket = {
  side: 'long',
  kind: 'market',
  entryPrice: 1.086,
  riskPercent: 1,
  stopDistance: 0.001,
  rewardRisk: 2,
  setup: 'Breakout',
  tags: 'A+, London',
  notes: '',
}

function App() {
  const [bootSession] = useState(loadStoredSession)
  const [candles, setCandles] = useState(bootSession.candles)
  const [cursor, setCursor] = useState(bootSession.cursor)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(speedOptions[1])
  const [balance, setBalance] = useState(bootSession.balance)
  const [activePosition, setActivePosition] = useState<Position | null>(bootSession.activePosition)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(bootSession.pendingOrders)
  const [trades, setTrades] = useState<Trade[]>(bootSession.trades)
  const [ticket, setTicket] = useState<OrderTicket>(bootSession.ticket)
  const [execution, setExecution] = useState<ExecutionSettings>(bootSession.execution)
  const [propRules, setPropRules] = useState<PropFirmRules>(bootSession.propRules)
  const [dataLabel, setDataLabel] = useState(bootSession.dataLabel)
  const [csvError, setCsvError] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [serverSessionId, setServerSessionId] = useState<string | null>(bootSession.serverSessionId ?? null)
  const [selectedServerSessionId, setSelectedServerSessionId] = useState(bootSession.serverSessionId ?? '')
  const [serverSessions, setServerSessions] = useState<ServerSessionSummary[]>([])
  const [serverMessage, setServerMessage] = useState('')
  const [serverDatasets, setServerDatasets] = useState<ServerDatasetSummary[]>([])
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [datasetMessage, setDatasetMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authMessage, setAuthMessage] = useState('')
  const [authForm, setAuthForm] = useState({
    email: 'trader@example.com',
    password: 'password123',
    displayName: 'Trader',
  })
  const [datasetForm, setDatasetForm] = useState({
    name: dataLabel,
    symbol: 'EURUSD',
    timeframe: '5m',
    assetClass: 'forex',
    exchange: 'custom',
  })

  const visibleCandles = useMemo(() => candles.slice(0, cursor + 1), [candles, cursor])
  const currentCandle = candles[cursor]
  const metrics = useMemo(() => calculateMetrics(trades, initialBalance), [trades])
  const propStatus = useMemo(
    () => calculatePropFirmStatus(trades, initialBalance, propRules),
    [propRules, trades],
  )
  const progress = Math.round((cursor / Math.max(candles.length - 1, 1)) * 100)
  const persistedSession = useMemo<PersistedSession>(
    () => ({
      serverSessionId,
      candles,
      cursor,
      balance,
      activePosition,
      pendingOrders,
      trades,
      ticket,
      execution,
      propRules,
      dataLabel,
    }),
    [
      activePosition,
      balance,
      candles,
      cursor,
      dataLabel,
      execution,
      pendingOrders,
      propRules,
      serverSessionId,
      ticket,
      trades,
    ],
  )

  const refreshServerSessions = useCallback(async () => {
    const sessions = await listServerSessionSnapshots()
    setServerSessions(sessions)

    if (!selectedServerSessionId && sessions[0]) {
      setSelectedServerSessionId(sessions[0].id)
    }
  }, [selectedServerSessionId])

  const refreshServerDatasets = useCallback(async () => {
    const datasets = await listServerDatasets()
    setServerDatasets(datasets)

    if (!selectedDatasetId && datasets[0]) {
      setSelectedDatasetId(datasets[0].id)
    }
  }, [selectedDatasetId])

  const refreshServerResources = useCallback(async () => {
    await Promise.all([refreshServerSessions(), refreshServerDatasets()])
  }, [refreshServerDatasets, refreshServerSessions])

  useEffect(() => {
    const controller = new AbortController()

    getApiHealth(controller.signal)
      .then(() => {
        setApiStatus('online')
        return getCurrentUser()
      })
      .then((user) => {
        setCurrentUser(user)
        return refreshServerResources()
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          clearAuthToken()
          setCurrentUser(null)
        }
      })

    return () => controller.abort()
  }, [refreshServerResources])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(persistedSession))
  }, [persistedSession])

  const registerTrade = useCallback((trade: Trade) => {
    setTrades((currentTrades) => [...currentTrades, trade])
    setBalance((currentBalance) => Number((currentBalance + trade.pnl).toFixed(2)))
    setActivePosition(null)
  }, [])

  const advanceOneCandle = useCallback(() => {
    setCursor((currentCursor) => {
      if (currentCursor >= candles.length - 1) {
        setIsPlaying(false)
        return currentCursor
      }

      const nextCursor = currentCursor + 1
      const nextCandle = candles[nextCursor]

      if (activePosition) {
        const trade = evaluatePosition(nextCandle, nextCursor, activePosition, execution)

        if (trade) {
          registerTrade(trade)
        }
      } else {
        const filledOrder = pendingOrders
          .map((order) => ({
            order,
            position: evaluatePendingOrder(nextCandle, nextCursor, balance, order, execution),
          }))
          .find((candidate) => candidate.position)

        if (filledOrder?.position) {
          setActivePosition(filledOrder.position)
          setPendingOrders((orders) => orders.filter((order) => order.id !== filledOrder.order.id))
        }
      }

      return nextCursor
    })
  }, [activePosition, balance, candles, execution, pendingOrders, registerTrade])

  useEffect(() => {
    if (!isPlaying || propStatus.status === 'failed' || propStatus.status === 'passed') {
      return
    }

    const timer = window.setInterval(advanceOneCandle, speed.delay)
    return () => window.clearInterval(timer)
  }, [advanceOneCandle, isPlaying, propStatus.status, speed])

  const resetSession = useCallback(
    (nextCandles = candles, nextLabel = dataLabel) => {
      setCandles(nextCandles)
      setCursor(Math.min(warmupCandles, nextCandles.length - 1))
      setIsPlaying(false)
      setBalance(initialBalance)
      setActivePosition(null)
      setPendingOrders([])
      setTrades([])
      setDataLabel(nextLabel)
      setServerSessionId(null)
      setSelectedServerSessionId('')
      setCsvError('')
    },
    [candles, dataLabel],
  )

  const clearStorage = useCallback(() => {
    localStorage.removeItem(storageKey)
    resetSession(createSampleCandles(), 'EURUSD demo - M5 synthetique')
    setTicket(defaultTicket)
    setExecution(defaultExecutionSettings)
    setPropRules(defaultPropFirmRules)
    setServerSessionId(null)
    setSelectedServerSessionId('')
  }, [resetSession])

  const submitOrder = useCallback(
    (side: TradeSide) => {
      if (!currentCandle || activePosition || propStatus.status !== 'active') {
        return
      }

      const nextTicket = { ...ticket, side }
      setTicket(nextTicket)

      if (nextTicket.kind === 'market') {
        setActivePosition(openPosition(currentCandle, cursor, balance, nextTicket, execution))
        return
      }

      setPendingOrders((orders) => [...orders, createPendingOrder(currentCandle, cursor, nextTicket)])
    },
    [activePosition, balance, currentCandle, cursor, execution, propStatus.status, ticket],
  )

  const closeActivePosition = useCallback(() => {
    if (!activePosition || !currentCandle) {
      return
    }

    registerTrade(
      closePosition(activePosition, currentCandle, cursor, currentCandle.close, 'manual-close', execution),
    )
  }, [activePosition, currentCandle, cursor, execution, registerTrade])

  const handleCsvUpload = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        try {
          const parsedCandles = parseCandlesCsv(String(reader.result))

          if (parsedCandles.length < 120) {
            throw new Error('Le CSV doit contenir au moins 120 bougies pour une session exploitable.')
          }

          resetSession(parsedCandles, file.name)
          setDatasetForm((current) => ({ ...current, name: file.name }))
        } catch (error) {
          setCsvError(error instanceof Error ? error.message : 'CSV invalide.')
        }
      }

      reader.readAsText(file)
    },
    [resetSession],
  )

  const exportJson = useCallback(() => {
    downloadFile(
      'backtest-lab-session.json',
      JSON.stringify(
        {
          dataLabel,
          initialBalance,
          balance,
          execution,
          propRules,
          metrics,
          propStatus,
          pendingOrders,
          activePosition,
          trades,
        },
        null,
        2,
      ),
      'application/json',
    )
  }, [
    activePosition,
    balance,
    dataLabel,
    execution,
    metrics,
    pendingOrders,
    propRules,
    propStatus,
    trades,
  ])

  const exportCsv = useCallback(() => {
    downloadFile('backtest-lab-trades.csv', exportTradesCsv(trades), 'text/csv')
  }, [trades])

  const saveServerSession = useCallback(async () => {
    if (!currentUser) {
      setServerMessage('Connecte-toi pour sauvegarder sur le serveur.')
      return
    }

    try {
      setServerMessage('Sauvegarde serveur...')
      const payload = {
        name: dataLabel,
        data_label: dataLabel,
        initial_balance: initialBalance,
        current_balance: balance,
        cursor,
        total_trades: trades.length,
        snapshot: persistedSession as unknown as Record<string, unknown>,
        metrics_json: metrics as unknown as Record<string, unknown>,
      }
      const savedSession = serverSessionId
        ? await updateServerSessionSnapshot(serverSessionId, payload)
        : await createServerSessionSnapshot(payload)

      setServerSessionId(savedSession.id)
      setSelectedServerSessionId(savedSession.id)
      setApiStatus('online')
      setServerMessage(`Session sauvegardee: ${savedSession.name}`)
      await refreshServerSessions()
    } catch (error) {
      setApiStatus('offline')
      setServerMessage(error instanceof Error ? error.message : 'Sauvegarde serveur impossible.')
    }
  }, [
    balance,
    currentUser,
    cursor,
    dataLabel,
    metrics,
    persistedSession,
    refreshServerSessions,
    serverSessionId,
    trades.length,
  ])

  const loadServerSession = useCallback(async () => {
    if (!selectedServerSessionId) {
      return
    }

    try {
      setServerMessage('Chargement serveur...')
      const serverSnapshot = await getServerSessionSnapshot(selectedServerSessionId)
      const normalizedSession = normalizePersistedSession(
        serverSnapshot.snapshot as Partial<PersistedSession>,
      )

      setCandles(normalizedSession.candles)
      setCursor(normalizedSession.cursor)
      setIsPlaying(false)
      setBalance(normalizedSession.balance)
      setActivePosition(normalizedSession.activePosition)
      setPendingOrders(normalizedSession.pendingOrders)
      setTrades(normalizedSession.trades)
      setTicket(normalizedSession.ticket)
      setExecution(normalizedSession.execution)
      setPropRules(normalizedSession.propRules)
      setDataLabel(normalizedSession.dataLabel)
      setServerSessionId(serverSnapshot.id)
      setServerMessage(`Session chargee: ${serverSnapshot.name}`)
      setApiStatus('online')
    } catch (error) {
      setApiStatus('offline')
      setServerMessage(error instanceof Error ? error.message : 'Chargement serveur impossible.')
    }
  }, [selectedServerSessionId])

  const deleteSelectedServerSession = useCallback(async () => {
    if (!selectedServerSessionId) {
      return
    }

    try {
      await deleteServerSessionSnapshot(selectedServerSessionId)
      if (serverSessionId === selectedServerSessionId) {
        setServerSessionId(null)
      }
      setSelectedServerSessionId('')
      setServerMessage('Session serveur supprimee.')
      await refreshServerSessions()
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : 'Suppression serveur impossible.')
    }
  }, [refreshServerSessions, selectedServerSessionId, serverSessionId])

  const uploadDatasetToServer = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        return
      }

      if (!currentUser) {
        setDatasetMessage('Connecte-toi pour uploader un dataset serveur.')
        return
      }

      try {
        setDatasetMessage('Upload dataset...')
        const dataset = await uploadServerDataset({
          file,
          name: datasetForm.name || file.name,
          symbol: datasetForm.symbol,
          timeframe: datasetForm.timeframe,
          assetClass: datasetForm.assetClass,
          exchange: datasetForm.exchange,
        })
        setSelectedDatasetId(dataset.id)
        setDatasetMessage(`Dataset sauvegarde: ${dataset.name} (${dataset.candle_count} candles)`)
        setApiStatus('online')
        await refreshServerDatasets()
      } catch (error) {
        setDatasetMessage(error instanceof Error ? error.message : 'Upload dataset impossible.')
      }
    },
    [currentUser, datasetForm, refreshServerDatasets],
  )

  const loadServerDataset = useCallback(async () => {
    if (!selectedDatasetId) {
      return
    }

    try {
      setDatasetMessage('Chargement dataset...')
      const datasetWithCandles = await getServerDatasetCandles(selectedDatasetId)

      if (datasetWithCandles.candles.length < 10) {
        throw new Error('Dataset serveur insuffisant.')
      }

      resetSession(
        datasetWithCandles.candles,
        `${datasetWithCandles.dataset.symbol} ${datasetWithCandles.dataset.timeframe} - ${datasetWithCandles.dataset.name}`,
      )
      setSelectedDatasetId(datasetWithCandles.dataset.id)
      setDatasetMessage(`Dataset charge: ${datasetWithCandles.candles.length} candles`)
    } catch (error) {
      setDatasetMessage(error instanceof Error ? error.message : 'Chargement dataset impossible.')
    }
  }, [resetSession, selectedDatasetId])

  const deleteSelectedDataset = useCallback(async () => {
    if (!selectedDatasetId) {
      return
    }

    try {
      await deleteServerDataset(selectedDatasetId)
      setDatasetMessage('Dataset supprime.')
      setSelectedDatasetId('')
      await refreshServerDatasets()
    } catch (error) {
      setDatasetMessage(error instanceof Error ? error.message : 'Suppression dataset impossible.')
    }
  }, [refreshServerDatasets, selectedDatasetId])

  const submitAuth = useCallback(async () => {
    try {
      setAuthMessage(authMode === 'login' ? 'Connexion...' : 'Creation du compte...')
      const response =
        authMode === 'login'
          ? await loginUser({ email: authForm.email, password: authForm.password })
          : await registerUser({
              email: authForm.email,
              password: authForm.password,
              display_name: authForm.displayName,
            })

      setAuthToken(response.token)
      setCurrentUser(response.user)
      setAuthMessage(`Connecte: ${response.user.email}`)
      setApiStatus('online')
      await refreshServerResources()
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentification impossible.')
    }
  }, [authForm.displayName, authForm.email, authForm.password, authMode, refreshServerResources])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } catch {
      clearAuthToken()
    } finally {
      setCurrentUser(null)
      setServerSessions([])
      setServerDatasets([])
      setServerSessionId(null)
      setSelectedServerSessionId('')
      setSelectedDatasetId('')
      setAuthMessage('Deconnecte.')
    }
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Backtest Lab</p>
          <h1>Replay trading platform</h1>
        </div>
        <div className="session-meta">
          <span>{dataLabel}</span>
          <strong>{currentCandle ? formatDateTime(currentCandle.time) : 'Aucune donnee'}</strong>
          <span className={`api-pill ${apiStatus}`}>API {apiStatus}</span>
        </div>
      </header>

      <section className="metrics-strip" aria-label="Statistiques de session">
        <Metric label="Balance" value={formatMoney(balance)} tone={balance >= initialBalance ? 'good' : 'bad'} />
        <Metric label="Net PnL" value={formatMoney(metrics.netPnl)} tone={metrics.netPnl >= 0 ? 'good' : 'bad'} />
        <Metric label="Win rate" value={`${metrics.winRate}%`} />
        <Metric
          label="Profit factor"
          value={Number.isFinite(metrics.profitFactor) ? String(metrics.profitFactor) : '∞'}
        />
        <Metric label="Prop status" value={propStatus.status} tone={propStatus.status === 'failed' ? 'bad' : 'good'} />
        <Metric label="Max DD" value={formatMoney(metrics.maxDrawdown)} tone="bad" />
      </section>

      <section className="workbench">
        <aside className="left-panel">
          <PanelTitle icon={<Activity size={16} />} label="Session" />
          <div className="control-row">
            <button className="icon-button primary" type="button" onClick={() => setIsPlaying((value) => !value)}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button className="icon-button" type="button" onClick={advanceOneCandle}>
              <SkipForward size={18} />
            </button>
            <button className="icon-button" type="button" onClick={() => resetSession()}>
              <RotateCcw size={18} />
            </button>
          </div>

          <label className="field-label" htmlFor="speed">
            Vitesse
          </label>
          <select
            id="speed"
            className="select-input"
            value={speed.label}
            onChange={(event) => {
              const nextSpeed = speedOptions.find((option) => option.label === event.target.value)
              if (nextSpeed) {
                setSpeed(nextSpeed)
              }
            }}
          >
            {speedOptions.map((option) => (
              <option key={option.label}>{option.label}</option>
            ))}
          </select>

          <label className="field-label" htmlFor="cursor">
            Progression {progress}%
          </label>
          <input
            id="cursor"
            min={warmupCandles}
            max={candles.length - 1}
            value={cursor}
            className="range-input"
            type="range"
            onChange={(event) => {
              setIsPlaying(false)
              setCursor(Number(event.target.value))
            }}
          />

          <section className="sub-panel compact-sub-panel">
            <h3>Compte</h3>
            {currentUser ? (
              <div className="account-box">
                <span>{currentUser.display_name || 'Trader'}</span>
                <strong>{currentUser.email}</strong>
                <button className="flat-button" type="button" onClick={logout}>
                  Deconnexion
                </button>
              </div>
            ) : (
              <div className="auth-form">
                <div className="side-toggle compact-toggle">
                  <button
                    className={authMode === 'login' ? 'selected long' : ''}
                    type="button"
                    onClick={() => setAuthMode('login')}
                  >
                    Login
                  </button>
                  <button
                    className={authMode === 'register' ? 'selected long' : ''}
                    type="button"
                    onClick={() => setAuthMode('register')}
                  >
                    Register
                  </button>
                </div>
                <TextField
                  label="Email"
                  value={authForm.email}
                  onChange={(value) => setAuthForm((current) => ({ ...current, email: value }))}
                />
                <label className="number-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                {authMode === 'register' ? (
                  <TextField
                    label="Nom"
                    value={authForm.displayName}
                    onChange={(value) => setAuthForm((current) => ({ ...current, displayName: value }))}
                  />
                ) : null}
                <button className="flat-button" type="button" onClick={submitAuth}>
                  {authMode === 'login' ? 'Se connecter' : 'Creer le compte'}
                </button>
              </div>
            )}
            {authMessage ? <p className="server-message">{authMessage}</p> : null}
          </section>

          <label className="upload-control">
            <FileUp size={16} />
            Importer CSV OHLCV
            <input accept=".csv,text/csv" type="file" onChange={(event) => handleCsvUpload(event.target.files?.[0])} />
          </label>
          {csvError ? <p className="error-text">{csvError}</p> : null}

          <div className="button-stack">
            <section className="sub-panel compact-sub-panel">
              <h3>Datasets serveur</h3>
              <TextField
                label="Nom dataset"
                value={datasetForm.name}
                onChange={(value) => setDatasetForm((current) => ({ ...current, name: value }))}
              />
              <div className="two-grid">
                <TextField
                  label="Symbole"
                  value={datasetForm.symbol}
                  onChange={(value) => setDatasetForm((current) => ({ ...current, symbol: value }))}
                />
                <TextField
                  label="Timeframe"
                  value={datasetForm.timeframe}
                  onChange={(value) => setDatasetForm((current) => ({ ...current, timeframe: value }))}
                />
              </div>
              <label className="upload-control compact-upload">
                <FileUp size={16} />
                Upload CSV serveur
                <input
                  accept=".csv,text/csv"
                  type="file"
                  onChange={(event) => uploadDatasetToServer(event.target.files?.[0])}
                />
              </label>
              <label className="number-field compact-field">
                <span>Dataset</span>
                <select
                  className="select-input"
                  value={selectedDatasetId}
                  onChange={(event) => setSelectedDatasetId(event.target.value)}
                >
                  <option value="">Aucun dataset</option>
                  {serverDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.symbol} {dataset.timeframe} - {dataset.candle_count}
                    </option>
                  ))}
                </select>
              </label>
              <div className="server-actions">
                <button className="flat-button" type="button" onClick={loadServerDataset} disabled={!selectedDatasetId}>
                  <Download size={15} />
                  Load
                </button>
                <button className="flat-button" type="button" onClick={refreshServerDatasets}>
                  <RefreshCw size={15} />
                  Refresh
                </button>
                <button
                  className="flat-button danger"
                  type="button"
                  onClick={deleteSelectedDataset}
                  disabled={!selectedDatasetId}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
              {datasetMessage ? <p className="server-message">{datasetMessage}</p> : null}
            </section>

            <button className="flat-button" type="button" onClick={saveServerSession}>
              <Save size={15} />
              Save server
            </button>
            <label className="number-field compact-field">
              <span>Session serveur</span>
              <select
                className="select-input"
                value={selectedServerSessionId}
                onChange={(event) => setSelectedServerSessionId(event.target.value)}
              >
                <option value="">Aucune session</option>
                {serverSessions.map((serverSession) => (
                  <option key={serverSession.id} value={serverSession.id}>
                    {serverSession.name} - {serverSession.total_trades} trades
                  </option>
                ))}
              </select>
            </label>
            <div className="server-actions">
              <button
                className="flat-button"
                type="button"
                onClick={loadServerSession}
                disabled={!selectedServerSessionId}
              >
                <Download size={15} />
                Load
              </button>
              <button className="flat-button" type="button" onClick={refreshServerSessions}>
                <RefreshCw size={15} />
                Refresh
              </button>
              <button
                className="flat-button danger"
                type="button"
                onClick={deleteSelectedServerSession}
                disabled={!selectedServerSessionId}
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
            {serverMessage ? <p className="server-message">{serverMessage}</p> : null}
            <button className="flat-button" type="button" onClick={exportCsv} disabled={trades.length === 0}>
              <Download size={15} />
              Export trades CSV
            </button>
            <button className="flat-button" type="button" onClick={exportJson}>
              <FileJson size={15} />
              Export session JSON
            </button>
            <button className="flat-button danger" type="button" onClick={clearStorage}>
              <Trash2 size={15} />
              Reset stockage
            </button>
          </div>

          <div className="snapshot-list">
            <Snapshot label="Open" value={currentCandle ? formatPrice(currentCandle.open) : '-'} />
            <Snapshot label="High" value={currentCandle ? formatPrice(currentCandle.high) : '-'} />
            <Snapshot label="Low" value={currentCandle ? formatPrice(currentCandle.low) : '-'} />
            <Snapshot label="Close" value={currentCandle ? formatPrice(currentCandle.close) : '-'} />
          </div>
        </aside>

        <section className="chart-panel">
          <ReplayChart candles={visibleCandles} activePosition={activePosition} trades={trades} />
        </section>

        <aside className="right-panel">
          <PanelTitle icon={<Send size={16} />} label="Ordres" />
          <div className="side-toggle" role="group" aria-label="Direction du trade">
            <button
              className={ticket.side === 'long' ? 'selected long' : ''}
              type="button"
              onClick={() => setTicket((currentTicket) => ({ ...currentTicket, side: 'long' }))}
            >
              <TrendingUp size={16} />
              Long
            </button>
            <button
              className={ticket.side === 'short' ? 'selected short' : ''}
              type="button"
              onClick={() => setTicket((currentTicket) => ({ ...currentTicket, side: 'short' }))}
            >
              <TrendingDown size={16} />
              Short
            </button>
          </div>

          <label className="number-field">
            <span>Type ordre</span>
            <select
              className="select-input"
              value={ticket.kind}
              onChange={(event) =>
                setTicket((currentTicket) => ({
                  ...currentTicket,
                  kind: event.target.value as OrderTicket['kind'],
                }))
              }
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
            </select>
          </label>

          <NumberField
            label="Prix entree"
            min={0.00001}
            max={999999}
            step={0.00001}
            value={ticket.kind === 'market' && currentCandle ? currentCandle.close : ticket.entryPrice}
            disabled={ticket.kind === 'market'}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, entryPrice: value }))}
          />
          <NumberField
            label="Risque %"
            min={0.1}
            max={10}
            step={0.1}
            value={ticket.riskPercent}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, riskPercent: value }))}
          />
          <NumberField
            label="Distance SL"
            min={0.0001}
            max={0.05}
            step={0.0001}
            value={ticket.stopDistance}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, stopDistance: value }))}
          />
          <NumberField
            label="Reward/Risk"
            min={0.2}
            max={12}
            step={0.1}
            value={ticket.rewardRisk}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, rewardRisk: value }))}
          />
          <TextField
            label="Setup"
            value={ticket.setup}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, setup: value }))}
          />
          <TextField
            label="Tags"
            value={ticket.tags}
            onChange={(value) => setTicket((currentTicket) => ({ ...currentTicket, tags: value }))}
          />
          <label className="number-field">
            <span>Notes</span>
            <textarea
              value={ticket.notes}
              onChange={(event) => setTicket((currentTicket) => ({ ...currentTicket, notes: event.target.value }))}
            />
          </label>

          <button
            className={`trade-button ${ticket.side}`}
            type="button"
            disabled={Boolean(activePosition) || !currentCandle || propStatus.status !== 'active'}
            onClick={() => submitOrder(ticket.side)}
          >
            {ticket.side === 'long' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            Envoyer {ticket.side === 'long' ? 'Long' : 'Short'}
          </button>

          <section className="sub-panel">
            <h3>Position</h3>
            {activePosition ? (
              <div className="position-box">
                <div>
                  <span>Position ouverte</span>
                  <strong>{activePosition.side.toUpperCase()}</strong>
                </div>
                <Snapshot label="Entry" value={formatPrice(activePosition.entryPrice)} />
                <Snapshot label="SL" value={formatPrice(activePosition.stopLoss)} />
                <Snapshot label="TP" value={formatPrice(activePosition.takeProfit)} />
                <button className="flat-button" type="button" onClick={closeActivePosition}>
                  <Square size={15} />
                  Cloturer au marche
                </button>
              </div>
            ) : (
              <p className="empty-copy">Aucune position ouverte.</p>
            )}
          </section>

          <section className="sub-panel">
            <h3>Pending</h3>
            {pendingOrders.length === 0 ? (
              <p className="empty-copy">Aucun ordre en attente.</p>
            ) : (
              <div className="pending-list">
                {pendingOrders.map((order) => (
                  <div className="pending-order" key={order.id}>
                    <div>
                      <strong>{order.side} {order.kind}</strong>
                      <span>{formatPrice(order.requestedPrice)}</span>
                    </div>
                    <button
                      className="mini-icon"
                      type="button"
                      onClick={() => setPendingOrders((orders) => orders.filter((item) => item.id !== order.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="settings-grid">
        <section className="journal-panel">
          <div className="journal-header">
            <PanelTitle icon={<Database size={16} />} label="Execution" />
            <span>Spread, slippage et commission sont appliques au PnL net.</span>
          </div>
          <div className="three-grid">
            <NumberField
              label="Spread"
              min={0}
              max={0.01}
              step={0.00001}
              value={execution.spread}
              onChange={(value) => setExecution((current) => ({ ...current, spread: value }))}
            />
            <NumberField
              label="Slippage"
              min={0}
              max={0.01}
              step={0.00001}
              value={execution.slippage}
              onChange={(value) => setExecution((current) => ({ ...current, slippage: value }))}
            />
            <NumberField
              label="Commission / million"
              min={0}
              max={250}
              step={1}
              value={execution.commissionPerMillion}
              onChange={(value) => setExecution((current) => ({ ...current, commissionPerMillion: value }))}
            />
          </div>
        </section>

        <section className="journal-panel">
          <div className="journal-header">
            <PanelTitle icon={<BarChart3 size={16} />} label="Prop firm" />
            <span>{propStatus.violations.length ? propStatus.violations.join(', ') : 'Regles respectees'}</span>
          </div>
          <div className="three-grid">
            <NumberField
              label="Target"
              min={0}
              max={100000}
              step={50}
              value={propRules.targetProfit}
              onChange={(value) => setPropRules((current) => ({ ...current, targetProfit: value }))}
            />
            <NumberField
              label="Max DD"
              min={0}
              max={100000}
              step={50}
              value={propRules.maxDrawdown}
              onChange={(value) => setPropRules((current) => ({ ...current, maxDrawdown: value }))}
            />
            <NumberField
              label="Daily loss"
              min={0}
              max={100000}
              step={50}
              value={propRules.dailyLossLimit}
              onChange={(value) => setPropRules((current) => ({ ...current, dailyLossLimit: value }))}
            />
          </div>
          <div className="prop-strip">
            <Snapshot label="Target" value={`${propStatus.targetProgress}%`} />
            <Snapshot label="Daily worst" value={formatMoney(propStatus.worstDailyLoss)} />
            <Snapshot label="Trading days" value={String(propStatus.tradingDays)} />
          </div>
        </section>
      </section>

      <section className="journal-panel">
        <div className="journal-header">
          <PanelTitle icon={<BarChart3 size={16} />} label="Analytics & Journal" />
          <span>
            {metrics.totalTrades} trades - expectancy {metrics.expectancyR}R - fees {formatMoney(metrics.fees)}
          </span>
        </div>
        <div className="analytics-grid">
          <Snapshot label="Avg win" value={formatMoney(metrics.averageWin)} />
          <Snapshot label="Avg loss" value={formatMoney(metrics.averageLoss)} />
          <Snapshot label="Largest win" value={formatMoney(metrics.largestWin)} />
          <Snapshot label="Largest loss" value={formatMoney(metrics.largestLoss)} />
          <Snapshot label="Avg hold" value={`${metrics.averageHoldCandles} candles`} />
          <Snapshot label="Trading days" value={String(metrics.tradingDays)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Entree</th>
                <th>Side</th>
                <th>Type</th>
                <th>Setup</th>
                <th>Tags</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>R</th>
                <th>PnL</th>
                <th>Sortie</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={11}>
                    Les trades simules apparaitront ici.
                  </td>
                </tr>
              ) : (
                trades
                  .slice()
                  .reverse()
                  .map((trade, index) => (
                    <tr key={trade.id}>
                      <td>{trades.length - index}</td>
                      <td>{formatDateTime(trade.entryTime)}</td>
                      <td className={trade.side === 'long' ? 'text-good' : 'text-bad'}>{trade.side}</td>
                      <td>{trade.orderKind}</td>
                      <td>{trade.setup || '-'}</td>
                      <td>{trade.tags.join(', ') || '-'}</td>
                      <td>{formatPrice(trade.entryPrice)}</td>
                      <td>{formatPrice(trade.exitPrice)}</td>
                      <td className={trade.rMultiple >= 0 ? 'text-good' : 'text-bad'}>{trade.rMultiple}R</td>
                      <td className={trade.pnl >= 0 ? 'text-good' : 'text-bad'}>{formatMoney(trade.pnl)}</td>
                      <td>{trade.reason}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={tone ? `text-${tone}` : ''}>{value}</strong>
    </div>
  )
}

function PanelTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{label}</h2>
    </div>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="snapshot">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NumberField({
  label,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function loadStoredSession(): PersistedSession {
  const fallback = createFallbackSession()

  try {
    const rawSession = localStorage.getItem(storageKey)
    if (!rawSession) {
      return fallback
    }

    return normalizePersistedSession(JSON.parse(rawSession) as Partial<PersistedSession>, fallback)
  } catch {
    return fallback
  }
}

function createFallbackSession(): PersistedSession {
  return {
    serverSessionId: null,
    candles: createSampleCandles(),
    cursor: warmupCandles,
    balance: initialBalance,
    activePosition: null,
    pendingOrders: [],
    trades: [],
    ticket: defaultTicket,
    execution: defaultExecutionSettings,
    propRules: defaultPropFirmRules,
    dataLabel: 'EURUSD demo - M5 synthetique',
  }
}

function normalizePersistedSession(
  parsed: Partial<PersistedSession>,
  fallback = createFallbackSession(),
): PersistedSession {
  const candles = parsed.candles?.length ? parsed.candles : fallback.candles

  return {
    ...fallback,
    ...parsed,
    serverSessionId: parsed.serverSessionId ?? fallback.serverSessionId ?? null,
    candles,
    cursor: Math.min(parsed.cursor ?? fallback.cursor, candles.length - 1),
    balance: parsed.balance ?? fallback.balance,
    activePosition: parsed.activePosition ?? fallback.activePosition,
    pendingOrders: parsed.pendingOrders ?? fallback.pendingOrders,
    trades: parsed.trades ?? fallback.trades,
    ticket: { ...fallback.ticket, ...parsed.ticket },
    execution: { ...fallback.execution, ...parsed.execution },
    propRules: { ...fallback.propRules, ...parsed.propRules },
    dataLabel: parsed.dataLabel ?? fallback.dataLabel,
  }
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default App
