import React from 'react';
import { useApp } from '../../context/AppContext';

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StressTestModal({ isOpen, onClose }: StressTestModalProps) {
  const {
    activeTab,
    concurrency, setConcurrency,
    totalRequests, setTotalRequests,
    durationSec, setDurationSec,
    rampUpSec, setRampUpSec,
    targetRPS, setTargetRPS,
    stressResult, stressLoading,
    handleStartStressTest,
    handleCancelStressTest
  } = useApp();

  if (!isOpen) return null;

  const successRate = stressResult && stressResult.totalRequests > 0
    ? ((stressResult.successCount / stressResult.totalRequests) * 100).toFixed(1)
    : '0';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid #1f293d',
        borderRadius: '12px',
        width: '760px',
        maxWidth: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1f293d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #1f142b 0%, #111827 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Go Core Stress & Load Testing
                <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  Goroutine Multi-thread
                </span>
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Đo tải và đánh giá khả năng chịu tải của API bằng multi-threaded goroutines cực nhanh.
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            ✕
          </button>
        </div>

        {/* Target Request Info */}
        {activeTab && (
          <div style={{
            padding: '10px 20px',
            background: '#0d131f',
            borderBottom: '1px solid #1f293d',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px'
          }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Target:</span>
            <span style={{
              fontWeight: 700,
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: activeTab.method === 'GET' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: activeTab.method === 'GET' ? '#10b981' : '#f59e0b'
            }}>
              {activeTab.method}
            </span>
            <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {activeTab.baseUrl || 'http://localhost'}{activeTab.usePort && activeTab.port ? `:${activeTab.port}` : ''}{activeTab.apiPath || ''}
            </span>
          </div>
        )}

        {/* Body Controls */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Config Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '14px',
            background: '#0d131f',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #1f293d'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Số luồng (VUs):
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={concurrency}
                onChange={e => setConcurrency(Math.max(1, Number(e.target.value)))}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', padding: '6px 8px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>Concurrent workers</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Tổng số Requests:
              </label>
              <input
                type="number"
                min="1"
                value={totalRequests}
                onChange={e => setTotalRequests(Math.max(1, Number(e.target.value)))}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', padding: '6px 8px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>Khi Duration = 0</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Thời gian (giây):
              </label>
              <input
                type="number"
                min="0"
                value={durationSec}
                onChange={e => setDurationSec(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', padding: '6px 8px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>0 = theo số req</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Ramp-up (giây):
              </label>
              <input
                type="number"
                min="0"
                value={rampUpSec}
                onChange={e => setRampUpSec(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', padding: '6px 8px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>Tăng dần tải</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Target RPS:
              </label>
              <input
                type="number"
                min="0"
                value={targetRPS}
                onChange={e => setTargetRPS(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', fontFamily: 'var(--font-mono)', padding: '6px 8px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>0 = Tối đa</span>
            </div>
          </div>

          {/* Action Trigger / Cancel */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {stressLoading && (
              <button
                onClick={handleCancelStressTest}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#374151',
                  color: '#f87171',
                  border: '1px solid #ef4444',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🛑 Dừng Đo Tải (Cancel)
              </button>
            )}

            <button
              onClick={handleStartStressTest}
              disabled={stressLoading}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                background: stressLoading ? '#991b1b' : '#dc2626',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
              }}
            >
              {stressLoading ? (
                <span className="animate-pulse">⚡ Đang kích hoạt đo tải...</span>
              ) : (
                <span>🚀 Bắt đầu Đo Tải (Start Stress Test)</span>
              )}
            </button>
          </div>

          {/* Results Display */}
          {stressResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 Kết Quả Hiệu Năng Chi Tiết:
                </div>
                {stressResult.cancelled && (
                  <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    ⚠️ Đã dừng bởi người dùng
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Metric 1: Throughput RPS */}
                <div style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Throughput (RPS)</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#facc15', fontFamily: 'var(--font-mono)' }}>
                    {((stressResult as any).rps || 0).toFixed(1)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Requests per second</span>
                </div>

                {/* Metric 2: Average Latency */}
                <div style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Độ trễ TB (Avg Latency)</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    {stressResult.averageTimeMs} <span style={{ fontSize: '14px' }}>ms</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Parallel response time</span>
                </div>

                {/* Metric 3: Success Rate */}
                <div style={{
                  background: '#0d131f',
                  border: '1px solid #1f293d',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Tỷ lệ thành công</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {successRate}%
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{stressResult.successCount} / {stressResult.totalRequests} reqs</span>
                </div>
              </div>

              {/* Extra summary row */}
              <div style={{
                background: '#0d131f',
                borderRadius: '8px',
                border: '1px solid #1f293d',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Thành công: {stressResult.successCount}</span>
                  <span style={{ color: stressResult.failureCount > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                    ✕ Thất bại / Timeout: {stressResult.failureCount}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                  Tổng thực thi: <strong style={{ color: '#f1f5f9' }}>{stressResult.totalRequests}</strong> requests
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #1f293d',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#0d131f'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              background: '#1e293d',
              color: '#f1f5f9',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
