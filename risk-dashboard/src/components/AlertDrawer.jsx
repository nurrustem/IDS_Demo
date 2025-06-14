// src/components/AlertDrawer.jsx

import React, { useEffect, useState } from "react";
import API from "../api/client";

export default function AlertDrawer() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  // Fetch initial alerts
  const fetchAlerts = async () => {
    try {
      const resp = await API.get("/alerts/recent?limit=50");
      setAlerts(resp.data);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
      setError(err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1) load existing alerts
    fetchAlerts();

    // 2) open WebSocket once
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/alerts`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // update only the matching alert
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === data.id
            ? { ...a, ml_score: data.ml_score, explanation: data.explanation }
            : a
        )
      );
    };

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      isMounted = false;
      ws.close();
    };
  }, []);

  // Handler to send a test alert and refresh UI
  const handleSendTest = async () => {
    const payload = {
      src_ip: "1.2.3.4",
      dest_ip: "5.6.7.8",
      signature: "TEST ALERT",
      severity: 5,
      proto: "TCP",
    };
    try {
      await API.post("/ingest", payload);
      // refresh rule-based data immediately
      await fetchAlerts();
      // ML score & explanation will come via WebSocket
    } catch (err) {
      console.error("Failed to send test alert", err);
      setError(err);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading alerts: {error.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Recent Alerts</h2>

      <button
        onClick={handleSendTest}
        className="mb-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Send Test Alert
      </button>

      {alerts.length === 0 ? (
        <p>No alerts yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-lg">
          <ul className="divide-y divide-gray-600">
            {alerts.map((a) => (
              <li key={a.id} className="p-3 bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-400">
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm px-2 py-1 rounded bg-red-600 text-white">
                    Severity: {a.severity}
                  </div>
                </div>
                <div className="font-medium mb-1">{a.signature}</div>
                <div className="text-sm text-gray-300 mb-2">
                  {a.src_ip} → {a.dest_ip} ({a.proto})
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="text-sm">
                    <span className="font-semibold">ML Score:</span>{" "}
                    <span
                      className={
                        a.ml_score >= 75
                          ? "text-red-400"
                          : a.ml_score >= 30
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {a.ml_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Explanation:</span>{" "}
                    <span className="italic text-gray-200">
                      {a.explanation || "Loading..."}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
