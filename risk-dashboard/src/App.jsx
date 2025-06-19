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
import usealerts from "./components/usealerts";

function App() {
  // live alerts array powered by WebSocket + initial fetch
  const alerts = usealerts();

  // leaderboard & KPI state
  const [leaderboard, setLeaderboard] = useState([]);
  const [kpis, setKpis] = useState({
    precision: 0,
    detection_rate: 0,
    false_positive_rate: 0,
    mean_alert_latency: 0,
  });

  // which alert is “selected” for the drawer
  const [selectedAlert, setSelectedAlert] = useState(null);

  // poll leaderboard every 5 seconds
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const resp = await API.get("/risks/leaderboard");
        setLeaderboard(resp.data);
      } catch (e) {
        console.error("Failed to fetch leaderboard", e);
      }
    };

    fetchLeaderboard();
    const iv = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <KpiBar kpis={kpis} />
            <RiskGauge alerts={alerts} />
            <Leaderboard
              data={leaderboard}
              onSelectIp={(ip) => {
                const a = alerts.find((al) => al.src_ip === ip);
                setSelectedAlert(a);
              }}
            />
            <TestIngestForm />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Timeline alerts={alerts} />
            <AlertDrawer
              alerts={alerts}
              selectedAlert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
