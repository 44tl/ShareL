export interface AfterCaptureTasks {
  copy_to_clipboard: boolean;
  save_to_file: boolean;
  upload_to_host: boolean;
  open_in_editor: boolean;
  show_notification: boolean;
  play_sound: boolean;
}

export interface AfterUploadTasks {
  copy_url_to_clipboard: boolean;
  open_url_in_browser: boolean;
  show_notification: boolean;
}

export interface GlobalShortcuts {
  capture_region: string;
  capture_fullscreen: string;
  capture_window: string;
  capture_active_screen: string;
  open_main_window: string;
  stop_recording: string;
  upload_last_capture: string;
  ocr_last_capture: string;
}

export type CompositorKind =
  | 'niri'
  | 'hyprland'
  | 'sway'
  | 'gnome'
  | 'kde_plasma'
  | 'cosmic'
  | 'generic_wayland'
  | 'x11'
  | 'unknown';

export interface BackendAvailability {
  xdg_desktop_portal: boolean;
  grim: boolean;
  slurp: boolean;
  gpu_screen_recorder: boolean;
  wf_recorder: boolean;
  ffmpeg: boolean;
  compositor_integration: boolean;
  compositor_cli_name?: string;
}

export interface SystemEnvironmentInfo {
  compositor: CompositorKind;
  compositor_name: string;
  session_type: string;
  wayland_display?: string;
  backends: BackendAvailability;
  preferred_screenshot_backend: string;
  preferred_recording_backend: string;
}

export interface AppConfig {
  save_directory: string;
  recordings_directory: string;
  file_naming_pattern: string;
  default_image_format: string;
  default_recording_format: string;
  recording_fps: number;
  recording_include_audio: boolean;
  recording_bitrate_kbps: number;
  recording_codec: string;
  recording_audio_source: string;
  recording_capture_cursor: boolean;
  recording_highlight_cursor: boolean;
  recording_webcam_overlay: boolean;
  recording_webcam_device: string;
  recording_webcam_position: string;
  recording_filename_template: string;
  recording_auto_upload: boolean;
  after_capture: AfterCaptureTasks;
  after_upload: AfterUploadTasks;
  active_uploader_id: string;
  theme: string;
  minimize_to_tray: boolean;
  preferred_screenshot_backend?: string;
  preferred_recording_backend?: string;
  shortcuts: GlobalShortcuts;
}

export interface CaptureResult {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  width: number;
  height: number;
  timestamp: number;
  data_url: string;
  format: string;
  backend_used?: string;
}

export interface RecordingOptions {
  recordings_dir?: string;
  format: string;
  fps: number;
  bitrate_kbps?: number;
  codec?: string;
  audio_source?: string;
  record_microphone?: boolean;
  record_system_audio?: boolean;
  separate_audio_tracks?: boolean;
  capture_cursor?: boolean;
  highlight_cursor?: boolean;
  webcam_device?: string;
  webcam_position?: string;
  mode: string;
  region_geometry?: string;
  preferred_backend?: string;
  filename_template?: string;
  auto_upload?: boolean;
}

export interface RecordingStatus {
  is_recording: boolean;
  is_paused?: boolean;
  is_processing?: boolean;
  processing_message?: string;
  duration_seconds: number;
  output_path?: string;
  format?: string;
  backend?: string;
  fps?: number;
  mode?: string;
  codec?: string;
  auto_upload?: boolean;
}

export interface RecordingResult {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  duration_seconds: number;
  format: string;
  timestamp: number;
  backend_used?: string;
  auto_upload?: boolean;
  is_processing?: boolean;
}

export interface RecordingProcessingEvent {
  id: string;
  file_name: string;
  format: string;
  message: string;
}

export interface CustomUploaderConfig {
  id: string;
  Version?: string;
  Name: string;
  DestinationType: string;
  RequestMethod: string;
  RequestURL: string;
  Headers: Record<string, string>;
  Parameters: Record<string, string>;
  Arguments: Record<string, string>;
  Body: string;
  FileFormName: string;
  Data?: string;
  URL?: string;
  ThumbnailURL?: string;
  DeletionURL?: string;
  ErrorMessage?: string;
  Domain?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnail_url?: string;
  deletion_url?: string;
  error_message?: string;
  raw_response: string;
  status_code: number;
  duration_ms: number;
}

export interface UploadJobStartEvent {
  job_id: string;
  uploader_id: string;
  uploader_name: string;
  file_path: string;
  file_name: string;
}

export interface UploadJobProgressEvent {
  job_id: string;
  progress: number;
  bytes_sent: number;
  bytes_total: number;
}

export interface UploadJobCompleteEvent {
  job_id: string;
  success: boolean;
  url?: string;
  deletion_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  status_code?: number;
  duration_ms?: number;
}

export interface UploadJob {
  jobId: string;
  uploaderId: string;
  uploaderName: string;
  filePath: string;
  fileName: string;
  progress: number;
  bytesSent: number;
  bytesTotal: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  deletionUrl?: string;
  error?: string;
  statusCode?: number;
  durationMs?: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  item_type: string;
  format: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  timestamp: number;
  upload_url?: string;
  deletion_url?: string;
  thumbnail_url?: string;
  is_favorite: boolean;
}

export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
}

export type EditorTool =
  | 'select'
  | 'arrow'
  | 'step'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'brush'
  | 'highlighter'
  | 'text'
  | 'blur'
  | 'crop';

export interface EditorAnnotation {
  id: string;
  type: EditorTool;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  text?: string;
  stepNumber?: number;
  points?: { x: number; y: number }[];
}
