import React, { useState, useMemo } from 'react';
import { useApp, HeaderPair, ParamPair, KeyValueRow } from '../../context/AppContext';
import { Editor } from '@monaco-editor/react';
import { parseCurl, generateCodeSnippet, generateCurlSnippet } from '../../utils/curlParser';

interface RequestPanelProps {
  onOpenStressModal?: () => void;
  onOpenEnvModal?: () => void;
}

export default function RequestPanel({ onOpenStressModal, onOpenEnvModal }: RequestPanelProps) {
  const { 
    activeTab, updateActiveTab, loading, handleSendRequest,
    environments, activeEnvId, setActiveEnvId,
    updateQueryParamsFromPath, updatePathFromQueryParams,
    buildFullUrl, getMappedHeaders
  } = useApp();
  
  if (!activeTab) return null;
  const { 
    method, reqBody, bodyType = 'json', urlEncodedList = [], 
    headersList = [], paramsList = [],
    authType = 'none', authToken = '', authConfig = {} 
  } = activeTab;

  const [activeSubTab, setActiveSubTab] = useState<'params' | 'headers' | 'body' | 'auth'>('headers');
  const [showRawToken, setShowRawToken] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);

  // Modals for cURL Import & Code Snippets
  const [isImportCurlOpen, setIsImportCurlOpen] = useState(false);
  const [curlInputText, setCurlInputText] = useState('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'nodejs'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Helper to resolve environment variables in text
  const resolveEnv = (text: string): string => {
    if (!text || activeEnvId === 'none') return text;
    const currentEnv = environments.find(e => e.id === activeEnvId);
    if (!currentEnv) return text;

    let parsedText = text;
    currentEnv.variables.forEach(v => {
      if (v.enabled && v.key.trim() !== "") {
        const placeholder = `{{${v.key.trim()}}}`;
        parsedText = parsedText.replaceAll(placeholder, v.value);
      }
    });
    return parsedText;
  };

  const resolvedAuthToken = resolveEnv(authToken.trim());

  // Method styles
  const getMethodColor = (m: string) => {
    switch (m.toUpperCase()) {
      case 'GET': return 'var(--method-get)';
      case 'POST': return 'var(--method-post)';
      case 'PUT': return 'var(--method-put)';
      case 'DELETE': return 'var(--method-delete)';
      case 'PATCH': return 'var(--method-patch)';
      default: return 'var(--text-main)';
    }
  };

  // ==========================================
  // PARAMS MANAGEMENT (2-Way Sync)
  // ==========================================
  const updateParamRow = (id: string, field: 'key' | 'value' | 'enabled' | 'description', val: any) => {
    const updated = paramsList.map(row => 
      row.id === id ? { ...row, [field]: val } : row
    );
    updatePathFromQueryParams(updated);
  };

  const addParamRow = () => {
    const newRow: ParamPair = {
      id: Date.now().toString(),
      key: '',
      value: '',
      enabled: true,
      description: ''
    };
    updatePathFromQueryParams([...paramsList, newRow]);
  };

  const removeParamRow = (id: string) => {
    const filtered = paramsList.filter(row => row.id !== id);
    updatePathFromQueryParams(filtered);
  };

  // ==========================================
  // HEADERS MANAGEMENT
  // ==========================================
  const updateHeaderRow = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    const updatedHeaders = headersList.map(row => 
      row.id === id ? { ...row, [field]: val } : row
    );
    updateActiveTab({ headersList: updatedHeaders });
  };

  const addHeaderRow = (defaultKey = '', defaultValue = '') => {
    const newRow: HeaderPair = { 
      id: Date.now().toString(), 
      key: defaultKey, 
      value: defaultValue, 
      enabled: true 
    };
    updateActiveTab({ headersList: [...headersList, newRow] });
  };

  const removeHeaderRow = (id: string) => {
    if (headersList.length > 1) {
      const filteredHeaders = headersList.filter(row => row.id !== id);
      updateActiveTab({ headersList: filteredHeaders });
    }
  };

  const addJsonHeaderPreset = () => {
    const exists = headersList.some(h => h.key.toLowerCase() === 'content-type');
    if (!exists) {
      addHeaderRow('Content-Type', 'application/json');
    }
  };

  // ==========================================
  // URL-ENCODED BODY MANAGEMENT
  // ==========================================
  const updateUrlEncodedRow = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    const updated = urlEncodedList.map(r => r.id === id ? { ...r, [field]: val } : r);
    updateActiveTab({ urlEncodedList: updated });
  };

  const addUrlEncodedRow = () => {
    const newRow: KeyValueRow = {
      id: Date.now().toString(),
      key: '',
      value: '',
      enabled: true
    };
    updateActiveTab({ urlEncodedList: [...urlEncodedList, newRow] });
  };

  const removeUrlEncodedRow = (id: string) => {
    const filtered = urlEncodedList.filter(r => r.id !== id);
    updateActiveTab({ urlEncodedList: filtered });
  };

  // ==========================================
  // JSON FORMATTER
  // ==========================================
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(reqBody);
      updateActiveTab({ reqBody: JSON.stringify(parsed, null, 2) });
    } catch {
      alert("Nội dung Body không phải định dạng JSON hợp lệ để format!");
    }
  };

  // ==========================================
  // JWT INSPECTOR
  // ==========================================
  const jwtDecodedData = useMemo(() => {
    if (authType !== 'bearer' || !resolvedAuthToken) return null;
    const tokenClean = resolvedAuthToken.replace(/^Bearer\s+/i, '').trim();
    const parts = tokenClean.split('.');
    if (parts.length === 3) {
      try {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload);
      } catch {
        return null;
      }
    }
    return null;
  }, [resolvedAuthToken, authType]);

  const jwtExpInfo = useMemo(() => {
    if (!jwtDecodedData || !jwtDecodedData.exp) return null;
    try {
      const expDate = new Date(jwtDecodedData.exp * 1000);
      const isExpired = expDate.getTime() < Date.now();
      return {
        formatted: expDate.toLocaleString(),
        isExpired
      };
    } catch {
      return null;
    }
  }, [jwtDecodedData]);

  const handleCopyHeader = () => {
    const finalHeader = resolvedAuthToken.toLowerCase().startsWith('bearer ')
      ? resolvedAuthToken
      : `Bearer ${resolvedAuthToken}`;
    navigator.clipboard.writeText(`Authorization: ${finalHeader}`);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  // ==========================================
  // IMPORT cURL HANDLER
  // ==========================================
  const handleImportCurlSubmit = () => {
    if (!curlInputText.trim()) return;
    const parsed = parseCurl(curlInputText.trim());
    if (parsed) {
      updateActiveTab({
        method: parsed.method,
        baseUrl: parsed.baseUrl,
        port: parsed.port,
        usePort: parsed.usePort,
        apiPath: parsed.apiPath,
        headersList: parsed.headers,
        paramsList: parsed.params,
        reqBody: parsed.body,
        bodyType: (parsed.bodyType as any) || 'json',
        authType: (parsed.authType as any) || 'none',
        authToken: parsed.authToken,
        authConfig: parsed.authConfig || {}
      });
      setIsImportCurlOpen(false);
      setCurlInputText('');
    } else {
      alert("Không thể phân tích cú pháp lệnh cURL này. Vui lòng kiểm tra lại định dạng cURL.");
    }
  };

  // Code Snippet Generator
  const fullUrl = buildFullUrl(activeTab);
  const mappedHeaders = getMappedHeaders(activeTab);
  const codeSnippet = useMemo(() => {
    return generateCodeSnippet(selectedLang, method, fullUrl, mappedHeaders, reqBody);
  }, [selectedLang, method, fullUrl, mappedHeaders, reqBody]);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleQuickCopyCurl = () => {
    const curl = generateCurlSnippet(method, fullUrl, mappedHeaders, reqBody);
    navigator.clipboard.writeText(curl);
    alert("✓ Đã sao chép lệnh cURL vào bộ nhớ tạm!");
  };

  const enabledParamsCount = paramsList.filter(p => p.enabled && p.key).length;
  const enabledHeadersCount = headersList.filter(h => h.enabled && h.key).length;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-card)',
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Top Bar: Title, Import cURL, Code Snippets & Environment Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Request Builder
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            (Ctrl+Enter để gửi ⚡)
          </span>
        </div>

        {/* Action Buttons: Import cURL, Code Snippets, Environment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          {/* Import cURL button */}
          <button
            type="button"
            onClick={() => setIsImportCurlOpen(true)}
            style={{
              padding: '3px 8px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-card)',
              color: '#38bdf8',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Dán lệnh cURL để tự động nhập cấu hình"
          >
            <span>📥</span> Import cURL
          </button>

          {/* Quick Copy cURL */}
          <button
            type="button"
            onClick={handleQuickCopyCurl}
            style={{
              padding: '3px 8px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Sao chép request dưới dạng cURL"
          >
            <span>📋</span> Copy cURL
          </button>

          {/* Code Snippets Modal Button */}
          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            style={{
              padding: '3px 8px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-card)',
              color: '#a78bfa',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Sinh mã nguồn Python, Go, JS Axios..."
          >
            <span>💻</span> Code
          </button>

          {/* Environment Quick Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>ENV:</span>
            <select 
              value={activeEnvId} 
              onChange={(e) => setActiveEnvId(e.target.value)}
              style={{
                padding: '3px 6px',
                background: 'var(--bg-input)',
                color: 'var(--color-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '11px'
              }}
            >
              <option value="none">Không dùng môi trường</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            {onOpenEnvModal && (
              <button
                type="button"
                onClick={onOpenEnvModal}
                title="Quản lý biến môi trường"
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  fontSize: '11px'
                }}
              >
                ⚙️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Omnibar (Method + Base URL + Port + Path + Actions) */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '6px',
        background: 'var(--bg-input)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid var(--border-card)'
      }}>
        {/* Method Picker */}
        <select 
          value={method} 
          onChange={(e) => updateActiveTab({ method: e.target.value })} 
          style={{
            padding: '8px 12px',
            background: 'var(--bg-card)',
            color: getMethodColor(method),
            fontWeight: 800,
            fontSize: '13px',
            border: '1px solid var(--border-card)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        {/* Base URL */}
        <div style={{ flex: 2, display: 'flex' }}>
          <input 
            type="text" 
            placeholder="Base URL: https://api.mysite.com hoặc {{base_url}}"
            value={activeTab.baseUrl} 
            onChange={(e) => updateActiveTab({ baseUrl: e.target.value })} 
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              padding: '8px 10px'
            }}
          />
        </div>

        {/* Port Segment */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-card)',
          padding: '0 8px',
          borderRadius: '6px',
          border: '1px solid var(--border-card)'
        }}>
          <input 
            type="checkbox" 
            title="Bật/Tắt cổng Port"
            checked={activeTab.usePort}
            onChange={(e) => updateActiveTab({ usePort: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>:</span>
          <input 
            type="text" 
            placeholder="Port"
            disabled={!activeTab.usePort}
            value={activeTab.port} 
            onChange={(e) => updateActiveTab({ port: e.target.value })} 
            style={{
              width: '54px',
              padding: '4px 2px',
              background: 'transparent',
              border: 'none',
              color: activeTab.usePort ? '#f59e0b' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textAlign: 'center'
            }}
          />
        </div>

        {/* Endpoint Path (2-Way Sync with Params) */}
        <div style={{ flex: 3, display: 'flex' }}>
          <input 
            type="text" 
            placeholder="Path & Query: /v1/users?page=1"
            value={activeTab.apiPath} 
            onChange={(e) => updateQueryParamsFromPath(e.target.value)} 
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              padding: '8px 10px'
            }}
          />
        </div>

        {/* Send Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            handleSendRequest();
          }} 
          disabled={loading} 
          style={{
            padding: '0 22px',
            background: loading ? '#0284c7' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(14, 165, 233, 0.35)'
          }}
        >
          {loading ? (
            <span className="animate-pulse">Đang gửi...</span>
          ) : (
            <>
              <span>Gửi</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>⚡</span>
            </>
          )}
        </button>

        {/* Stress Test Button */}
        {onOpenStressModal && (
          <button
            onClick={onOpenStressModal}
            title="Mở bảng đo tải hệ thống bằng Goroutines"
            style={{
              padding: '0 12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⚡</span> Đo Tải
          </button>
        )}
      </div>

      {/* Sub-tabs bar (Params, Headers, Body, Auth) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        {/* PARAMS SUBTAB BUTTON */}
        <button 
          type="button"
          onClick={() => setActiveSubTab('params')}
          style={{ 
            padding: '6px 14px', 
            background: 'transparent', 
            color: activeSubTab === 'params' ? 'var(--color-primary)' : 'var(--text-muted)', 
            borderBottom: activeSubTab === 'params' ? '2px solid var(--color-primary)' : '2px solid transparent', 
            fontSize: '13px', 
            fontWeight: activeSubTab === 'params' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Params</span>
          {enabledParamsCount > 0 && (
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '10px' }}>
              {enabledParamsCount}
            </span>
          )}
        </button>

        {/* HEADERS SUBTAB BUTTON */}
        <button 
          type="button"
          onClick={() => setActiveSubTab('headers')}
          style={{ 
            padding: '6px 14px', 
            background: 'transparent', 
            color: activeSubTab === 'headers' ? 'var(--color-primary)' : 'var(--text-muted)', 
            borderBottom: activeSubTab === 'headers' ? '2px solid var(--color-primary)' : '2px solid transparent', 
            fontSize: '13px', 
            fontWeight: activeSubTab === 'headers' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Headers</span>
          {enabledHeadersCount > 0 && (
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '10px' }}>
              {enabledHeadersCount}
            </span>
          )}
        </button>

        {/* BODY SUBTAB BUTTON */}
        <button 
          type="button"
          onClick={() => setActiveSubTab('body')}
          style={{ 
            padding: '6px 14px', 
            background: 'transparent', 
            color: activeSubTab === 'body' ? 'var(--color-primary)' : 'var(--text-muted)', 
            borderBottom: activeSubTab === 'body' ? '2px solid var(--color-primary)' : '2px solid transparent', 
            fontSize: '13px', 
            fontWeight: activeSubTab === 'body' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Body</span>
          {bodyType !== 'none' && reqBody.trim() && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          )}
        </button>

        {/* AUTH SUBTAB BUTTON */}
        <button 
          type="button"
          onClick={() => setActiveSubTab('auth')}
          style={{ 
            padding: '6px 14px', 
            background: 'transparent', 
            color: activeSubTab === 'auth' ? 'var(--color-primary)' : 'var(--text-muted)', 
            borderBottom: activeSubTab === 'auth' ? '2px solid var(--color-primary)' : '2px solid transparent', 
            fontSize: '13px', 
            fontWeight: activeSubTab === 'auth' ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Auth</span>
          {authType !== 'none' && (
            <span style={{ 
              fontSize: '10px', 
              background: 'rgba(16, 185, 129, 0.2)', 
              color: '#10b981', 
              padding: '1px 6px', 
              borderRadius: '8px', 
              fontWeight: 600 
            }}>
              {authType}
            </span>
          )}
        </button>
      </div>

      {/* Subtab Content Panels */}
      <div style={{ minHeight: '140px' }}>
        {/* ========================================== */}
        {/* SUBTAB PARAMS (Query Parameters)           */}
        {/* ========================================== */}
        {activeSubTab === 'params' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Các tham số Query Params sẽ tự động đồng bộ 2 chiều với thanh Endpoint Path.
              </span>
              <button
                type="button"
                onClick={addParamRow}
                style={{
                  padding: '4px 10px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--color-primary)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                + Thêm Param
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-card)', borderRadius: '6px', background: 'var(--bg-app)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ width: '38px', padding: '6px', textAlign: 'center' }}>Bật</th>
                    <th style={{ padding: '6px 10px', width: '35%' }}>Tham số (Key)</th>
                    <th style={{ padding: '6px 10px', width: '35%' }}>Giá trị (Value)</th>
                    <th style={{ padding: '6px 10px' }}>Mô tả (Description)</th>
                    <th style={{ width: '40px', padding: '6px', textAlign: 'center' }}>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {paramsList.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={row.enabled} 
                          onChange={(e) => updateParamRow(row.id, 'enabled', e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="Key"
                          value={row.key}
                          onChange={(e) => updateParamRow(row.id, 'key', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#f1f5f9' }}
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="Value hoặc {{var}}"
                          value={row.value}
                          onChange={(e) => updateParamRow(row.id, 'value', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="Ghi chú..."
                          value={row.description || ''}
                          onChange={(e) => updateParamRow(row.id, 'description', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => removeParamRow(row.id)}
                          style={{ background: 'transparent', color: '#ef4444', fontSize: '13px', padding: '2px' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paramsList.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                        Chưa có query parameters. Nhấn "+ Thêm Param" hoặc gõ <code>?key=value</code> trên thanh URL.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB HEADERS                             */}
        {/* ========================================== */}
        {activeSubTab === 'headers' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => addHeaderRow()}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--color-primary)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  + Thêm Header
                </button>
                <button
                  type="button"
                  onClick={addJsonHeaderPreset}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  + Preset: JSON
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-card)', borderRadius: '6px', background: 'var(--bg-app)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ width: '38px', padding: '6px', textAlign: 'center' }}>Bật</th>
                    <th style={{ padding: '6px 10px', width: '40%' }}>Tên Header (Key)</th>
                    <th style={{ padding: '6px 10px' }}>Giá trị (Value)</th>
                    <th style={{ width: '40px', padding: '6px', textAlign: 'center' }}>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {headersList.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={row.enabled} 
                          onChange={(e) => updateHeaderRow(row.id, 'enabled', e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="e.g. Content-Type / Authorization"
                          value={row.key}
                          onChange={(e) => updateHeaderRow(row.id, 'key', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#f1f5f9' }}
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input 
                          type="text" 
                          placeholder="e.g. application/json hoặc {{token}}"
                          value={row.value}
                          onChange={(e) => updateHeaderRow(row.id, 'value', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => removeHeaderRow(row.id)}
                          style={{ background: 'transparent', color: '#ef4444', fontSize: '13px', padding: '2px' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB BODY (JSON / Raw / UrlEncoded / None) */}
        {/* ========================================== */}
        {activeSubTab === 'body' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              {/* Body Type Radio group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="bodyType" 
                    checked={bodyType === 'none'} 
                    onChange={() => updateActiveTab({ bodyType: 'none' })} 
                  />
                  <span>None</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="bodyType" 
                    checked={bodyType === 'json'} 
                    onChange={() => updateActiveTab({ bodyType: 'json' })} 
                  />
                  <span style={{ color: bodyType === 'json' ? 'var(--color-primary)' : 'inherit', fontWeight: bodyType === 'json' ? 600 : 400 }}>
                    JSON
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="bodyType" 
                    checked={bodyType === 'raw'} 
                    onChange={() => updateActiveTab({ bodyType: 'raw' })} 
                  />
                  <span>Raw (Text / XML)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="bodyType" 
                    checked={bodyType === 'urlencoded'} 
                    onChange={() => updateActiveTab({ bodyType: 'urlencoded' })} 
                  />
                  <span>x-www-form-urlencoded</span>
                </label>
              </div>

              {/* Actions for JSON/Raw */}
              {(bodyType === 'json' || bodyType === 'raw') && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  {bodyType === 'json' && (
                    <button
                      type="button"
                      onClick={handleFormatJson}
                      style={{
                        padding: '3px 10px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--color-primary)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      ✨ Format JSON
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateActiveTab({ reqBody: '' })}
                    style={{
                      padding: '3px 10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-card)',
                      color: '#ef4444',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  >
                    Xóa trắng
                  </button>
                </div>
              )}
            </div>

            {/* Render Body Editor or Table */}
            {bodyType === 'none' && (
              <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '6px', color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', border: '1px dashed var(--border-card)' }}>
                Yêu cầu này không gửi Payload Body.
              </div>
            )}

            {(bodyType === 'json' || bodyType === 'raw') && (
              <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <Editor
                  height="160px"
                  defaultLanguage={bodyType === 'json' ? "json" : "plaintext"}
                  language={bodyType === 'json' ? "json" : "plaintext"}
                  theme="vs-dark"
                  value={reqBody}
                  onChange={(value) => updateActiveTab({ reqBody: value || '' })}
                  options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 13, 
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            )}

            {bodyType === 'urlencoded' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={addUrlEncodedRow}
                    style={{
                      padding: '4px 10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--color-primary)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    + Thêm trường Form
                  </button>
                </div>
                <div style={{ border: '1px solid var(--border-card)', borderRadius: '6px', background: 'var(--bg-app)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', textAlign: 'left' }}>
                        <th style={{ width: '38px', padding: '6px', textAlign: 'center' }}>Bật</th>
                        <th style={{ padding: '6px 10px', width: '45%' }}>Tên trường (Key)</th>
                        <th style={{ padding: '6px 10px' }}>Giá trị (Value)</th>
                        <th style={{ width: '40px', padding: '6px', textAlign: 'center' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {urlEncodedList.map(row => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={row.enabled} 
                              onChange={(e) => updateUrlEncodedRow(row.id, 'enabled', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <input 
                              type="text" 
                              placeholder="Key"
                              value={row.key}
                              onChange={(e) => updateUrlEncodedRow(row.id, 'key', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#f1f5f9' }}
                            />
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <input 
                              type="text" 
                              placeholder="Value hoặc {{var}}"
                              value={row.value}
                              onChange={(e) => updateUrlEncodedRow(row.id, 'value', e.target.value)}
                              style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: 'none', color: '#38bdf8', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => removeUrlEncodedRow(row.id)}
                              style={{ background: 'transparent', color: '#ef4444', fontSize: '13px', padding: '2px' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      {urlEncodedList.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                            Chưa có trường form nào. Nhấn "+ Thêm trường Form" để nhập.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* SUBTAB AUTH (Bearer, Basic, API Key, None) */}
        {/* ========================================== */}
        {activeSubTab === 'auth' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Auth Type selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, width: '90px' }}>Loại Auth:</label>
              <select
                value={authType}
                onChange={(e) => updateActiveTab({ authType: e.target.value as any })}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-app)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  border: '1px solid var(--border-card)',
                  borderRadius: '6px'
                }}
              >
                <option value="none">No Auth (Không xác thực)</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </select>
            </div>

            {authType === 'none' && (
              <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '6px', color: 'var(--text-dim)', fontSize: '12px', border: '1px dashed var(--border-card)' }}>
                Yêu cầu này không sử dụng xác thực tự động. Chọn loại xác thực phía trên để cấu hình.
              </div>
            )}

            {/* BEARER TOKEN */}
            {authType === 'bearer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Bearer Token:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowRawToken(!showRawToken)}
                        style={{ background: 'transparent', color: 'var(--color-primary)', fontSize: '11px', textDecoration: 'underline' }}
                      >
                        {showRawToken ? 'Ẩn token' : 'Hiện token'}
                      </button>
                      {authToken && (
                        <button
                          type="button"
                          onClick={() => updateActiveTab({ authToken: '' })}
                          style={{ background: 'transparent', color: '#ef4444', fontSize: '11px' }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type={showRawToken ? 'text' : 'password'}
                    placeholder="Nhập token hoặc biến {{token}}"
                    value={authToken}
                    onChange={(e) => updateActiveTab({ authToken: e.target.value })}
                    style={{
                      width: '100%',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: '#10b981',
                      padding: '8px 10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                {/* Auto Generated Header Preview */}
                {authToken.trim() !== '' && (
                  <div style={{
                    background: 'var(--bg-app)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Header tự động gửi: </span>
                      <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
                        Authorization: {resolvedAuthToken.toLowerCase().startsWith('bearer ') ? resolvedAuthToken : `Bearer ${resolvedAuthToken}`}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHeader}
                      style={{
                        padding: '3px 8px',
                        background: copiedHeader ? '#10b981' : 'var(--bg-card)',
                        color: copiedHeader ? '#0b0f17' : 'var(--text-main)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      {copiedHeader ? '✓ Đã sao chép' : 'Sao chép Header'}
                    </button>
                  </div>
                )}

                {/* JWT Inspector */}
                {jwtDecodedData && (
                  <div style={{ background: 'var(--bg-app)', borderRadius: '6px', border: '1px solid var(--border-card)', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                        🔍 JWT Payload Inspector:
                      </span>
                      {jwtExpInfo && (
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          background: jwtExpInfo.isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: jwtExpInfo.isExpired ? '#ef4444' : '#10b981',
                          fontWeight: 600
                        }}>
                          {jwtExpInfo.isExpired ? '⚠️ Token hết hạn' : '✓ Token còn hạn'} ({jwtExpInfo.formatted})
                        </span>
                      )}
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '8px',
                      background: 'var(--bg-card)',
                      borderRadius: '4px',
                      color: '#93c5fd',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      maxHeight: '120px',
                      overflowY: 'auto'
                    }}>
                      {JSON.stringify(jwtDecodedData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* BASIC AUTH */}
            {authType === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Username:</label>
                    <input
                      type="text"
                      placeholder="Username hoặc {{user}}"
                      value={authConfig.username || ''}
                      onChange={(e) => updateActiveTab({ authConfig: { ...authConfig, username: e.target.value } })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Password:</label>
                    <input
                      type="password"
                      placeholder="Password hoặc {{pass}}"
                      value={authConfig.password || ''}
                      onChange={(e) => updateActiveTab({ authConfig: { ...authConfig, password: e.target.value } })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Hệ thống sẽ tự động mã hóa Base64 và chèn header <code>Authorization: Basic ...</code> khi gửi request.
                </div>
              </div>
            )}

            {/* API KEY */}
            {authType === 'apikey' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tên Key (Key Name):</label>
                    <input
                      type="text"
                      placeholder="e.g. X-API-Key hoặc api_key"
                      value={authConfig.apiKeyName || ''}
                      onChange={(e) => updateActiveTab({ authConfig: { ...authConfig, apiKeyName: e.target.value } })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giá trị Key (Value):</label>
                    <input
                      type="text"
                      placeholder="e.g. secret_key hoặc {{api_key}}"
                      value={authConfig.apiKeyValue || ''}
                      onChange={(e) => updateActiveTab({ authConfig: { ...authConfig, apiKeyValue: e.target.value } })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Gắn vào (Add to):</label>
                    <select
                      value={authConfig.apiKeyAddTo || 'header'}
                      onChange={(e) => updateActiveTab({ authConfig: { ...authConfig, apiKeyAddTo: e.target.value as any } })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
                    >
                      <option value="header">Request Headers</option>
                      <option value="query">Query Params</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: IMPORT cURL                         */}
      {/* ========================================== */}
      {isImportCurlOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 8, 15, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '10px',
            width: '650px',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d131f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📥</span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>Import từ lệnh cURL</span>
              </div>
              <button onClick={() => setIsImportCurlOpen(false)} style={{ background: 'transparent', color: '#94a3b8', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>
                Dán câu lệnh <code>curl ...</code> từ trình duyệt (DevTools ➔ Copy as cURL) hoặc tài liệu API:
              </label>
              <textarea
                rows={7}
                placeholder="curl --location 'https://api.example.com/v1/users' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer my_token' \
--data '{ &quot;name&quot;: &quot;John&quot; }'"
                value={curlInputText}
                onChange={e => setCurlInputText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  background: '#0a0e17',
                  border: '1px solid #1f293d',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#38bdf8'
                }}
              />
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #1f293d', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#0d131f' }}>
              <button
                onClick={() => setIsImportCurlOpen(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', background: 'transparent', color: '#94a3b8', fontSize: '12px' }}
              >
                Hủy
              </button>
              <button
                onClick={handleImportCurlSubmit}
                style={{ padding: '6px 16px', borderRadius: '6px', background: 'var(--color-primary)', color: '#0b0f17', fontWeight: 700, fontSize: '12px' }}
              >
                Nhập Ngay ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CODE SNIPPETS GENERATOR             */}
      {/* ========================================== */}
      {isCodeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 8, 15, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f293d',
            borderRadius: '10px',
            width: '720px',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d131f' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💻</span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>Code Snippets Generator</span>
              </div>
              <button onClick={() => setIsCodeModalOpen(false)} style={{ background: 'transparent', color: '#94a3b8', fontSize: '16px' }}>✕</button>
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '1px solid #1f293d', background: '#0a0e17' }}>
              {(['curl', 'fetch', 'axios', 'python', 'go', 'nodejs'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: selectedLang === lang ? 700 : 400,
                    background: selectedLang === lang ? 'var(--color-primary)' : '#1e293b',
                    color: selectedLang === lang ? '#0b0f17' : '#94a3b8',
                    textTransform: 'uppercase'
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Code View */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Mã nguồn thực thi độc lập:</span>
                <button
                  onClick={handleCopySnippet}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: copiedSnippet ? '#10b981' : '#1e293b',
                    color: copiedSnippet ? '#0b0f17' : '#38bdf8',
                    border: '1px solid #334155',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {copiedSnippet ? '✓ Đã sao chép' : 'Sao chép Code'}
                </button>
              </div>

              <div style={{ border: '1px solid #1f293d', borderRadius: '6px', overflow: 'hidden' }}>
                <Editor
                  height="260px"
                  language={selectedLang === 'python' ? 'python' : (selectedLang === 'go' ? 'go' : (selectedLang === 'curl' ? 'shell' : 'javascript'))}
                  theme="vs-dark"
                  value={codeSnippet}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '10px 16px', borderTop: '1px solid #1f293d', display: 'flex', justifyContent: 'flex-end', background: '#0d131f' }}>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                style={{ padding: '6px 14px', borderRadius: '6px', background: '#1e293b', color: '#f1f5f9', fontSize: '12px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}