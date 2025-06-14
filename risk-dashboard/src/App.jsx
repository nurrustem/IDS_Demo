// src/App.jsx
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import KpiBar from "./components/KpiBar";
import RiskGauge from "./components/RiskGauge";
import Leaderboard from "./components/Leaderboard";
import Timeline from "./components/Timeline";
import AlertDrawer from "./components/AlertDrawer";
import SimulationPanel from "./components/SimulationPanel";
import API from "./api/client";
import TestIngestForm from "./components/TestIngestForm";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [kpis, setKpis] = useState({
    precision: 0,
    detection_rate: 0,
    false_positive_rate: 0,
    mean_alert_latency: 0,
  });
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Fetch recent alerts
  const fetchAlerts = async () => {
    try {
      const resp = await API.get("/alerts/recent?limit=500");
      setAlerts(resp.data);
    } catch (e) {
      console.error("Failed to fetch alerts", e);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const resp = await API.get("/risks/leaderboard");
      setLeaderboard(resp.data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  };

  // Poll every 5 seconds
  useEffect(() => {
    fetchAlerts();
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchLeaderboard();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <KpiBar kpis={kpis} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <RiskGauge score={kpis.precision * 100} />
            <SimulationPanel />
            <TestIngestForm />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Leaderboard
              data={leaderboard}
              onSelectIp={(ip) => {
                // Filter alerts by ip or scroll to it
                const a = alerts.find((al) => al.src_ip === ip);
                setSelectedAlert(a);
              }}
            />
            <Timeline alerts={alerts} />
          </div>
        </div>
        <AlertDrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      </div>
    </div>
  );
}

export default App;
