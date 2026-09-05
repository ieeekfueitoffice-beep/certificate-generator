import React from "react";
import { API_BASE } from "../config";

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🎓</div>
        <h1 className="text-2xl font-bold mb-2">CertifyFlow</h1>
        <p className="text-gray-500 mb-8">
          Create events, upload a certificate template, upload your participant list, and
          generate + email certificates in a few clicks.
        </p>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 border rounded-lg py-3 font-medium hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 7.1 29.6 5 24 5 16.2 5 9.5 9.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.5-5.5c-2 1.4-4.6 2.3-7.7 2.3-5.1 0-9.5-3.3-11.1-7.9l-6.6 5.1C9.4 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.5C41.5 35.8 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-xs text-gray-400 mt-6">
          We request Gmail send permission only so certificates can be emailed from your own account.
        </p>
      </div>
    </div>
  );
}
