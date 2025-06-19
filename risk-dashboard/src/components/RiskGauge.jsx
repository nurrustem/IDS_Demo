// src/components/RiskGauge.jsx
import React, { useMemo } from "react";
import GaugeChart from "react-gauge-chart";

export default function RiskGauge({ alerts }) {
  // Compute average score (0–100) from the alerts array
  const avgScore = useMemo(() => {
    if (!alerts || alerts.length === 0) return 0;
    const total = alerts.reduce((sum, a) => sum + a.score, 0);
    return total / alerts.length;
  }, [alerts]);

  // GaugeChart wants a fraction 0–1
  const percent = avgScore / 100;

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4">
      <div className="text-lg font-semibold text-white mb-4">
        Current Alert Severity Score
      </div>
      <GaugeChart
        id="risk-gauge"
        nrOfLevels={20}
        percent={percent}
        colors={["#10B981", "#FBBF24", "#EF4444"]}
        arcWidth={0.2}
        textColor="#FFFFFF"
        // formatTextValue receives val = percent * 100
        formatTextValue={() => `${avgScore.toFixed(1)}`}
        animate={false}
      />
    </div>
  );
}
