export default function Custom502() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '4rem', margin: 0 }}>502</h1>
      <h2>Backend Unavailable</h2>
      <p style={{ color: '#666' }}>
        Our servers are experiencing issues, but our frontend is still alive! 
        Please try refreshing the page.
      </p>
    </main>
  );
}