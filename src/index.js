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
      --bg: #eef3f8;
      --card: #ffffff;
      --card2: #e6eef5;
      --txt: #0b192c;
      --muted: #496073;
      --pri: #1d4ed8;
      --olive: #4d5d2b;
      --olive-soft: rgba(77, 93, 43, 0.14);
      --gold: #a16207;
      --err: #dc2626;
      --bdr: #cbd8e6;
      --glyph: rgba(29, 78, 216, 0.075);
      --shadow: 0 10px 26px rgba(11, 25, 44, 0.08);
    }
    body.dark {
      --bg: #05080f;
      --card: #0c1320;
      --card2: #131e2e;
      --txt: #f1f5f9;
      --muted: #94a3b8;
      --pri: #3b82f6;
      --olive: #8fa34b;
      --olive-soft: rgba(143, 163, 75, 0.16);
      --gold: #fbbf24;
      --err: #f87171;
      --bdr: #1e2d42;
      --glyph: rgba(143, 163, 75, 0.09);
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
    .inline-dua-banner {
      max-width: 1240px;
      margin: 14px auto 0;
      padding: 12px 18px;
      border-radius: 16px;
      background: linear-gradient(120deg, rgba(11, 25, 44, 0.94), rgba(29, 78, 216, 0.88), rgba(60, 74, 33, 0.92));
      color: #f8fafc;
      border: 1px solid rgba(143, 163, 75, 0.55);
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
    .inline-dua-avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #8fa34b; flex-shrink: 0; }
    .inline-dua-text { font-weight: 900; font-size: 1.05rem; }
    .inline-dua-sub { font-size: 0.78rem; opacity: 0.88; }
    #arabicBg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
    .ar-glyph {
      position: absolute; font-weight: 900; color: var(--glyph); user-select: none;
      will-change: transform;
      animation: letterDrift var(--dur, 18s) ease-in-out var(--delay, 0s) infinite alternate;
    }
    @keyframes letterDrift {
      0% { transform: translate(0px, 0px) rotate(-6deg); }
      50% { transform: translate(var(--dx, 16px), var(--dy, -22px)) rotate(8deg); }
      100% { transform: translate(calc(var(--dx, 16px) * -0.7), var(--dy, -22px)) rotate(-10deg); }
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
      background: linear-gradient(135deg, var(--pri), var(--olive));
      color: #fff; font-weight: 900; display: grid; place-items: center; font-size: 1rem;
    }
    .theme-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 999px; border: 1px solid var(--bdr); background: var(--card2);
      color: var(--txt); font-weight: 800; cursor: pointer; font-size: 0.84rem;
    }
    .global-alert {
      max-width: 1240px; margin: 12px auto 0; background: var(--olive-soft);
      border: 1px solid var(--olive); color: var(--olive);
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
    .pill-warn { background: rgba(161, 98, 7, 0.16); color: var(--gold); }
    .msg-err {
      background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.35);
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
      background: linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%);
      color: #fff; border-radius: 14px; padding: 18px;
      display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow);
    }
    .kpi-card.olive-kpi { background: linear-gradient(135deg, #4d5d2b 0%, #1c2410 100%); }
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
      position: relative; width: 128px; height: 138px; margin: 8px auto 10px;
      border-radius: 16px; overflow: hidden; border: 2px solid var(--bdr);
    }
    .teacher-color-meter img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
      background: linear-gradient(135deg, #0b192c 0%, #1d4ed8 58%, #3c4a21 100%);
      color: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px;
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .branch-book-card {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.22);
      padding: 10px 14px; border-radius: 14px;
    }
    .branch-book-card img { width: 68px; height: 78px; object-fit: cover; border-radius: 10px; border: 2px solid #fff; }
    .course-banner {
      height: 145px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #0b192c, #2f3b19);
      color: #fff; padding: 14px; display: flex; justify-content: space-between; align-items: flex-end;
    }
    .course-banner img.book-thumb { width: 64px; height: 78px; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255, 255, 255, 0.7); }
    .course-body { padding: 14px; }
    .course-title { font-weight: 900; font-size: 1rem; margin-bottom: 8px; }
    .split-auth {
      max-width: 1060px; margin: 18px auto; padding: 0 14px;
      display: grid; grid-template-columns: 1fr 1.1fr; gap: 20px; align-items: stretch;
    }
    @media (max-width: 840px) { .split-auth { grid-template-columns: 1fr; } }
    .promo-pane {
      background: linear-gradient(160deg, #0b192c 0%, #1d4ed8 60%, #3b4920 100%);
      color: #fff; border-radius: 20px; padding: 26px;
      display: flex; flex-direction: column; justify-content: space-between; min-height: 440px;
    }
    .promo-pane.olive-mode { background: linear-gradient(160deg, #1b2610 0%, #4d5d2b 65%, #0f172a 100%); }
    .promo-img {
      width: 190px; height: 210px; object-fit: cover; border-radius: 16px;
      border: 2px solid rgba(255, 255, 255, 0.35); margin: 14px auto 0; display: block;
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
    .ticket-img-thumb { max-width: 240px; max-height: 170px; border-radius: 10px; border: 1px solid var(--bdr); margin-top: 8px; display: block; }
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
        ${!student ? `<a class="btn btn-out btn-sm" href="/admin">لوحة الأدمن</a>` : ""}
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
        const dur = 14 + ((i * 3) % 12);
        const delay = -((i * 2.3) % 10);
        const dx = (i % 2 === 0 ? 1 : -1) * (14 + (i % 16));
        const dy = (i % 3 === 0 ? -1 : 1) * (18 + (i % 20));
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