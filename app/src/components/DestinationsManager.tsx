import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { CustomUploaderConfig, UploadResult } from '../types';

interface DestinationsManagerProps {
  uploaders: CustomUploaderConfig[];
  activeUploaderId: string;
  onSelectActive: (id: string) => void;
  onSaveUploader: (uploader: CustomUploaderConfig) => Promise<void>;
  onDeleteUploader: (id: string) => Promise<void>;
  onImportSxcu: (file: File) => Promise<void>;
  onTestUploader: (uploaderId: string) => Promise<UploadResult>;
}

export const DestinationsManager: React.FC<DestinationsManagerProps> = ({
  uploaders,
  activeUploaderId,
  onSelectActive,
  onSaveUploader,
  onDeleteUploader,
  onImportSxcu,
  onTestUploader,
}) => {
  const [selectedUploader, setSelectedUploader] = useState<CustomUploaderConfig>(
    uploaders.find((u) => u.id === activeUploaderId) || uploaders[0] || {
      id: 'custom_' + Date.now(),
      Name: 'New Custom Uploader',
      DestinationType: 'ImageUploader',
      RequestMethod: 'POST',
      RequestURL: 'https://example.com/api/upload',
      Headers: {},
      Parameters: {},
      Arguments: {},
      Body: 'MultipartFormData',
      FileFormName: 'file',
      URL: '$json:url$',
    }
  );

  const [headerKey, setHeaderKey] = useState<string>('');
  const [headerVal, setHeaderVal] = useState<string>('');
  const [argKey, setArgKey] = useState<string>('');
  const [argVal, setArgVal] = useState<string>('');
  const [testResult, setTestResult] = useState<UploadResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'test'>('request');

  const handleUpdateField = <K extends keyof CustomUploaderConfig>(
    field: K,
    val: CustomUploaderConfig[K]
  ) => {
    setSelectedUploader((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleAddHeader = () => {
    if (!headerKey.trim()) return;
    setSelectedUploader((prev) => ({
      ...prev,
      Headers: {
        ...prev.Headers,
        [headerKey.trim()]: headerVal.trim(),
      },
    }));
    setHeaderKey('');
    setHeaderVal('');
  };

  const handleRemoveHeader = (key: string) => {
    setSelectedUploader((prev) => {
      const nextHeaders = { ...prev.Headers };
      delete nextHeaders[key];
      return { ...prev, Headers: nextHeaders };
    });
  };

  const handleAddArgument = () => {
    if (!argKey.trim()) return;
    setSelectedUploader((prev) => ({
      ...prev,
      Arguments: {
        ...prev.Arguments,
        [argKey.trim()]: argVal.trim(),
      },
    }));
    setArgKey('');
    setArgVal('');
  };

  const handleRemoveArgument = (key: string) => {
    setSelectedUploader((prev) => {
      const nextArgs = { ...prev.Arguments };
      delete nextArgs[key];
      return { ...prev, Arguments: nextArgs };
    });
  };

  const handleCreateNew = () => {
    const newUploader: CustomUploaderConfig = {
      id: 'sxcu_' + Date.now(),
      Name: 'Custom Host',
      DestinationType: 'ImageUploader',
      RequestMethod: 'POST',
      RequestURL: 'https://',
      Headers: {},
      Parameters: {},
      Arguments: {},
      Body: 'MultipartFormData',
      FileFormName: 'image',
      URL: '$json:data.url$',
    };
    setSelectedUploader(newUploader);
  };

  const handleExportSxcu = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedUploader, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${selectedUploader.Name.replace(/\s+/g, '_')}.sxcu`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportSxcu(e.target.files[0]);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await onSaveUploader(selectedUploader);
      const res = await onTestUploader(selectedUploader.id);
      setTestResult(res);
      setActiveTab('test');
    } catch (err) {
      setTestResult({
        success: false,
        raw_response: String(err),
        status_code: 500,
        duration_ms: 0,
        error_message: String(err),
      });
      setActiveTab('test');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: 'var(--md-sys-color-background)' }}>
      <div
        style={{
          width: '280px',
          backgroundColor: 'var(--md-sys-color-surface)',
          borderRight: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
              Destinations (.sxcu)
            </div>
            <button
              onClick={handleCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-primary)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <Plus size={13} />
              <span>New</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            {uploaders.map((u) => {
              const isSelected = selectedUploader.id === u.id;
              const isActive = activeUploaderId === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUploader(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--md-sys-color-surface-container-highest)' : 'transparent',
                    border: isSelected ? '1px solid var(--md-sys-color-primary)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--md-sys-color-on-surface)' }}>
                      {u.Name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                      {u.RequestMethod} • {u.DestinationType}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(109, 213, 140, 0.15)',
                          color: 'var(--md-sys-color-success)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid rgba(109, 213, 140, 0.3)',
                        }}
                      >
                        Active
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUploader(u.id);
                      }}
                      style={{ color: 'var(--md-sys-color-error)', padding: '2px' }}
                      title="Delete Uploader"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '8px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Upload size={14} color="var(--md-sys-color-primary)" />
            <span>Import .sxcu File</span>
            <input type="file" accept=".sxcu,.json" onChange={handleFileInput} style={{ display: 'none' }} />
          </label>

          <button
            onClick={handleExportSxcu}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
              padding: '8px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <Download size={14} color="var(--md-sys-color-primary)" />
            <span>Export .sxcu</span>
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--md-sys-color-background)',
          overflowY: 'auto',
          padding: '28px',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
              {selectedUploader.Name}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
              ShareX Custom Uploader (.sxcu) Configuration
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onSelectActive(selectedUploader.id)}
              disabled={activeUploaderId === selectedUploader.id}
              style={{
                backgroundColor: activeUploaderId === selectedUploader.id ? 'var(--md-sys-color-surface-container)' : 'rgba(109, 213, 140, 0.15)',
                color: activeUploaderId === selectedUploader.id ? 'var(--md-sys-color-on-surface-muted)' : 'var(--md-sys-color-success)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {activeUploaderId === selectedUploader.id ? 'Active Default' : 'Make Active'}
            </button>

            <button
              onClick={handleRunTest}
              disabled={isTesting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                color: 'var(--md-sys-color-primary)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Play size={13} fill="currentColor" />
              <span>{isTesting ? 'Testing' : 'Test Uploader'}</span>
            </button>

            <button
              onClick={() => onSaveUploader(selectedUploader)}
              style={{
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                padding: '6px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Save Configuration
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('request')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: activeTab === 'request' ? 'var(--md-sys-color-surface-container-high)' : 'transparent',
              color: activeTab === 'request' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            HTTP Request
          </button>
          <button
            onClick={() => setActiveTab('response')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: activeTab === 'response' ? 'var(--md-sys-color-surface-container-high)' : 'transparent',
              color: activeTab === 'response' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Response Parsing
          </button>
          <button
            onClick={() => setActiveTab('test')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: activeTab === 'test' ? 'var(--md-sys-color-surface-container-high)' : 'transparent',
              color: activeTab === 'test' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Live Test Inspector {testResult && `(${testResult.status_code})`}
          </button>
        </div>

        {activeTab === 'request' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  Destination Name
                </label>
                <input
                  type="text"
                  value={selectedUploader.Name}
                  onChange={(e) => handleUpdateField('Name', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  HTTP Method
                </label>
                <select
                  value={selectedUploader.RequestMethod}
                  onChange={(e) => handleUpdateField('RequestMethod', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="GET">GET</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  Body Type
                </label>
                <select
                  value={selectedUploader.Body}
                  onChange={(e) => handleUpdateField('Body', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="MultipartFormData">Multipart / Form-Data</option>
                  <option value="FormUrlEncoded">Form URL Encoded</option>
                  <option value="JSON">JSON Payload</option>
                  <option value="Binary">Raw Binary</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  Request Endpoint URL
                </label>
                <input
                  type="text"
                  value={selectedUploader.RequestURL}
                  onChange={(e) => handleUpdateField('RequestURL', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                  File Form Field Name
                </label>
                <input
                  type="text"
                  value={selectedUploader.FileFormName}
                  onChange={(e) => handleUpdateField('FileFormName', e.target.value)}
                  placeholder="image, file, source..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '10px' }}>
                HTTP Request Headers
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Header Name (e.g. Authorization)"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Header Value (e.g. Bearer token)"
                  value={headerVal}
                  onChange={(e) => setHeaderVal(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddHeader}
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Add Header
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(selectedUploader.Headers || {}).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{k}:</span>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)', flex: 1, margin: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v}
                    </span>
                    <button onClick={() => handleRemoveHeader(k)} style={{ color: 'var(--md-sys-color-error)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', marginBottom: '10px' }}>
                Form Arguments &amp; Parameters
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Parameter Key"
                  value={argKey}
                  onChange={(e) => setArgKey(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Parameter Value"
                  value={argVal}
                  onChange={(e) => setArgVal(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddArgument}
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container-high)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Add Argument
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(selectedUploader.Arguments || {}).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--md-sys-color-surface-container-high)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--md-sys-color-primary)' }}>{k}:</span>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)', flex: 1, margin: '0 12px' }}>{v}</span>
                    <button onClick={() => handleRemoveArgument(k)} style={{ color: 'var(--md-sys-color-error)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'response' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                Image Response URL Pattern
              </label>
              <input
                type="text"
                value={selectedUploader.URL || ''}
                onChange={(e) => handleUpdateField('URL', e.target.value)}
                placeholder="$json:data.url$, $json:link$, $regex:1$, $response$"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', marginTop: '4px', display: 'block' }}>
                Supports JSON path templates ($json:path$), Regex extractions ($regex:1$), and headers ($header:Location$).
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                Thumbnail URL Pattern (Optional)
              </label>
              <input
                type="text"
                value={selectedUploader.ThumbnailURL || ''}
                onChange={(e) => handleUpdateField('ThumbnailURL', e.target.value)}
                placeholder="$json:thumbnail.url$"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                Deletion URL Pattern (Optional)
              </label>
              <input
                type="text"
                value={selectedUploader.DeletionURL || ''}
                onChange={(e) => handleUpdateField('DeletionURL', e.target.value)}
                placeholder="$json:delete_url$"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                Error Message Pattern (Optional)
              </label>
              <input
                type="text"
                value={selectedUploader.ErrorMessage || ''}
                onChange={(e) => handleUpdateField('ErrorMessage', e.target.value)}
                placeholder="$json:error.message$"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {testResult ? (
              <div
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  border: `1px solid ${testResult.success ? 'rgba(109, 213, 140, 0.4)' : 'rgba(242, 184, 181, 0.4)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {testResult.success ? (
                      <CheckCircle size={20} color="var(--md-sys-color-success)" />
                    ) : (
                      <XCircle size={20} color="var(--md-sys-color-error)" />
                    )}
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                      {testResult.success ? 'Upload Succeeded' : 'Upload Failed'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--md-sys-color-on-surface-muted)' }}>
                    <span>HTTP {testResult.status_code}</span>
                    <span>{testResult.duration_ms} ms</span>
                  </div>
                </div>

                {testResult.url && (
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block' }}>Extracted URL:</span>
                    <a
                      href={testResult.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--md-sys-color-primary)', fontSize: '13px', wordBreak: 'break-all' }}
                    >
                      {testResult.url}
                    </a>
                  </div>
                )}

                {testResult.deletion_url && (
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block' }}>Deletion URL:</span>
                    <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '12px', wordBreak: 'break-all' }}>
                      {testResult.deletion_url}
                    </span>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--md-sys-color-on-surface-muted)', display: 'block', marginBottom: '4px' }}>
                    Raw Server Response:
                  </span>
                  <pre
                    style={{
                      backgroundColor: 'var(--md-sys-color-background)',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      color: 'var(--md-sys-color-success)',
                    }}
                  >
                    {testResult.raw_response}
                  </pre>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: 'var(--md-sys-color-on-surface-muted)',
                  gap: '12px',
                }}
              >
                <Play size={32} />
                <span>Click "Test Uploader" above to run a live test.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
