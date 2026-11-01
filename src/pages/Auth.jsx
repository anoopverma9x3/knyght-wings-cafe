import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (signup && !data.session) {
      setMessage("Account created. Verify your email, then log in.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-sm p-7 rounded-2xl shadow-sm"
      >
        <h1 className="text-2xl font-bold text-[#173F35]">
          Knyght Wings Cafe
        </h1>

        <p className="text-gray-500 text-sm mt-2 mb-6">
          {signup ? "Create owner account" : "Owner Login"}
        </p>

        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-xl p-3 mt-1 mb-4"
          placeholder="owner@example.com"
        />

        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-xl p-3 mt-1 mb-4"
          placeholder="Minimum 6 characters"
        />

        {message && (
          <p className="text-sm text-red-600 mb-4">{message}</p>
        )}

        <button
          disabled={loading}
          className="w-full bg-[#173F35] text-white p-3 rounded-xl font-semibold"
        >
          {loading ? "Please wait..." : signup ? "Create Account" : "Login"}
        </button>

        <button
          type="button"
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
          className="w-full mt-4 text-sm text-[#21866B]"
        >
          {signup ? "Already registered? Login" : "Create owner account"}
        </button>
      </form>
    </div>
  );
}