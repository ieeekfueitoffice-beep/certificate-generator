import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const loadTasks = () => {
    setLoading(true);
    api
      .get("/api/tasks")
      .then((res) => setTasks(res.data.tasks))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required");
    try {
      await api.post("/api/tasks", { title, description });
      setTitle("");
      setDescription("");
      setShowForm(false);
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create task");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this event and all its data? This cannot be undone.")) return;
    await api.delete(`/api/tasks/${id}`);
    loadTasks();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Events</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium"
        >
          + New Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Event / Task title</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Web Development Bootcamp 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium">
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No events yet. Create your first one to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="bg-white border rounded-xl p-5 flex items-center justify-between hover:shadow-sm transition"
            >
              <Link to={`/tasks/${t.id}`} className="flex-1">
                <h3 className="font-semibold text-lg">{t.title}</h3>
                {t.description && <p className="text-gray-500 text-sm mt-1">{t.description}</p>}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>{t.total_participants} participants</span>
                  <span>{t.generated_count} generated</span>
                  <span>{t.sent_count} sent</span>
                  {!t.template_drive_id && <span className="text-amber-600">No template yet</span>}
                </div>
              </Link>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-sm text-red-500 hover:text-red-700 ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
