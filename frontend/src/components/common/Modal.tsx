import React from 'react';

export default function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}