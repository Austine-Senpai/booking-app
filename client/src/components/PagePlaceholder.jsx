// Temporary content for pages that are built in a later phase.
export default function PagePlaceholder({ title, phase }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">This page is coming in Phase {phase}.</p>
    </div>
  );
}
