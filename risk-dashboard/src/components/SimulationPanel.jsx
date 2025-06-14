// src/components/SimulationPanel.jsx
import React, { useState } from "react";
import API from "../api/client";

const attacks = [
  { name: "nmap", label: "Nmap SYN Scan" },
  { name: "hydra_smb", label: "Hydra SMB Brute-Force" },
  { name: "simple_dos", label: "Simple DoS (hping3)" },
];

export default function SimulationPanel() {
  const [selected, setSelected] = useState(attacks[0].name);
  const [status, setStatus] = useState("");

  const handleRun = async () => {
    setStatus("Running...");
    try {
      const resp = await API.post(`/simulate/${selected}`);
      setStatus(`Simulated: ${resp.data.attack}`);
    } catch (e) {
      console.error(e);
      setStatus("Simulation failed");
    }
    setTimeout(() => setStatus(""), 3000);
  };

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4 space-y-2">
      <div className="text-lg font-semibold text-white">Simulation</div>
      <select
        className="w-full bg-gray-900 text-white rounded px-3 py-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {attacks.map((a) => (
          <option key={a.name} value={a.name}>
            {a.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleRun}
        className="w-full bg-sky-400 text-black rounded px-4 py-2 shadow hover:bg-sky-300"
      >
        Run
      </button>
      {status && <div className="text-sm text-gray-300 mt-1">{status}</div>}
    </div>
  );
}
