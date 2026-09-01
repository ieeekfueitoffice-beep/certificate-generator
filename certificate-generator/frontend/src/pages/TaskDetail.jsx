import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { API_BASE } from "../config";
import TemplatePositioner from "../components/TemplatePositioner.jsx";
import ParticipantsTable from "../components/ParticipantsTable.jsx";

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadTask = useCallback(() => {
    api.get(`/api/tasks/${id}`).then((res) => {
      setTask(res.data.task);
      setSettings({
        name_x: res.data.task.name_x,
        name_y: res.data.task.name_y,
        font_size: res.data.task.font_size,
        font_color: res.data.task.font_color,
        font_family: res.data.task.font_family,
        text_align: res.data.task.text_align,
        email_subject: res.data.task.email_subject,
        email_body: res.data.task.email_body,
      });
    });
  }, [id]);

  const loadParticipants = useCallback(() => {
    api.get(`/api/tasks/${id}/participants`).then((res) => setParticipants(res.data.participants));
  }, [id]);

  useEffect(() => {
    loadTask();
    loadParticipants();
  }, [loadTask, loadParticipants]);

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("template", file);
    setBusy(true);
    try {
      await api.post(`/api/tasks/${id}/template`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      loadTask();
      setMessage({ type: "success", text: "Template uploaded." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Upload failed" });
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (overrides = {}) => {
    const next = { ...settings, ...overrides };
    setSettings(next);
    await api.put(`/api/tasks/${id}/settings`, next);
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setBusy(true);
    try {
      const res = await api.post(`/api/tasks/${id}/participants/csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult(res.data);
      loadParticipants();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "CSV upload failed" });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) return;
    try {
      await api.post(`/api/tasks/${id}/participants`, { name: manualName, email: manualEmail });
      setManualName("");
      setManualEmail("");
      loadParticipants();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Could not add participant" });
    }
  };

  const handleDeleteParticipant = async (pid) => {
    await api.delete(`/api/tasks/${id}/participants/${pid}`);
    loadParticipants();
  };

  const handleGenerate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post(`/api/tasks/${id}/certificates/generate`);
      const r = res.data.results;
      setMessage({
        type: r.failed ? "warning" : "success",
        text: `Generated ${r.success} certificate(s).${r.failed ? ` ${r.failed} failed.` : ""}`,
      });
      loadParticipants();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Generation failed" });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!confirm("Send emails with certificates to all participants marked 'generated'?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post(`/api/tasks/${id}/certificates/send`);
      const r = res.data.results;
      setMessage({
        type: r.failed ? "warning" : "success",
        text: `Sent ${r.sent} email(s).${r.failed ? ` ${r.failed} failed — see rows below.` : ""}`,
      });
      loadParticipants();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Sending failed" });
    } finally {
      setBusy(false);
    }
  };

  if (!task || !settings) return <p className="text-gray-500">Loading...</p>;

  const generatedCount = participants.filter((p) => p.status === "generated" || p.status === "sent").length;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
          &larr; Back to events
        </Link>
        <h1 className="text-2xl font-bold mt-1">{task.title}</h1>
        {task.description && <p className="text-gray-500">{task.description}</p>}
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : message.type === "warning"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Step 1: Template */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-3">1. Certificate template</h2>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleTemplateUpload} />
        {task.template_path && (
          <div className="mt-4">
            <TemplatePositioner
              imageUrl={`${API_BASE}/${task.template_path}`}
              settings={settings}
              templateWidth={task.template_width}
              onChange={(next) => saveSettings(next)}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Font size (px)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={settings.font_size}
                  onChange={(e) => saveSettings({ font_size: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color</label>
                <input
                  type="color"
                  className="w-full border rounded h-8"
                  value={settings.font_color}
                  onChange={(e) => saveSettings({ font_color: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alignment</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={settings.text_align}
                  onChange={(e) => saveSettings({ text_align: e.target.value })}
                >
                  <option value="middle">Center</option>
                  <option value="start">Left</option>
                  <option value="end">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Font family</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={settings.font_family}
                  onChange={(e) => saveSettings({ font_family: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Email text */}
      {task.template_path && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">2. Email content</h2>
          <p className="text-xs text-gray-400 mb-2">Use {"{{name}}"} to insert the participant's name.</p>
          <input
            className="w-full border rounded-lg px-3 py-2 mb-3"
            value={settings.email_subject}
            onChange={(e) => saveSettings({ email_subject: e.target.value })}
            placeholder="Email subject"
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows={4}
            value={settings.email_body}
            onChange={(e) => saveSettings({ email_body: e.target.value })}
            placeholder="Email body"
          />
        </section>
      )}

      {/* Step 3: Participants */}
      {task.template_path && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">3. Participants</h2>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="text-sm">
              <span className="block text-xs text-gray-500 mb-1">Upload CSV (columns: name, email)</span>
              <input type="file" accept=".csv" onChange={handleCsvUpload} />
            </label>
          </div>
          {csvResult && (
            <p className="text-xs text-gray-500 mb-3">
              Added {csvResult.added} participant(s).
              {csvResult.skippedCount > 0 && ` Skipped ${csvResult.skippedCount} invalid row(s).`}
            </p>
          )}

          <form onSubmit={handleAddManual} className="flex flex-wrap gap-2 mb-4">
            <input
              className="border rounded-lg px-3 py-2 flex-1 min-w-[150px]"
              placeholder="Name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
            <input
              className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]"
              placeholder="Email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
            />
            <button type="submit" className="px-4 py-2 rounded-lg border font-medium hover:bg-gray-50">
              Add
            </button>
          </form>

          <ParticipantsTable participants={participants} taskId={id} onDelete={handleDeleteParticipant} />
        </section>
      )}

      {/* Step 4: Generate + Send */}
      {task.template_path && participants.length > 0 && (
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-3">4. Generate &amp; send</h2>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={handleGenerate}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              Generate certificates
            </button>
            <button
              disabled={busy || generatedCount === 0}
              onClick={handleSend}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              Email certificates
            </button>
            <a
              href={`${API_BASE}/api/tasks/${id}/certificates/download-all`}
              className="px-4 py-2 rounded-lg border font-medium hover:bg-gray-50"
            >
              Download all (.zip)
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
