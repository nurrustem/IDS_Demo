// src/components/Timeline.jsx
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function Timeline({ alerts }) {
  // Build a time series: aggregate alerts by 5-minute bucket for demo
  const buckets = {};
  alerts.forEach((a) => {
    const dt = parseISO(a.timestamp);
    // Round down to nearest 5 minutes
    const minutes = Math.floor(dt.getMinutes() / 5) * 5;
    const bucketKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}T${String(
      dt.getHours()
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`;

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = { count: 0, totalScore: 0 };
    }
    buckets[bucketKey].count += 1;
    buckets[bucketKey].totalScore += a.score;
  });

  // Convert to array and compute avgScore
  const data = Object.entries(buckets).map(([time, { count, totalScore }]) => ({
    time,
    count,
    avgScore: totalScore / count,
  }));

  // Sort by time ascending
  data.sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4">
      <div className="text-lg font-semibold text-white mb-4">
        Alerts Over Time
      </div>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <XAxis
              dataKey="time"
              tickFormatter={(t) => format(parseISO(t), "HH:mm")}
              stroke="#9CA3AF"
            />
            <YAxis
              yAxisId="left"
              label={{ value: "Alerts", angle: -90, position: "insideLeft" }}
              stroke="#34D399"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "Avg Score", angle: 90, position: "insideRight" }}
              stroke="#38BDF8"
            />
            <Tooltip
              labelFormatter={(t) => format(parseISO(t), "yyyy-MM-dd HH:mm")}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="#34D399"
              barSize={20}
              name="Alert Count"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="avgScore"
              stroke="#38BDF8"
              fill="rgba(56, 189, 248, 0.2)"
              name="Avg Score"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
