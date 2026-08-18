use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::Instant;

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

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("sxcu")
                || path.extension().and_then(|s| s.to_str()) == Some("json")
            {
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
            id: "sxcu_freeimage".to_string(),
            version: Some("15.0.0".to_string()),
            name: "Freeimage Host".to_string(),
            destination_type: "ImageUploader".to_string(),
            request_method: "POST".to_string(),
            request_url: "https://freeimage.host/api/1/upload".to_string(),
            headers: HashMap::new(),
            parameters: {
                let mut p = HashMap::new();
                p.insert("key".to_string(), "6d207e02198a847aa98d0a2a901485a5".to_string());
                p.insert("action".to_string(), "upload".to_string());
                p.insert("format".to_string(), "json".to_string());
                p
            },
            arguments: HashMap::new(),
            body: "MultipartFormData".to_string(),
            file_form_name: "source".to_string(),
            data: None,
            url_pattern: Some("$json:image.url$".to_string()),
            thumbnail_url_pattern: Some("$json:image.thumb.url$".to_string()),
            deletion_url_pattern: Some("$json:image.url_viewer$".to_string()),
            error_message_pattern: Some("$json:error.message$".to_string()),
        };
        save_custom_uploader(&default_uploader).ok();
        uploaders.push(default_uploader);
    }

    uploaders
}

pub fn save_custom_uploader(uploader: &CustomUploaderConfig) -> Result<(), String> {
    let dir = get_uploaders_dir();
    let filename = format!("{}.sxcu", uploader.id);
    let path = dir.join(filename);
    let json = serde_json::to_string_pretty(uploader).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
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
            let group_num = &caps[1];
            if let Ok(idx) = group_num.parse::<usize>() {
                if let Ok(re) = regex::Regex::new(r"https?://[^\s<>]+|\S+") {
                    if let Some(captures) = re.captures(raw_response) {
                        return captures.get(idx).map(|m| m.as_str()).unwrap_or_default().to_string();
                    }
                }
            }
            raw_response.to_string()
        })
        .to_string();

    result
}

pub async fn execute_upload(
    uploader: &CustomUploaderConfig,
    file_path: &str,
) -> Result<UploadResult, String> {
    let start_time = Instant::now();
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let file_bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
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
        let part = Part::bytes(file_bytes)
            .file_name(file_name.clone())
            .mime_str(mime_type)
            .map_err(|e| e.to_string())?;
        form = form.part(uploader.file_form_name.clone(), part);
        req = req.multipart(form);
    } else if uploader.body.eq_ignore_ascii_case("JSON") {
        let mut map = serde_json::Map::new();
        for (k, v) in &uploader.arguments {
            map.insert(k.clone(), serde_json::Value::String(v.clone()));
        }
        let base64_str = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &file_bytes);
        map.insert(uploader.file_form_name.clone(), serde_json::Value::String(base64_str));
        req = req.json(&map);
    } else if uploader.body.eq_ignore_ascii_case("Binary") {
        req = req.body(file_bytes);
    } else {
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
        if !parsed.is_empty() {
            Some(parsed)
        } else {
            None
        }
    } else {
        None
    };

    let extracted_thumbnail = if let Some(pattern) = &uploader.thumbnail_url_pattern {
        let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
        if !parsed.is_empty() {
            Some(parsed)
        } else {
            None
        }
    } else {
        None
    };

    let extracted_deletion = if let Some(pattern) = &uploader.deletion_url_pattern {
        let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
        if !parsed.is_empty() {
            Some(parsed)
        } else {
            None
        }
    } else {
        None
    };

    let extracted_error = if status >= 400 {
        if let Some(pattern) = &uploader.error_message_pattern {
            let parsed = parse_pattern(pattern, &raw_text, json_val.as_ref(), &file_name, &resp_headers);
            Some(parsed)
        } else {
            Some(format!("Server returned HTTP status {}", status))
        }
    } else {
        None
    };

    Ok(UploadResult {
        success: status < 400 && extracted_error.is_none(),
        url: extracted_url,
        thumbnail_url: extracted_thumbnail,
        deletion_url: extracted_deletion,
        error_message: extracted_error,
        raw_response: raw_text,
        status_code: status,
        duration_ms,
    })
}
