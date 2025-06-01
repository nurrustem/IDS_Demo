// src/components/SettingsPanel.jsx
import React, { useState } from "react";

export default function SettingsPanel() {
  const [useMl, setUseMl] = useState(false);
  const [ruleWeight, setRuleWeight] = useState(1);
  const [mlWeight, setMlWeight] = useState(1);
  const [llm, setLlm] = useState("openai");

  return (
    <div className="bg-gray-800 rounded-2xl shadow p-4 space-y-4">
      <div className="text-lg font-semibold text-white">Settings</div>
      <div className="flex items-center justify-between">
        <span className="text-gray-300">Enable ML Scoring</span>
        <input
          type="checkbox"
          checked={useMl}
          onChange={(e) => setUseMl(e.target.checked)}
          className="accent-sky-400"
        />
      </div>
      {useMl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Rule Weight</span>
            <input
              type="number"
              value={ruleWeight}
              min={0}
              max={10}
              onChange={(e) => setRuleWeight(Number(e.target.value))}
              className="w-16 bg-gray-900 text-white rounded px-1 py-0.5"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">ML Weight</span>
            <input
              type="number"
              value={mlWeight}
              min={0}
              max={10}
              onChange={(e) => setMlWeight(Number(e.target.value))}
              className="w-16 bg-gray-900 text-white rounded px-1 py-0.5"
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-300">LLM Backend</span>
        <select
          value={llm}
          onChange={(e) => setLlm(e.target.value)}
          className="bg-gray-900 text-white rounded px-2 py-1"
        >
          <option value="openai">OpenAI</option>
          <option value="azure">Azure OpenAI</option>
          <option value="local">Local LLM</option>
        </select>
      </div>
      <button className="w-full bg-red-600 text-white rounded px-4 py-2 shadow hover:bg-red-500">
        Save Settings
      </button>
    </div>
  );
}
