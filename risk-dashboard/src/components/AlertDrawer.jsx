// src/components/AlertDrawer.jsx
import React from "react";

export default function AlertDrawer({ alerts, selectedAlert, onClose }) {
  if (!alerts) {
    return <div className="p-4 text-gray-400">Loading alerts…</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Recent Alerts</h2>
        {selectedAlert && (
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <p>No alerts yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-lg">
          <ul className="divide-y divide-gray-600">
            {alerts.map((a) => {
              const isSelected = selectedAlert?.id === a.id;
              return (
                <li
                  key={a.id}
                  className={`p-3 cursor-pointer ${
                    isSelected ? "bg-gray-700" : "bg-gray-800"
                  } hover:bg-gray-700`}
                  onClick={() => onClose && onClose(a)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-400">
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm px-2 py-1 rounded bg-red-600 text-white">
                      Severity: {a.severity}
                    </div>
                  </div>
                  <div className="font-medium mb-1">{a.signature}</div>
                  <div className="text-sm text-gray-300 mb-2">
                    {a.src_ip} → {a.dest_ip} ({a.proto})
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="text-sm">
                      <span className="font-semibold">ML Score:</span>{" "}
                      <span
                        className={
                          a.ml_score >= 75
                            ? "text-red-400"
                            : a.ml_score >= 30
                            ? "text-yellow-400"
                            : "text-green-400"
                        }
                      >
                        {a.ml_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Explanation:</span>{" "}
                      <span className="italic text-gray-200">
                        {a.explanation || "Loading..."}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
