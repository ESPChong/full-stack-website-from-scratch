"use client";

import { useQuery } from '@tanstack/react-query';

const fetchBackendStatus = async () => {
  const response = await fetch('/api/ready');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export default function Home() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['backendStatus'], // Unique key for caching this specific request
    queryFn: fetchBackendStatus, // The function that actually fetches the data
  });

  if (isLoading) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Connected Backend</h1>
        <p>Checking connection...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Connected Backend</h1>
        <p style={{
          padding: '1rem',
          background: '#f8d7da',
          color: '#721c24',    
          borderRadius: '8px',
          display: 'inline-block'
        }}>
          <strong>Connection failed:</strong> {error.message}
        </p>
      </main>
    );
  }

  // 4. Success state
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif'}}>
      <h1>Connected Backend</h1>
      <p style={{
        padding: '1rem',
        background: data?.hostname ? '#d4edda' : '#f8d7da',
        color: data?.hostname ? '#155724' : '#721c24',
        borderRadius: '8px',
        display: 'inline-block'
      }}>
        <strong>Host Name:</strong> {data?.hostname || 'Unknown'}
      </p>
    </main>
  );
}