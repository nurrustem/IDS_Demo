// src/components/usealerts.jsx
import { useState, useEffect } from "react";
import API from "../api/client";

export default function usealerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    API.get("/alerts/recent?limit=50")
      .then((r) => setAlerts(r.data))
      .catch((e) => console.error("fetchAlerts error", e));

    const wsUrl = "ws://10.3.3.200:8000/ws/alerts"; // ← full URL
    console.log("📡 connecting to WebSocket at", wsUrl);

    const ws = new WebSocket(wsUrl);
    ws.onopen = () => console.log("✅ WS open");
    ws.onerror = (e) => console.error("❌ WS error", e);
    ws.onclose = () => console.log("🛑 WS closed");
    ws.onmessage = (evt) => {
      console.log("📨 WS message", evt.data);
      const msg = JSON.parse(evt.data);
      if (msg.type === "new_alert") {
        setAlerts((prev) => [msg.alert, ...prev]);
      } else {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === msg.id
              ? { ...a, ml_score: msg.ml_score, explanation: msg.explanation }
              : a
          )
        );
      }
    };

    return () => ws.close();
  }, []);

  return alerts;
}
