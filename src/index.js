const BRANCHES = ["النحو", "الصرف", "البلاغة", "الأدب", "النصوص", "المطالعة", "الإنشاء"];
const GRADES = [
  "الأول الثانوي الأزهري",
  "الثاني الثانوي الأزهري",
  "الثالث الثانوي الأزهري"
];
const TRACKS = ["علمي", "أدبي"];
const TEACHER_MAIN_PHOTO = "https://www.mohammedyoussef2027.com/public/heroPhotos/teacher-photo.png";

async function sha256(val) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(val || "")));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeToken(payload, secret) {
  const body = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `${body}.${String(secret || "jakh-secret").slice(0, 16)}`;
}

function parseToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (sig !== String(secret || "jakh-secret").slice(0, 16)) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(body))));
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const cookie = req.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookieHeader(name, value, maxAge = 60 * 60 * 24 * 14) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearCookieHeader(name) {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function htmlRes(html, status = 200, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...extraHeaders }
  });
}

function redirectRes(location, extraHeaders = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, ...extraHeaders }
  });
}

function fsBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function toFsVal(v) {
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsVal) } };
  if (v && typeof v === "object") {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFsVal(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v ?? "") };
}

function fromFsVal(fv) {
  if (!fv) return null;
  if ("stringValue" in fv) return fv.stringValue;
  if ("integerValue" in fv) return Number(fv.integerValue);
  if ("doubleValue" in fv) return Number(fv.doubleValue);
  if ("booleanValue" in fv) return fv.booleanValue;
  if ("arrayValue" in fv) return (fv.arrayValue.values || []).map(fromFsVal);
  if ("mapValue" in fv) {
    const o = {};
    for (const [k, val] of Object.entries(fv.mapValue.fields || {})) o[k] = fromFsVal(val);
    return o;
  }
  return null;
}

function docToObj(doc) {
  const id = doc.name.split("/").pop();
  const o = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) o[k] = fromFsVal(v);
  return o;
}

async function fsList(env, col) {
  const res = await fetch(`${fsBase(env)}/${col}?key=${env.FIREBASE_API_KEY}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(docToObj);
}

async function fsGet(env, col, id) {
  const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}?key=${env.FIREBASE_API_KEY}`);
  if (!res.ok) return null;
  return docToObj(await res.json());
}

async function fsSet(env, col, id, obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== "id") fields[k] = toFsVal(v);
  }
  const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}?key=${env.FIREBASE_API_KEY}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return res.ok;
}

async function fsDelete(env, col, id) {
  const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}?key=${env.FIREBASE_API_KEY}`, {
    method: "DELETE"
  });
  return res.ok;
}

async function getSettings(env) {
  const saved = (await fsGet(env, "settings", "main")) || {};
  return {
    vodafone_number: saved.vodafone_number || "01066329782",
    admin_whatsapp: saved.admin_whatsapp || "201066329782",
    admin_email: env.ADMIN_EMAIL || saved.admin_email || "mohmed@mr.com",
    admin_password_hash: saved.admin_password_hash || (await sha256(env.ADMIN_PASSWORD || "admin123456")),
    global_notice: saved.global_notice || "",
    teacher_image: saved.teacher_image || TEACHER_MAIN_PHOTO
  };
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractYoutubeId(url) {
  if (!url) return "";
  const m = String(url).trim().match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

function renderLayout(title, settings, student, isAdmin, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | نور البيان — أ. محمد يوسف</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
  <style>
    :root {
      --bg: #f3efe9;
      --card: #fcfaf7;
      --card2: #ebe4d8;
      --txt: #1b222c;
      --muted: #5b4d3f;
      --pri: #1e4e8c;
      --olive: #55662d;
      --olive-soft: rgba(85, 102, 45, 0.15);
      --brown: #6b4423;
      --brown-soft: rgba(107, 68, 35, 0.14);
      --gold: #7c4d25;
      --err: #b91c1c;
      --bdr: #d5c9b8;
      --glyph: rgba(85, 102, 45, 0.085);
      --shadow: 0 10px 26px rgba(58, 39, 22, 0.09);
    }
    body.dark {
      --bg: #0b0e13;
      --card: #131820;
      --card2: #1c222b;
      --txt: #f3efe9;
      --muted: #b8a896;
      --pri: #3b76c4;
      --olive: #879c49;
      --olive-soft: rgba(135, 156, 73, 0.18);
      --brown: #9c683b;
      --brown-soft: rgba(156, 104, 59, 0.18);
      --gold: #c28b52;
      --err: #f87171;
      --bdr: #2d2924;
      --glyph: rgba(156, 104, 59, 0.11);
      --shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body {
      background: var(--bg);
      color: var(--txt);
      min-height: 100vh;
      line-height: 1.65;
      position: relative;
      overflow-x: hidden;
    }
    .admin-edge-bar {
      max-width: 1240px;
      margin: 8px auto 0;
      padding: 0 14px;
      display: flex;
      justify-content: flex-start;
    }
    .admin-edge-btn {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 800;
      border-radius: 7px;
      text-decoration: none;
      background: var(--card);
      color: var(--brown);
      border: 1px solid var(--bdr);
    }
    .admin-edge-btn:hover {
      background: var(--card2);
      color: var(--txt);
    }
    .inline-dua-banner {
      max-width: 1240px;
      margin: 10px auto 0;
      padding: 12px 18px;
      border-radius: 16px;
      background: linear-gradient(120deg, rgba(30, 78, 140, 0.94), rgba(85, 102, 45, 0.92), rgba(107, 68, 35, 0.94));
      color: #f8fafc;
      border: 1px solid rgba(156, 104, 59, 0.55);
      box-shadow: var(--shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      transition: max-height 0.45s ease, opacity 0.45s ease, margin 0.45s ease, padding 0.45s ease;
      max-height: 160px;
      opacity: 1;
      overflow: hidden;
    }
    .inline-dua-banner.dua-done {
      max-height: 0; opacity: 0; margin-top: 0; padding-top: 0; padding-bottom: 0; border-width: 0; pointer-events: none;
    }
    .inline-dua-left { display: flex; align-items: center; gap: 12px; }
    .inline-dua-avatar {
      width: 56px; height: 68px; border-radius: 12px;
      object-fit: contain; object-position: center top;
      background: rgba(27, 34, 44, 0.45);
      border: 2px solid #879c49; flex-shrink: 0;
    }
    .inline-dua-text { font-weight: 900; font-size: 1.05rem; }
    .inline-dua-sub { font-size: 0.78rem; opacity: 0.88; }
    #arabicBg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
    .ar-glyph {
      position: absolute; font-weight: 900; color: var(--glyph); user-select: none;
      will-change: transform;
      animation: letterDrift var(--dur, 28s) ease-in-out var(--delay, 0s) infinite alternate;
    }
    @keyframes letterDrift {
      0% { transform: translate(0px, 0px) rotate(-3deg); }
      50% { transform: translate(var(--dx, 8px), var(--dy, -10px)) rotate(3deg); }
      100% { transform: translate(calc(var(--dx, 8px) * -0.6), var(--dy, -10px)) rotate(-4deg); }
    }
    .page-layer { position: relative; z-index: 1; }
    .topbar {
      background: var(--card); border-bottom: 1px solid var(--bdr);
      padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;
      gap: 12px; flex-wrap: wrap; position: sticky; top: 0; z-index: 20;
    }
    .brand-box { display: flex; align-items: center; gap: 10px; }
    .brand-logo-badge {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, var(--pri), var(--olive), var(--brown));
      color: #fff; font-weight: 900; display: grid; place-items: center; font-size: 1rem;
    }
    .theme-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 999px; border: 1px solid var(--bdr); background: var(--card2);
      color: var(--txt); font-weight: 800; cursor: pointer; font-size: 0.84rem;
    }
    .global-alert {
      max-width: 1240px; margin: 12px auto 0; background: var(--brown-soft);
      border: 1px solid var(--brown); color: var(--brown);
      border-radius: 12px; padding: 10px 16px; font-weight: 800;
    }
    .card {
      background: var(--card); border: 1px solid var(--bdr); border-radius: 16px;
      padding: 20px; box-shadow: var(--shadow); margin-bottom: 16px;
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px 16px; border-radius: 10px; border: none; font-weight: 800;
      cursor: pointer; text-decoration: none; font-size: 0.9rem;
    }
    .btn-blue { background: var(--pri); color: #fff; }
    .btn-olive { background: var(--olive); color: #fff; }
    .btn-brown { background: var(--brown); color: #fff; }
    .btn-red { background: var(--err); color: #fff; }
    .btn-out { background: transparent; color: var(--txt); border: 1px solid var(--bdr); }
    .btn-sm { padding: 6px 12px; font-size: 0.82rem; border-radius: 8px; }
    .field { margin-bottom: 12px; }
    label { display: block; font-weight: 700; margin-bottom: 5px; font-size: 0.9rem; }
    input, select, textarea {
      width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--bdr);
      background: var(--card2); color: var(--txt); font-size: 0.93rem; outline: none;
    }
    textarea { min-height: 84px; resize: vertical; }
    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
    .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
    .row {
      background: var(--card2); border: 1px solid var(--bdr); border-radius: 12px;
      padding: 12px 14px; margin-top: 10px; display: flex; justify-content: space-between;
      align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }
    .pill-ok { background: var(--olive-soft); color: var(--olive); }
    .pill-warn { background: var(--brown-soft); color: var(--brown); }
    .msg-err {
      background: rgba(185, 28, 28, 0.12); border: 1px solid rgba(185, 28, 28, 0.35);
      color: var(--err); padding: 10px 14px; border-radius: 10px; font-weight: 800; margin-bottom: 12px;
    }
    .msg-ok {
      background: var(--olive-soft); border: 1px solid var(--olive);
      color: var(--olive); padding: 10px 14px; border-radius: 10px; font-weight: 800; margin-bottom: 12px;
    }
    .muted { color: var(--muted); }
    .dash-shell {
      max-width: 1240px; margin: 18px auto; padding: 0 14px 40px;
      display: grid; grid-template-columns: 1fr 255px; gap: 18px; align-items: start;
    }
    .dash-shell.collapsed { grid-template-columns: 1fr 74px; }
    @media (max-width: 880px) { .dash-shell, .dash-shell.collapsed { grid-template-columns: 1fr; } }
    .right-drawer {
      background: var(--card); border: 1px solid var(--bdr); border-radius: 16px;
      padding: 14px 10px; box-shadow: var(--shadow); position: sticky; top: 68px;
    }
    .drawer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px; }
    .collapse-btn {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: var(--pri); color: #fff; font-weight: 900; cursor: pointer;
    }
    .nav-item-link {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: right;
      padding: 10px 12px; border-radius: 10px; border: none; background: transparent;
      color: var(--txt); font-weight: 800; text-decoration: none; cursor: pointer;
      font-size: 0.9rem; margin-bottom: 4px;
    }
    .nav-item-link.active { background: var(--pri); color: #fff; }
    .sub-nav { padding-right: 16px; margin-bottom: 6px; }
    .sub-link {
      display: block; padding: 6px 10px; border-radius: 8px; color: var(--muted);
      text-decoration: none; font-weight: 700; font-size: 0.84rem; margin-bottom: 2px;
    }
    .sub-link.active, .sub-link:hover { background: var(--olive-soft); color: var(--olive); }
    .dash-shell.collapsed .nav-label, .dash-shell.collapsed .sub-nav, .dash-shell.collapsed .drawer-title { display: none; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .kpi-card {
      background: linear-gradient(135deg, var(--pri) 0%, #112642 100%);
      color: #fff; border-radius: 14px; padding: 18px;
      display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow);
    }
    .kpi-card.olive-kpi { background: linear-gradient(135deg, var(--olive) 0%, #242d12 100%); }
    .kpi-card.brown-kpi { background: linear-gradient(135deg, var(--brown) 0%, #2e1b0d 100%); }
    .kpi-num { font-size: 1.6rem; font-weight: 900; line-height: 1.1; }
    .kpi-lbl { font-size: 0.88rem; font-weight: 700; opacity: 0.95; margin-top: 4px; }
    .kpi-icon-box {
      width: 44px; height: 44px; border-radius: 12px; background: rgba(255, 255, 255, 0.18);
      display: grid; place-items: center; font-size: 1.2rem; font-weight: 900;
    }
    .progress-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 820px) { .progress-layout { grid-template-columns: 1fr; } }
    .progress-frame { background: var(--card); border: 2px solid var(--olive); border-radius: 16px; padding: 18px; text-align: center; }
    .teacher-color-meter {
      position: relative; width: 144px; height: 185px; margin: 8px auto 10px;
      border-radius: 16px; overflow: hidden; border: 2px solid var(--bdr); background: var(--card2);
    }
    .teacher-color-meter img {
      width: 100%; height: 100%; object-fit: contain; object-position: center top; display: block;
    }
    .teacher-color-meter .bw-layer { filter: grayscale(100%) contrast(1.08); }
    .teacher-color-meter .color-reveal { position: absolute; inset: 0; overflow: hidden; transition: clip-path 0.5s ease; }
    .prog-bar-bg { height: 8px; border-radius: 999px; background: var(--card2); border: 1px solid var(--bdr); overflow: hidden; margin: 10px 0; }
    .prog-bar-fill { height: 100%; background: var(--olive); border-radius: 999px; transition: width 0.4s ease; }
    .course-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(265px, 1fr)); gap: 16px; }
    .course-card {
      background: var(--card); border: 1px solid var(--bdr); border-radius: 16px;
      overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow);
    }
    .branch-hero-banner {
      background: linear-gradient(135deg, var(--brown) 0%, var(--pri) 58%, var(--olive) 100%);
      color: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px;
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .branch-book-card {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 10px 14px; border-radius: 14px;
    }
    .branch-book-card img {
      width: 74px; height: 96px; object-fit: contain; object-position: center top;
      background: rgba(27, 34, 44, 0.45); border-radius: 10px; border: 2px solid #fff;
    }
    .course-banner {
      min-height: 158px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, var(--pri), var(--olive), var(--brown));
      color: #fff; padding: 14px; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
    }
    .course-banner img.book-thumb {
      width: 76px; height: 100px; object-fit: contain; object-position: center top;
      background: rgba(27, 34, 44, 0.45); border-radius: 10px; border: 2px solid rgba(255, 255, 255, 0.75); flex-shrink: 0;
    }
    .course-body { padding: 14px; }
    .course-title { font-weight: 900; font-size: 1rem; margin-bottom: 8px; }
    .split-auth {
      max-width: 1060px; margin: 18px auto; padding: 0 14px;
      display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px; align-items: stretch;
    }
    @media (max-width: 840px) { .split-auth { grid-template-columns: 1fr; } }
    .promo-pane {
      background: linear-gradient(160deg, var(--pri) 0%, var(--olive) 62%, var(--brown) 100%);
      color: #fff; border-radius: 20px; padding: 26px;
      display: flex; flex-direction: column; justify-content: space-between; min-height: 460px;
    }
    .promo-pane.olive-mode { background: linear-gradient(160deg, var(--brown) 0%, var(--olive) 65%, var(--pri) 100%); }
    .promo-img {
      width: 225px; height: 280px; object-fit: contain; object-position: center top;
      background: rgba(27, 34, 44, 0.35);
      border-radius: 16px; border: 2px solid rgba(255, 255, 255, 0.4); margin: 14px auto 0; display: block;
    }
    .step-track { height: 5px; background: var(--card2); border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
    .step-fill { height: 100%; background: var(--olive); }
    .secure-player-box {
      position: relative; width: 100%; max-width: 820px; margin: 12px auto 0;
      border-radius: 14px; overflow: hidden; background: #000; border: 1px solid var(--bdr); user-select: none;
    }
    .secure-player-box video, .secure-player-box iframe { width: 100%; display: block; height: 440px; max-height: 70vw; border: none; }
    .watermark-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
    .watermark-tag {
      position: absolute; color: rgba(255, 255, 255, 0.28); font-size: 0.84rem;
      font-weight: 800; transform: rotate(-15deg); white-space: nowrap;
      animation: wmDrift 12s infinite alternate ease-in-out;
    }
    @keyframes wmDrift {
      0% { top: 14%; right: 8%; }
      50% { top: 46%; right: 32%; }
      100% { top: 72%; right: 12%; }
    }
    body.privacy-blur .secure-player-box video, body.privacy-blur .secure-player-box iframe { filter: blur(18px); }
    .ticket-img-thumb { max-width: 260px; max-height: 220px; object-fit: contain; border-radius: 10px; border: 1px solid var(--bdr); margin-top: 8px; display: block; }
    .branch-toggle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 10px 0; }
    .branch-check-pill {
      display: flex; align-items: center; gap: 6px; padding: 7px 10px;
      border-radius: 10px; background: var(--card); border: 1px solid var(--bdr);
      font-size: 0.84rem; font-weight: 800; cursor: pointer;
    }
    .branch-check-pill input { width: auto; }
  </style>
</head>
<body>
  <div id="arabicBg" aria-hidden="true"></div>
  <div class="page-layer">
    <div class="admin-edge-bar">
      <a class="admin-edge-btn" href="/admin">أدمن</a>
    </div>
    <header class="topbar">
      <div class="brand-box">
        <div class="brand-logo-badge">جخ</div>
        <div>
          <div style="font-weight:900; font-size:1.05rem; color:var(--pri);">نور البيان — أ. محمد يوسف</div>
          <div class="muted" style="font-size:0.78rem; font-weight:700;">اللغة العربية للثانوية الأزهرية (خبرة 20 عاماً)</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button type="button" class="theme-pill" id="themeToggle">☀️ نهار / 🌙 ليل</button>
        <a class="btn btn-out btn-sm" href="/">الرئيسية</a>
        <a class="btn btn-out btn-sm" href="/student">بوابة الطالب</a>
        ${(student || isAdmin) ? `<a class="btn btn-red btn-sm" href="/logout">خروج</a>` : ""}
      </div>
    </header>
    <div class="inline-dua-banner dua-done" id="inlineDuaBanner">
      <div class="inline-dua-left">
        <img class="inline-dua-avatar" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
        <div>
          <div class="inline-dua-text">اللهم فهمني كما فهمت داوود وسليمان</div>
          <div class="inline-dua-sub">دعاء البداية • الأستاذ محمد يوسف — مدرس أول اللغة العربية الأزهرية</div>
        </div>
      </div>
      <button type="button" class="btn btn-out btn-sm" style="color:#fff; border-color:rgba(255,255,255,0.35);" id="hideDuaBtn">إخفاء</button>
    </div>
    ${settings.global_notice ? `<div class="global-alert">📢 تنبيه الإدارة: ${esc(settings.global_notice)}</div>` : ""}
    ${bodyHtml}
  </div>
  <script>
    if (localStorage.getItem("nb_py_theme") === "dark") document.body.classList.add("dark");
    document.getElementById("themeToggle").addEventListener("click", function () {
      const dark = document.body.classList.toggle("dark");
      localStorage.setItem("nb_py_theme", dark ? "dark" : "light");
    });
    (function setupDuaOnOpenOrRefresh() {
      const banner = document.getElementById("inlineDuaBanner");
      if (!banner) return;
      const navEntries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
      const navType = navEntries && navEntries.length > 0 ? navEntries[0].type : "navigate";
      const alreadyShownInSession = sessionStorage.getItem("nb_dua_shown") === "1";
      const isRefresh = navType === "reload";
      function hideBanner() { banner.classList.add("dua-done"); }
      if (!alreadyShownInSession || isRefresh) {
        sessionStorage.setItem("nb_dua_shown", "1");
        banner.classList.remove("dua-done");
        const timer = setTimeout(hideBanner, 4000);
        document.getElementById("hideDuaBtn")?.addEventListener("click", function () {
          clearTimeout(timer);
          hideBanner();
        });
      }
    })();
    (function renderAnimatedArabicLetters() {
      const container = document.getElementById("arabicBg");
      const letters = "أبجدهوزحطيكلمنسعفصقرشتثخذضظغى".split("");
      const sides = ["right", "left"];
      for (let i = 0; i < 38; i++) {
        const span = document.createElement("span");
        span.className = "ar-glyph";
        span.textContent = letters[i % letters.length];
        const side = sides[i % 2];
        const horiz = 2 + ((i * 17) % 21);
        const vert = 3 + ((i * 13) % 90);
        const size = 24 + ((i * 7) % 28);
        const dur = 26 + ((i * 3) % 9);
        const delay = -((i * 2.4) % 12);
        const dx = (i % 2 === 0 ? 1 : -1) * (6 + (i % 7));
        const dy = (i % 3 === 0 ? -1 : 1) * (7 + (i % 8));
        span.style[side] = horiz + "%";
        span.style.top = vert + "%";
        span.style.fontSize = size + "px";
        span.style.setProperty("--dur", dur + "s");
        span.style.setProperty("--delay", delay + "s");
        span.style.setProperty("--dx", dx + "px");
        span.style.setProperty("--dy", dy + "px");
        container.appendChild(span);
      }
    })();
    document.addEventListener("contextmenu", function (e) {
      if (e.target.closest(".secure-player-box")) e.preventDefault();
    });
    document.addEventListener("keydown", function (e) {
      if (
        (e.ctrlKey && ["s", "u", "p"].includes(e.key.toLowerCase())) ||
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))
      ) {
        if (e.key === "PrintScreen") {
          document.body.classList.add("privacy-blur");
          setTimeout(() => document.body.classList.remove("privacy-blur"), 2500);
        }
        if (document.querySelector(".secure-player-box")) e.preventDefault();
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        document.querySelectorAll(".secure-player-box video").forEach((v) => v.pause());
      }
    });
  </script>
</body>
</html>`;
}

function renderLanding(settings) {
  return `
<div class="split-auth">
  <div class="promo-pane">
    <div>
      <span class="pill" style="background:rgba(255,255,255,0.2); color:#fff;">خبرة 20 عاماً في المنهج الأزهري</span>
      <h1 style="font-size:1.7rem; font-weight:900; margin-top:12px;">الأستاذ محمد يوسف</h1>
      <p style="margin-top:8px; font-size:0.95rem; opacity:0.95;">
        مدرس أول اللغة العربية للثانوية الأزهرية (الأول، الثاني، والثالث الثانوي — علمي وأدبي). شرح الفروع السبعة، تفعيل كل فرع بشكل مستقل، أكواد سنتر لمرة واحدة، واجبات إلكترونية، وامتحانات شاملة.
      </p>
    </div>
    <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
  </div>
  <div class="card" style="display:flex; flex-direction:column; justify-content:center; margin-bottom:0;">
    <h2 style="font-size:1.45rem; font-weight:900; margin-bottom:8px;">أهلاً بك في منصة نور البيان ✦ ۝ جخ ۝ ✦</h2>
    <p class="muted" style="margin-bottom:20px;">اختر إنشاء حساب جديد للانضمام، أو سجل دخولك لحسابك الحالي لمتابعة فروع اللغة العربية.</p>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <a class="btn btn-olive" style="flex:1; min-width:170px;" href="/student?tab=register&step=1">ابدأ معنا الآن</a>
      <a class="btn btn-blue" style="flex:1; min-width:170px;" href="/student?tab=login">تسجيل الدخول</a>
    </div>
  </div>
</div>`;
}

function renderStudentAuth(settings, authTab, step, draft, error, notice) {
  const gradeOpts = GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  const trackOpts = TRACKS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");

  if (authTab === "login") {
    return `
    <div class="split-auth">
      <div class="promo-pane">
        <div>
          <h2 style="font-size:1.35rem; font-weight:900;">انضم الآن لمجتمع طلاب الثانوية الأزهرية</h2>
          <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">تعلم اللغة العربية وفروعها السبعة بأسلوب منظم مع أ. محمد يوسف.</p>
        </div>
        <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
      </div>
      <div class="card" style="margin-bottom:0;">
        <h2 style="text-align:center; font-weight:900; margin-bottom:6px;">أهلاً تاني! جاهز للمذاكرة؟</h2>
        <p class="muted" style="text-align:center; font-size:0.88rem; margin-bottom:14px;">ادخل على حسابك برقم الهاتف وكلمة السر، أو أدخل كود السنتر لفتح المنصة فوراً.</p>
        <div style="display:flex; gap:8px; justify-content:center; margin-bottom:16px; border-bottom:1px solid var(--bdr); padding-bottom:10px; flex-wrap:wrap;">
          <a class="btn btn-blue btn-sm" href="/student?tab=login">تسجيل الدخول برقم الهاتف</a>
          <a class="btn btn-olive btn-sm" href="/student?tab=center">دخول بكود السنتر</a>
          <a class="btn btn-out btn-sm" href="/student?tab=register&step=1">إنشاء حساب جديد</a>
        </div>
        ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
        ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
        <form method="post" action="/student/login">
          <div class="field"><label>رقم الهاتف</label><input name="phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
          <div class="field"><label>كلمة السر</label><input name="password" type="password" required placeholder="••••••••" /></div>
          <div style="margin-bottom:14px;"><a href="/student?tab=forgot" style="font-size:0.86rem; font-weight:800; color:var(--pri);">هل نسيت كلمة السر؟ اضغط هنا</a></div>
          <button type="submit" class="btn btn-blue" style="width:100%;">تسجيل الدخول</button>
        </form>
      </div>
    </div>`;
  }

  if (authTab === "center") {
    return `
    <div class="split-auth">
      <div class="promo-pane olive-mode">
        <div>
          <h2 style="font-size:1.35rem; font-weight:900;">دخول طلاب السنتر بكود التفعيل</h2>
          <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">أدخل بياناتك وكود السنتر المخصص لمرة واحدة ليتم فتح المنصة لك مباشرة.</p>
        </div>
        <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
      </div>
      <div class="card" style="margin-bottom:0;">
        <h2 style="font-weight:900; margin-bottom:8px;">تفعيل المنصة بكود السنتر</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">يُستخدم كود السنتر مرة واحدة فقط لفتح المنصة على حسابك.</p>
        ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
        ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
        <form method="post" action="/student/center-login">
          <div class="field"><label>كود السنتر (لمرة واحدة) *</label><input name="center_code" type="text" required placeholder="مثال: CTR-XXXXXX" /></div>
          <div class="field"><label>اسم الطالب *</label><input name="name" type="text" required placeholder="الاسم الثلاثي" /></div>
          <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
          <div class="grid2">
            <div class="field"><label>الصف الدراسي *</label><select name="grade">${gradeOpts}</select></div>
            <div class="field"><label>الشعبة *</label><select name="track">${trackOpts}</select></div>
          </div>
          <button type="submit" class="btn btn-olive" style="width:100%;">فتح المنصة بكود السنتر</button>
        </form>
        <div style="margin-top:14px; text-align:center; font-size:0.86rem;">
          <a href="/student?tab=login" style="color:var(--pri); font-weight:800;">العودة لتسجيل الدخول العادي</a>
        </div>
      </div>
    </div>`;
  }

  if (authTab === "forgot") {
    return `
    <div class="card" style="max-width:520px; margin:24px auto;">
      <h2 style="font-weight:900; margin-bottom:8px;">استعادة كلمة السر</h2>
      <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">أدخل رقم هاتف الطالب ورقم هاتف ولي الأمر لتعيين كلمة سر جديدة.</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
      <form method="post" action="/student/reset-password">
        <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
        <div class="field"><label>رقم هاتف ولي الأمر *</label><input name="parent_phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
        <div class="field"><label>كلمة السر الجديدة *</label><input name="new_password" type="password" required minlength="4" /></div>
        <button type="submit" class="btn btn-olive" style="width:100%;">تعيين كلمة السر الجديدة</button>
      </form>
      <div style="margin-top:12px; text-align:center;"><a href="/student?tab=login" style="font-weight:800; color:var(--pri); font-size:0.88rem;">العودة لتسجيل الدخول</a></div>
    </div>`;
  }

  const isStep2 = step === 2;
  const fullName = `${draft.first_name || ""} ${draft.second_name || ""} ${draft.third_name || ""}`.trim();
  return `
  <div class="split-auth">
    <div class="promo-pane olive-mode">
      <div>
        <h2 style="font-size:1.35rem; font-weight:900;">طلب إنشاء حساب طالب جديد</h2>
        <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">أدخل بياناتك بدقة وسيتم ربطك بمنهج صفك وشعبتك تلقائياً.</p>
      </div>
      <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
    </div>
    <div class="card" style="margin-bottom:0;">
      <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:800; color:var(--olive);">
        <span>الخطوة ${isStep2 ? "الثانية" : "الأولى"}</span>
        <span>${isStep2 ? "70%" : "35%"}</span>
      </div>
      <div class="step-track"><div class="step-fill" style="width:${isStep2 ? "70%" : "35%"};"></div></div>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${!isStep2 ? `
        <form method="get" action="/student">
          <input type="hidden" name="tab" value="register" />
          <input type="hidden" name="step" value="2" />
          <div class="grid2">
            <div class="field"><label>الاسم الأول *</label><input name="first_name" type="text" value="${esc(draft.first_name)}" required /></div>
            <div class="field"><label>الاسم الثاني *</label><input name="second_name" type="text" value="${esc(draft.second_name)}" required /></div>
            <div class="field"><label>الاسم الثالث *</label><input name="third_name" type="text" value="${esc(draft.third_name)}" required /></div>
            <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" value="${esc(draft.phone)}" required placeholder="01xxxxxxxxx" /></div>
          </div>
          <button type="submit" class="btn btn-blue" style="width:100%;">التالي</button>
        </form>
      ` : `
        <form method="post" action="/student/register">
          <input type="hidden" name="full_name" value="${esc(fullName)}" />
          <input type="hidden" name="phone" value="${esc(draft.phone)}" />
          <div class="field"><label>الصف الدراسي *</label><select name="grade">${gradeOpts}</select></div>
          <div class="field"><label>الشعبة *</label><select name="track">${trackOpts}</select></div>
          <div class="field"><label>رقم هاتف ولي الأمر *</label><input name="parent_phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
          <div class="grid2">
            <div class="field"><label>المحافظة *</label><input name="governorate" type="text" required placeholder="مثال: الشرقية" /></div>
            <div class="field"><label>كلمة السر *</label><input name="password" type="password" required minlength="4" /></div>
          </div>
          <button type="submit" class="btn btn-olive" style="width:100%;">إتمام إنشاء الحساب</button>
        </form>
      `}
      <div style="margin-top:14px; text-align:center; font-size:0.86rem;">
        لديك حساب بالفعل؟ <a href="/student?tab=login" style="color:var(--pri); font-weight:800;">تسجيل الدخول</a>
      </div>
    </div>
  </div>`;
}

function renderStudentDash(settings, student, state) {
  const unlocked = new Set(student.branches || []);
  const unlockedCount = unlocked.size;
  const totalBranches = BRANCHES.length;
  const progressPct = Math.round((unlockedCount / totalBranches) * 100);
  const clipTop = Math.max(0, 100 - progressPct);

  const section = state.section || "dashboard";
  const branchParam = state.branch || "";
  const lectureId = state.lectureId || "";
  const error = state.error || "";
  const notice = state.notice || "";

  const branchCardsHtml = BRANCHES.map(br => {
    const isUnlocked = unlocked.has(br);
    const brLectures = (state.lectures || []).filter(l => l.branch === br);
    return `
      <div class="course-card">
        <div>
          <div class="course-banner">
            <div>
              <span class="pill ${isUnlocked ? "pill-ok" : "pill-warn"}">${isUnlocked ? "مفعل ✓" : "مغلق 🔒"}</span>
              <div style="font-size:1.25rem; font-weight:900; margin-top:6px;">${esc(br)}</div>
              <div style="font-size:0.8rem; opacity:0.9;">${brLectures.length} محاضرة متاحة</div>
            </div>
            <img class="book-thumb" src="${esc(settings.teacher_image)}" alt="${esc(br)}" onerror="this.style.display='none';" />
          </div>
          <div class="course-body">
            <div class="course-title">منهج ${esc(br)} — ${esc(student.grade)} (${esc(student.track)})</div>
            <p class="muted" style="font-size:0.84rem; margin-bottom:12px;">
              ${isUnlocked ? "يمكنك الآن فتح محاضرات الفرع ومشاهدة الفيديوهات بعلامة مائية." : "هذا الفرع يحتاج إلى كود تفعيل خاص بالفرع لفتحه."}
            </p>
          </div>
        </div>
        <div style="padding:0 14px 14px;">
          ${isUnlocked
            ? `<a class="btn btn-blue btn-sm" style="width:100%;" href="/student?section=branch&branch=${encodeURIComponent(br)}">دخول الفرع</a>`
            : `<a class="btn btn-olive btn-sm" style="width:100%;" href="/student?section=codes">تفعيل بكود الفرع</a>`
          }
        </div>
      </div>
    `;
  }).join("");

  let activeLectureHtml = "";
  if (lectureId) {
    const lec = (state.lectures || []).find(x => String(x.id) === String(lectureId));
    if (lec) {
      if (!unlocked.has(lec.branch)) {
        activeLectureHtml = `<div class="msg-err">عذراً، فرع (${esc(lec.branch)}) غير مفعل على حسابك.</div>`;
      } else {
        const ytId = extractYoutubeId(lec.video_url);
        let playerHtml = "";
        if (ytId) {
          playerHtml = `<iframe src="https://www.youtube.com/embed/${esc(ytId)}?rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
        } else if (lec.video_url && /^https?:\/\//i.test(lec.video_url)) {
          playerHtml = `<iframe src="${esc(lec.video_url)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
        } else if (lec.video_url) {
          playerHtml = `<video controls controlsList="nodownload"><source src="${esc(lec.video_url)}" /></video>`;
        } else {
          playerHtml = `<div class="msg-err">لا يوجد رابط فيديو مضاف لهذه المحاضرة بعد.</div>`;
        }

        const wmText = `${student.full_name} • ${student.phone} • نور البيان`;
        activeLectureHtml = `
          <div class="card" style="margin-top:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
              <div>
                <span class="pill pill-ok">${esc(lec.branch)}</span>
                <h3 style="font-weight:900; margin-top:6px;">${esc(lec.title)}</h3>
              </div>
              <a class="btn btn-out btn-sm" href="/student?section=branch&branch=${encodeURIComponent(lec.branch)}">رجوع للفرع</a>
            </div>
            <div class="secure-player-box">
              <div class="watermark-layer">
                <span class="watermark-tag" style="top:18%; right:10%;">${esc(wmText)}</span>
                <span class="watermark-tag" style="top:54%; right:35%; animation-delay:-4s;">${esc(wmText)}</span>
              </div>
              ${playerHtml}
            </div>
            ${lec.video_url && /^https?:\/\//i.test(lec.video_url) && !ytId
              ? `<div style="margin-top:10px;"><a class="btn btn-olive btn-sm" href="${esc(lec.video_url)}" target="_blank" rel="noopener">فتح الفيديو في نافذة المشغل الخارجية</a></div>`
              : ""
            }
          </div>
        `;
      }
    }
  }

  const branchDetailHtml = branchParam ? (() => {
    const canEnter = unlocked.has(branchParam);
    const list = (state.lectures || []).filter(l => l.branch === branchParam);
    return `
      <div class="branch-hero-banner">
        <div>
          <span class="pill" style="background:rgba(255,255,255,0.2); color:#fff;">فرع ${esc(branchParam)}</span>
          <h2 style="font-size:1.45rem; font-weight:900; margin-top:6px;">محاضرات ${esc(branchParam)}</h2>
          <p style="font-size:0.88rem; opacity:0.92;">${esc(student.grade)} — الشعبة: ${esc(student.track)}</p>
        </div>
        <div class="branch-book-card">
          <img src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
          <div>
            <div style="font-weight:900;">أ. محمد يوسف</div>
            <div style="font-size:0.8rem; opacity:0.9;">نور البيان الأزهرية</div>
          </div>
        </div>
      </div>
      ${!canEnter ? `
        <div class="card">
          <div class="msg-err">هذا الفرع مغلق على حسابك حالياً. فعّله بكود خاص بفرع (${esc(branchParam)}).</div>
          <form method="post" action="/student/redeem-code" style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
            <div class="field" style="flex:1; min-width:220px; margin:0;">
              <label>كود تفعيل الفرع (لمرة واحدة)</label>
              <input name="code" type="text" required placeholder="مثال: BR-XXXXXX" />
            </div>
            <button type="submit" class="btn btn-olive">تفعيل الفرع الآن</button>
          </form>
        </div>
      ` : `
        <div class="card">
          <h3 style="font-weight:900; margin-bottom:10px;">قائمة المحاضرات</h3>
          ${list.length ? list.map(l => `
            <div class="row">
              <div>
                <div style="font-weight:900;">${esc(l.title)}</div>
                <div class="muted" style="font-size:0.82rem;">الفرع: ${esc(l.branch)}</div>
              </div>
              <a class="btn btn-blue btn-sm" href="/student?section=branch&branch=${encodeURIComponent(branchParam)}&lecture=${encodeURIComponent(l.id)}">مشاهدة المحاضرة</a>
            </div>
          `).join("") : `<p class="muted">لا توجد محاضرات مضافة لهذا الفرع حتى الآن.</p>`}
        </div>
        ${activeLectureHtml}
      `}
    `;
  })() : "";

  const examsHtml = (state.exams || []).map(ex => {
    const questions = Array.isArray(ex.questions) ? ex.questions : [];
    const prev = (state.submissions || []).find(s => String(s.exam_id) === String(ex.id));
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          <div>
            <span class="pill pill-ok">${esc(ex.branch || "عام")}</span>
            <h3 style="font-weight:900; margin-top:6px;">${esc(ex.title)}</h3>
          </div>
          ${prev ? `<span class="pill pill-ok">درجتك السابقة: ${esc(prev.score)} / ${esc(prev.total)}</span>` : `<span class="pill pill-warn">لم يُسلّم بعد</span>`}
        </div>
        <form method="post" action="/student/submit-exam">
          <input type="hidden" name="exam_id" value="${esc(ex.id)}" />
          ${questions.map((q, qi) => `
            <div class="row" style="display:block;">
              <div style="font-weight:800; margin-bottom:6px;">${qi + 1}. ${esc(q.text)}</div>
              ${(q.options || []).map((opt, oi) => `
                <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin:4px 0;">
                  <input type="radio" name="q_${qi}" value="${oi}" style="width:auto;" required />
                  <span>${esc(opt)}</span>
                </label>
              `).join("")}
            </div>
          `).join("")}
          <button type="submit" class="btn btn-blue">تسليم الاختبار</button>
        </form>
      </div>
    `;
  }).join("") || `<div class="card"><p class="muted">لا توجد امتحانات أو واجبات متاحة حالياً.</p></div>`;

  const ticketsHtml = (state.tickets || []).map(t => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <strong>${esc(t.subject)}</strong>
        <span class="pill ${t.reply ? "pill-ok" : "pill-warn"}">${t.reply ? "تم الرد" : "قيد المراجعة"}</span>
      </div>
      <p class="muted" style="font-size:0.88rem; margin-top:6px;">${esc(t.message)}</p>
      ${t.image_url ? `<img class="ticket-img-thumb" src="${esc(t.image_url)}" alt="صورة السؤال" onerror="this.style.display='none';" />` : ""}
      ${t.reply ? `<div class="msg-ok" style="margin-top:8px; margin-bottom:0;">رد الإدارة: ${esc(t.reply)}</div>` : ""}
    </div>
  `).join("") || `<p class="muted" style="margin-top:10px;">لم ترسل تذاكر دعم أو أسئلة من قبل.</p>`;

  let mainContentHtml = "";
  if (section === "dashboard") {
    mainContentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div><div class="kpi-num">${unlockedCount} / ${totalBranches}</div><div class="kpi-lbl">الفروع المفعلة</div></div>
          <div class="kpi-icon-box">📚</div>
        </div>
        <div class="kpi-card olive-kpi">
          <div><div class="kpi-num">${(state.lectures || []).length}</div><div class="kpi-lbl">إجمالي المحاضرات</div></div>
          <div class="kpi-icon-box">🎥</div>
        </div>
        <div class="kpi-card brown-kpi">
          <div><div class="kpi-num">${(state.exams || []).length}</div><div class="kpi-lbl">الواجبات والامتحانات</div></div>
          <div class="kpi-icon-box">📝</div>
        </div>
        <div class="kpi-card olive-kpi">
          <div><div class="kpi-num">${(state.submissions || []).length}</div><div class="kpi-lbl">الاختبارات المحلولة</div></div>
          <div class="kpi-icon-box">✓</div>
        </div>
      </div>

      <div class="progress-layout">
        <div class="progress-frame">
          <div style="font-weight:900; font-size:0.95rem;">مؤشر إنجاز الفروع (${progressPct}%)</div>
          <div class="teacher-color-meter">
            <img class="bw-layer" src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
            <div class="color-reveal" style="clip-path: inset(${clipTop}% 0 0 0);">
              <img src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
            </div>
          </div>
          <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${progressPct}%;"></div></div>
          <div class="muted" style="font-size:0.8rem;">كل فرع تفعله يرفع نسبة الإنجاز</div>
        </div>

        <div class="card" style="margin-bottom:0;">
          <h3 style="font-weight:900; margin-bottom:6px;">أهلاً بك يا ${esc(student.full_name)}</h3>
          <p class="muted" style="font-size:0.88rem; margin-bottom:12px;">
            الصف: <strong>${esc(student.grade)}</strong> • الشعبة: <strong>${esc(student.track)}</strong> • رقم الهاتف: <strong>${esc(student.phone)}</strong> • ولي الأمر: <strong>${esc(student.parent_phone || "-")}</strong>
          </p>
          <div style="margin-bottom:12px;">
            ${(student.branches || []).length
              ? (student.branches || []).map(b => `<span class="pill pill-ok" style="margin-left:4px;">${esc(b)}</span>`).join("")
              : `<span class="pill pill-warn">لم يتم تفعيل أي فرع بعد</span>`
            }
          </div>
          <a class="btn btn-olive btn-sm" href="/student?section=codes">تفعيل كود فرع جديد</a>
        </div>
      </div>

      <h3 style="font-weight:900; margin-bottom:12px;">فروع اللغة العربية السبعة</h3>
      <div class="course-grid">${branchCardsHtml}</div>
    `;
  } else if (section === "branch") {
    mainContentHtml = branchDetailHtml;
  } else if (section === "codes") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:8px;">تفعيل الفروع بالأكواد</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">أدخل كود الفرع (يُستخدم مرة واحدة فقط) لفتح محاضرات الفرع على حسابك.</p>
        <form method="post" action="/student/redeem-code" class="grid2">
          <div class="field"><label>كود التفعيل *</label><input name="code" type="text" required placeholder="مثال: BR-XXXXXX" /></div>
          <div class="field" style="display:flex; align-items:flex-end;"><button type="submit" class="btn btn-olive" style="width:100%;">تفعيل الكود</button></div>
        </form>
        <div style="margin-top:12px;">
          <strong>الفروع المفعلة حالياً:</strong>
          ${(student.branches || []).length ? (student.branches || []).map(b => `<span class="pill pill-ok">${esc(b)}</span>`).join(" ") : `<span class="muted">لا يوجد</span>`}
        </div>
      </div>
    `;
  } else if (section === "exams") {
    mainContentHtml = examsHtml;
  } else if (section === "tickets") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:8px;">اسأل سؤالاً أو أرسل تذكرة دعم</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">اختر صورة سؤالك مباشرة من جهازك ليراها الأستاذ محمد يوسف.</p>
        <form method="post" action="/student/tickets" id="studentTicketForm">
          <input type="hidden" name="image_url" id="ticketImageData" />
          <div class="grid2">
            <div class="field"><label>عنوان السؤال أو التذكرة *</label><input name="subject" type="text" required placeholder="مثال: استفسار في إعراب أو سؤال" /></div>
            <div class="field"><label>صورة السؤال (من جهازك)</label><input id="ticketImageFile" type="file" accept="image/*" /></div>
          </div>
          <img id="ticketImagePreview" class="ticket-img-thumb" style="display:none;" alt="معاينة صورة السؤال" />
          <div class="field"><label>تفاصيل السؤال أو الرسالة *</label><textarea name="message" required placeholder="اكتب سؤالك بوضوح..."></textarea></div>
          <button type="submit" class="btn btn-blue">إرسال السؤال</button>
        </form>
      </div>
      <div class="card">
        <h3 style="font-weight:900;">أسئلتك وتذاكرك السابقة</h3>
        ${ticketsHtml}
      </div>
      <script>
        (function () {
          const fileInput = document.getElementById("ticketImageFile");
          const hiddenInput = document.getElementById("ticketImageData");
          const preview = document.getElementById("ticketImagePreview");
          if (!fileInput || !hiddenInput || !preview) return;
          fileInput.addEventListener("change", function () {
            const file = fileInput.files && fileInput.files[0];
            if (!file) {
              hiddenInput.value = "";
              preview.src = "";
              preview.style.display = "none";
              return;
            }
            const reader = new FileReader();
            reader.onload = function () {
              const dataUrl = String(reader.result || "");
              hiddenInput.value = dataUrl;
              preview.src = dataUrl;
              preview.style.display = "block";
            };
            reader.readAsDataURL(file);
          });
        })();
      </script>
    `;
  } else if (section === "account") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:12px;">بيانات الحساب</h2>
        <div class="row"><span>الاسم الكامل</span><strong>${esc(student.full_name)}</strong></div>
        <div class="row"><span>رقم هاتف الطالب</span><strong>${esc(student.phone)}</strong></div>
        <div class="row"><span>رقم هاتف ولي الأمر</span><strong>${esc(student.parent_phone || "-")}</strong></div>
        <div class="row"><span>الصف الدراسي</span><strong>${esc(student.grade)}</strong></div>
        <div class="row"><span>الشعبة</span><strong>${esc(student.track)}</strong></div>
        <div class="row"><span>المحافظة</span><strong>${esc(student.governorate || "-")}</strong></div>
      </div>
    `;
  }

  const branchSubLinks = BRANCHES.map(b => `
    <a class="sub-link ${section === "branch" && branchParam === b ? "active" : ""}" href="/student?section=branch&branch=${encodeURIComponent(b)}">${esc(b)}</a>
  `).join("");

  return `
  <div class="dash-shell" id="dashShell">
    <div>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
      ${mainContentHtml}
    </div>
    <aside class="right-drawer">
      <div class="drawer-top">
        <span class="drawer-title" style="font-weight:900; font-size:0.92rem;">قائمة الطالب</span>
        <button type="button" class="collapse-btn" id="collapseDrawerBtn">⇄</button>
      </div>
      <a class="nav-item-link ${section === "dashboard" ? "active" : ""}" href="/student?section=dashboard"><span>🏠</span><span class="nav-label">الرئيسية</span></a>
      <a class="nav-item-link ${section === "branch" ? "active" : ""}" href="/student?section=branch&branch=${encodeURIComponent(branchParam || BRANCHES[0])}"><span>📖</span><span class="nav-label">فروع اللغة العربية</span></a>
      <div class="sub-nav">${branchSubLinks}</div>
      <a class="nav-item-link ${section === "codes" ? "active" : ""}" href="/student?section=codes"><span>🔑</span><span class="nav-label">تفعيل الفروع</span></a>
      <a class="nav-item-link ${section === "exams" ? "active" : ""}" href="/student?section=exams"><span>📝</span><span class="nav-label">الواجبات والامتحانات</span></a>
      <a class="nav-item-link ${section === "tickets" ? "active" : ""}" href="/student?section=tickets"><span>🎫</span><span class="nav-label">الأسئلة والدعم</span></a>
      <a class="nav-item-link ${section === "account" ? "active" : ""}" href="/student?section=account"><span>👤</span><span class="nav-label">حسابي</span></a>
      <a class="nav-item-link" href="/logout" style="color:var(--err);"><span>🚪</span><span class="nav-label">تسجيل الخروج</span></a>
    </aside>
  </div>
  <script>
    document.getElementById("collapseDrawerBtn")?.addEventListener("click", function () {
      document.getElementById("dashShell")?.classList.toggle("collapsed");
    });
  </script>`;
}

function renderAdminPage(settings, isAuthed, data, error, notice) {
  if (!isAuthed) {
    return `
    <div class="card" style="max-width:460px; margin:28px auto;">
      <h2 style="font-weight:900; margin-bottom:8px;">دخول لوحة تحكم الأدمن</h2>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">أدخل بيانات الإدارة لإدارة الأكواد والمحاضرات والاختبارات والطلاب.</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      <form method="post" action="/admin/login">
        <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required placeholder="mohmed@mr.com" /></div>
        <div class="field"><label>كلمة المرور</label><input name="password" type="password" required placeholder="••••••••" /></div>
        <button type="submit" class="btn btn-blue" style="width:100%;">دخول الأدمن</button>
      </form>
    </div>`;
  }

  const branchChecks = BRANCHES.map(b => `
    <label class="branch-check-pill">
      <input type="checkbox" name="branches" value="${esc(b)}" />
      <span>${esc(b)}</span>
    </label>
  `).join("");

  const codesRows = (data.codes || []).slice(-12).reverse().map(c => `
    <div class="row">
      <div>
        <strong>${esc(c.code)}</strong> — <span class="pill pill-ok">${esc(c.type === "center" ? "كود سنتر (لمرة واحدة)" : "كود فرع: " + (c.branch || ""))}</span>
      </div>
      <span class="pill ${c.used ? "pill-warn" : "pill-ok"}">${c.used ? "مستخدم (" + esc(c.used_by || "") + ")" : "متاح"}</span>
    </div>
  `).join("") || `<p class="muted">لا توجد أكواد مولدة بعد.</p>`;

  const lecturesRows = (data.lectures || []).slice(-12).reverse().map(l => `
    <div class="row">
      <div>
        <strong>${esc(l.title)}</strong> — <span class="pill pill-ok">${esc(l.branch)}</span>
        <div class="muted" style="font-size:0.8rem;">${esc(l.grade || "")} • ${esc(l.track || "")}</div>
      </div>
      <form method="post" action="/admin/delete-lecture" style="margin:0;">
        <input type="hidden" name="lecture_id" value="${esc(l.id)}" />
        <button type="submit" class="btn btn-red btn-sm">حذف</button>
      </form>
    </div>
  `).join("") || `<p class="muted">لا توجد محاضرات مضافة بعد.</p>`;

  const studentsRows = (data.students || []).map(s => `
    <div class="row">
      <div>
        <strong>${esc(s.full_name)}</strong> — <span class="muted">${esc(s.phone)}</span>
        <div class="muted" style="font-size:0.8rem;">${esc(s.grade || "")} (${esc(s.track || "")}) • ولي الأمر: ${esc(s.parent_phone || "-")}</div>
        <div style="margin-top:4px;">${(s.branches || []).map(b => `<span class="pill pill-ok">${esc(b)}</span>`).join(" ")}</div>
      </div>
    </div>
  `).join("") || `<p class="muted">لا يوجد طلاب مسجلون بعد.</p>`;

  const ticketsRows = (data.tickets || []).map(t => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <strong>${esc(t.subject)}</strong>
        <span class="muted" style="font-size:0.8rem;">${esc(t.student_phone || "")}</span>
      </div>
      <p style="margin:6px 0; font-size:0.88rem;">${esc(t.message)}</p>
      ${t.image_url ? `<img class="ticket-img-thumb" src="${esc(t.image_url)}" alt="صورة التذكرة" onerror="this.style.display='none';" />` : ""}
      <form method="post" action="/admin/reply-ticket" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input type="hidden" name="ticket_id" value="${esc(t.id)}" />
        <input name="reply" type="text" value="${esc(t.reply || "")}" placeholder="اكتب رد الإدارة هنا..." style="flex:1; min-width:220px;" />
        <button type="submit" class="btn btn-olive btn-sm">حفظ الرد</button>
      </form>
    </div>
  `).join("") || `<p class="muted">لا توجد تذاكر دعم حالياً.</p>`;

  return `
  <div class="dash-shell" id="adminShell">
    <div>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}

      <div class="kpi-grid">
        <div class="kpi-card"><div><div class="kpi-num">${(data.students || []).length}</div><div class="kpi-lbl">الطلاب</div></div><div class="kpi-icon-box">👨‍🎓</div></div>
        <div class="kpi-card olive-kpi"><div><div class="kpi-num">${(data.lectures || []).length}</div><div class="kpi-lbl">المحاضرات</div></div><div class="kpi-icon-box">🎥</div></div>
        <div class="kpi-card brown-kpi"><div><div class="kpi-num">${(data.exams || []).length}</div><div class="kpi-lbl">الاختبارات</div></div><div class="kpi-icon-box">📝</div></div>
        <div class="kpi-card olive-kpi"><div><div class="kpi-num">${(data.tickets || []).length}</div><div class="kpi-lbl">التذاكر</div></div><div class="kpi-icon-box">🎫</div></div>
      </div>

      <div id="sec-codes" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">توليد أكواد (سنتر لمرة واحدة / فروع)</h3>
        <form method="post" action="/admin/generate-codes" class="grid3">
          <div class="field">
            <label>نوع الكود</label>
            <select name="code_type">
              <option value="center">كود سنتر (يُستخدم مرة واحدة)</option>
              <option value="branch">كود تفعيل فرع</option>
            </select>
          </div>
          <div class="field">
            <label>الفرع (لكود الفرع)</label>
            <select name="branch">${BRANCHES.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>عدد الأكواد</label>
            <input name="count" type="number" min="1" max="50" value="1" />
          </div>
          <div style="grid-column:1/-1;"><button type="submit" class="btn btn-olive">توليد الأكواد الآن</button></div>
        </form>
        <div style="margin-top:12px;">${codesRows}</div>
      </div>

      <div id="sec-lectures" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إضافة محاضرة (رابط iNK Player / YouTube)</h3>
        <form method="post" action="/admin/add-lecture" class="grid2">
          <div class="field"><label>عنوان المحاضرة *</label><input name="title" type="text" required placeholder="مثال: أحكام المبتدأ والخبر" /></div>
          <div class="field"><label>الفرع *</label><select name="branch">${BRANCHES.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select></div>
          <div class="field"><label>الصف الدراسي</label><select name="grade">${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select></div>
          <div class="field"><label>الشعبة</label><select name="track">${TRACKS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></div>
          <div class="field" style="grid-column:1/-1;"><label>رابط الفيديو (iNK Player أو YouTube) *</label><input name="video_url" type="text" required placeholder="https://..." /></div>
          <div style="grid-column:1/-1;"><button type="submit" class="btn btn-blue">إضافة المحاضرة</button></div>
        </form>
        <div style="margin-top:12px;">${lecturesRows}</div>
      </div>

      <div id="sec-exams" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إضافة اختبار / واجب سريع</h3>
        <form method="post" action="/admin/add-exam">
          <div class="grid2">
            <div class="field"><label>عنوان الاختبار *</label><input name="title" type="text" required placeholder="واجب النحو الأسبوعي" /></div>
            <div class="field"><label>الفرع</label><select name="branch">${BRANCHES.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select></div>
          </div>
          <div class="field"><label>نص السؤال *</label><input name="q_text" type="text" required placeholder="اكتب نص السؤال..." /></div>
          <div class="grid3">
            <div class="field"><label>الاختيار 1 *</label><input name="opt0" type="text" required /></div>
            <div class="field"><label>الاختيار 2 *</label><input name="opt1" type="text" required /></div>
            <div class="field"><label>الاختيار 3 *</label><input name="opt2" type="text" required /></div>
          </div>
          <div class="field">
            <label>الإجابة الصحيحة</label>
            <select name="correct_idx">
              <option value="0">الاختيار 1</option>
              <option value="1">الاختيار 2</option>
              <option value="2">الاختيار 3</option>
            </select>
          </div>
          <button type="submit" class="btn btn-olive">نشر الاختبار</button>
        </form>
      </div>

      <div id="sec-students" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">تفعيل فروع لطالب والاطلاع على الطلاب</h3>
        <form method="post" action="/admin/grant-branches" class="card" style="background:var(--card2); margin-bottom:14px;">
          <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
          <div class="branch-toggle-grid">${branchChecks}</div>
          <button type="submit" class="btn btn-blue btn-sm">تفعيل الفروع المحددة للطالب</button>
        </form>
        ${studentsRows}
      </div>

      <div id="sec-tickets" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">تذاكر الدعم والصور المرفقة</h3>
        ${ticketsRows}
      </div>

      <div id="sec-settings" class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إعدادات المنصة والتنبيه العام</h3>
        <form method="post" action="/admin/settings">
          <div class="grid2">
            <div class="field"><label>رقم فودافون كاش</label><input name="vodafone_number" type="text" value="${esc(settings.vodafone_number)}" /></div>
            <div class="field"><label>واتساب الإدارة</label><input name="admin_whatsapp" type="text" value="${esc(settings.admin_whatsapp)}" /></div>
          </div>
          <div class="field"><label>رابط صورة الأستاذ (اختياري)</label><input name="teacher_image" type="text" value="${esc(settings.teacher_image)}" /></div>
          <div class="field"><label>تنبيه عام يظهر أعلى المنصة (اتركه فارغاً لإخفائه)</label><input name="global_notice" type="text" value="${esc(settings.global_notice)}" /></div>
          <button type="submit" class="btn btn-blue">حفظ الإعدادات</button>
        </form>
      </div>
    </div>

    <aside class="right-drawer">
      <div class="drawer-top">
        <span class="drawer-title" style="font-weight:900; font-size:0.92rem;">إدارة نور البيان</span>
        <button type="button" class="collapse-btn" onclick="document.getElementById('adminShell')?.classList.toggle('collapsed')">⇄</button>
      </div>
      <a class="nav-item-link" href="#sec-codes"><span>🔑</span><span class="nav-label">الأكواد</span></a>
      <a class="nav-item-link" href="#sec-lectures"><span>🎥</span><span class="nav-label">المحاضرات</span></a>
      <a class="nav-item-link" href="#sec-exams"><span>📝</span><span class="nav-label">الاختبارات</span></a>
      <a class="nav-item-link" href="#sec-students"><span>👨‍🎓</span><span class="nav-label">الطلاب</span></a>
      <a class="nav-item-link" href="#sec-tickets"><span>🎫</span><span class="nav-label">التذاكر</span></a>
      <a class="nav-item-link" href="#sec-settings"><span>⚙️</span><span class="nav-label">الإعدادات</span></a>
    </aside>
  </div>`;
}

async function parseFormBody(req) {
  const ct = req.headers.get("Content-Type") || "";
  const out = {};
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    for (const [k, v] of params.entries()) {
      if (k in out) {
        if (!Array.isArray(out[k])) out[k] = [out[k]];
        out[k].push(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") {
        if (k in out) {
          if (!Array.isArray(out[k])) out[k] = [out[k]];
          out[k].push(v);
        } else {
          out[k] = v;
        }
      }
    }
    return out;
  }
  try {
    return await req.json();
  } catch {
    return out;
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();
    const secret = env.FIREBASE_API_KEY || "jakh-worker-secret";

    const settings = await getSettings(env);
    const stCookie = parseToken(getCookie(req, "nb_st"), secret);
    const admCookie = parseToken(getCookie(req, "nb_adm"), secret);
    const isAdmin = Boolean(admCookie && admCookie.role === "admin");

    let student = null;
    if (stCookie && stCookie.phone) {
      student = await fsGet(env, "students", stCookie.phone);
    }

    if (path === "/logout") {
      return redirectRes("/student?tab=login", {
        "Set-Cookie": `${clearCookieHeader("nb_st")}, ${clearCookieHeader("nb_adm")}`
      });
    }

    if (path === "/" && method === "GET") {
      return htmlRes(renderLayout("الرئيسية", settings, student, isAdmin, renderLanding(settings)));
    }

    if (path === "/student" && method === "GET") {
      const tab = url.searchParams.get("tab") || "register";
      const step = Number(url.searchParams.get("step") || "1");
      const draft = {
        first_name: url.searchParams.get("first_name") || "",
        second_name: url.searchParams.get("second_name") || "",
        third_name: url.searchParams.get("third_name") || "",
        phone: url.searchParams.get("phone") || ""
      };
      const error = url.searchParams.get("error") || "";
      const notice = url.searchParams.get("notice") || "";

      if (!student) {
        return htmlRes(renderLayout("بوابة الطالب", settings, null, isAdmin, renderStudentAuth(settings, tab, step, draft, error, notice)));
      }

      const [lectures, exams, tickets, submissions] = await Promise.all([
        fsList(env, "lectures"),
        fsList(env, "exams"),
        fsList(env, "tickets"),
        fsList(env, "submissions")
      ]);

      const myTickets = tickets.filter(t => t.student_phone === student.phone);
      const mySubmissions = submissions.filter(s => s.student_phone === student.phone);

      const dashHtml = renderStudentDash(settings, student, {
        section: url.searchParams.get("section") || "dashboard",
        branch: url.searchParams.get("branch") || "",
        lectureId: url.searchParams.get("lecture") || "",
        lectures,
        exams,
        tickets: myTickets,
        submissions: mySubmissions,
        error,
        notice
      });
      return htmlRes(renderLayout("لوحة الطالب", settings, student, isAdmin, dashHtml));
    }

    if (path === "/student/login" && method === "POST") {
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      const password = String(form.password || "");
      const st = await fsGet(env, "students", phone);
      if (!st || st.password_hash !== (await sha256(password))) {
        return redirectRes(`/student?tab=login&error=${encodeURIComponent("رقم الهاتف أو كلمة السر غير صحيحة")}`);
      }
      const tok = makeToken({ phone: st.phone, role: "student" }, secret);
      return redirectRes("/student?section=dashboard", {
        "Set-Cookie": setCookieHeader("nb_st", tok)
      });
    }

    if (path === "/student/center-login" && method === "POST") {
      const form = await parseFormBody(req);
      const centerCode = String(form.center_code || "").trim();
      const name = String(form.name || "").trim();
      const phone = String(form.phone || "").trim();
      const grade = String(form.grade || GRADES[0]);
      const track = String(form.track || TRACKS[0]);

      if (!centerCode || !name || !phone) {
        return redirectRes(`/student?tab=center&error=${encodeURIComponent("يرجى إدخال كود السنتر والاسم ورقم الهاتف")}`);
      }

      const codeDoc = await fsGet(env, "codes", centerCode);
      if (!codeDoc || codeDoc.type !== "center" || codeDoc.used) {
        return redirectRes(`/student?tab=center&error=${encodeURIComponent("كود السنتر غير صحيح أو تم استخدامه من قبل")}`);
      }

      await fsSet(env, "codes", centerCode, { ...codeDoc, used: true, used_by: phone });

      const existing = await fsGet(env, "students", phone);
      const updatedStudent = {
        full_name: existing?.full_name || name,
        phone,
        parent_phone: existing?.parent_phone || "",
        grade,
        track,
        governorate: existing?.governorate || "",
        password_hash: existing?.password_hash || (await sha256(phone + "_center")),
        branches: existing?.branches || []
      };
      await fsSet(env, "students", phone, updatedStudent);

      const tok = makeToken({ phone, role: "student" }, secret);
      return redirectRes(`/student?section=dashboard&notice=${encodeURIComponent("تم تفعيل المنصة بكود السنتر بنجاح")}`, {
        "Set-Cookie": setCookieHeader("nb_st", tok)
      });
    }

    if (path === "/student/register" && method === "POST") {
      const form = await parseFormBody(req);
      const fullName = String(form.full_name || "").trim();
      const phone = String(form.phone || "").trim();
      const parentPhone = String(form.parent_phone || "").trim();
      const grade = String(form.grade || GRADES[0]);
      const track = String(form.track || TRACKS[0]);
      const governorate = String(form.governorate || "").trim();
      const password = String(form.password || "");

      if (!fullName || !phone || !password) {
        return redirectRes(`/student?tab=register&step=1&error=${encodeURIComponent("أكمل البيانات المطلوبة")}`);
      }
      const existing = await fsGet(env, "students", phone);
      if (existing) {
        return redirectRes(`/student?tab=login&error=${encodeURIComponent("هذا الرقم مسجل بالفعل، سجل دخولك")}`);
      }

      await fsSet(env, "students", phone, {
        full_name: fullName,
        phone,
        parent_phone: parentPhone,
        grade,
        track,
        governorate,
        password_hash: await sha256(password),
        branches: []
      });

      const tok = makeToken({ phone, role: "student" }, secret);
      return redirectRes(`/student?section=dashboard&notice=${encodeURIComponent("تم إنشاء حسابك بنجاح")}`, {
        "Set-Cookie": setCookieHeader("nb_st", tok)
      });
    }

    if (path === "/student/reset-password" && method === "POST") {
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      const parentPhone = String(form.parent_phone || "").trim();
      const newPassword = String(form.new_password || "");
      const st = await fsGet(env, "students", phone);
      if (!st || (st.parent_phone && st.parent_phone !== parentPhone)) {
        return redirectRes(`/student?tab=forgot&error=${encodeURIComponent("تعذر التحقق من رقم الطالب أو ولي الأمر")}`);
      }
      await fsSet(env, "students", phone, { ...st, password_hash: await sha256(newPassword) });
      return redirectRes(`/student?tab=login&notice=${encodeURIComponent("تم تعيين كلمة السر الجديدة، سجل دخولك الآن")}`);
    }

    if (path === "/student/redeem-code" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const code = String(form.code || "").trim();
      const codeDoc = await fsGet(env, "codes", code);
      if (!codeDoc || codeDoc.type !== "branch" || codeDoc.used) {
        return redirectRes(`/student?section=codes&error=${encodeURIComponent("كود الفرع غير صحيح أو مستخدم من قبل")}`);
      }
      const branches = Array.from(new Set([...(student.branches || []), codeDoc.branch]));
      await fsSet(env, "students", student.phone, { ...student, branches });
      await fsSet(env, "codes", code, { ...codeDoc, used: true, used_by: student.phone });
      return redirectRes(`/student?section=branch&branch=${encodeURIComponent(codeDoc.branch)}&notice=${encodeURIComponent("تم تفعيل الفرع بنجاح")}`);
    }

    if (path === "/student/submit-exam" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const examId = String(form.exam_id || "");
      const exam = await fsGet(env, "exams", examId);
      if (!exam) return redirectRes(`/student?section=exams&error=${encodeURIComponent("الاختبار غير موجود")}`);
      const qs = Array.isArray(exam.questions) ? exam.questions : [];
      let score = 0;
      qs.forEach((q, idx) => {
        if (Number(form["q_" + idx]) === Number(q.correct_idx)) score++;
      });
      await fsSet(env, "submissions", `${student.phone}_${examId}`, {
        student_phone: student.phone,
        student_name: student.full_name,
        exam_id: examId,
        score,
        total: qs.length,
        date: new Date().toISOString()
      });
      return redirectRes(`/student?section=exams&notice=${encodeURIComponent(`تم تسليم الاختبار — درجتك: ${score} من ${qs.length}`)}`);
    }

    if (path === "/student/tickets" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const subject = String(form.subject || "").trim();
      const message = String(form.message || "").trim();
      const imageUrl = String(form.image_url || "").trim();
      if (!subject || !message) {
        return redirectRes(`/student?section=tickets&error=${encodeURIComponent("اكتب عنوان التذكرة والرسالة")}`);
      }
      const id = "t_" + Date.now();
      await fsSet(env, "tickets", id, {
        student_phone: student.phone,
        student_name: student.full_name,
        subject,
        message,
        image_url: imageUrl,
        reply: "",
        created_at: new Date().toISOString()
      });
      return redirectRes(`/student?section=tickets&notice=${encodeURIComponent("تم إرسال التذكرة بنجاح")}`);
    }

    if (path === "/admin" && method === "GET") {
      const error = url.searchParams.get("error") || "";
      const notice = url.searchParams.get("notice") || "";
      let data = {};
      if (isAdmin) {
        const [codes, lectures, exams, students, tickets] = await Promise.all([
          fsList(env, "codes"),
          fsList(env, "lectures"),
          fsList(env, "exams"),
          fsList(env, "students"),
          fsList(env, "tickets")
        ]);
        data = { codes, lectures, exams, students, tickets };
      }
      return htmlRes(renderLayout("لوحة الأدمن", settings, student, isAdmin, renderAdminPage(settings, isAdmin, data, error, notice)));
    }

    if (path === "/admin/login" && method === "POST") {
      const form = await parseFormBody(req);
      const email = String(form.email || "").trim();
      const password = String(form.password || "");
      const validPass = (await sha256(password)) === settings.admin_password_hash || (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD);
      if (email !== settings.admin_email || !validPass) {
        return redirectRes(`/admin?error=${encodeURIComponent("بيانات دخول الأدمن غير صحيحة")}`);
      }
      const tok = makeToken({ role: "admin", email }, secret);
      return redirectRes("/admin", {
        "Set-Cookie": setCookieHeader("nb_adm", tok)
      });
    }

    if (!isAdmin) {
      return redirectRes("/admin");
    }

    if (path === "/admin/generate-codes" && method === "POST") {
      const form = await parseFormBody(req);
      const codeType = String(form.code_type || "center");
      const branch = String(form.branch || BRANCHES[0]);
      const count = Math.min(50, Math.max(1, Number(form.count || 1)));
      const prefix = codeType === "center" ? "CTR-" : "BR-";
      for (let i = 0; i < count; i++) {
        const code = prefix + Math.random().toString(36).substring(2, 8).toUpperCase();
        await fsSet(env, "codes", code, {
          code,
          type: codeType,
          branch: codeType === "branch" ? branch : "",
          used: false,
          used_by: ""
        });
      }
      return redirectRes(`/admin?notice=${encodeURIComponent(`تم توليد ${count} كود بنجاح`)}`);
    }

    if (path === "/admin/add-lecture" && method === "POST") {
      const form = await parseFormBody(req);
      const title = String(form.title || "").trim();
      const branch = String(form.branch || BRANCHES[0]);
      const grade = String(form.grade || GRADES[0]);
      const track = String(form.track || TRACKS[0]);
      const videoUrl = String(form.video_url || "").trim();
      const id = "lec_" + Date.now();
      await fsSet(env, "lectures", id, { title, branch, grade, track, video_url: videoUrl });
      return redirectRes(`/admin?notice=${encodeURIComponent("تمت إضافة المحاضرة")}`);
    }

    if (path === "/admin/delete-lecture" && method === "POST") {
      const form = await parseFormBody(req);
      const lectureId = String(form.lecture_id || "");
      if (lectureId) await fsDelete(env, "lectures", lectureId);
      return redirectRes(`/admin?notice=${encodeURIComponent("تم حذف المحاضرة")}`);
    }

    if (path === "/admin/add-exam" && method === "POST") {
      const form = await parseFormBody(req);
      const title = String(form.title || "").trim();
      const branch = String(form.branch || BRANCHES[0]);
      const qText = String(form.q_text || "").trim();
      const options = [String(form.opt0 || "").trim(), String(form.opt1 || "").trim(), String(form.opt2 || "").trim()];
      const correctIdx = Number(form.correct_idx || 0);
      const id = "ex_" + Date.now();
      await fsSet(env, "exams", id, {
        title,
        branch,
        questions: [{ text: qText, options, correct_idx: correctIdx }]
      });
      return redirectRes(`/admin?notice=${encodeURIComponent("تم نشر الاختبار")}`);
    }

    if (path === "/admin/grant-branches" && method === "POST") {
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      const selected = Array.isArray(form.branches) ? form.branches : (form.branches ? [form.branches] : []);
      const st = await fsGet(env, "students", phone);
      if (!st) return redirectRes(`/admin?error=${encodeURIComponent("الطالب غير موجود")}`);
      const branches = Array.from(new Set([...(st.branches || []), ...selected]));
      await fsSet(env, "students", phone, { ...st, branches });
      return redirectRes(`/admin?notice=${encodeURIComponent("تم تفعيل الفروع للطالب")}`);
    }

    if (path === "/admin/reply-ticket" && method === "POST") {
      const form = await parseFormBody(req);
      const ticketId = String(form.ticket_id || "");
      const reply = String(form.reply || "").trim();
      const t = await fsGet(env, "tickets", ticketId);
      if (t) await fsSet(env, "tickets", ticketId, { ...t, reply });
      return redirectRes(`/admin?notice=${encodeURIComponent("تم حفظ الرد على التذكرة")}`);
    }

    if (path === "/admin/settings" && method === "POST") {
      const form = await parseFormBody(req);
      await fsSet(env, "settings", "main", {
        ...settings,
        vodafone_number: String(form.vodafone_number || settings.vodafone_number),
        admin_whatsapp: String(form.admin_whatsapp || settings.admin_whatsapp),
        teacher_image: String(form.teacher_image || settings.teacher_image),
        global_notice: String(form.global_notice || "")
      });
      return redirectRes(`/admin?notice=${encodeURIComponent("تم حفظ إعدادات المنصة")}`);
    }

    return htmlRes("<h1>404 — الصفحة غير موجودة</h1>", 404);
  }
};
```[cite: 7]

### خطوات سريعة بعد النسخ
* الصق الكود في `src/index.js` واحفظ الملف (`Ctrl + S`).
* ارفعه على GitHub واضغط **Retry build** في Cloudflare Workers.
* ملاحظة بسيطة على صور الأسئلة المرفوعة من الجهاز: لو صورة الطالب كبيرة جداً، قد يرفض Firestore حفظ المستند إذا تجاوز الحجم المسموح للمستند الواحد، فالأفضل رفع صور بحجم مناسب.

