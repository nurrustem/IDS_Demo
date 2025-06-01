// src/components/AlertDrawer.jsx
import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export default function AlertDrawer({ alert, onClose }) {
  return (
    <Dialog.Root open={Boolean(alert)} onOpenChange={() => onClose(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
        <Dialog.Content className="fixed top-0 right-0 w-full max-w-md h-full bg-gray-800 shadow-lg p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Alert Details</h2>
            <button onClick={onClose}>
              <X className="text-gray-300 hover:text-white" />
            </button>
          </div>
          {alert ? (
            <>
              <div className="mb-4">
                <pre className="bg-gray-900 text-sm rounded p-2 overflow-x-auto">
                  {JSON.stringify(alert, null, 2)}
                </pre>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">
                  Explanation (LLM)
                </h3>
                <div className="bg-gray-900 rounded p-2 text-gray-300 italic">
                  {/* Placeholder text; integrate your LLM endpoint later */}
                  This is where the natural-language explanation will appear.
                </div>
              </div>
              <div>
                <button className="bg-sky-400 text-gray-900 rounded px-4 py-2 shadow hover:bg-sky-300">
                  Copy JSON
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-400">No alert selected.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
