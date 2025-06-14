// src/components/Leaderboard.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function Leaderboard({ data, onSelectIp }) {
  // Example data: [{ src_ip: "10.0.0.5", avg_score: 30.0, count: 5 }, …]
  // src/components/Leaderboard.jsx
  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4 overflow-x-auto">
      <div className="text-lg font-semibold text-white mb-4">Alerts by IPs</div>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-gray-400">
            <th className="px-2 py-1">IP Address</th>
            <th className="px-2 py-1">Rule Avg</th>
            <th className="px-2 py-1">ML Avg</th>
            <th className="px-2 py-1">Combined</th>
            <th className="px-2 py-1">Count</th>
            <th className="px-2 py-1">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((row) => (
            <tr key={row.src_ip} className="hover:bg-gray-700 cursor-pointer">
              <td className="px-2 py-1">{row.src_ip}</td>
              <td className="px-2 py-1">{row.avg_rule_score.toFixed(1)}</td>
              <td className="px-2 py-1">{row.avg_ml_score.toFixed(1)}</td>
              <td className="px-2 py-1">{row.combined_score.toFixed(1)}</td>
              <td className="px-2 py-1">{row.count}</td>
              <td className="px-2 py-1 w-40 h-14">
                {/* Sparkline code unchanged */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
