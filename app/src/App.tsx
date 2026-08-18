import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CaptureCenter } from './components/CaptureCenter';
import { ImageEditor } from './components/ImageEditor';
import { DestinationsManager } from './components/DestinationsManager';
import { HistoryGallery } from './components/HistoryGallery';
import { ToolsPanel } from './components/ToolsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { UploadNotifications } from './components/UploadNotifications';
import {
  AppConfig,
  CaptureResult,
  CustomUploaderConfig,
  HistoryItem,
  OcrResult,
  RecordingResult,
  RecordingStatus,
  SystemEnvironmentInfo,
  UploadJob,
  UploadJobCompleteEvent,
  UploadJobProgressEvent,
  UploadJobStartEvent,
  UploadResult,
} from './types';
import { invokeCommand } from './lib/tauri';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('capture');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [systemEnvironment, setSystemEnvironment] = useState<SystemEnvironmentInfo | null>(null);
  const [uploaders, setUploaders] = useState<CustomUploaderConfig[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const historyRef = useRef<HistoryItem[]>([]);
  const [lastCapture, setLastCapture] = useState<CaptureResult | null>(null);
  const [lastRecording, setLastRecording] = useState<RecordingResult | null>(null);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorFilePath, setEditorFilePath] = useState<string | undefined>(undefined);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    is_recording: false,
    duration_seconds: 0,
  });
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const uploadJobsRef = useRef<UploadJob[]>([]);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshHistory = useCallback(async () => {
    try {
      const history = await invokeCommand<HistoryItem[]>('get_history');
      if (JSON.stringify(historyRef.current) !== JSON.stringify(history)) {
        historyRef.current = history;
        setHistoryItems(history);
      }
    } catch {
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const cfg = await invokeCommand<AppConfig>('get_app_config');
      setConfig(cfg);

      const envInfo = await invokeCommand<SystemEnvironmentInfo>('get_system_environment');
      setSystemEnvironment(envInfo);

      const uploaderList = await invokeCommand<CustomUploaderConfig[]>('list_uploaders');
      setUploaders(uploaderList);

      await refreshHistory();
    } catch (err) {
      showToast(String(err), 'error');
    }
  }, [refreshHistory]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen('history://changed', () => {
          if (mounted) refreshHistory();
        })
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, [refreshHistory]);

  useEffect(() => {
    let unlisteners: (() => void)[] = [];
    let mounted = true;

    const updateJob = (jobId: string, patch: Partial<UploadJob>) => {
      uploadJobsRef.current = uploadJobsRef.current.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j));
      if (mounted) setUploadJobs(uploadJobsRef.current);
    };

    const upsertJob = (job: UploadJob) => {
      const exists = uploadJobsRef.current.some((j) => j.jobId === job.jobId);
      uploadJobsRef.current = exists
        ? uploadJobsRef.current.map((j) => (j.jobId === job.jobId ? { ...j, ...job } : j))
        : [...uploadJobsRef.current, job];
      if (mounted) setUploadJobs(uploadJobsRef.current);
    };

    import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        unlisteners.push(
          await listen('upload://start', (e) => {
            const p = e.payload as UploadJobStartEvent;
            upsertJob({
              jobId: p.job_id,
              uploaderId: p.uploader_id,
              uploaderName: p.uploader_name,
              filePath: p.file_path,
              fileName: p.file_name,
              progress: 0,
              bytesSent: 0,
              bytesTotal: 0,
              status: 'uploading',
            });
          })
        );

        unlisteners.push(
          await listen('upload://progress', (e) => {
            const p = e.payload as UploadJobProgressEvent;
            updateJob(p.job_id, {
              progress: p.progress,
              bytesSent: p.bytes_sent,
              bytesTotal: p.bytes_total,
            });
          })
        );

        unlisteners.push(
          await listen('upload://complete', (e) => {
            const p = e.payload as UploadJobCompleteEvent;
            updateJob(p.job_id, {
              progress: p.success ? 100 : 0,
              status: p.success ? 'success' : 'error',
              url: p.url,
              deletionUrl: p.deletion_url,
              error: p.error_message,
              statusCode: p.status_code,
              durationMs: p.duration_ms,
            });
          })
        );

        unlisteners.push(
          await listen('ocr://result', (e) => {
            const p = e.payload as { success: boolean; text?: string; error?: string };
            if (p.success) {
              showToast('OCR text copied to clipboard', 'success');
            } else {
              showToast(`OCR failed: ${p.error || 'No text recognized'}`, 'error');
            }
          })
        );
      })
      .catch(() => {});

    return () => {
      mounted = false;
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshHistory();
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshHistory]);

  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/window')
      .then(async ({ getCurrentWindow }) => {
        const fn = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
          if (focused && mounted) refreshHistory();
        });
        if (!mounted) fn();
        else unlisten = fn;
      })
      .catch(() => {});
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, [refreshHistory]);

  useEffect(() => {
    let interval: any;
    if (recordingStatus.is_recording) {
      interval = setInterval(async () => {
        try {
          const status = await invokeCommand<RecordingStatus>('get_recording_state');
          setRecordingStatus(status);
        } catch {
          setRecordingStatus((prev) => ({
            ...prev,
            duration_seconds: prev.duration_seconds + 1,
          }));
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingStatus.is_recording]);

  const handleTriggerCapture = async (mode: string, delayMs: number = 0) => {
    try {
      showToast(`Starting ${mode} capture...`, 'info');
      const result = await invokeCommand<CaptureResult>('capture_screen', {
        mode,
        delayMs,
      });

      setLastCapture(result);
      showToast(`Screenshot saved: ${result.file_name}`, 'success');

      await refreshHistory();

      if (config?.after_capture.open_in_editor) {
        setEditorImageSrc(result.data_url);
        setEditorFilePath(result.file_path);
        setActiveView('editor');
      }
    } catch (err) {
      showToast(`Capture failed: ${err}`, 'error');
    }
  };

  const handleStartRecording = async (format: string, fps: number, audio: boolean) => {
    try {
      await invokeCommand('start_screen_recording', {
        format,
        fps,
        includeAudio: audio,
      });
      setRecordingStatus({
        is_recording: true,
        duration_seconds: 0,
        format,
      });
      showToast(`Screen recording started (${format.toUpperCase()})`, 'info');
    } catch (err) {
      showToast(`Failed to start recording: ${err}`, 'error');
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await invokeCommand<RecordingResult>('stop_screen_recording');
      setLastRecording(result);
      setRecordingStatus({
        is_recording: false,
        duration_seconds: 0,
      });
      showToast(`Recording saved: ${result.file_name} (${result.duration_seconds}s)`, 'success');

      await refreshHistory();
    } catch (err) {
      showToast(`Failed to stop recording: ${err}`, 'error');
      setRecordingStatus({
        is_recording: false,
        duration_seconds: 0,
      });
    }
  };

  const handleUploadFile = async (filePath: string, uploaderId?: string) => {
    const targetUploader = uploaderId || config?.active_uploader_id;
    if (!targetUploader) {
      showToast('No active uploader destination configured', 'error');
      return;
    }

    try {
      const res = await invokeCommand<UploadResult>('upload_file', {
        uploaderId: targetUploader,
        filePath,
      });

      if (!res.success) {
        showToast(`Upload failed: ${res.error_message || 'Unknown server error'}`, 'error');
      } else if (res.url) {
        await refreshHistory();
      }
    } catch (err) {
      showToast(`Upload error: ${err}`, 'error');
    }
  };

  const handleRetryUpload = (job: UploadJob) => {
    uploadJobsRef.current = uploadJobsRef.current.filter((j) => j.jobId !== job.jobId);
    setUploadJobs(uploadJobsRef.current);
    handleUploadFile(job.filePath, job.uploaderId);
  };

  const handleDismissUpload = (jobId: string) => {
    uploadJobsRef.current = uploadJobsRef.current.filter((j) => j.jobId !== jobId);
    setUploadJobs(uploadJobsRef.current);
  };

  const handleSaveEditorImage = async (dataUrl: string, origPath?: string) => {
    try {
      const outPath = await invokeCommand<string>('save_edited_image', {
        dataUrl,
        originalPath: origPath,
        format: config?.default_image_format || 'png',
      });
      showToast(`Saved annotated image: ${outPath}`, 'success');
      await refreshHistory();
    } catch (err) {
      showToast(`Save failed: ${err}`, 'error');
    }
  };

  const handleCopyEditorClipboard = async (dataUrl: string) => {
    try {
      const tempPath = await invokeCommand<string>('save_edited_image', {
        dataUrl,
        originalPath: undefined,
        format: 'png',
      });
      await invokeCommand('copy_image', { path: tempPath });
      showToast('Annotated image copied to system clipboard', 'success');
    } catch (err) {
      showToast(`Clipboard error: ${err}`, 'error');
    }
  };

  const handleUploadEditorImage = async (dataUrl: string) => {
    try {
      const tempPath = await invokeCommand<string>('save_edited_image', {
        dataUrl,
        originalPath: undefined,
        format: 'png',
      });
      await handleUploadFile(tempPath);
    } catch (err) {
      showToast(`Upload failed: ${err}`, 'error');
    }
  };

  const handleRunOcrOnData = async (dataUrl: string) => {
    try {
      const tempPath = await invokeCommand<string>('save_edited_image', {
        dataUrl,
        originalPath: undefined,
        format: 'png',
      });
      const res = await invokeCommand<OcrResult>('ocr_image', { imagePath: tempPath });
      if (res.success) {
        await invokeCommand('copy_text', { text: res.text });
        showToast(`OCR text copied to clipboard`, 'success');
      } else {
        showToast(`OCR failed: ${res.error || 'No text recognized'}`, 'error');
      }
    } catch (err) {
      showToast(`OCR error: ${err}`, 'error');
    }
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      await invokeCommand('update_app_config', { config: newConfig });
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast(`Failed to save settings: ${err}`, 'error');
    }
  };

  const handleToggleAfterCapture = (key: keyof AppConfig['after_capture']) => {
    if (!config) return;
    const nextVal = !config.after_capture[key];
    const newConfig = {
      ...config,
      after_capture: {
        ...config.after_capture,
        [key]: nextVal,
      },
    };
    handleUpdateConfig(newConfig);
  };

  const handleSelectUploader = (id: string) => {
    if (!config) return;
    const newConfig = { ...config, active_uploader_id: id };
    handleUpdateConfig(newConfig);
  };

  const handleSaveUploader = async (uploader: CustomUploaderConfig) => {
    try {
      await invokeCommand('save_uploader', { uploader });
      const list = await invokeCommand<CustomUploaderConfig[]>('list_uploaders');
      setUploaders(list);
      showToast(`Destination '${uploader.Name}' saved`, 'success');
    } catch (err) {
      showToast(`Failed to save uploader: ${err}`, 'error');
    }
  };

  const handleDeleteUploader = async (id: string) => {
    try {
      await invokeCommand('delete_uploader', { id });
      const list = await invokeCommand<CustomUploaderConfig[]>('list_uploaders');
      setUploaders(list);
      showToast('Destination deleted', 'info');
    } catch (err) {
      showToast(`Failed to delete uploader: ${err}`, 'error');
    }
  };

  const handleImportSxcu = async (file: File) => {
    try {
      const text = await file.text();
      const parsed: CustomUploaderConfig = JSON.parse(text);
      if (!parsed.id) {
        parsed.id = 'imported_' + Date.now();
      }
      await handleSaveUploader(parsed);
      showToast(`Imported ShareX destination: ${parsed.Name}`, 'success');
    } catch (err) {
      showToast(`Failed to parse .sxcu file: ${err}`, 'error');
    }
  };

  const handleTestUploader = async (uploaderId: string): Promise<UploadResult> => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#191c20';
      ctx.fillRect(0, 0, 400, 200);
      ctx.fillStyle = '#a8c7fa';
      ctx.font = '20px sans-serif';
      ctx.fillText('ShareL Test Capture', 80, 105);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const tempPath = await invokeCommand<string>('save_edited_image', {
      dataUrl,
      originalPath: undefined,
      format: 'png',
    });

    return await invokeCommand<UploadResult>('upload_file', {
      uploaderId,
      filePath: tempPath,
    });
  };

  const handleToggleFavoriteHistory = async (id: string) => {
    try {
      await invokeCommand('toggle_favorite_history', { id });
      await refreshHistory();
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleDeleteHistoryItem = async (id: string, deleteFile: boolean) => {
    try {
      await invokeCommand('delete_history', { id, deleteFile });
      await refreshHistory();
      showToast('Item removed from history', 'info');
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleClearHistory = async () => {
    try {
      await invokeCommand('clear_all_history');
      await refreshHistory();
      showToast('Capture history cleared', 'info');
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleOpenInEditor = (filePath: string) => {
    setEditorFilePath(filePath);
    setEditorImageSrc(`asset://${filePath}`);
    setActiveView('editor');
  };

  const handleCopyImage = async (path: string) => {
    try {
      await invokeCommand('copy_image', { path });
      showToast('Image copied to clipboard', 'success');
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await invokeCommand('copy_text', { text });
      showToast('Text copied to clipboard', 'success');
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleShowInFolder = async (path: string) => {
    try {
      await invokeCommand('show_file_in_folder', { path });
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await invokeCommand('open_link', { url });
    } catch (err) {
      showToast(String(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--md-sys-color-background)' }}>
      <Navbar
        recordingStatus={recordingStatus}
        onQuickCapture={handleTriggerCapture}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        activeView={activeView}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          config={config}
          uploaders={uploaders}
          onToggleAfterCapture={handleToggleAfterCapture}
          onSelectUploader={handleSelectUploader}
        />

        <main style={{ flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: 'var(--md-sys-color-background)' }}>
          {activeView === 'capture' && (
            <CaptureCenter
              onTriggerCapture={handleTriggerCapture}
              onStartRecording={handleStartRecording}
              onOpenImageInEditor={(dataUrl, path) => {
                setEditorImageSrc(dataUrl);
                setEditorFilePath(path);
                setActiveView('editor');
              }}
              lastCapture={lastCapture}
              lastRecording={lastRecording}
              onCopyPath={(p) => handleCopyText(p)}
              onShowInFolder={handleShowInFolder}
              environment={systemEnvironment}
            />
          )}

          {activeView === 'editor' && (
            <ImageEditor
              imageSrc={editorImageSrc}
              filePath={editorFilePath}
              onSave={handleSaveEditorImage}
              onCopyClipboard={handleCopyEditorClipboard}
              onUpload={handleUploadEditorImage}
              onRunOcr={handleRunOcrOnData}
            />
          )}

          {activeView === 'destinations' && (
            <DestinationsManager
              uploaders={uploaders}
              activeUploaderId={config?.active_uploader_id || ''}
              onSelectActive={handleSelectUploader}
              onSaveUploader={handleSaveUploader}
              onDeleteUploader={handleDeleteUploader}
              onImportSxcu={handleImportSxcu}
              onTestUploader={handleTestUploader}
            />
          )}

          {activeView === 'history' && (
            <HistoryGallery
              items={historyItems}
              onOpenInEditor={handleOpenInEditor}
              onCopyImage={handleCopyImage}
              onCopyText={handleCopyText}
              onShowInFolder={handleShowInFolder}
              onOpenLink={handleOpenLink}
              onToggleFavorite={handleToggleFavoriteHistory}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
            />
          )}

          {activeView === 'tools' && (
            <ToolsPanel
              onCopyText={handleCopyText}
              onRunOcrOnPath={async (p) => {
                let pathOrData = p;
                if (p.startsWith('data:')) {
                  pathOrData = await invokeCommand<string>('save_edited_image', {
                    dataUrl: p,
                    originalPath: undefined,
                    format: 'png',
                  });
                }
                return await invokeCommand<OcrResult>('ocr_image', { imagePath: pathOrData });
              }}
            />
          )}

          {activeView === 'settings' && (
            <SettingsPanel
              config={config}
              environment={systemEnvironment}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {toastMessage && (
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                backgroundColor:
                  toastMessage.type === 'error'
                    ? 'var(--md-sys-color-error-container)'
                    : toastMessage.type === 'success'
                    ? 'var(--md-sys-color-primary-container)'
                    : 'var(--md-sys-color-surface-container-highest)',
                color:
                  toastMessage.type === 'error'
                    ? '#ffffff'
                    : toastMessage.type === 'success'
                    ? 'var(--md-sys-color-on-primary-container)'
                    : 'var(--md-sys-color-on-surface)',
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                fontSize: '13px',
                fontWeight: 500,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{toastMessage.text}</span>
            </div>
          )}

          <UploadNotifications
            jobs={uploadJobs}
            onCopyUrl={handleCopyText}
            onRetry={handleRetryUpload}
            onDismiss={handleDismissUpload}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
