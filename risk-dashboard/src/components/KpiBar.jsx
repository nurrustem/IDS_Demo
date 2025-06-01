// src/components/KpiBar.jsx
import React from "react";

export default function KpiBar({ kpis }) {
  const { precision, detection_rate, false_positive_rate, mean_alert_latency } =
    kpis;

  const formatPct = (n) => `${(n * 100).toFixed(1)}%`;
  const formatMs = (n) => `${n.toFixed(0)} ms`;

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex flex-col">
        <span className="text-sm text-gray-400">Precision</span>
        <span className="text-xl font-semibold text-white">
          {formatPct(precision)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-gray-400">Detection Rate</span>
        <span className="text-xl font-semibold text-white">
          {formatPct(detection_rate)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-gray-400">FPR</span>
        <span className="text-xl font-semibold text-white">
          {formatPct(false_positive_rate)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-gray-400">Mean Latency</span>
        <span className="text-xl font-semibold text-white">
          {formatMs(mean_alert_latency)}
        </span>
      </div>
    </div>
  );
}
