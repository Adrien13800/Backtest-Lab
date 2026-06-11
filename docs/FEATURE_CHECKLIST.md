# Feature Checklist: FX Replay vs Backtest Lab

Date de reference: 2026-06-11.

Portee: inventaire public des fonctionnalites FX Replay visibles sur le site officiel et le help center. Les fonctionnalites internes, A/B tests, permissions admin, workflows non documentes et details proprietaires ne peuvent pas etre garantis sans acces au produit et a sa base de connaissance complete.

Sources principales:

- FX Replay homepage: https://fxreplay.com/
- FX Replay pricing: https://fxreplay.com/pricing
- FX Replay help center / product guide: https://support.fxreplay.com/categories/product-guide-features
- FX Replay indicators: https://support.fxreplay.com/articles/what-indicators-does-fx-replay-offer
- FX Replay prop firm simulator: https://support.fxreplay.com/articles/prop-firm-simulator
- FX Replay analytic metrics: https://support.fxreplay.com/articles/analytic-metrics-defined
- FX Replay multi-asset article: https://support.fxreplay.com/articles/maximize-your-backtesting-explore-multiple-assets-with-fx-replay
- FX Replay resource center/support: https://support.fxreplay.com/articles/when-is-support-available

Legend:

- `[x]` present in Backtest Lab
- `[~]` partially present
- `[ ]` missing
- `[n/a]` external/commercial/community feature, not core product logic

## FX Replay: Full Public Feature Checklist

### Product / SaaS Foundation

- [ ] Web SaaS platform
- [x] User accounts
- [x] Login/logout
- [~] Profile/account settings
- [ ] Subscription plans: free tier, intermediate, pro
- [ ] Billing and payments
- [ ] Subscription cancellation
- [ ] Refund/cancellation policy
- [ ] Promotional offers / discounts
- [ ] Affiliate program
- [ ] Device/session access limits by plan
- [ ] Feature gating by plan
- [ ] Historical data hosting included in subscription
- [ ] No broker transaction fees/commissions charged by platform access

### Dashboard / Navigation

- [ ] Trader dashboard overview
- [ ] Session list / session management
- [ ] Create backtesting session
- [ ] Configure trading strategy
- [ ] Create checklist in FX Replay
- [ ] Help button / resource center
- [ ] In-app feature request flow
- [ ] In-app bug report flow
- [ ] General feedback flow
- [ ] Tutorials/webinars/resources access
- [ ] Social links from platform
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Tooltips

### Backtesting Session Setup

- [x] Replay mode concept
- [~] Jump to historical date / point in data
- [~] Select symbol/instrument
- [~] Select timeframe from imported/generated data
- [ ] Full session creation wizard
- [ ] Strategy configuration attached to session
- [ ] Session-specific trading checklist
- [ ] Session autosave cloud persistence
- [x] Local session autosave
- [ ] Reopen/resume saved sessions from account
- [ ] Separate chart markings by backtesting session
- [ ] Chart layout saving
- [ ] Drawing templates saving
- [ ] Chart autosave
- [ ] Replay feature enable/disable in settings

### Replay Controls

- [x] Play/pause replay
- [x] Adjustable replay speed
- [x] Step forward candle-by-candle
- [ ] Bar-by-bar rewind
- [ ] Rewind to a specific point in the chart
- [ ] Right-click replay to selected candle
- [ ] Dedicated bar replay button in chart UI
- [ ] Go-To Date feature
- [ ] Go-To feature for sessions
- [ ] Go-To feature for price levels
- [ ] Go-To feature for news events
- [ ] Go-To feature for trade closes
- [ ] Price skipper bar
- [ ] Replay without reloading/breaking session flow

### Charting

- [x] Candlestick chart
- [ ] TradingView-powered charting
- [ ] TradingView native drawing toolkit
- [ ] Multiple chart layouts
- [ ] Multi-chart with different timeframes
- [ ] Multi-chart with different pairs/assets
- [ ] Up to 16 charts simultaneously
- [ ] Up to 5 assets in one session
- [ ] Multi-pair / multi-chart workflow
- [ ] Track live prices
- [ ] Economic events on chart
- [ ] Candle smoothing feature
- [ ] Seconds-level chart/replay data
- [ ] One-minute historical data depth management
- [ ] Data provider transparency
- [ ] OANDA data provider support
- [ ] Forex vs futures price difference handling
- [ ] Futures chart support
- [ ] Stocks chart support
- [ ] Crypto chart support
- [ ] Commodities chart support
- [ ] Indices chart support
- [ ] Options risk disclosure/content

### Markets / Assets

- [~] Forex via CSV/custom data
- [~] Crypto via CSV/custom data
- [~] Stocks via CSV/custom data
- [~] Futures via CSV/custom data
- [~] Indices via CSV/custom data
- [~] Commodities via CSV/custom data
- [ ] Built-in asset universe
- [ ] Built-in historical data catalog
- [ ] Built-in multi-asset selector
- [ ] Full public asset list page
- [ ] Data depth by plan
- [ ] Broker/data vendor-backed datasets

### Orders / Execution

- [x] Buy/sell simulated orders
- [x] Long/short direction
- [x] Market orders
- [x] Limit orders
- [x] Stop orders
- [ ] Automatic order type detection from chart click
- [ ] Right-click order execution on chart
- [ ] Drag-and-place stop loss on chart
- [ ] Drag-and-place take profit on chart
- [x] Stop loss
- [x] Take profit
- [ ] Multiple take profits
- [~] Partial profits / partial close
- [ ] Break-even adjustment
- [ ] Risk/reward simulator
- [ ] Scalper mode for faster execution
- [x] Position sizing by risk %
- [x] Spread model
- [x] Commission model
- [x] Slippage model
- [~] Precise order simulation with OHLC conservative fill rules
- [ ] Seconds/tick-based intrabar order resolution
- [ ] Trade placement validation/error feedback parity with FX Replay
- [ ] Trade edit after placement
- [ ] Manage pending orders directly on chart
- [ ] Multiple simultaneous positions
- [ ] Multiple accounts

### Risk Management

- [x] Initial balance
- [x] Risk percent per trade
- [x] Stop distance
- [x] Reward/risk target
- [x] R-multiple calculation
- [x] Drawdown calculation
- [ ] Drawdown analytics by adverse movement/heat on winning trades
- [ ] Risk management education/resource modules
- [ ] Currency correlations resource/module
- [ ] Fundamental analysis resource/module
- [ ] Swing high/low education module

### Prop Firm Simulator

- [x] Prop firm session mode concept
- [x] Profit target
- [x] Max drawdown limit
- [x] Daily loss limit
- [x] Minimum trading days
- [x] Pass/fail/active status
- [~] Real challenge pressure/no rewind enforcement
- [ ] Preset prop firm templates
- [ ] FTMO discount/resource integration
- [ ] Prop firm-specific reporting

### Journal

- [x] Trade log/journal
- [x] Entry/exit timestamps
- [x] Side/order type
- [x] Entry/exit price
- [x] SL/TP
- [x] PnL
- [x] R-multiple
- [x] Setup field
- [x] Tags
- [x] Notes
- [ ] Journal templates
- [ ] Confidence score
- [ ] Calendar view
- [ ] Exporting journal reports
- [x] Export trades CSV
- [x] Export session JSON
- [ ] Journal cloud persistence
- [ ] Journal note save troubleshooting parity
- [ ] Live trades journal area
- [ ] Trading accounts area
- [ ] Coexistence with dedicated backtesting journal workflows

### Analytics

- [x] Total trades
- [x] Win rate
- [x] Total/net PnL
- [x] Gross profit/loss
- [x] Fees
- [x] Profit factor
- [x] Expectancy R
- [x] Average win
- [x] Average loss
- [x] Largest win/loss
- [x] Max drawdown
- [x] Average hold
- [x] Trading days
- [ ] Analytics dashboard parity
- [ ] Session stats overview parity
- [ ] Charts & visual performance metrics
- [ ] Tag analysis
- [ ] Analytics by setup
- [ ] Analytics by strategy
- [ ] Analytics by session hours
- [ ] Trading-session-hours-aware analytics
- [ ] Drawdown analytics / MAE-style heat metrics
- [ ] Monte Carlo simulation
- [ ] Monte Carlo inputs: number of simulations
- [ ] Monte Carlo inputs: trades per simulation
- [ ] Monte Carlo uses starting balance
- [ ] Monte Carlo uses win rate
- [ ] Monte Carlo uses average profit
- [ ] Monte Carlo uses average loss
- [ ] Monte Carlo scenario distribution output

### Mentor AI / Coaching

- [ ] Mentor AI
- [ ] AI feature help
- [ ] AI guidance for product navigation/settings
- [ ] AI coaching on session/trade behavior
- [ ] AI feedback loop after simulated trades
- [ ] AI explanation of ranks/battles/community features

### Economic Calendar / News

- [ ] Economic calendar
- [ ] Align backtesting with real economic events
- [ ] Jump to news events
- [ ] Economic event visibility on chart/session

### Community / Battles / Resources

- [ ] Community page/resources
- [ ] Discord community integration
- [ ] Webinars
- [ ] Profit Playbook resource
- [ ] Backtest & Chill resource
- [ ] Getting started resource
- [ ] Social media links
- [ ] Trading battles overview
- [ ] Battle accounts/access/assets
- [ ] Battle navigation/participation
- [ ] Battle types/objectives
- [ ] Battle creation/hosting
- [ ] Battle flow/controls
- [ ] Battle rules/mechanics
- [ ] Battle chat/communication
- [ ] Battle ranking/rank-change explanation

### Support / Troubleshooting

- [ ] Help center access
- [ ] Submit ticket/contact support
- [ ] Basic troubleshooting docs
- [ ] Browser/cache troubleshooting
- [ ] VPN/ad blocker troubleshooting
- [ ] CAPTCHA troubleshooting
- [ ] Chart not loading troubleshooting
- [ ] Candles not displaying troubleshooting
- [ ] Session freeze/trading data stops troubleshooting
- [ ] Unable to play session troubleshooting
- [ ] Unable to access account troubleshooting
- [ ] Trade cannot be placed troubleshooting
- [ ] Buy order error troubleshooting
- [ ] Fibonacci edit issue troubleshooting
- [ ] Support availability docs

### Indicators: Full Public FX Replay Indicator List

- [ ] DMNS ICT AMD by FXR
- [ ] Mentfx strucutre by FXR
- [ ] ORDER BLOCKS with singnal by FXR
- [ ] 50% body candle by FXR
- [ ] 52 week high
- [ ] Accelerator Oscillator
- [ ] Accumulation/distribution
- [ ] Accumulative Swing Index
- [ ] Advance/Decline
- [ ] Accumulative swing index
- [ ] Aroon
- [ ] ATR based support and resistance zones [UALGO]
- [ ] Average directional index
- [ ] Average Price
- [ ] Average True Range
- [ ] Awesome Oscillator
- [ ] Balance of Power
- [ ] Bollinger Bands
- [ ] Bollinger Bands %B
- [ ] Bollinger Bands Width
- [ ] Chaikin Money Flow
- [ ] Chaikin Oscillator
- [ ] Chaikin Volatility
- [ ] Chande Kroll Stop
- [ ] Chande Momentum Oscillator
- [ ] Chop Zone
- [ ] Choppiness Index
- [ ] Commodity Channel Index
- [ ] Connors RSI
- [ ] Coppock Curve
- [ ] Correlation - Log
- [ ] Correlation Coefficient
- [ ] Custom Session Indicator by FX Replay
- [ ] Day of Week and Opening Price Indicator by FX Replay
- [ ] Daye Quarterly Theory
- [ ] Detrended Price Oscillator
- [ ] Directional Movement
- [ ] Donchian Channels
- [ ] Double EMA
- [ ] DR/IDR by FX Replay
- [ ] Ease Of Movement
- [ ] Elder's Force Index
- [ ] EMA Cross
- [ ] Envelopes
- [ ] Fisher Transform
- [ ] FVG Indicator by FX Replay
- [ ] Guppy Multiple Moving Average
- [ ] Historical Volatility
- [ ] HTF PO3° [Pro+] by Toodegrees & FX Replay
- [ ] Hull Moving Average
- [ ] Ichimoku Cloud
- [ ] ICT Indicator by FX Replay
- [ ] Inside Bar by FX Replay
- [ ] Keltner Channels
- [ ] Klinger Oscillator
- [ ] Know Sure Thing
- [ ] Least Squares Moving Average
- [ ] Linear Regression Curve
- [ ] Linear Regression Slope
- [ ] Linear Weighted Moving Average
- [ ] MA Cross
- [ ] MA with EMA Cross
- [ ] MACD
- [ ] Majority Rule
- [ ] Market Structure Indicator by Fx Replay
- [ ] Mass Index
- [ ] McGinley Dynamic
- [ ] Median Price
- [ ] Momentum
- [ ] Money Flow Index
- [ ] Moving Average
- [ ] Moving Average Adaptive
- [ ] Moving Average Channel
- [ ] Moving Average Double
- [ ] Moving Average Exponential
- [ ] Moving Average Hamming
- [ ] Moving Average Multiple
- [ ] Moving Average Triple
- [ ] Moving Average Weighted
- [ ] Net Volume
- [ ] On Balance Volume
- [ ] Parabolic SAR
- [ ] Pivot Points Standard
- [ ] Pivot Points Standard by FX Replay
- [ ] Price Channel
- [ ] Price Oscillator
- [ ] Price Volume Trend
- [ ] Rate Of Change
- [ ] Ratio
- [ ] Relative Strength Index
- [ ] Relative Strength Index by FxReplay
- [ ] Relative Vigor Index
- [ ] Relative Volatility Index
- [ ] Round Number by FX Replay
- [ ] Round Number Quarters Theory by FX Replay
- [ ] Session Indicator by FX Replay
- [ ] Session Indicator NY by FX Replay
- [ ] SFL Session Opens by FX Replay
- [ ] Silver Bullet by FX Replay
- [ ] SMI Ergodic Indicator/Oscillator
- [ ] Smoothed Moving Average
- [ ] Spread
- [ ] SQN by FxReplay
- [ ] Standard Deviation
- [ ] Standard Error
- [ ] Standard Error Bands
- [ ] Stochastic
- [ ] Stochastic RSI
- [ ] Strat Assistant by FxReplay
- [ ] SuperTrend
- [ ] Supertrend by FxReplay
- [ ] TDI - Traders Dynamic Index by FX Replay
- [ ] Trend Strength Index
- [ ] Triple EMA
- [ ] RIX
- [ ] True Strength Index
- [ ] Typical Price
- [ ] Ultimate Oscillator
- [ ] Volatility Close-to-Close
- [ ] Volatility Index
- [ ] Volatility O-H-L-C
- [ ] Volatility Zero Trend Close-to-Close
- [ ] Volume
- [ ] Volume Oscillator
- [ ] Volume Profile Fixed Range
- [ ] Volume Profile Visible Range
- [ ] Vortex Indicator
- [ ] VWAP
- [ ] VWAP by FX Replay
- [ ] VWMA
- [ ] Watermark Indicator by FX Replay
- [ ] Weekly Separator and Weekly Opens by FX Replay
- [ ] Williams %R
- [ ] Williams Alligator
- [ ] Williams Fractal
- [ ] Williams Fractal by FX Replay
- [ ] Zig Zag

## Backtest Lab: Current Full Feature Checklist

### Frontend Application

- [x] React + TypeScript + Vite app
- [x] Local dev server
- [x] Responsive dashboard layout
- [x] Dark professional trading UI
- [x] API status badge
- [x] Build/lint scripts

### Chart / Replay

- [x] Lightweight Charts candlestick rendering
- [x] Synthetic EURUSD M5 sample data
- [x] CSV OHLCV import
- [x] Replay play/pause
- [x] Replay speed selector: 1x, 2x, 5x, 10x
- [x] Step forward one candle
- [x] Progress slider
- [x] Current OHLC snapshot
- [x] Trade entry/exit markers
- [x] Active position entry/SL/TP price lines

### Trading Engine

- [x] Market orders
- [x] Limit orders
- [x] Stop orders
- [x] Pending order list
- [x] Pending order cancel
- [x] Long/short
- [x] Stop loss
- [x] Take profit
- [x] Manual close
- [x] Risk percent sizing
- [x] Stop distance
- [x] Reward/risk
- [x] Conservative OHLC intrabar resolution
- [x] Spread
- [x] Slippage
- [x] Commission per million
- [x] Entry fee
- [x] Exit fee
- [x] Gross PnL
- [x] Net PnL
- [x] R-multiple
- [x] Hold candles

### Journal / Export

- [x] Trade journal table
- [x] Setup field
- [x] Tags field
- [x] Notes field
- [x] CSV trade export
- [x] JSON session export
- [x] LocalStorage autosave
- [x] Reset local storage

### Analytics

- [x] Balance
- [x] Net PnL
- [x] Total trades
- [x] Winning/losing trades
- [x] Win rate
- [x] Gross profit/loss
- [x] Fees
- [x] Profit factor
- [x] Expectancy R
- [x] Average win/loss
- [x] Largest win/loss
- [x] Max drawdown
- [x] Average hold candles
- [x] Trading days

### Prop Firm

- [x] Prop rules enabled by default
- [x] Profit target
- [x] Max drawdown
- [x] Daily loss limit
- [x] Minimum trading days
- [x] Active/passed/failed state
- [x] Violations list
- [x] Target progress
- [x] Worst daily loss

### Backend / Infrastructure

- [x] FastAPI backend scaffold
- [x] Versioned API router
- [x] Health endpoint
- [x] Platform status endpoint
- [x] User registration
- [x] User login
- [x] Bearer token auth
- [x] Logout/token revocation
- [x] Current user endpoint
- [x] User-scoped sessions
- [x] User-scoped datasets
- [x] Replay sessions API skeleton
- [x] Server-side session snapshot create
- [x] Server-side session snapshot update
- [x] Server-side session snapshot list
- [x] Server-side session snapshot load
- [x] Server-side session delete
- [x] Server-side dataset CSV upload
- [x] Server-side dataset list
- [x] Server-side dataset candle loading
- [x] Server-side dataset delete
- [x] Historical candles persisted in PostgreSQL
- [x] Pydantic schemas
- [x] SQLAlchemy async setup
- [x] Dataset model
- [x] Candle model
- [x] Replay session model
- [x] Trade record model
- [x] Alembic migration
- [x] TimescaleDB hypertable migration for candles
- [x] Docker Compose
- [x] PostgreSQL + TimescaleDB service
- [x] Redis service
- [x] MinIO service
- [x] API Dockerfile
- [x] Backend `.env.example`
- [x] Frontend `.env.example`

## Highest-Priority Gaps To Reach FX Replay Parity

1. Subscriptions, billing and plan gating.
2. Full normalized server persistence for trades, chart layouts, drawings and notes.
3. Built-in historical market data catalog and data vendor integration.
4. Full TradingView-like chart drawing/tooling or equivalent drawing layer.
5. Multi-chart and multi-asset sessions.
6. Bar rewind, right-click replay, Go-To feature, event/news jumps.
7. Chart-based order management: right-click entry, drag SL/TP, partial closes, break-even.
8. Indicator engine and the full FX Replay indicator list.
9. Economic calendar and event-aware replay.
10. Analytics dashboard parity: tag analysis, visual metrics, drawdown heat, Monte Carlo.
11. Journal parity: templates, confidence score, calendar, cloud reports.
12. Mentor AI.
13. Community/resources/battles layer.
14. Help center, support flows, in-app feedback/bug reporting.
