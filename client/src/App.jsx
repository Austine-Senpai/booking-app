import { useEffect, useState } from "react";
import { getHealth } from "./api/health.js";

// Temporary page for Phase 0: proves the client can reach the API.
// Replaced by the router and real pages in Phase 6.
function App() {
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"

  useEffect(() => {
    async function checkApi() {
      try {
        await getHealth();
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    }
    checkApi();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Booking App</h1>
        {status === "loading" && <p className="text-slate-500">Checking API…</p>}
        {status === "ok" && <p className="text-green-700">API connected ✅</p>}
        {status === "error" && (
          <p className="text-red-700">
            Can't reach the API ❌ — is the server running on port 5000?
          </p>
        )}
      </div>
    </main>
  );
}

export default App;
