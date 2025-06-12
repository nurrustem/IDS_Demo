// src/components/SimulateAttack.jsx
import React, { useState } from "react";
import API from "../api/client";

export default function SimulateAttack() {
  const [attackName, setAttackName] = useState("nmap_syn_scan");
  const [status, setStatus] = useState("");

  const handleRun = async () => {
    setStatus("Simulating...");
    try {
      const res = await API.post(`/simulate/${attackName}`);
      setStatus(`Server says: ${res.data.status} (${res.data.attack})`);
    } catch (err) {
      console.error(err);
      setStatus("Simulation error");
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg space-y-2">
      <label className="block">Choose attack to simulate:</label>
      <select
        value={attackName}
        onChange={(e) => setAttackName(e.target.value)}
        className="w-full p-1 bg-gray-800 rounded"
      >
        <option value="nmap_syn_scan">Nmap SYN Scan</option>
        <option value="nikto_web_scan">Nikto Web Scan</option>
        <option value="bruteforce_ssh">Brute‐force SSH</option>
        {/* add more as you write the back‐end logic */}
      </select>
      <button
        onClick={handleRun}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded"
      >
        Run Simulation
      </button>
      {status && <p className="text-sm text-gray-300 mt-2">{status}</p>}
    </div>
  );
}
