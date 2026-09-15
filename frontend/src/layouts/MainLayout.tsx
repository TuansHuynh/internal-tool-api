import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import Workspace from '../pages/Workspace/Workspace';

export default function MainLayout() {
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Sidebar cố định bên trái (280px) */}
      <div style={{
        width: '280px',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Sidebar onOpenEnvModal={() => setIsEnvModalOpen(true)} />
      </div>
      
      {/* Vùng làm việc chính bên phải */}
      <div style={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Workspace 
          isEnvModalOpen={isEnvModalOpen} 
          setIsEnvModalOpen={setIsEnvModalOpen} 
        />
      </div>
    </div>
  );
}