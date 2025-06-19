// src/components/Timeline.jsx
import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Area,
} from "recharts";
import { format, parseISO, subMinutes } from "date-fns";

export default function Timeline({ alerts }) {
  // Only include alerts from the last 20 minutes
  const cutoff = subMinutes(new Date(), 20);
  const recentAlerts = alerts.filter((a) => parseISO(a.timestamp) >= cutoff);

  // aggregate recentAlerts into 5-minute buckets
  const buckets = {};
  recentAlerts.forEach((a) => {
    const dt = parseISO(a.timestamp);
    const minutes = Math.floor(dt.getMinutes() / 5) * 5;
    const bucketKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}T${String(
      dt.getHours()
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = { count: 0, totalScore: 0 };
    }
    buckets[bucketKey].count += 1;
    buckets[bucketKey].totalScore += a.score;
  });

  // build sorted data array with average score
  const data = Object.entries(buckets)
    .map(([time, { count, totalScore }]) => ({
      time,
      count,
      avgScore: totalScore / count,
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4">
      <div className="text-lg font-semibold text-white mb-4">
        Alerts Over Time (Last 20 Minutes)
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
              label={{
                value: "Avg Score",
                angle: 90,
                position: "insideRight",
              }}
              stroke="#38BDF8"
            />
            <Tooltip
              labelFormatter={(t) => format(parseISO(t), "yyyy-MM-dd HH:mm")}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="count"
              barSize={20}
              name="Alert Count"
              fill="#34D399"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="avgScore"
              name="Avg Score"
              stroke="#38BDF8"
              fill="rgba(56, 189, 248, 0.2)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
