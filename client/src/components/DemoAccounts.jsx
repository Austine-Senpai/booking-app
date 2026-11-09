// Shown on the login page ONLY when the site is built with VITE_DEMO_MODE=true,
// so people trying the live demo can log in with one tap. In a real deployment
// for a business, leave VITE_DEMO_MODE unset and this never appears.
//
// The customer account always exists after `npm run seed`. The admin login
// comes from VITE_DEMO_ADMIN_EMAIL / VITE_DEMO_ADMIN_PASSWORD, which must match
// ADMIN_EMAIL / ADMIN_PASSWORD used when seeding the demo database.
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

// Vite swaps import.meta.env values in at build time, so when demo mode is off
// `isDemoMode` is a plain `false` and the bundler deletes this whole list —
// no demo login (not even the admin one) ever ships in a normal build.
const DEMO_ACCOUNTS = isDemoMode
  ? [
      { label: "Customer", email: "demo@example.com", password: "demo1234" },
      {
        label: "Admin (owner)",
        email: import.meta.env.VITE_DEMO_ADMIN_EMAIL,
        password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD,
      },
    ].filter((account) => account.email && account.password)
  : [];

// onUse(account) fills the login form
export default function DemoAccounts({ onUse }) {
  if (!isDemoMode || DEMO_ACCOUNTS.length === 0) return null;

  return (
    <aside className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
      <h2 className="font-semibold text-brand-800">Trying the demo?</h2>
      <p className="mt-1 text-slate-600">Use one of these accounts. Demo data is reset from time to time.</p>
      <ul className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.label} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{account.label}</p>
              <p className="truncate text-slate-600">
                {account.email} / {account.password}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUse(account)}
              className="shrink-0 rounded-lg border border-brand-600 px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Use
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
