use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::str::FromStr;
use std::task::{Context, Poll};
use std::time::Instant;
use tokio::io::{AsyncRead, ReadBuf};
use tokio_util::io::ReaderStream;

fn write_secret_file(path: &Path, contents: &[u8]) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomUploaderConfig {
    pub id: String,
    #[serde(rename = "Version", default)]
    pub version: Option<String>,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "DestinationType", default = "default_destination_type")]
    pub destination_type: String,
    #[serde(rename = "RequestMethod", alias = "RequestType", default = "default_request_method")]
    pub request_method: String,
    #[serde(rename = "RequestURL")]
    pub request_url: String,
    #[serde(rename = "Headers", default)]
    pub headers: HashMap<String, String>,
    #[serde(rename = "Parameters", default)]
    pub parameters: HashMap<String, String>,
    #[serde(rename = "Arguments", default)]
    pub arguments: HashMap<String, String>,
    #[serde(rename = "Body", default = "default_body_type")]
    pub body: String,
    #[serde(rename = "FileFormName", default = "default_file_form_name")]
    pub file_form_name: String,
    #[serde(rename = "Data", default)]
    pub data: Option<String>,
    #[serde(rename = "URL", default)]
    pub url_pattern: Option<String>,
    #[serde(rename = "ThumbnailURL", default)]
    pub thumbnail_url_pattern: Option<String>,
    #[serde(rename = "DeletionURL", default)]
    pub deletion_url_pattern: Option<String>,
    #[serde(rename = "ErrorMessage", default)]
    pub error_message_pattern: Option<String>,
    #[serde(rename = "Domain", default)]
    pub custom_domain: Option<String>,
}

fn default_destination_type() -> String {
    "ImageUploader".to_string()
}

fn default_request_method() -> String {
    "POST".to_string()
}

fn default_body_type() -> String {
    "MultipartFormData".to_string()
}

fn default_file_form_name() -> String {
    "image".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    pub url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub deletion_url: Option<String>,
    pub error_message: Option<String>,
    pub raw_response: String,
    pub status_code: u16,
    pub duration_ms: u64,
}

pub fn get_uploaders_dir() -> PathBuf {
    let mut dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("sharel");
    dir.push("uploaders");
    fs::create_dir_all(&dir).ok();
    dir
}

pub fn list_custom_uploaders() -> Vec<CustomUploaderConfig> {
    let dir = get_uploaders_dir();
    let mut uploaders = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("sxcu")
                || path.extension().and_then(|s| s.to_str()) == Some("json")
            {
                if path.file_stem().and_then(|s| s.to_str()) == Some("sxcu_freeimage") {
                    let _ = fs::remove_file(&path);
                    continue;
                }
                if let Ok(contents) = fs::read_to_string(&path) {
                    if let Ok(mut config) = serde_json::from_str::<CustomUploaderConfig>(&contents) {
                        if config.id.is_empty() {
                            config.id = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                        }
                        uploaders.push(config);
                    }
                }
            }
        }
    }

    if uploaders.is_empty() {
        let default_uploader = CustomUploaderConfig {
            id: "sxcu_0x0".to_string(),
            version: Some("15.0.0".to_string()),
            name: "0x0 (The Null Pointer)".to_string(),
            destination_type: "ImageUploader".to_string(),
            request_method: "POST".to_string(),
            request_url: "https://0x0.st".to_string(),
            headers: HashMap::new(),
            parameters: HashMap::new(),
            arguments: HashMap::new(),
            body: "MultipartFormData".to_string(),
            file_form_name: "file".to_string(),
            data: None,
            url_pattern: Some("$response$".to_string()),
            thumbnail_url_pattern: None,
            deletion_url_pattern: None,
            error_message_pattern: None,
            custom_domain: None,
        };

        let litterbox_uploader = CustomUploaderConfig {
            id: "sxcu_litterbox".to_string(),
            version: Some("15.0.0".to_string()),
            name: "Litterbox (Catbox)".to_string(),
            destination_type: "ImageUploader".to_string(),
            request_method: "POST".to_string(),
            request_url: "https://litterbox.catbox.moe/resources/internals/api.php".to_string(),
            headers: HashMap::new(),
            parameters: {
                let mut p = HashMap::new();
                p.insert("reqtype".to_string(), "fileupload".to_string());
                p.insert("time".to_string(), "72h".to_string());
                p
            },
            arguments: HashMap::new(),
            body: "MultipartFormData".to_string(),
            file_form_name: "fileToUpload".to_string(),
            data: None,
            url_pattern: Some("$response$".to_string()),
            thumbnail_url_pattern: None,
            deletion_url_pattern: None,
            error_message_pattern: None,
            custom_domain: None,
        };

        save_custom_uploader(&default_uploader).ok();
        save_custom_uploader(&litterbox_uploader).ok();
        uploaders.push(default_uploader);
        uploaders.push(litterbox_uploader);
    }

    uploaders
}

pub fn resolve_active_uploader(active_id: &str) -> Option<CustomUploaderConfig> {
    let uploaders = list_custom_uploaders();
    if !active_id.is_empty() {
        if let Some(uploader) = uploaders.iter().find(|u| u.id == active_id) {
            return Some(uploader.clone());
        }
    }
    uploaders.into_iter().next()
}

pub fn save_custom_uploader(uploader: &CustomUploaderConfig) -> Result<(), String> {
    let dir = get_uploaders_dir();
    let filename = format!("{}.sxcu", uploader.id);
    let path = dir.join(filename);
    let json = serde_json::to_string_pretty(uploader).map_err(|e| e.to_string())?;
    write_secret_file(&path, json.as_bytes())
}

pub fn delete_custom_uploader(id: &str) -> Result<(), String> {
    let dir = get_uploaders_dir();
    let path = dir.join(format!("{}.sxcu", id));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    let json_path = dir.join(format!("{}.json", id));
    if json_path.exists() {
        fs::remove_file(json_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn parse_sxcu_file(file_path: &str) -> Result<CustomUploaderConfig, String> {
    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let mut config: CustomUploaderConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    if config.id.is_empty() {
        let p = Path::new(file_path);
        config.id = p.file_stem().unwrap_or_default().to_string_lossy().to_string();
    }
    Ok(config)
}

fn resolve_json_path(value: &serde_json::Value, path: &str) -> Option<String> {
    let segments: Vec<&str> = path.split('.').collect();
    let mut current = value;

    for segment in segments {
        if segment.contains('[') && segment.ends_with(']') {
            let parts: Vec<&str> = segment.split('[').collect();
            let key = parts[0];
            let idx_str = parts[1].trim_end_matches(']');
            if !key.is_empty() {
                current = current.get(key)?;
            }
            if let Ok(idx) = idx_str.parse::<usize>() {
                current = current.get(idx)?;
            } else {
                return None;
            }
        } else {
            current = current.get(segment)?;
        }
    }

    match current {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Number(n) => Some(n.to_string()),
        serde_json::Value::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

pub fn parse_pattern(
    pattern: &str,
    raw_response: &str,
    json_val: Option<&serde_json::Value>,
    filename: &str,
    headers: &reqwest::header::HeaderMap,
) -> String {
    let mut result = pattern.to_string();

    result = result.replace("$response$", raw_response);
    result = result.replace("$filename$", filename);

    if let Some(json) = json_val {
        let json_re = regex::Regex::new(r"\$json:([^$]+)\$").unwrap();
        result = json_re
            .replace_all(&result, |caps: &regex::Captures| {
                let path = &caps[1];
                resolve_json_path(json, path).unwrap_or_default()
            })
            .to_string();
    }

    let header_re = regex::Regex::new(r"\$header:([^$]+)\$").unwrap();
    result = header_re
        .replace_all(&result, |caps: &regex::Captures| {
            let header_name = &caps[1];
            headers
                .get(header_name)
                .and_then(|v| v.to_str().ok())
                .unwrap_or_default()
                .to_string()
        })
        .to_string();

    let regex_re = regex::Regex::new(r"\$regex:([^$]+)\$").unwrap();
    result = regex_re
        .replace_all(&result, |caps: &regex::Captures| {
            let inner = &caps[1];
            let (pat, group_idx) = if let Some(last_comma) = inner.rfind(',') {
                let pat = &inner[..last_comma];
                let group_str = &inner[last_comma + 1..];
                let idx = group_str.parse::<usize>().unwrap_or(0);
                (pat, idx)
            } else if let Some(last_pipe) = inner.rfind('|') {
                let pat = &inner[..last_pipe];
                let group_str = &inner[last_pipe + 1..];
                let idx = group_str.parse::<usize>().unwrap_or(0);
                (pat, idx)
            } else if let Ok(idx) = inner.parse::<usize>() {
                (r"https?://[^\s<>]+|\S+", idx)
            } else {
                (inner, 0)
            };

            if let Ok(re) = regex::Regex::new(pat) {
                if let Some(captures) = re.captures(raw_response) {
                    return captures.get(group_idx).map(|m| m.as_str()).unwrap_or_default().to_string();
                }
            }
            String::new()
        })
        .to_string();

    result
}

pub fn apply_custom_domain(url: Option<String>, custom_domain: Option<&str>) -> Option<String> {
    let url = url?;
    let Some(domain) = custom_domain else {
        return Some(url);
    };
    let trimmed = domain.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Some(url);
    }

    if let Ok(parsed) = reqwest::Url::parse(&url) {
        if parsed.scheme().starts_with("http") {
            let mut host = match parsed.host_str() {
                Some(h) => h.to_string(),
                None => return Some(url),
            };
            if let Some(port) = parsed.port() {
                host.push_str(&format!(":{}", port));
            }
            if host == trimmed {
                return Some(url);
            }
            let mut mapped = parsed.clone();
            mapped.set_host(Some(trimmed)).ok();
            return Some(mapped.as_str().to_string());
        }
    }

    if let Some(stripped) = url.strip_prefix("https://") {
        return Some(format!("https://{}{}", trimmed, stripped));
    }
    if let Some(stripped) = url.strip_prefix("http://") {
        return Some(format!("http://{}{}", trimmed, stripped));
    }
    Some(url)
}

struct ProgressReader<R> {
    inner: R,
    total: u64,
    sent: u64,
    on_progress: Box<dyn Fn(u64, u64) + Send + Sync>,
}

impl<R: AsyncRead + Unpin> AsyncRead for ProgressReader<R> {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        let before = buf.filled().len();
        let res = Pin::new(&mut self.inner).poll_read(cx, buf);
        if res.is_ready() {
            let after = buf.filled().len();
            self.sent += (after - before) as u64;
            (self.on_progress)(self.sent, self.total);
        }
        res
    }
}

async fn build_progress_body(
    file_path: &str,
    on_progress: impl Fn(u64, u64) + Send + Sync + 'static,
) -> Result<(reqwest::Body, u64), String> {
    let file = tokio::fs::File::open(file_path).await.map_err(|e| e.to_string())?;
    let total = file.metadata().await.map_err(|e| e.to_string())?.len();
    let reader = ProgressReader {
        inner: file,
        total,
        sent: 0,
        on_progress: Box::new(on_progress),
    };
    Ok((reqwest::Body::wrap_stream(ReaderStream::new(reader)), total))
}

pub async fn execute_upload_with_progress(
    uploader: &CustomUploaderConfig,
    file_path: &str,
    on_progress: impl Fn(u64, u64) + Send + Sync + 'static,
) -> Result<UploadResult, String> {
    let start_time = Instant::now();
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let mut url = reqwest::Url::parse(&uploader.request_url).map_err(|e| e.to_string())?;

    for (k, v) in &uploader.parameters {
        url.query_pairs_mut().append_pair(k, v);
    }

    let method = match uploader.request_method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        _ => reqwest::Method::POST,
    };

    let mut req = client.request(method, url);

    let mut header_map = HeaderMap::new();
    for (k, v) in &uploader.headers {
        if let (Ok(name), Ok(val)) = (HeaderName::from_str(k), HeaderValue::from_str(v)) {
            header_map.insert(name, val);
        }
    }
    req = req.headers(header_map);

    let mime_type = match path.extension().and_then(|s| s.to_str()).unwrap_or("") {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "txt" => "text/plain",
        _ => "image/png",
    };

    if uploader.body.eq_ignore_ascii_case("MultipartFormData") {
        let mut form = Form::new();
        for (k, v) in &uploader.arguments {
            form = form.text(k.clone(), v.clone());
        }
        let (body, total) = build_progress_body(file_path, on_progress).await?;
        let part = Part::stream_with_length(body, total)
            .file_name(file_name.clone())
            .mime_str(mime_type)
            .map_err(|e| e.to_string())?;
        form = form.part(uploader.file_form_name.clone(), part);
        req = req.multipart(form);
    } else if uploader.body.eq_ignore_ascii_case("JSON") {
        let file_bytes = tokio::fs::read(file_path).await.map_err(|e| e.to_string())?;
        on_progress(file_bytes.len() as u64, file_bytes.len() as u64);
        let mut map = serde_json::Map::new();
        for (k, v) in &uploader.arguments {
            map.insert(k.clone(), serde_json::Value::String(v.clone()));
        }
        let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &file_bytes);
        map.insert(uploader.file_form_name.clone(), serde_json::Value::String(base64_str));
        req = req.json(&map);
    } else if uploader.body.eq_ignore_ascii_case("Binary") {
        let (body, _) = build_progress_body(file_path, on_progress).await?;
        req = req.body(body);
    } else {
        let file_bytes = tokio::fs::read(file_path).await.map_err(|e| e.to_string())?;
        on_progress(file_bytes.len() as u64, file_bytes.len() as u64);
        let mut params = HashMap::new();
        for (k, v) in &uploader.arguments {
            params.insert(k.clone(), v.clone());
        }
        req = req.form(&params);
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let resp_headers = response.headers().clone();
    let raw_text = response.text().await.unwrap_or_default();
    let duration_ms = start_time.elapsed().as_millis() as u64;

    let json_val: Option<serde_json::Value> = serde_json::from_str(&raw_text).ok();

    let extracted_url = if let Some(pattern) = &uploader.url_pattern {
        let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
        let trimmed = parsed.trim();
        if !trimmed.is_empty() {
            Some(trimmed.to_string())
        } else {
            None
        }
    } else {
        None
    };

    let extracted_thumbnail = if let Some(pattern) = &uploader.thumbnail_url_pattern {
        let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
        let trimmed = parsed.trim();
        if !trimmed.is_empty() {
            Some(trimmed.to_string())
        } else {
            None
        }
    } else {
        None
    };

    let extracted_deletion = if let Some(pattern) = &uploader.deletion_url_pattern {
        let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
        let trimmed = parsed.trim();
        if !trimmed.is_empty() {
            Some(trimmed.to_string())
        } else {
            None
        }
    } else {
        None
    };

    let extracted_error = if status >= 400 {
        if let Some(pattern) = &uploader.error_message_pattern {
            let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
            let trimmed = parsed.trim();
            Some(if trimmed.is_empty() {
                format!("Server returned HTTP status {}", status)
            } else {
                trimmed.to_string()
            })
        } else {
            Some(format!("Server returned HTTP status {}", status))
        }
    } else {
        None
    };

    Ok(UploadResult {
        success: status < 400 && extracted_error.is_none(),
        url: apply_custom_domain(extracted_url, uploader.custom_domain.as_deref()),
        thumbnail_url: apply_custom_domain(extracted_thumbnail, uploader.custom_domain.as_deref()),
        deletion_url: apply_custom_domain(extracted_deletion, uploader.custom_domain.as_deref()),
        error_message: extracted_error,
        raw_response: raw_text,
        status_code: status,
        duration_ms,
    })
}

pub async fn execute_upload(
    uploader: &CustomUploaderConfig,
    file_path: &str,
) -> Result<UploadResult, String> {
    execute_upload_with_progress(uploader, file_path, |_, _| {}).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pattern_regex() {
        let headers = reqwest::header::HeaderMap::new();
        let raw = "File uploaded to: https://example.com/view/abcd123 and thumbnail at https://example.com/thumb/abcd123";
        let pattern = "$regex:https://example.com/view/([a-zA-Z0-9]+),1$";
        let parsed = parse_pattern(pattern, raw, None, "test.png", &headers);
        assert_eq!(parsed, "abcd123");

        let full_match_pattern = "$regex:https://example.com/view/([a-zA-Z0-9]+),0$";
        let full_parsed = parse_pattern(full_match_pattern, raw, None, "test.png", &headers);
        assert_eq!(full_parsed, "https://example.com/view/abcd123");
    }

    #[test]
    fn test_apply_custom_domain_rewrites_host() {
        let mapped = apply_custom_domain(
            Some("https://example.com/view/abcd123".to_string()),
            Some("cdn.example.com"),
        );
        assert_eq!(mapped.as_deref(), Some("https://cdn.example.com/view/abcd123"));
    }

    #[test]
    fn test_apply_custom_domain_preserves_when_disabled() {
        let original = Some("https://example.com/view/abcd123".to_string());
        let mapped = apply_custom_domain(original.clone(), None);
        assert_eq!(mapped, original);
    }

    #[test]
    fn test_apply_custom_domain_strips_trailing_sllash() {
        let mapped = apply_custom_domain(
            Some("https://example.com/view/abcd123".to_string()),
            Some("cdn.example.com/"),
        );
        assert_eq!(mapped.as_deref(), Some("https://cdn.example.com/view/abcd123"));
    }

    #[test]
    fn test_apply_custom_domain_passthrough_non_http() {
        let original = Some("file:///tmp/image.png".to_string());
        let mapped = apply_custom_domain(original.clone(), Some("cdn.example.com"));
        assert_eq!(mapped, original);
    }
}
