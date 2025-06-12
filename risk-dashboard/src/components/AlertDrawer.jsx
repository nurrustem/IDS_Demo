// src/components/AlertDrawer.jsx

import React, { useEffect, useState } from "react";
import API from "../api/client";

export default function AlertDrawer() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  // Fetch the most recent alerts every 5s
  useEffect(() => {
    let isMounted = true; // for cleanup

    async function fetchAlerts() {
      try {
        const resp = await API.get("/alerts/recent?limit=50");
        if (isMounted) {
          setAlerts(resp.data);
        }
      } catch (err) {
        console.error("Failed to fetch alerts", err);
        if (isMounted) {
          setError(err);
        }
      }
    }

    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 5000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

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
      {alerts.length === 0 ? (
        <p>No alerts yet.</p>
      ) : (
        <ul className="space-y-4">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="border border-gray-700 rounded-lg p-3 bg-gray-800"
            >
              {/* Top row: timestamp, signature, severity */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-400">
                  {new Date(a.timestamp).toLocaleString()}
                </div>
                <div className="text-sm px-2 py-1 rounded bg-red-600 text-white">
                  Severity: {a.severity}
                </div>
              </div>

              {/* Signature */}
              <div className="font-medium mb-1">{a.signature}</div>

              {/* Source / Dest IPs */}
              <div className="text-sm text-gray-300 mb-2">
                {a.src_ip} → {a.dest_ip} ({a.proto})
              </div>

              {/* VT score + Explanation */}
              <div className="flex flex-col space-y-1">
                <div className="text-sm">
                  <span className="font-semibold">VT Score:</span>{" "}
                  <span
                    className={
                      a.vt_score >= 75
                        ? "text-red-400"
                        : a.vt_score >= 30
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  >
                    {a.vt_score.toFixed(1)}
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
      )}
    </div>
  );
}
