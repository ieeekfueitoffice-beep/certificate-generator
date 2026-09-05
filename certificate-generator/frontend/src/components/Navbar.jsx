import React from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../App.jsx";

export default function Navbar() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/auth/logout");
    refreshUser();
    navigate("/login");
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="font-bold text-lg text-brand-700">
          🎓 CertifyFlow
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            )}
            <span className="text-sm text-gray-700">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
