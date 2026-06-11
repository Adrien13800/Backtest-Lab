import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Position, Trade } from '../types'

interface ReplayChartProps {
  candles: Candle[]
  activePosition: Position | null
  trades: Trade[]
}

export function ReplayChart({ candles, activePosition, trades }: ReplayChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markersRef = useRef<{ setMarkers: (markers: unknown[]) => void } | null>(null)
  const priceLinesRef = useRef<unknown[]>([])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#11161d' },
        textColor: '#c9d1d9',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1d2530' },
        horzLines: { color: '#1d2530' },
      },
      rightPriceScale: {
        borderColor: '#2b3642',
      },
      timeScale: {
        borderColor: '#2b3642',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: '#8aa4bf33' },
        horzLine: { color: '#8aa4bf33' },
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#2fbf71',
      downColor: '#e25555',
      borderUpColor: '#2fbf71',
      borderDownColor: '#e25555',
      wickUpColor: '#83d59d',
      wickDownColor: '#ef8a8a',
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) {
      return
    }

    seriesRef.current.setData(
      candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    )
    chartRef.current?.timeScale().scrollToRealTime()
  }, [candles])

  useEffect(() => {
    if (!seriesRef.current) {
      return
    }

    const markers = trades.flatMap((trade) => [
      {
        time: trade.entryTime as UTCTimestamp,
        position: trade.side === 'long' ? 'belowBar' : 'aboveBar',
        color: trade.side === 'long' ? '#2fbf71' : '#e25555',
        shape: trade.side === 'long' ? 'arrowUp' : 'arrowDown',
        text: trade.side === 'long' ? 'Long' : 'Short',
      },
      {
        time: trade.exitTime as UTCTimestamp,
        position: trade.pnl >= 0 ? 'aboveBar' : 'belowBar',
        color: trade.pnl >= 0 ? '#2fbf71' : '#e25555',
        shape: trade.pnl >= 0 ? 'circle' : 'square',
        text: `${trade.rMultiple}R`,
      },
    ])

    if (activePosition) {
      markers.push({
        time: activePosition.entryTime as UTCTimestamp,
        position: activePosition.side === 'long' ? 'belowBar' : 'aboveBar',
        color: '#f1b44c',
        shape: activePosition.side === 'long' ? 'arrowUp' : 'arrowDown',
        text: 'Open',
      })
    }

    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(seriesRef.current, markers as never) as unknown as {
        setMarkers: (markers: unknown[]) => void
      }
    } else {
      markersRef.current.setMarkers(markers)
    }
  }, [activePosition, trades])

  useEffect(() => {
    const series = seriesRef.current

    if (!series) {
      return
    }

    priceLinesRef.current.forEach((line) => {
      series.removePriceLine(line as never)
    })
    priceLinesRef.current = []

    if (!activePosition) {
      return
    }

    priceLinesRef.current = [
      series.createPriceLine({
        price: activePosition.entryPrice,
        color: '#f1b44c',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Entry',
      }),
      series.createPriceLine({
        price: activePosition.stopLoss,
        color: '#e25555',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SL',
      }),
      series.createPriceLine({
        price: activePosition.takeProfit,
        color: '#2fbf71',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP',
      }),
    ]
  }, [activePosition])

  return <div className="chart-surface" ref={containerRef} />
}
