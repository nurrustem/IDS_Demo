import React from "react";
import GaugeChart from "react-gauge-chart";

export default function RiskGauge({ score }) {
  // score is 0–100; GaugeChart expects a fraction 0–1
  const percent = (score || 0) / 100;

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4">
      <div className="text-sm text-gray-400 mb-2">Overall Risk</div>
      <GaugeChart
        id="risk-gauge"
        nrOfLevels={20}
        percent={percent} // percent = score/100 (e.g. 0.5 for 50%)
        colors={["#10B981", "#FBBF24", "#EF4444"]}
        arcWidth={0.2}
        textColor="#FFFFFF"
        formatTextValue={(val) => `${val.toFixed(0)}%`}
        animate={false}
      />
    </div>
  );
}
