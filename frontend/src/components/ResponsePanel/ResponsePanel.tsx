import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Editor } from '@monaco-editor/react';

export default function ResponsePanel() {
  const { activeTab, loading } = useApp();
  const [formatMode, setFormatMode] = useState<'pretty' | 'raw' | 'preview'>('pretty');
  const [activeTabSub, setActiveTabSub] = useState<'body' | 'headers' | 'timing'>('body');
  const [copied, setCopied] = useState(false);

  if (!activeTab) return null;
  const { response } = activeTab;

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '8px',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flex: 1,
        height: '100%'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>
          Đang gửi request và đợi phản hồi từ máy chủ...
        </span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  if (!response) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px dashed var(--border-card)',
        borderRadius: '8px',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: 'var(--text-dim)',
        flex: 1,
        height: '100%'
      }}>
        <span style={{ fontSize: '32px', opacity: 0.6 }}>📡</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Chưa có phản hồi từ máy chủ
        </span>
        <span style={{ fontSize: '12px' }}>
          Nhấn nút <strong>"Gửi ⚡"</strong> (hoặc bấm <code>Ctrl + Enter</code>) để thực thi API
        </span>
      </div>
    );
  }

  // Format response body
  const isHtml = response.body.trim().startsWith('<');
  let displayBody = response.body;
  if (formatMode === 'pretty') {
    try {
      const parsed = JSON.parse(response.body);
      displayBody = JSON.stringify(parsed, null, 2);
    } catch {
      // keep raw body
    }
  }

  // Status color logic
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    if (status >= 300 && status < 400) return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
    if (status >= 400 && status < 500) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
  };

  const statusStyle = getStatusColor(response.status);

  // Response size formatting
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(displayBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([displayBody], { type: isHtml ? 'text/html' : 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `response_${Date.now()}.${isHtml ? 'html' : 'json'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const responseHeadersList = Object.entries(response.headers || {});
  const timing = (response as any).timing || {
    dnsTimeMs: 0,
    tcpTimeMs: 0,
    tlsTimeMs: 0,
    ttfbMs: response.responseTimeMs,
    downloadTimeMs: 0,
    totalTimeMs: response.responseTimeMs
  };

  return (
    <div className="animate-fade-in" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-card)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Top Status & Metrics Bar */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0d131f',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0
      }}>
        {/* Left Metrics Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status badge */}
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: statusStyle.bg,
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
            fontFamily: 'var(--font-mono)'
          }}>
            Status: {response.status} {response.statusText || (response.status === 200 ? 'OK' : '')}
          </span>

          {/* Time pill (Click to view timing breakdown) */}
          <button
            onClick={() => setActiveTabSub('timing')}
            title="Nhấn để xem chi tiết độ trễ DNS, TCP, TLS, TTFB"
            style={{
              fontSize: '12px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: activeTabSub === 'timing' ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-app)',
              color: response.responseTimeMs < 300 ? '#10b981' : (response.responseTimeMs < 1000 ? '#f59e0b' : '#ef4444'),
              border: '1px solid var(--border-card)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer'
            }}
          >
            ⏱ {response.responseTimeMs} ms ▾
          </button>

          {/* Size pill */}
          <span style={{
            fontSize: '12px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'var(--bg-app)',
            color: '#38bdf8',
            border: '1px solid var(--border-card)',
            fontFamily: 'var(--font-mono)'
          }}>
            📦 {formatSize(response.responseSizeByte)}
          </span>
        </div>

        {/* Right Tools & Mode switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Pretty / Raw / Preview toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
            <button
              onClick={() => { setFormatMode('pretty'); setActiveTabSub('body'); }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: formatMode === 'pretty' && activeTabSub === 'body' ? 'var(--color-primary)' : 'transparent',
                color: formatMode === 'pretty' && activeTabSub === 'body' ? '#0b0f17' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              Pretty
            </button>
            <button
              onClick={() => { setFormatMode('raw'); setActiveTabSub('body'); }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: formatMode === 'raw' && activeTabSub === 'body' ? 'var(--color-primary)' : 'transparent',
                color: formatMode === 'raw' && activeTabSub === 'body' ? '#0b0f17' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              Raw
            </button>
            <button
              onClick={() => { setFormatMode('preview'); setActiveTabSub('body'); }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: formatMode === 'preview' && activeTabSub === 'body' ? 'var(--color-primary)' : 'transparent',
                color: formatMode === 'preview' && activeTabSub === 'body' ? '#0b0f17' : 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              Preview
            </button>
          </div>

          {/* Copy response */}
          <button
            onClick={handleCopyResponse}
            style={{
              padding: '3px 8px',
              background: copied ? '#10b981' : 'var(--bg-app)',
              color: copied ? '#0b0f17' : 'var(--text-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            {copied ? '✓ Đã chép' : 'Sao chép'}
          </button>

          {/* Download response */}
          <button
            onClick={handleDownload}
            title="Tải xuống tệp phản hồi"
            style={{
              padding: '3px 8px',
              background: 'var(--bg-app)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-card)',
              borderRadius: '6px',
              fontSize: '11px'
            }}
          >
            💾
          </button>
        </div>
      </div>

      {/* Subtabs: Body vs Headers vs Timing */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-card)',
        padding: '0 14px',
        background: '#0f1724',
        gap: '6px',
        flexShrink: 0
      }}>
        <button
          onClick={() => setActiveTabSub('body')}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: activeTabSub === 'body' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTabSub === 'body' ? '2px solid var(--color-primary)' : '2px solid transparent',
            fontSize: '12px',
            fontWeight: activeTabSub === 'body' ? 600 : 400
          }}
        >
          Response Body
        </button>
        <button
          onClick={() => setActiveTabSub('headers')}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: activeTabSub === 'headers' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTabSub === 'headers' ? '2px solid var(--color-primary)' : '2px solid transparent',
            fontSize: '12px',
            fontWeight: activeTabSub === 'headers' ? 600 : 400
          }}
        >
          Response Headers ({responseHeadersList.length})
        </button>
        <button
          onClick={() => setActiveTabSub('timing')}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: activeTabSub === 'timing' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTabSub === 'timing' ? '2px solid var(--color-primary)' : '2px solid transparent',
            fontSize: '12px',
            fontWeight: activeTabSub === 'timing' ? 600 : 400
          }}
        >
          Network Timing
        </button>
      </div>

      {/* Body / Headers / Timing Display (Stretches to 100% height) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTabSub === 'body' && (
          formatMode === 'preview' ? (
            <div style={{ flex: 1, height: '100%', background: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
              <iframe
                title="Response HTML Preview"
                srcDoc={response.body}
                sandbox="allow-same-origin"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
              <Editor
                height="100%"
                width="100%"
                defaultLanguage={isHtml ? "html" : "json"}
                theme="vs-dark"
                value={displayBody}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on'
                }}
              />
            </div>
          )
        )}

        {activeTabSub === 'headers' && (
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {responseHeadersList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-card)' }}>
                    <th style={{ padding: '6px 10px', width: '35%' }}>Tên Header</th>
                    <th style={{ padding: '6px 10px' }}>Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  {responseHeadersList.map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 10px', color: '#f1f5f9', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{k}</td>
                      <td style={{ padding: '6px 10px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Không có Header nào được trả về
              </div>
            )}
          </div>
        )}

        {activeTabSub === 'timing' && (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              🌐 Network Timing Breakdown (Chi tiết phân tích mạng):
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>DNS Lookup</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  {timing.dnsTimeMs} ms
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>TCP Connection</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  {timing.tcpTimeMs} ms
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>TLS Handshake</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  {timing.tlsTimeMs} ms
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Time to First Byte (TTFB)</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                  {timing.ttfbMs} ms
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Content Download</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  {timing.downloadTimeMs} ms
                </div>
              </div>

              <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tổng Thời Gian (Total)</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                  {timing.totalTimeMs} ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}