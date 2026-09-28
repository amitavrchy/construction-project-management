"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="initial-loading">
      <h1>Something interrupted the workspace</h1>
      <p>Please try loading this page again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
