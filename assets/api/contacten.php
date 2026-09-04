<?php
declare(strict_types=1);

// -------------------------
// CONFIG
// -------------------------
$TO = 'info@bpd.lv';
$FROM = 'no-reply@bpd.lv'; // domēna adrese, lai SPF/DKIM ir sakarā
$SUBJECT_PREFIX = 'BPD Contact';

// -------------------------
// Helpers
// -------------------------
function json_out(int $code, array $data): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function clean(string $s, int $max = 5000): string {
  $s = trim($s);
  $s = str_replace(["\r\n", "\r"], "\n", $s);
  // prevent header injection
  $s = preg_replace("/[\r\n]+/", "\n", $s);
  if (mb_strlen($s) > $max) $s = mb_substr($s, 0, $max);
  return $s;
}

function is_valid_email(string $email): bool {
  return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

// -------------------------
// Basic hardening
// -------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// Honeypot (bots fill it)
$hp = $_POST['website'] ?? '';
if (is_string($hp) && trim($hp) !== '') {
  // pretend success to avoid bot adaptation
  json_out(200, ['ok' => true]);
}

// Simple rate limit by IP (file-based; good enough for launch)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ipKey = preg_replace('/[^0-9a-fA-F:\.]/', '_', $ip);
$rlFile = sys_get_temp_dir() . "/bpd_rl_" . $ipKey;
$now = time();
$window = 60;      // seconds
$maxReq = 6;       // per window

$hits = [];
if (file_exists($rlFile)) {
  $raw = @file_get_contents($rlFile);
  $hits = $raw ? json_decode($raw, true) : [];
  if (!is_array($hits)) $hits = [];
}
$hits = array_values(array_filter($hits, fn($t) => is_int($t) && ($now - $t) < $window));
if (count($hits) >= $maxReq) {
  json_out(429, ['ok' => false, 'error' => 'Too many requests']);
}
$hits[] = $now;
@file_put_contents($rlFile, json_encode($hits));

// -------------------------
// Read + validate fields
// -------------------------
$name = clean((string)($_POST['name'] ?? ''), 200);
$email = clean((string)($_POST['email'] ?? ''), 200);
$brief = clean((string)($_POST['brief'] ?? ''), 5000);
$clientType = clean((string)($_POST['client_type'] ?? ''), 50);

if ($name === '' || $email === '' || $brief === '') {
  json_out(400, ['ok' => false, 'error' => 'Missing fields']);
}
if (!is_valid_email($email)) {
  json_out(400, ['ok' => false, 'error' => 'Invalid email']);
}
if ($clientType === '') $clientType = 'unspecified';

// -------------------------
// Compose email
// -------------------------
$subject = $SUBJECT_PREFIX . " (" . $clientType . ") — " . $name;

$body =
"Name/Company: {$name}\n" .
"Email: {$email}\n" .
"Client type: {$clientType}\n" .
"IP: {$ip}\n\n" .
"Task / brief:\n{$brief}\n";

// Headers
$headers = [];
$headers[] = "From: BPD Website <{$FROM}>";
$headers[] = "Reply-To: {$email}";
$headers[] = "Content-Type: text/plain; charset=UTF-8";
$headers[] = "X-Website: bpd.lv";

// Send (uses server MTA / sendmail)
$ok = @mail($TO, $subject, $body, implode("\r\n", $headers));

if (!$ok) {
  json_out(500, ['ok' => false, 'error' => 'Mail failed']);
}

json_out(200, ['ok' => true]);