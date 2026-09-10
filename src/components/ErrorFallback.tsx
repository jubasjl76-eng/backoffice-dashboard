/** Shown by the top-level Sentry.ErrorBoundary when a render throws. */
export function ErrorFallback() {
  return (
    <div style={{ padding: 32, fontFamily: 'system-ui', color: '#334155' }}>
      <h1 style={{ fontSize: 18 }}>Something went wrong.</h1>
      <p>The page hit an error and has been reported. Reload to try again.</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
        Reload
      </button>
    </div>
  );
}
