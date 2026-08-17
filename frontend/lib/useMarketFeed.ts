"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface StreamTick {
  symbol: string;
  base_symbol: string;
  price: number;
  day_change: number;
  day_change_pct: number;
  volume?: number;
}

export interface StreamEventEnvelope {
  event_id: string;
  event_type: "TICK" | "VALUATION" | "HEARTBEAT" | "STATUS";
  timestamp: string;
  data_badge: string;
  market_session: string;
  provider: string;
  payload: {
    ticks?: StreamTick[];
    status?: string;
    [key: string]: unknown;
  };
}

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "disconnected" | "fallback";

export function useMarketFeed(symbols?: string[]) {
  const [ticks, setTicks] = useState<Record<string, StreamTick>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [activeBadge, setActiveBadge] = useState<string>("SIMULATED");
  const [marketSession, setMarketSession] = useState<string>("OPEN");
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [flashStates, setFlashStates] = useState<Record<string, "up" | "down" | null>>({});

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPricesRef = useRef<Record<string, number>>({});

  const triggerPriceFlash = useCallback((symbol: string, direction: "up" | "down") => {
    setFlashStates(prev => ({ ...prev, [symbol]: direction }));
    setTimeout(() => {
      setFlashStates(prev => ({ ...prev, [symbol]: null }));
    }, 800);
  }, []);

  const connectStream = useCallback(() => {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "");
    const symQuery = symbols && symbols.length > 0 ? `?symbols=${encodeURIComponent(symbols.join(","))}` : "";
    const streamUrl = `${apiBase}/api/v1/markets/stream${symQuery}`;

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionStatus("connecting");
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus("connected");
      };

      es.onmessage = (e) => {
        try {
          const envelope: StreamEventEnvelope = JSON.parse(e.data);

          if (envelope.data_badge) setActiveBadge(envelope.data_badge);
          if (envelope.market_session) setMarketSession(envelope.market_session);
          setLastHeartbeat(envelope.timestamp);

          if (envelope.event_type === "TICK" && envelope.payload.ticks) {
            setTicks(prev => {
              const updated = { ...prev };
              for (const t of envelope.payload.ticks || []) {
                const prevP = previousPricesRef.current[t.symbol];
                if (prevP !== undefined && t.price !== prevP) {
                  triggerPriceFlash(t.symbol, t.price > prevP ? "up" : "down");
                }
                previousPricesRef.current[t.symbol] = t.price;
                updated[t.symbol] = t;
              }
              return updated;
            });
          }
        } catch (err) {
          console.warn("Failed to parse SSE tick packet:", err);
        }
      };

      es.onerror = () => {
        setConnectionStatus("reconnecting");
        es.close();
        // Exponential backoff reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectStream();
        }, 3000);
      };
    } catch (err) {
      console.error("SSE stream connection error:", err);
      setConnectionStatus("disconnected");
    }
  }, [symbols, triggerPriceFlash]);

  useEffect(() => {
    connectStream();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectStream]);

  return {
    ticks,
    connectionStatus,
    activeBadge,
    marketSession,
    lastHeartbeat,
    flashStates
  };
}
