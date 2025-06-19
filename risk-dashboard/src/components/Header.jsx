// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import API from "../api/client";

export default function Header() {
  const [online, setOnline] = useState(true);

  // Simple ping to /alerts/recent to check connectivity
  const checkConnection = async () => {
    try {
      await API.get("/alerts/recent?limit=1");
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-gray-800 shadow p-4 grid grid-cols-3 items-center">
      {/* Empty left cell */}
      <div />

      {/* Centered title */}
      <div className="text-center">
        <span className="text-2xl font-bold text-white">
          IDS DEMO DASHBOARD
        </span>
      </div>

      {/* Right-aligned connectivity status */}
      <div className="flex items-center justify-end space-x-2">
        {online ? (
          <Wifi className="text-green-400" />
        ) : (
          <WifiOff className="text-red-400" />
        )}
        <span className="text-sm text-gray-300">
          {online ? "Connected" : "Offline"}
        </span>
      </div>
    </header>
  );
}
