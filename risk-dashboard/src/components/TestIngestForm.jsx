// src/components/TestIngestForm.jsx

import React, { useState } from "react";
import API from "../api/client";

export default function TestIngestForm() {
  const [srcIp, setSrcIp] = useState("8.8.8.8");
  const [destIp, setDestIp] = useState("1.1.1.1");
  const [signature, setSignature] = useState("Manual Test Alert");
  const [severity, setSeverity] = useState(5);
  const [proto, setProto] = useState("TCP");
  const [status, setStatus] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("Sending...");
    try {
      const payload = {
        src_ip: srcIp,
        dest_ip: destIp,
        signature,
        severity,
        proto,
      };
      const resp = await API.post("/ingest", payload);
      setStatus(`Alert ingested (ID: ${resp.data.id})`);
      // trigger AlertDrawer to refresh
      window.dispatchEvent(new Event("alertIngested"));
    } catch (err) {
      console.error(err);
      setStatus("Error ingesting alert");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-gray-900 rounded-lg space-y-2"
    >
      <h3 className="text-md font-semibold">Manual Ingest</h3>

      <div>
        <label className="block text-sm">Source IP:</label>
        <input
          type="text"
          value={srcIp}
          onChange={(e) => setSrcIp(e.target.value)}
          className="w-full px-2 py-1 bg-gray-800 rounded"
        />
      </div>

      <div>
        <label className="block text-sm">Dest IP:</label>
        <input
          type="text"
          value={destIp}
          onChange={(e) => setDestIp(e.target.value)}
          className="w-full px-2 py-1 bg-gray-800 rounded"
        />
      </div>

      <div>
        <label className="block text-sm">Signature:</label>
        <input
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="w-full px-2 py-1 bg-gray-800 rounded"
        />
      </div>

      <div className="flex space-x-2">
        <div className="flex-1">
          <label className="block text-sm">Severity (1–10):</label>
          <input
            type="number"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full px-2 py-1 bg-gray-800 rounded"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm">Protocol:</label>
          <input
            type="text"
            value={proto}
            onChange={(e) => setProto(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 rounded"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-sky-400 text-black rounded px-4 py-2 shadow hover:bg-sky-300"
      >
        Send Alert
      </button>

      {status && <p className="mt-2 text-sm text-gray-300">{status}</p>}
    </form>
  );
}
