"use client";

import { useEffect, useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [status, setStatus] = useState("Checking connection...");

  useEffect(() => {
    // Fetch data from Express backend
    fetch('/api/status')
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        //Update state with the message from Express
        setStatus(data.message);
      })
      .catch((error) => {
        setStatus("Connection failed: " + error.message);
      });
  }, []);




  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif'}}>
      <h1>MERN Stack Connection Test</h1>
      <p style={{
        padding: '1rem',
        background: status.includes("successfully") ? '#d4edda' : '#f8d7da',
        color: status.includes("successfully") ? '#155724' : '#721c24',
        borderRadius: '8px',
        display: 'inline-block'
      }}>
        <strong>Status:</strong> {status}
      </p>
    </main>
  );
}
