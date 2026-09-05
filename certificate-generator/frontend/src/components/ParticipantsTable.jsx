import React from "react";
import { API_BASE } from "../config";

const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-600",
  generated: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function ParticipantsTable({ participants, taskId, onDelete }) {
  if (participants.length === 0) {
    return <p className="text-gray-400 text-sm py-6 text-center">No participants added yet.</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Certificate</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2 font-medium">{p.name}</td>
              <td className="px-4 py-2 text-gray-600">{p.email}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status] || ""}`}>
                  {p.status}
                </span>
                {p.error && <span className="block text-xs text-red-500 mt-0.5">{p.error}</span>}
              </td>
              <td className="px-4 py-2">
                {p.certificate_path ? (
                  <a
                    href={`${API_BASE}/api/tasks/${taskId}/certificates/${p.id}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs">
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
