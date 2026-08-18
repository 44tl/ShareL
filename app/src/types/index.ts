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

export interface AppConfig {
  save_directory: string;
  recordings_directory: string;
  file_naming_pattern: string;
  default_image_format: string;
  default_recording_format: string;
  recording_fps: number;
  recording_include_audio: boolean;
  after_capture: AfterCaptureTasks;
  after_upload: AfterUploadTasks;
  active_uploader_id: string;
  theme: string;
  minimize_to_tray: boolean;
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
}

export interface RecordingStatus {
  is_recording: boolean;
  duration_seconds: number;
  output_path?: string;
  format?: string;
}

export interface RecordingResult {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  duration_seconds: number;
  format: string;
  timestamp: number;
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
