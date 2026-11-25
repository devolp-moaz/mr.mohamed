const BRANCHES = ["النحو", "الصرف", "البلاغة", "الأدب", "النصوص", "المطالعة", "الإنشاء"];
const GRADES = [
  "الأول الثانوي الأزهري",
  "الثاني الثانوي الأزهري",
  "الثالث الثانوي الأزهري"
];
const TRACKS = ["علمي", "أدبي"];
const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء"
];
const TEACHER_MAIN_PHOTO = "https://www.mohammedyoussef2027.com/public/heroPhotos/teacher-photo.png";
const DEFAULT_ADMIN_EMAIL = "mohmed@mr.com";
const DEFAULT_ADMIN_PASS = "admin123456";
const PLATFORM_NAME = "نور البيان";
const COURSE_PRICE_EGP = 500;

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
  const projectId = env.FIREBASE_PROJECT_ID || "nour-albayan-ar";
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function fsKeyQuery(env) {
  return env.FIREBASE_API_KEY ? `?key=${encodeURIComponent(env.FIREBASE_API_KEY)}` : "";
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
  try {
    const res = await fetch(`${fsBase(env)}/${col}${fsKeyQuery(env)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map(docToObj);
  } catch {
    return [];
  }
}

async function fsGet(env, col, id) {
  try {
    const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}${fsKeyQuery(env)}`);
    if (!res.ok) return null;
    return docToObj(await res.json());
  } catch {
    return null;
  }
}

async function fsSet(env, col, id, obj) {
  try {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k !== "id") fields[k] = toFsVal(v);
    }
    const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}${fsKeyQuery(env)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fsDelete(env, col, id) {
  try {
    const res = await fetch(`${fsBase(env)}/${col}/${encodeURIComponent(id)}${fsKeyQuery(env)}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeWaPhone(raw) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "201066329782";
  if (digits.startsWith("01") && digits.length === 11) return "2" + digits;
  return digits;
}

function safeExternalUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}

async function getSettings(env) {
  const saved = (await fsGet(env, "settings", "main")) || {};
  return {
    vodafone_number: saved.vodafone_number || "01066329782",
    admin_whatsapp: saved.admin_whatsapp || "01066329782",
    admin_email: saved.admin_email || env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    admin_password: saved.admin_password || "",
    admin_password_hash: saved.admin_password_hash || (await sha256(env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASS)),
    global_notice: saved.global_notice || "",
    teacher_image: saved.teacher_image || TEACHER_MAIN_PHOTO,
    youtube_url: saved.youtube_url || "",
    tiktok_url: saved.tiktok_url || "",
    facebook_url: saved.facebook_url || ""
  };
}

async function verifyAdminCredentials(env, settings, emailInput, passwordInput) {
  const cleanEmail = String(emailInput || "").trim().toLowerCase();
  const rawPass = String(passwordInput || "");
  if (!cleanEmail || !rawPass) return false;

  const allowedEmails = new Set([
    DEFAULT_ADMIN_EMAIL.toLowerCase(),
    String(settings.admin_email || "").trim().toLowerCase(),
    String(env.ADMIN_EMAIL || "").trim().toLowerCase()
  ].filter(Boolean));

  if (!allowedEmails.has(cleanEmail)) return false;

  const passHash = await sha256(rawPass);
  const validDefault = rawPass === DEFAULT_ADMIN_PASS;
  const validEnv = Boolean(env.ADMIN_PASSWORD && rawPass === String(env.ADMIN_PASSWORD));
  const validFirestorePlain = Boolean(settings.admin_password && rawPass === String(settings.admin_password));
  const validSavedHash = Boolean(settings.admin_password_hash && passHash === String(settings.admin_password_hash));

  return validDefault || validEnv || validFirestorePlain || validSavedHash;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function extractYoutubeId(url) {
  if (!url) return "";
  const m = String(url).trim().match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

function sortLectures(list) {
  return [...(list || [])].sort((a, b) => {
    const ao = Number(a.order_num ?? 0);
    const bo = Number(b.order_num ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function computeStudentMetrics(student, lectures, exams, submissions, watchedList) {
  const stPhone = String(student.phone || "");
  const stSubs = (submissions || []).filter(s => String(s.student_phone || "") === stPhone);
  const stWatched = (watchedList || []).filter(w => String(w.student_phone || "") === stPhone);
  const watchedSet = new Set(stWatched.map(w => String(w.lecture_id)));
  const solvedExamSet = new Set(stSubs.map(s => String(s.exam_id)));

  const totalLectures = (lectures || []).length;
  const totalExams = (exams || []).length;
  const watchedCount = watchedSet.size;
  const solvedExamsCount = solvedExamSet.size;

  const pendingLectures = Math.max(0, totalLectures - watchedCount);
  const pendingExams = Math.max(0, totalExams - solvedExamsCount);

  let avgPct = 0;
  if (stSubs.length > 0) {
    const sumPct = stSubs.reduce((acc, s) => {
      const p = Number(s.pct ?? Math.round((Number(s.score || 0) / Math.max(1, Number(s.total || 1))) * 100));
      return acc + p;
    }, 0);
    avgPct = Math.round(sumPct / stSubs.length);
  }

  const lecRatio = totalLectures > 0 ? watchedCount / totalLectures : 1;
  const examRatio = totalExams > 0 ? solvedExamsCount / totalExams : 1;
  const performanceScore = Math.round(avgPct * 0.6 + lecRatio * 20 + examRatio * 20);

  let performanceLabel = "يحتاج متابعة";
  if (performanceScore >= 85) performanceLabel = "ممتاز جداً";
  else if (performanceScore >= 70) performanceLabel = "جيد جداً";
  else if (performanceScore >= 50) performanceLabel = "متوسط";

  return {
    watchedCount,
    solvedExamsCount,
    pendingLectures,
    pendingExams,
    avgPct,
    performanceScore,
    performanceLabel,
    submissions: stSubs
  };
}

function renderAboutStandalonePage(settings) {
  return `
  <div class="card" style="max-width:960px; margin:26px auto; padding:28px;">
    <div style="display:grid; grid-template-columns:250px 1fr; gap:24px; align-items:center;">
      <div style="background:var(--surface-soft); border:1px solid var(--bdr); border-radius:16px; padding:12px; text-align:center;">
        <img src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" style="width:100%; max-height:290px; object-fit:contain; object-position:center top; border-radius:12px;" onerror="this.style.display='none';" />
        <div style="font-weight:900; margin-top:10px; color:var(--accent);">الأستاذ محمد يوسف</div>
        <div class="muted" style="font-size:0.82rem; font-weight:700;">معلم أول اللغة العربية</div>
      </div>

      <div>
        <span class="pill pill-ok">${PLATFORM_NAME}</span>
        <h1 style="font-size:1.75rem; font-weight:900; margin-top:8px; color:var(--accent);">من نحن — الأستاذ محمد يوسف وفريق العمل</h1>
        <p style="margin-top:10px; line-height:1.9; font-size:0.96rem;">
          تأسست منصة <strong>${PLATFORM_NAME}</strong> بإشراف <strong>الأستاذ محمد يوسف</strong>، معلم أول اللغة العربية بخبرة تمتد إلى <strong>30 عاماً</strong> في تدريس وتأسيس طلاب المرحلة الثانوية الأزهرية (الأول، الثاني، والثالث الثانوي — علمي وأدبي).
        </p>
        <p style="margin-top:10px; line-height:1.9; font-size:0.95rem;">
          يعتمد نظام الشرح على ربط القاعدة بالتطبيق العملي المستمر عبر فروع اللغة العربية السبعة: <strong>النحو، الصرف، البلاغة، الأدب، النصوص، المطالعة، والإنشاء</strong>، مع متابعة أداء كل طالب وتدرج فتح الدروس بعد حل الواجبات.
        </p>
      </div>
    </div>

    <hr style="border:none; border-top:1px solid var(--bdr); margin:24px 0;" />

    <div class="grid2">
      <div class="row" style="display:block; margin-top:0;">
        <h3 style="font-weight:900; color:var(--accent); margin-bottom:8px;">تيم الدعم العلمي</h3>
        <p class="muted" style="font-size:0.9rem; line-height:1.8;">
          فريق متخصص للإجابة على استفسارات الطلاب وأسئلتهم في النحو والصرف والبلاغة والنصوص والمطالعة والإنشاء والأدب، ومراجعة الصور والأسئلة المرسلة من داخل بوابة الطالب والرد عليها بدقة.
        </p>
      </div>
      <div class="row" style="display:block; margin-top:0;">
        <h3 style="font-weight:900; color:var(--accent); margin-bottom:8px;">فريق الدعم الفني والتشغيل</h3>
        <p class="muted" style="font-size:0.9rem; line-height:1.8;">
          متابعة حسابات الطلاب، أكواد التفعيل والسنتر، تشغيل المحاضرات، وحل أي مشكلة تقنية أو استفسار فوري عبر الشات المباشر على مدار اليوم.
        </p>
      </div>
    </div>

    <div style="margin-top:22px; display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn btn-blue" href="/">العودة للرئيسية</a>
      <a class="btn btn-out" href="/student">دخول بوابة الطالب</a>
      <a class="btn btn-out" href="/privacy" target="_blank" rel="noopener">سياسة الخصوصية (تبويب جديد)</a>
    </div>
  </div>`;
}

function renderPrivacyStandalonePage() {
  const privacyTypes = [
    {
      enTitle: "Data Privacy",
      arTitle: "خصوصية البيانات",
      desc: "نحمي كافة البيانات المدخلة في المنصة ونقصر استخدامها على إدارة الحسابات، متابعة المستوى الدراسي، وتفعيل الكورسات والواجبات."
    },
    {
      enTitle: "Personal Information Privacy",
      arTitle: "خصوصية المعلومات الشخصية",
      desc: "الاسم الكامل، رقم هاتف الطالب، رقم هاتف ولي الأمر، الصف، الشعبة، والمحافظة تُحفظ بسرية ولا تُعرض أو تُباع لأي جهة خارجية."
    },
    {
      enTitle: "Educational & Assessment Privacy",
      arTitle: "خصوصية السجل التعليمي والدرجات",
      desc: "درجات الواجبات والامتحانات، نسبة الإنجاز، والأسئلة المرسلة لتيم الدعم العلمي مخصصة للطالب والإدارة لمتابعة التحصيل الدراسي."
    },
    {
      enTitle: "Intellectual Property & Video Content Privacy",
      arTitle: "خصوصية المحتوى التعليمي والملكية الفكرية",
      desc: "جميع المحاضرات والشروحات والملفات محفوظة لمنصة نور البيان والأستاذ محمد يوسف، ويُمنع تصوير الشاشة أو إعادة نشر المحتوى."
    },
    {
      enTitle: "Account & Session Security Privacy",
      arTitle: "خصوصية أمان الحساب والجلسات",
      desc: "تُشفّر كلمات المرور وتُدار جلسات الدخول بأمان لحماية حساب الطالب من الوصول غير المصرح به."
    },
    {
      enTitle: "Local Storage & Cookies Privacy",
      arTitle: "خصوصية التخزين المحلي وملفات تعريف الارتباط",
      desc: "نستخدم التخزين المحلي لحفظ تفضيلات العرض (الوضع النهاري أو الليلي) وحالة الجلسة لتحسين سرعة الاستخدام."
    }
  ];

  return `
  <div class="card" style="max-width:960px; margin:26px auto; padding:28px;">
    <span class="pill pill-ok">Privacy Policy • ${PLATFORM_NAME}</span>
    <h1 style="font-size:1.75rem; font-weight:900; margin-top:8px; color:var(--accent);">سياسة الخصوصية — Privacy Categories</h1>
    <p class="muted" style="margin-top:8px; font-size:0.94rem;">
      توضح هذه الصفحة مختلف أنواع الخصوصية المعتمدة في منصة <strong>${PLATFORM_NAME}</strong> لحماية بيانات الطلاب وأولياء الأمور والمحتوى التعليمي.
    </p>

    <div class="grid2" style="margin-top:18px;">
      ${privacyTypes.map(item => `
        <div class="row" style="display:block; margin-top:0;">
          <div style="font-weight:900; font-size:1.02rem; color:var(--accent); direction:ltr; text-align:left;">${esc(item.enTitle)}</div>
          <div style="font-weight:800; font-size:0.92rem; margin-top:2px;">${esc(item.arTitle)}</div>
          <p class="muted" style="font-size:0.88rem; margin-top:6px; line-height:1.8;">${esc(item.desc)}</p>
        </div>
      `).join("")}
    </div>

    <div style="margin-top:22px; display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn btn-blue" href="/">العودة للرئيسية</a>
      <a class="btn btn-out" href="/about">من نحن</a>
    </div>
  </div>`;
}

function renderLayout(title, settings, student, isAdmin, bodyHtml, options = {}) {
  const showLandingAdminAvatar = Boolean(options.showLandingAdminAvatar);
  const showSupportWidget = options.showSupportWidget !== false;
  const hasNotice = Boolean(settings.global_notice && String(settings.global_notice).trim());
  const defaultChatName = student ? String(student.full_name || "") : "";
  const defaultChatPhone = student ? String(student.phone || "") : "";
  const academicUnreadCount = Number(options.academicUnreadCount || 0);
  const academicUnreadItems = Array.isArray(options.academicUnreadItems) ? options.academicUnreadItems : [];

  const ytHref = safeExternalUrl(settings.youtube_url);
  const ttHref = safeExternalUrl(settings.tiktok_url);
  const fbHref = safeExternalUrl(settings.facebook_url);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | ${PLATFORM_NAME}</title>
  <link rel="icon" type="image/png" href="${esc(settings.teacher_image)}" />
  <link rel="shortcut icon" href="${esc(settings.teacher_image)}" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-soft: #eef2ff;
      --txt: #0f172a;
      --muted: #475569;
      --accent: #1e3a8a;
      --accent-dark: #172554;
      --accent-2: #2563eb;
      --gold: #b45309;
      --gold-soft: #d97706;
      --err: #dc2626;
      --bdr: #cbd5e1;
      --glyph: rgba(30, 58, 138, 0.11);
      --shadow-sm: 0 2px 10px rgba(15, 23, 42, 0.06);
      --shadow-md: 0 12px 28px rgba(15, 23, 42, 0.09);
      --shadow-lg: 0 20px 44px rgba(15, 23, 42, 0.14);
    }
    body.dark {
      --bg: #040d21;
      --surface: #0a1936;
      --surface-soft: #11264f;
      --txt: #f8fafc;
      --muted: #cbd5e1;
      --accent: #f59e0b;
      --accent-dark: #d97706;
      --accent-2: #fbbf24;
      --gold: #fbbf24;
      --gold-soft: #f59e0b;
      --err: #f87171;
      --bdr: rgba(245, 158, 11, 0.28);
      --glyph: rgba(251, 191, 36, 0.13);
      --shadow-sm: 0 2px 12px rgba(2, 6, 23, 0.45);
      --shadow-md: 0 14px 32px rgba(2, 6, 23, 0.62);
      --shadow-lg: 0 22px 48px rgba(2, 6, 23, 0.82);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body {
      background:
        radial-gradient(circle at 12% 8%, rgba(245, 158, 11, 0.09), transparent 44%),
        radial-gradient(circle at 88% 85%, rgba(30, 58, 138, 0.1), transparent 46%),
        var(--bg);
      color: var(--txt);
      min-height: 100vh;
      line-height: 1.72;
      position: relative;
      overflow-x: hidden;
      -webkit-user-select: none;
      user-select: none;
      transition: background-color 0.28s ease, color 0.22s ease;
    }

    #screenBlackoutGuard {
      display: none;
      position: fixed;
      inset: 0;
      background: #000000;
      z-index: 99999;
    }
    body.screen-blackout #screenBlackoutGuard {
      display: block;
    }
    @media print {
      body * { visibility: hidden !important; }
      body { background: #000000 !important; }
    }

    #arabicBg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
    .ar-glyph {
      position: absolute;
      font-weight: 900;
      color: var(--glyph);
      user-select: none;
      will-change: transform;
      animation: letterRoam var(--dur, 2.8s) ease-in-out var(--delay, 0s) infinite alternate;
    }
    @keyframes letterRoam {
      0% { transform: translate(0px, 0px) rotate(-10deg) scale(1); }
      50% { transform: translate(calc(var(--dx, 75px) * 0.7), calc(var(--dy, -70px) * 0.72)) rotate(8deg) scale(1.06); }
      100% { transform: translate(var(--dx, 105px), var(--dy, -95px)) rotate(14deg) scale(0.96); }
    }

    .page-layer { position: relative; z-index: 1; }

    .topbar {
      background: color-mix(in srgb, var(--surface) 92%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--bdr);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 25;
      box-shadow: var(--shadow-sm);
    }
    .brand-box { display: flex; align-items: center; gap: 12px; }
    .brand-logo-badge {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, #1e3a8a, #0f172a);
      color: #fbbf24; font-weight: 900; display: grid; place-items: center; font-size: 1.02rem;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
      border: 1px solid rgba(251, 191, 36, 0.45);
    }

    .notif-bell-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .blue-bell-btn {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      border: 1px solid rgba(245, 158, 11, 0.55);
      background: linear-gradient(135deg, #1e3a8a, #0a1936);
      color: #fbbf24;
      font-size: 1.15rem;
      font-weight: 900;
      display: grid;
      place-items: center;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(10, 25, 54, 0.28);
      transition: transform 0.16s ease;
    }
    .blue-bell-btn:hover { transform: translateY(-1px) scale(1.04); }
    .blue-bell-btn.has-alert {
      animation: bellPulse 1.4s infinite ease-in-out;
    }
    @keyframes bellPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.65); }
      50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
    }
    .bell-badge-num {
      position: absolute;
      top: -6px;
      left: -6px;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 999px;
      background: #d97706;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--surface);
    }
    .bell-badge-num.hidden-badge { display: none; }

    .notif-popover {
      display: none;
      position: fixed;
      top: 68px;
      left: 24px;
      width: min(350px, calc(100vw - 28px));
      max-height: 380px;
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--bdr);
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
      padding: 14px;
      z-index: 90;
    }
    .notif-popover.open { display: block; }
    .notif-item-card {
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--surface-soft);
      border: 1px solid var(--bdr);
      margin-top: 8px;
      font-size: 0.84rem;
    }

    .mode-switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px 4px 6px;
      border-radius: 999px;
      background: var(--surface-soft);
      border: 1px solid var(--bdr);
      cursor: pointer;
      user-select: none;
      transition: border-color 0.2s ease, background-color 0.2s ease;
    }
    .mode-switch:hover { border-color: var(--accent); }
    .mode-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
    .mode-track {
      position: relative;
      width: 48px;
      height: 26px;
      border-radius: 999px;
      background: #cbd5e1;
      transition: background-color 0.25s ease;
      display: inline-block;
    }
    .mode-track::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.22);
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .mode-switch input:checked + .mode-track {
      background: #d97706;
    }
    .mode-switch input:checked + .mode-track::after {
      transform: translateX(22px);
    }
    .mode-text { font-size: 0.82rem; font-weight: 800; color: var(--txt); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: 12px;
      border: 1px solid transparent;
      font-weight: 800;
      cursor: pointer;
      text-decoration: none;
      font-size: 0.9rem;
      transition: transform 0.16s ease, box-shadow 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
    }
    .btn:hover { transform: translateY(-1.5px); }
    .btn:active { transform: translateY(0) scale(0.985); }

    .btn-blue {
      background: linear-gradient(135deg, #1e3a8a, #0a1936);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.35);
      box-shadow: 0 6px 18px rgba(10, 25, 54, 0.25);
    }
    .btn-blue:hover { box-shadow: 0 10px 24px rgba(10, 25, 54, 0.38); }

    .btn-teal {
      background: linear-gradient(135deg, #0f172a, #1e3a8a);
      color: #fde68a;
      border: 1px solid rgba(245, 158, 11, 0.45);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.24);
    }
    .btn-teal:hover { box-shadow: 0 10px 24px rgba(15, 23, 42, 0.36); }

    .btn-gold {
      background: linear-gradient(135deg, #f59e0b, #b45309);
      color: #ffffff;
      box-shadow: 0 6px 18px rgba(217, 119, 6, 0.28);
    }
    .btn-red {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.24);
    }
    .btn-out {
      background: var(--surface);
      color: var(--txt);
      border-color: var(--bdr);
      box-shadow: var(--shadow-sm);
    }
    .btn-out:hover { border-color: var(--accent); background: var(--surface-soft); }
    .btn-sm { padding: 7px 13px; font-size: 0.82rem; border-radius: 10px; }

    .card, .right-drawer, .landing-hero-card, .course-card, .student-detail-box, .q-builder-card {
      background: var(--surface);
      border: 1px solid var(--bdr);
      border-radius: 18px;
      box-shadow: var(--shadow-md);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .card { padding: 22px; margin-bottom: 18px; }
    .course-card:hover, .landing-hero-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-lg);
    }

    .jakh-week-banner {
      background: linear-gradient(120deg, #0a1936 0%, #1e3a8a 100%);
      color: #fff;
      padding: 20px 24px;
      border-radius: 18px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(251, 191, 36, 0.35);
    }
    .you-here-pill {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 5px 14px; border-radius: 999px;
      border: 1px solid rgba(251, 191, 36, 0.65);
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24; font-weight: 800; font-size: 0.84rem; white-space: nowrap;
    }
    .lecture-accordion-list { display: flex; flex-direction: column; gap: 12px; }
    .lec-accordion-item {
      border-radius: 16px;
      border: 1px solid var(--bdr);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.18s ease;
    }
    .lec-accordion-item.is-open {
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
    }
    .lec-accordion-header {
      width: 100%;
      background: var(--surface-soft);
      border: none;
      color: var(--txt);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      text-align: right;
      transition: background-color 0.22s ease, color 0.22s ease;
    }
    .lec-accordion-item.is-open .lec-accordion-header {
      background: linear-gradient(120deg, #0a1936 0%, #1e3a8a 100%);
      color: #ffffff;
    }
    .lec-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .lec-chevron-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #f59e0b;
      color: #091a38;
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
      transition: transform 0.25s ease;
    }
    .lec-accordion-item:not(.is-open) .lec-chevron-circle {
      transform: rotate(180deg);
    }
    .lec-counter-badge {
      font-weight: 800;
      font-size: 0.9rem;
      opacity: 0.92;
      direction: ltr;
    }
    .lec-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex: 1;
    }
    .lec-main-title {
      font-weight: 900;
      font-size: 1.04rem;
      line-height: 1.45;
    }
    .lec-sub-icons {
      font-size: 0.85rem;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .lec-accordion-body {
      display: none;
      padding: 18px;
      background: var(--surface);
      border-top: 1px solid var(--bdr);
    }
    .lec-accordion-item.is-open .lec-accordion-body {
      display: block;
    }

    .sub-topic-list { display: flex; flex-direction: column; gap: 10px; }
    .sub-topic-card {
      border: 1px solid var(--bdr);
      border-radius: 14px;
      background: var(--surface-soft);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }
    .sub-topic-card.sub-open { border-color: var(--accent); }
    .sub-topic-head {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--txt);
      padding: 13px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 800;
      font-size: 0.98rem;
      text-align: right;
    }
    .sub-topic-left {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 0.86rem;
      font-weight: 800;
    }
    .sub-topic-panel {
      display: none;
      padding: 14px 18px 16px;
      background: var(--surface);
      border-top: 1px solid var(--bdr);
    }
    .sub-topic-card.sub-open .sub-topic-panel { display: block; }

    .jakh-action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 16px; border-radius: 11px;
      background: linear-gradient(135deg, #1e3a8a, #0a1936);
      color: #fbbf24; font-weight: 800; font-size: 0.85rem;
      text-decoration: none; border: 1px solid rgba(251, 191, 36, 0.35); cursor: pointer;
      box-shadow: 0 5px 14px rgba(10, 25, 54, 0.28);
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .jakh-action-btn:hover { transform: translateY(-1px); opacity: 0.96; }

    .field { margin-bottom: 14px; }
    label { display: block; font-weight: 800; margin-bottom: 6px; font-size: 0.88rem; color: var(--txt); }

    .pwd-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .pwd-input-wrap input {
      padding-left: 44px;
    }
    .pwd-eye-btn {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 1.05rem;
      line-height: 1;
      padding: 4px;
      display: grid;
      place-items: center;
    }
    .pwd-eye-btn:hover {
      color: var(--accent);
    }

    input, select, textarea {
      width: 100%;
      padding: 11px 15px;
      border-radius: 12px;
      border: 1px solid var(--bdr);
      background: var(--surface-soft);
      color: var(--txt);
      font-size: 0.94rem;
      font-weight: 600;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
    }
    input:focus, select:focus, textarea:focus {
      background: var(--surface);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
    }
    textarea { min-height: 96px; resize: vertical; }
    input[type="radio"], input[type="checkbox"] { width: auto; box-shadow: none; }

    .floating-admin-avatar {
      position: fixed;
      bottom: 18px;
      left: 18px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--accent);
      box-shadow: var(--shadow-md);
      z-index: 60;
      background: var(--surface);
      display: block;
      transition: transform 0.2s ease;
    }
    .floating-admin-avatar:hover { transform: scale(1.08); }
    .floating-admin-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }

    .support-fab-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      height: 58px;
      padding: 0 20px;
      border-radius: 999px;
      border: 1.5px solid rgba(251, 191, 36, 0.5);
      background: linear-gradient(135deg, #0a1936 0%, #1e3a8a 100%);
      color: #fbbf24;
      font-weight: 900;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 14px 32px rgba(10, 25, 54, 0.42);
      z-index: 80;
      transition: transform 0.18s ease, box-shadow 0.2s ease;
    }
    .support-fab-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 18px 38px rgba(10, 25, 54, 0.54);
    }
    .support-fab-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.18);
      display: grid;
      place-items: center;
      font-size: 1.15rem;
    }
    .support-fab-dot {
      position: relative;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: #f59e0b;
      color: #091a38;
      font-size: 0.76rem;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .support-fab-dot.hidden-badge { display: none; }

    .support-chat-window {
      display: none;
      position: fixed;
      bottom: 92px;
      right: 20px;
      width: min(445px, calc(100vw - 24px));
      height: min(620px, calc(100vh - 116px));
      background: var(--surface);
      border: 1px solid var(--bdr);
      border-radius: 22px;
      box-shadow: var(--shadow-lg);
      z-index: 85;
      flex-direction: column;
      overflow: hidden;
    }
    .support-chat-window.open {
      display: flex;
    }
    .support-chat-header {
      background: linear-gradient(120deg, #0a1936, #1e3a8a);
      color: #ffffff;
      padding: 15px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .support-chat-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      font-weight: 900;
      cursor: pointer;
    }
    .support-chat-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 11px;
      background: var(--bg);
    }
    .chat-bubble-bot {
      background: var(--surface);
      border: 1px solid var(--bdr);
      color: var(--txt);
      padding: 11px 14px;
      border-radius: 15px 15px 15px 4px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-start;
      box-shadow: var(--shadow-sm);
    }
    .chat-bubble-user {
      background: linear-gradient(135deg, #1e3a8a, #0a1936);
      color: #ffffff;
      padding: 11px 14px;
      border-radius: 15px 15px 4px 15px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-end;
      box-shadow: var(--shadow-sm);
    }
    .chat-bubble-admin {
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.36);
      color: var(--txt);
      padding: 11px 14px;
      border-radius: 15px 15px 15px 4px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-start;
    }
    .chat-msg-img {
      max-width: 100%;
      max-height: 190px;
      border-radius: 10px;
      margin-top: 6px;
      display: block;
      object-fit: contain;
    }
    .support-name-box {
      padding: 13px 15px;
      border-top: 1px solid var(--bdr);
      background: var(--surface);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .support-composer-wrap {
      border-top: 1px solid var(--bdr);
      background: var(--surface);
      padding: 11px 13px;
    }
    .support-img-chip {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: var(--surface-soft);
      border: 1px solid var(--bdr);
      border-radius: 10px;
      padding: 6px 10px;
      margin-bottom: 8px;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .support-img-chip.has-img {
      display: flex;
    }
    .support-composer-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .plus-attach-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      border: 1.5px solid var(--accent);
      background: var(--surface-soft);
      color: var(--accent);
      font-size: 1.4rem;
      font-weight: 900;
      display: grid;
      place-items: center;
      cursor: pointer;
      flex-shrink: 0;
    }
    .plus-attach-btn:hover {
      background: var(--accent);
      color: #ffffff;
    }

    .inline-dua-banner {
      max-width: 1240px;
      margin: 14px auto 0;
      padding: 14px 20px;
      border-radius: 16px;
      background: linear-gradient(120deg, #0a1936, #1e3a8a);
      color: #fff;
      box-shadow: var(--shadow-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease, padding 0.4s ease;
      max-height: 150px;
      opacity: 1;
      overflow: hidden;
    }
    .inline-dua-banner.dua-done {
      max-height: 0; opacity: 0; margin-top: 0; padding-top: 0; padding-bottom: 0; pointer-events: none;
    }
    .inline-dua-left { display: flex; align-items: center; gap: 12px; }
    .inline-dua-avatar {
      width: 52px; height: 64px; border-radius: 12px;
      object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.16);
      border: 1.5px solid rgba(251, 191, 36, 0.65); flex-shrink: 0;
    }
    .inline-dua-text { font-weight: 900; font-size: 1.05rem; }
    .inline-dua-sub { font-size: 0.8rem; opacity: 0.92; }

    .glow-notice-wrap {
      max-width: 1240px;
      margin: 14px auto 0;
      padding: 0 16px;
      z-index: 15;
    }
    .glow-notice-box {
      background: var(--surface);
      color: var(--txt);
      border: 1px solid var(--gold-soft);
      border-right: 4px solid var(--gold-soft);
      border-radius: 14px;
      padding: 12px 18px;
      font-weight: 800;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
    .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
    .row {
      background: var(--surface-soft);
      border: 1px solid var(--bdr);
      border-radius: 14px;
      padding: 13px 16px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill { display: inline-block; padding: 3px 11px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }
    .pill-ok { background: rgba(30, 58, 138, 0.14); color: var(--accent); }
    body.dark .pill-ok { background: rgba(245, 158, 11, 0.16); color: #fbbf24; }
    .pill-warn { background: rgba(217, 119, 6, 0.16); color: var(--gold); }
    body.dark .pill-warn { color: #fcd34d; }
    .pill-err { background: rgba(220, 38, 38, 0.15); color: var(--err); }
    .msg-err {
      background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.35);
      color: var(--err); padding: 12px 16px; border-radius: 12px; font-weight: 800; margin-bottom: 14px;
    }
    .msg-ok {
      background: rgba(30, 58, 138, 0.12); border: 1px solid rgba(30, 58, 138, 0.35);
      color: var(--accent); padding: 12px 16px; border-radius: 12px; font-weight: 800; margin-bottom: 14px;
    }
    body.dark .msg-ok { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.35); color: #fbbf24; }
    .muted { color: var(--muted); }

    .dash-shell {
      max-width: 1240px; margin: 22px auto; padding: 0 16px 48px;
      display: grid; grid-template-columns: 1fr 260px; gap: 20px; align-items: start;
    }
    .dash-shell.collapsed { grid-template-columns: 1fr 76px; }
    @media (max-width: 880px) { .dash-shell, .dash-shell.collapsed { grid-template-columns: 1fr; } }

    .right-drawer { padding: 16px 12px; position: sticky; top: 76px; }
    .drawer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
    .collapse-btn {
      width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--bdr);
      background: var(--surface-soft); color: var(--txt); font-weight: 900; cursor: pointer;
    }
    .nav-item-link {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: right;
      padding: 10px 12px; border-radius: 11px; border: none; background: transparent;
      color: var(--txt); font-weight: 800; text-decoration: none; cursor: pointer;
      font-size: 0.9rem; margin-bottom: 4px; transition: background-color 0.18s ease, color 0.18s ease;
    }
    .nav-item-link:hover { background: var(--surface-soft); }
    .nav-item-link.active { background: linear-gradient(135deg, #0a1936, #1e3a8a); color: #fbbf24; }
    .sub-nav { padding-right: 14px; margin-bottom: 8px; }
    .sub-link {
      display: block; padding: 5px 12px; border-radius: 9px; color: var(--muted);
      text-decoration: none; font-weight: 700; font-size: 0.83rem; margin-bottom: 2px;
    }
    .sub-link.active, .sub-link:hover { background: var(--surface-soft); color: var(--accent); }
    .dash-shell.collapsed .nav-label, .dash-shell.collapsed .sub-nav, .dash-shell.collapsed .drawer-title { display: none; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi-card {
      background: linear-gradient(135deg, #0a1936 0%, #1e3a8a 100%);
      color: #fff; border-radius: 16px; padding: 18px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(251, 191, 36, 0.25);
    }
    .kpi-card.teal-kpi { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); }
    .kpi-card.gold-kpi { background: linear-gradient(135deg, #1e3a8a 0%, #0a1936 100%); }
    .kpi-num { font-size: 1.62rem; font-weight: 900; line-height: 1.1; color: #fbbf24; }
    .kpi-lbl { font-size: 0.86rem; font-weight: 700; opacity: 0.94; margin-top: 4px; }
    .kpi-icon-box {
      width: 46px; height: 46px; border-radius: 13px; background: rgba(251, 191, 36, 0.16);
      display: grid; place-items: center; font-size: 1.2rem; font-weight: 900;
    }

    .progress-layout { display: grid; grid-template-columns: 280px 1fr; gap: 18px; margin-bottom: 18px; }
    @media (max-width: 820px) { .progress-layout { grid-template-columns: 1fr; } }
    .progress-frame {
      background: var(--surface); border: 1px solid var(--bdr);
      border-radius: 18px; padding: 18px; text-align: center; box-shadow: var(--shadow-md);
    }
    .teacher-color-meter {
      position: relative; width: 144px; height: 184px; margin: 10px auto;
      border-radius: 14px; overflow: hidden; border: 1px solid var(--bdr); background: var(--surface-soft);
    }
    .teacher-color-meter img { width: 100%; height: 100%; object-fit: contain; object-position: center top; display: block; }
    .teacher-color-meter .bw-layer { filter: grayscale(100%) contrast(1.05); }
    .teacher-color-meter .color-reveal { position: absolute; inset: 0; overflow: hidden; transition: clip-path 0.45s ease; }
    .prog-bar-bg { height: 8px; border-radius: 999px; background: var(--surface-soft); overflow: hidden; margin: 10px 0; }
    .prog-bar-fill { height: 100%; background: linear-gradient(90deg, #1e3a8a, #f59e0b); border-radius: 999px; transition: width 0.4s ease; }

    .course-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(265px, 1fr)); gap: 16px; }
    .course-card { overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
    .branch-book-card {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(251, 191, 36, 0.35);
      padding: 7px 11px; border-radius: 12px;
    }
    .branch-book-card img {
      width: 52px; height: 66px; object-fit: contain; object-position: center top;
      background: rgba(15, 23, 42, 0.3); border-radius: 8px; border: 1.5px solid #fbbf24;
    }
    .course-banner {
      min-height: 156px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #0a1936 0%, #1e3a8a 100%);
      color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
    }
    .course-banner img.book-thumb {
      width: 72px; height: 94px; object-fit: contain; object-position: center top;
      background: rgba(15, 23, 42, 0.3); border-radius: 10px; border: 1.5px solid rgba(251, 191, 36, 0.75); flex-shrink: 0;
    }
    .course-body { padding: 16px; }
    .course-title { font-weight: 900; font-size: 1rem; margin-bottom: 6px; }

    .landing-hero-box { max-width: 1120px; margin: 24px auto 0; padding: 0 16px; }
    .landing-hero-card { padding: 26px; display: grid; grid-template-columns: 310px 1fr; gap: 26px; align-items: center; }
    @media (max-width: 860px) { .landing-hero-card { grid-template-columns: 1fr; } }
    .hero-teacher-frame {
      background: linear-gradient(155deg, rgba(30, 58, 138, 0.12), rgba(245, 158, 11, 0.12));
      border-radius: 16px; padding: 12px; display: flex; justify-content: center; align-items: center;
      min-height: 340px; border: 1px solid var(--bdr);
    }
    .hero-teacher-frame img {
      width: 100%; max-height: 340px; object-fit: contain; object-position: center top;
      border-radius: 12px; display: block;
    }
    .landing-start-section { max-width: 1120px; margin: 22px auto 36px; padding: 0 16px; }

    .split-auth {
      max-width: 1060px; margin: 22px auto; padding: 0 16px;
      display: grid; grid-template-columns: 1fr 1.12fr; gap: 20px; align-items: stretch;
    }
    @media (max-width: 840px) { .split-auth { grid-template-columns: 1fr; } }
    .promo-pane {
      background: linear-gradient(155deg, #0a1936 0%, #1e3a8a 100%);
      color: #fff; border-radius: 18px; padding: 24px; box-shadow: var(--shadow-md);
      display: flex; flex-direction: column; justify-content: space-between; min-height: 440px;
      border: 1px solid rgba(251, 191, 36, 0.25);
    }
    .promo-pane.gold-mode { background: linear-gradient(155deg, #0f172a 0%, #1e3a8a 100%); }
    .promo-img {
      width: 215px; height: 265px; object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 14px; border: 1.5px solid rgba(251, 191, 36, 0.5); margin: 14px auto 0; display: block;
    }
    .step-track { height: 6px; background: var(--surface-soft); border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
    .step-fill { height: 100%; background: linear-gradient(90deg, #1e3a8a, #f59e0b); }

    .secure-player-box {
      position: relative; width: 100%; max-width: 920px; aspect-ratio: 16 / 9; margin: 12px auto 0;
      border-radius: 16px; overflow: hidden; background: #000;
      border: 1px solid var(--bdr); user-select: none; box-shadow: var(--shadow-md);
    }
    .secure-player-box video, .secure-player-box iframe { width: 100%; height: 100%; min-height: 100%; display: block; border: none; }
    .watermark-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
    .watermark-tag {
      position: absolute; color: rgba(255, 255, 255, 0.34); font-size: 0.84rem;
      font-weight: 800; transform: rotate(-15deg); white-space: nowrap;
      animation: wmDrift 12s infinite alternate ease-in-out;
    }
    @keyframes wmDrift {
      0% { top: 14%; right: 8%; }
      50% { top: 46%; right: 32%; }
      100% { top: 72%; right: 12%; }
    }
    .ticket-img-thumb { max-width: 260px; max-height: 220px; object-fit: contain; border-radius: 10px; border: 1px solid var(--bdr); margin-top: 8px; display: block; }
    .branch-toggle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 10px 0; }
    .branch-check-pill {
      display: flex; align-items: center; gap: 6px; padding: 8px 12px;
      border-radius: 10px; background: var(--surface); border: 1px solid var(--bdr);
      font-size: 0.84rem; font-weight: 800; cursor: pointer;
    }
    .branch-check-pill input { width: auto; }
    .q-builder-card { padding: 16px; margin-bottom: 14px; }
    .opt-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .student-detail-box { padding: 18px; margin-top: 16px; }
    .price-summary-box {
      background: var(--surface-soft);
      border: 1px solid var(--bdr);
      border-radius: 16px;
      padding: 16px;
      margin: 14px 0;
    }

    .site-footer {
      width: 100%;
      margin-top: 40px;
      background: #050d1e;
      color: #f8fafc;
      border-top: 2px solid #f59e0b;
      padding: 34px 24px 24px;
    }
    .footer-inner {
      max-width: 1180px;
      margin: 0 auto;
    }
    .footer-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1.1fr;
      gap: 28px;
      align-items: center;
    }
    @media (max-width: 780px) {
      .footer-columns { grid-template-columns: 1fr; text-align: center; }
    }
    .footer-col-title {
      font-weight: 900;
      font-size: 1.04rem;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .footer-social-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    @media (max-width: 780px) {
      .footer-social-list { align-items: center; }
    }
    .social-row-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #f8fafc;
      text-decoration: none;
      font-weight: 800;
      font-size: 0.94rem;
      transition: transform 0.16s ease, color 0.16s ease;
    }
    .social-row-link:hover {
      transform: translateX(-3px);
      color: #fbbf24;
    }
    .social-row-link.disabled-link {
      opacity: 0.45;
      pointer-events: none;
    }
    .social-sq-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: inline-grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.85rem;
      color: #ffffff;
      flex-shrink: 0;
    }
    .icon-fb { background: #1877f2; }
    .icon-tt { background: #111827; border: 1px solid #fbbf24; color: #fbbf24; }
    .icon-yt { background: #ef4444; }

    .footer-nav-stack {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .footer-page-link {
      color: #f8fafc;
      text-decoration: none;
      font-weight: 800;
      font-size: 1rem;
      transition: color 0.16s ease;
    }
    .footer-page-link:hover { color: #fbbf24; }

    .footer-brand-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    @media (max-width: 780px) {
      .footer-brand-box { align-items: center; }
    }
    .footer-brand-emblem {
      font-size: 2rem;
      font-weight: 900;
      color: #fbbf24;
      letter-spacing: 0.5px;
    }
    .footer-copyright-line {
      font-size: 0.9rem;
      font-weight: 800;
      color: #fbbf24;
    }
    .footer-dev-line {
      font-size: 0.86rem;
      font-weight: 800;
      color: #f59e0b;
      direction: ltr;
    }
  </style>
</head>
<body>
  <div id="screenBlackoutGuard" aria-hidden="true"></div>
  <div id="arabicBg" aria-hidden="true"></div>

  ${showLandingAdminAvatar ? `
    <a class="floating-admin-avatar" href="/admin" title="دخول الأدمن والأسيستانت" aria-label="Admin">
      <img src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
    </a>
  ` : ""}

  ${showSupportWidget ? `
    <button type="button" class="support-fab-btn" id="supportFabBtn" title="الدعم الفني" aria-label="الدعم الفني">
      <span class="support-fab-icon">🎧</span>
      <span>الدعم الفني</span>
      <span class="support-fab-dot hidden-badge" id="supportChatBadge">0</span>
    </button>

    <div class="support-chat-window" id="supportChatWindow" role="dialog" aria-label="الدعم الفني">
      <div class="support-chat-header">
        <div>
          <div style="font-weight:900; font-size:1rem;">الدعم الفني لمستر محمد يوسف</div>
          <div style="font-size:0.76rem; opacity:0.94;">مساعد فني مباشر • ${PLATFORM_NAME}</div>
        </div>
        <button type="button" class="support-chat-close" id="supportCloseBtn">✕</button>
      </div>

      <div class="support-chat-body" id="supportChatBody"></div>

      <div class="support-name-box" id="supportNameBox">
        <input type="text" id="supportVisitorNameInput" placeholder="ضع اسمك هنا..." value="${esc(defaultChatName)}" style="flex:1; padding:9px 12px; font-size:0.88rem;" />
        <button type="button" class="btn btn-blue btn-sm" id="supportSaveNameBtn">تأكيد الاسم</button>
      </div>

      <form class="support-composer-wrap" id="supportChatForm" style="display:none;">
        <div class="support-img-chip" id="supportImgChip">
          <span id="supportImgName">صورة مرفقة</span>
          <button type="button" class="btn btn-red btn-sm" style="padding:3px 9px; font-size:0.75rem;" id="supportClearImgBtn">إزالة</button>
        </div>
        <div class="support-composer-row">
          <button type="button" class="plus-attach-btn" id="supportPlusBtn" title="إرفاق صورة واحدة">+</button>
          <input type="file" id="supportSingleImageFile" accept="image/*" style="display:none;" />
          <input type="text" id="supportMsgInput" placeholder="اكتب رسالتك أو سؤالك..." style="flex:1; padding:10px 12px; font-size:0.88rem;" />
          <button type="submit" class="btn btn-blue btn-sm" style="padding:10px 15px;">إرسال</button>
        </div>
      </form>
    </div>
  ` : ""}

  <div class="page-layer">
    <header class="topbar">
      <div class="brand-box">
        <div class="brand-logo-badge">${PLATFORM_NAME}</div>
        <div>
          <div style="font-weight:900; font-size:1.08rem; color:var(--accent);">${PLATFORM_NAME} — مع محمد يوسف</div>
          <div class="muted" style="font-size:0.78rem; font-weight:700;">اللغة العربية للثانوية الأزهرية (خبرة 30 عاماً)</div>
        </div>
      </div>

      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        ${!isAdmin ? `
          <div class="notif-bell-wrap">
            <button type="button" class="blue-bell-btn ${academicUnreadCount > 0 ? "has-alert" : ""}" id="yellowNotifBellBtn" title="إشعارات الردود">
              <span>🔔</span>
              <span class="bell-badge-num ${academicUnreadCount > 0 ? "" : "hidden-badge"}" id="yellowBellBadge">${academicUnreadCount}</span>
            </button>
            <div class="notif-popover" id="yellowNotifPopover">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--bdr); padding-bottom:8px;">
                <strong style="font-size:0.92rem;">إشعارات الردود</strong>
                <span class="pill pill-warn">الدعم الفني والعلمي</span>
              </div>
              <div id="yellowNotifList"></div>
            </div>
          </div>
        ` : ""}

        <label class="mode-switch" title="تبديل الوضع النهاري والليلي">
          <input type="checkbox" id="themeToggle" />
          <span class="mode-track"></span>
          <span class="mode-text" id="themeLabelText">نهار</span>
        </label>
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
          <div class="inline-dua-sub">دعاء البداية • ${PLATFORM_NAME} — معلم أول اللغة العربية الأزهرية</div>
        </div>
      </div>
      <button type="button" class="btn btn-out btn-sm" style="color:var(--txt);" id="hideDuaBtn">إخفاء</button>
    </div>

    ${hasNotice ? `
      <div class="glow-notice-wrap">
        <div class="glow-notice-box">
          <span>📢</span>
          <span>${esc(settings.global_notice)}</span>
        </div>
      </div>
    ` : ""}

    ${bodyHtml}

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-columns">
          <div>
            <div class="footer-col-title">السوشيال ميديا</div>
            <div class="footer-social-list">
              <a class="social-row-link ${fbHref ? "" : "disabled-link"}" ${fbHref ? `href="${esc(fbHref)}" target="_blank" rel="noopener"` : `href="javascript:void(0)"`}>
                <span class="social-sq-icon icon-fb">f</span>
                <span>فيسبوك</span>
              </a>
              <a class="social-row-link ${ttHref ? "" : "disabled-link"}" ${ttHref ? `href="${esc(ttHref)}" target="_blank" rel="noopener"` : `href="javascript:void(0)"`}>
                <span class="social-sq-icon icon-tt">♪</span>
                <span>تيك توك</span>
              </a>
              <a class="social-row-link ${ytHref ? "" : "disabled-link"}" ${ytHref ? `href="${esc(ytHref)}" target="_blank" rel="noopener"` : `href="javascript:void(0)"`}>
                <span class="social-sq-icon icon-yt">▶</span>
                <span>يوتيوب</span>
              </a>
            </div>
          </div>

          <div class="footer-nav-stack">
            <a class="footer-page-link" href="/about">من نحن</a>
            <a class="footer-page-link" href="/privacy" target="_blank" rel="noopener">سياسة الخصوصية</a>
          </div>

          <div class="footer-brand-box">
            <div class="footer-brand-emblem">${PLATFORM_NAME}</div>
            <div class="footer-copyright-line">جميع الحقوق محفوظة © 2026</div>
            <div class="footer-dev-line">&lt;Developed by="MOAZ"</div>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <script>
    (function () {
      const toggleEl = document.getElementById("themeToggle");
      const labelEl = document.getElementById("themeLabelText");
      const isSavedDark = localStorage.getItem("nb_py_theme") === "dark";
      if (isSavedDark) {
        document.body.classList.add("dark");
        if (toggleEl) toggleEl.checked = true;
        if (labelEl) labelEl.textContent = "ليلي";
      }
      toggleEl?.addEventListener("change", function () {
        const dark = document.body.classList.toggle("dark", toggleEl.checked);
        localStorage.setItem("nb_py_theme", dark ? "dark" : "light");
        if (labelEl) labelEl.textContent = dark ? "ليلي" : "نهار";
      });
    })();

    (function initPasswordEyes() {
      document.querySelectorAll("input[type='password']").forEach(function (inp) {
        if (inp.closest(".pwd-input-wrap")) return;
        const wrap = document.createElement("div");
        wrap.className = "pwd-input-wrap";
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);

        const eyeBtn = document.createElement("button");
        eyeBtn.type = "button";
        eyeBtn.className = "pwd-eye-btn";
        eyeBtn.title = "إظهار / إخفاء كلمة السر";
        eyeBtn.setAttribute("aria-label", "إظهار / إخفاء كلمة السر");
        eyeBtn.textContent = "👁️";

        eyeBtn.addEventListener("click", function () {
          const isHidden = inp.type === "password";
          inp.type = isHidden ? "text" : "password";
          eyeBtn.textContent = isHidden ? "🙈" : "👁️";
        });

        wrap.appendChild(eyeBtn);
      });
    })();

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

    (function renderFastRoamingArabicLetters() {
      const container = document.getElementById("arabicBg");
      if (!container) return;
      const letters = "أبجدهوزحطيكلمنسعفصقرشتثخذضظغى".split("");
      for (let i = 0; i < 48; i++) {
        const span = document.createElement("span");
        span.className = "ar-glyph";
        span.textContent = letters[i % letters.length];
        const leftPct = (i * 19) % 93;
        const topPct = (i * 29) % 91;
        const size = 28 + ((i * 7) % 28);
        const dur = 1.45 + ((i * 3) % 5) * 0.35;
        const delay = -((i * 0.5) % 2.5);
        const dx = (i % 2 === 0 ? 1 : -1) * (85 + (i % 65));
        const dy = (i % 3 === 0 ? -1 : 1) * (80 + (i % 60));
        span.style.left = leftPct + "%";
        span.style.top = topPct + "%";
        span.style.fontSize = size + "px";
        span.style.setProperty("--dur", dur + "s");
        span.style.setProperty("--delay", delay + "s");
        span.style.setProperty("--dx", dx + "px");
        span.style.setProperty("--dy", dy + "px");
        container.appendChild(span);
      }
    })();

    (function enforceOnScreenshotOrCaptureOnly() {
      let blackoutTimer = null;
      function triggerOnCapture(ms = 2600) {
        document.body.classList.add("screen-blackout");
        document.querySelectorAll("video").forEach((v) => { try { v.pause(); } catch {} });
        clearTimeout(blackoutTimer);
        blackoutTimer = setTimeout(function () {
          document.body.classList.remove("screen-blackout");
        }, ms);
      }

      document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      document.addEventListener("copy", function (e) { e.preventDefault(); });

      window.addEventListener("keydown", function (e) {
        const k = (e.key || "").toLowerCase();
        const isScreenshotKey =
          e.key === "PrintScreen" ||
          e.code === "PrintScreen" ||
          (e.ctrlKey && ["s", "u", "p", "c"].includes(k)) ||
          (e.metaKey && ["s", "p", "c", "g"].includes(k)) ||
          (e.ctrlKey && e.shiftKey && ["i", "j", "c", "s"].includes(k)) ||
          (e.metaKey && e.shiftKey && ["3", "4", "5", "s"].includes(k));
        if (isScreenshotKey) {
          e.preventDefault();
          triggerOnCapture(3200);
        }
      }, true);

      window.addEventListener("keyup", function (e) {
        if (e.key === "PrintScreen" || e.code === "PrintScreen") {
          triggerOnCapture(3200);
        }
      }, true);
    })();

    (function initSupportAndBellNotifications() {
      const fabBtn = document.getElementById("supportFabBtn");
      const winEl = document.getElementById("supportChatWindow");
      const closeBtn = document.getElementById("supportCloseBtn");
      const bodyEl = document.getElementById("supportChatBody");
      const nameBox = document.getElementById("supportNameBox");
      const nameInput = document.getElementById("supportVisitorNameInput");
      const saveNameBtn = document.getElementById("supportSaveNameBtn");
      const formEl = document.getElementById("supportChatForm");
      const plusBtn = document.getElementById("supportPlusBtn");
      const fileInput = document.getElementById("supportSingleImageFile");
      const imgChip = document.getElementById("supportImgChip");
      const imgNameLbl = document.getElementById("supportImgName");
      const clearImgBtn = document.getElementById("supportClearImgBtn");
      const msgInput = document.getElementById("supportMsgInput");
      const chatBadge = document.getElementById("supportChatBadge");

      const bellBtn = document.getElementById("yellowNotifBellBtn");
      const bellBadge = document.getElementById("yellowBellBadge");
      const bellPopover = document.getElementById("yellowNotifPopover");
      const bellList = document.getElementById("yellowNotifList");

      let sessionId = localStorage.getItem("jakh_sup_sid") || "";
      if (!sessionId) {
        sessionId = "sup_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        localStorage.setItem("jakh_sup_sid", sessionId);
      }

      let visitorName = localStorage.getItem("jakh_sup_name") || ${safeJsonForScript(defaultChatName)} || "";
      let attachedSingleImage = "";
      let messages = [];
      let readAdminIds = [];
      try {
        readAdminIds = JSON.parse(localStorage.getItem("jakh_sup_read_ids") || "[]");
        if (!Array.isArray(readAdminIds)) readAdminIds = [];
      } catch {
        readAdminIds = [];
      }

      let dismissedAcademicKeys = [];
      try {
        dismissedAcademicKeys = JSON.parse(localStorage.getItem("jakh_acad_dismissed") || "[]");
        if (!Array.isArray(dismissedAcademicKeys)) dismissedAcademicKeys = [];
      } catch {
        dismissedAcademicKeys = [];
      }

      const serverAcademicItems = ${safeJsonForScript(academicUnreadItems)};

      function escLocal(s) {
        return String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function getAdminMsgKey(m, idx) {
        return String(m.id || m.at || ("adm_" + idx + "_" + (m.text || "").slice(0, 20)));
      }

      function getUnreadAdminMessages() {
        const list = [];
        messages.forEach(function (m, idx) {
          if (m.sender === "admin") {
            const k = getAdminMsgKey(m, idx);
            if (!readAdminIds.includes(k)) {
              list.push({ msg: m, key: k });
            }
          }
        });
        return list;
      }

      function persistReadStateToServer(ids) {
        fetch("/api/support/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, read_admin_ids: ids })
        }).catch(function () {});
      }

      function markAllCurrentAdminMessagesAsRead() {
        let changed = false;
        messages.forEach(function (m, idx) {
          if (m.sender === "admin") {
            const k = getAdminMsgKey(m, idx);
            if (!readAdminIds.includes(k)) {
              readAdminIds.push(k);
              changed = true;
            }
          }
        });
        localStorage.setItem("jakh_sup_read_ids", JSON.stringify(readAdminIds));
        if (changed) persistReadStateToServer(readAdminIds);
      }

      function refreshAllBells() {
        if (winEl && winEl.classList.contains("open")) {
          markAllCurrentAdminMessagesAsRead();
        }
        const unreadAdmin = getUnreadAdminMessages();
        const supUnread = unreadAdmin.length;
        const acadUnreadList = serverAcademicItems.filter(it => !dismissedAcademicKeys.includes(it.key));
        const totalUnread = supUnread + acadUnreadList.length;

        if (chatBadge) {
          chatBadge.textContent = String(supUnread);
          chatBadge.classList.toggle("hidden-badge", supUnread <= 0);
        }

        if (bellBadge) {
          bellBadge.textContent = String(totalUnread);
          bellBadge.classList.toggle("hidden-badge", totalUnread <= 0);
        }

        if (bellBtn) {
          bellBtn.classList.toggle("has-alert", totalUnread > 0);
        }

        if (bellList) {
          const cards = [];
          if (supUnread > 0) {
            const latestAdminMsg = unreadAdmin[unreadAdmin.length - 1].msg;
            cards.push(
              '<div class="notif-item-card">' +
                '<span class="pill pill-ok">الدعم الفني</span>' +
                '<div style="font-weight:800; margin-top:4px;">رسالة جديدة من الدعم الفني (' + supUnread + ')</div>' +
                (latestAdminMsg?.text ? '<div class="muted" style="margin-top:2px;">' + escLocal(latestAdminMsg.text.slice(0, 75)) + '</div>' : '') +
                '<button type="button" class="btn btn-blue btn-sm" style="margin-top:6px;" id="openChatFromBellBtn">فتح الرسالة وإخفاء الإشعار</button>' +
              '</div>'
            );
          }
          acadUnreadList.forEach(it => {
            cards.push(
              '<div class="notif-item-card">' +
                '<span class="pill pill-warn">' + escLocal(it.kind) + '</span>' +
                '<div style="font-weight:800; margin-top:4px;">' + escLocal(it.title) + '</div>' +
                '<div class="muted" style="margin-top:2px;">' + escLocal(it.preview) + '</div>' +
                '<a href="' + escLocal(it.href) + '" data-acad-key="' + escLocal(it.key) + '" class="acad-open-link" style="display:inline-block; margin-top:6px; font-weight:800; font-size:0.8rem; color:var(--accent);">عرض الرد</a>' +
              '</div>'
            );
          });
          bellList.innerHTML = cards.length
            ? cards.join("")
            : '<div class="muted" style="font-size:0.84rem; margin-top:10px;">لا توجد إشعارات جديدة حالياً.</div>';

          document.getElementById("openChatFromBellBtn")?.addEventListener("click", function () {
            bellPopover?.classList.remove("open");
            winEl?.classList.add("open");
            markAllCurrentAdminMessagesAsRead();
            renderChatMessages();
          });

          bellList.querySelectorAll(".acad-open-link").forEach(function (lnk) {
            lnk.addEventListener("click", function () {
              const k = lnk.getAttribute("data-acad-key");
              if (k && !dismissedAcademicKeys.includes(k)) {
                dismissedAcademicKeys.push(k);
                localStorage.setItem("jakh_acad_dismissed", JSON.stringify(dismissedAcademicKeys));
              }
              refreshAllBells();
            });
          });
        }
      }

      bellBtn?.addEventListener("click", function (e) {
        e.stopPropagation();
        bellPopover?.classList.toggle("open");
      });

      document.addEventListener("click", function (e) {
        if (bellPopover && !bellPopover.contains(e.target) && !bellBtn?.contains(e.target)) {
          bellPopover.classList.remove("open");
        }
      });

      function renderChatMessages() {
        if (!bodyEl) return;
        const parts = [];
        parts.push('<div class="chat-bubble-bot">أهلاً بك مع الدعم الفني لمستر محمد يوسف</div>');
        if (!visitorName) {
          parts.push('<div class="chat-bubble-bot">من فضلك ضع اسمك في الخانة بالأسفل لنبدأ.</div>');
        } else {
          parts.push('<div class="chat-bubble-bot">أهلاً بك يا ' + escLocal(visitorName) + '، ضع سؤالك</div>');
        }

        messages.forEach(function (m) {
          if (m.sender === "admin") {
            const senderLbl = m.sender_name ? ("الدعم الفني • " + m.sender_name) : "الدعم الفني • مستر محمد يوسف";
            parts.push(
              '<div class="chat-bubble-admin">' +
                '<div style="font-size:0.74rem; opacity:0.8; margin-bottom:2px;">' + escLocal(senderLbl) + '</div>' +
                (m.text ? '<div>' + escLocal(m.text) + '</div>' : '') +
                (m.image_url ? '<img class="chat-msg-img" src="' + escLocal(m.image_url) + '" alt="مرفق الدعم" />' : '') +
              '</div>'
            );
          } else {
            parts.push(
              '<div class="chat-bubble-user">' +
                (m.text ? '<div>' + escLocal(m.text) + '</div>' : '') +
                (m.image_url ? '<img class="chat-msg-img" src="' + escLocal(m.image_url) + '" alt="صورة مرفقة" />' : '') +
              '</div>'
            );
          }
        });

        bodyEl.innerHTML = parts.join("");
        bodyEl.scrollTop = bodyEl.scrollHeight;

        if (nameBox && formEl) {
          if (visitorName) {
            nameBox.style.display = "none";
            formEl.style.display = "block";
          } else {
            nameBox.style.display = "flex";
            formEl.style.display = "none";
          }
        }
        refreshAllBells();
      }

      async function syncThread() {
        try {
          const res = await fetch("/api/support/thread?session_id=" + encodeURIComponent(sessionId));
          if (!res.ok) return;
          const data = await res.json();
          if (data.visitor_name && !visitorName) {
            visitorName = data.visitor_name;
            localStorage.setItem("jakh_sup_name", visitorName);
          }
          if (Array.isArray(data.read_admin_ids)) {
            data.read_admin_ids.forEach(function (id) {
              if (!readAdminIds.includes(id)) readAdminIds.push(id);
            });
            localStorage.setItem("jakh_sup_read_ids", JSON.stringify(readAdminIds));
          }
          messages = Array.isArray(data.messages) ? data.messages : [];
          if (winEl && winEl.classList.contains("open")) {
            markAllCurrentAdminMessagesAsRead();
          }
          renderChatMessages();
        } catch {}
      }

      fabBtn?.addEventListener("click", function () {
        if (!winEl) return;
        const willOpen = !winEl.classList.contains("open");
        winEl.classList.toggle("open", willOpen);
        if (willOpen) {
          markAllCurrentAdminMessagesAsRead();
        }
        renderChatMessages();
        if (willOpen) syncThread();
      });

      closeBtn?.addEventListener("click", function () {
        winEl?.classList.remove("open");
        refreshAllBells();
      });

      async function confirmVisitorName() {
        const val = (nameInput?.value || "").trim();
        if (!val) {
          nameInput?.focus();
          return;
        }
        visitorName = val;
        localStorage.setItem("jakh_sup_name", visitorName);
        renderChatMessages();
        msgInput?.focus();
        try {
          await fetch("/api/support/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              visitor_name: visitorName,
              student_phone: ${safeJsonForScript(defaultChatPhone)},
              register_name_only: true
            })
          });
        } catch {}
      }

      saveNameBtn?.addEventListener("click", confirmVisitorName);
      nameInput?.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmVisitorName();
        }
      });

      plusBtn?.addEventListener("click", function () { fileInput?.click(); });

      fileInput?.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          attachedSingleImage = "";
          imgChip?.classList.remove("has-img");
          return;
        }
        const reader = new FileReader();
        reader.onload = function () {
          attachedSingleImage = String(reader.result || "");
          if (imgNameLbl) imgNameLbl.textContent = "صورة واحدة: " + file.name;
          imgChip?.classList.add("has-img");
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });

      clearImgBtn?.addEventListener("click", function () {
        attachedSingleImage = "";
        imgChip?.classList.remove("has-img");
      });

      formEl?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const textVal = (msgInput?.value || "").trim();
        if (!textVal && !attachedSingleImage) return;
        if (!visitorName) {
          confirmVisitorName();
          return;
        }

        const msgId = "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const payload = {
          session_id: sessionId,
          visitor_name: visitorName,
          student_phone: ${safeJsonForScript(defaultChatPhone)},
          text: textVal,
          image_url: attachedSingleImage,
          msg_id: msgId
        };

        messages.push({
          id: msgId,
          sender: "user",
          sender_name: visitorName,
          text: textVal,
          image_url: attachedSingleImage,
          at: new Date().toISOString()
        });
        if (msgInput) msgInput.value = "";
        attachedSingleImage = "";
        imgChip?.classList.remove("has-img");
        renderChatMessages();

        try {
          const res = await fetch("/api/support/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.messages)) {
              messages = data.messages;
              renderChatMessages();
            }
          }
        } catch {}
      });

      renderChatMessages();
      syncThread();
      setInterval(syncThread, 7000);
    })();
  </script>
</body>
</html>`;
}

function renderLanding(settings) {
  return `
<div class="landing-hero-box">
  <div class="landing-hero-card">
    <div class="hero-teacher-frame">
      <img src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
    </div>
    <div>
      <span class="pill pill-ok">معلم أول لغة عربية</span>
      <h1 style="font-size:1.85rem; font-weight:900; margin-top:10px; color:var(--accent);">${PLATFORM_NAME} مع محمد يوسف</h1>
      <div style="font-size:1.08rem; font-weight:800; color:var(--gold); margin-top:6px;">
        30 سنة خبرة تدريس في اللغة العربية للثانوية الأزهرية
      </div>
      <p class="muted" style="margin-top:12px; font-size:0.96rem; line-height:1.8;">
        معلم أول لغة عربية بمسيرة تمتد إلى 30 عاماً من العطاء والتميز والتأسيس الدقيق في فروع اللغة العربية السبعة للمرحلة الثانوية الأزهرية (الأول، الثاني، والثالث الثانوي — علمي وأدبي)، مما يجعله جديراً تماماً بقيادة طلابه نحو التفوق والدرجة النهائية بمنهج واضح ومنظم.
      </p>
    </div>
  </div>
</div>

<div class="landing-start-section">
  <div class="card" style="margin-bottom:0; text-align:center; padding:26px 22px;">
    <h2 style="font-size:1.45rem; font-weight:900; margin-bottom:8px;">أهلاً بك في ${PLATFORM_NAME} ✦ ۝ جخ ۝ ✦</h2>
    <p class="muted" style="margin-bottom:20px;">ابدأ رحلتك الآن مع الأستاذ محمد يوسف في فروع اللغة العربية والواجبات والامتحانات.</p>
    <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; max-width:500px; margin:0 auto;">
      <a class="btn btn-teal" style="flex:1; min-width:170px;" href="/student?tab=login">ابدأ معنا</a>
      <a class="btn btn-blue" style="flex:1; min-width:170px;" href="/student?tab=register&step=1">إنشاء حساب جديد</a>
    </div>
  </div>
</div>`;
}

function renderStudentAuth(settings, authTab, step, draft, error, notice) {
  const gradeOpts = GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  const trackOpts = TRACKS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  const govOpts = EGYPT_GOVERNORATES.map(gv => `<option value="${esc(gv)}">${esc(gv)}</option>`).join("");

  if (authTab === "login") {
    return `
    <div class="split-auth">
      <div class="promo-pane">
        <div>
          <h2 style="font-size:1.32rem; font-weight:900;">انضم الآن لمجتمع طلاب الثانوية الأزهرية</h2>
          <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">تعلم اللغة العربية وفروعها السبعة بأسلوب منظم في ${PLATFORM_NAME}.</p>
        </div>
        <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
      </div>
      <div class="card" style="margin-bottom:0;">
        <h2 style="text-align:center; font-weight:900; margin-bottom:6px;">أهلاً تاني! جاهز للمذاكرة؟</h2>
        <p class="muted" style="text-align:center; font-size:0.86rem; margin-bottom:14px;">ادخل على حسابك برقم الهاتف وكلمة السر من أي جهاز في نفس الوقت، أو أدخل كود السنتر لفتح المنصة فوراً.</p>
        <div style="display:flex; gap:8px; justify-content:center; margin-bottom:16px; border-bottom:1px solid var(--bdr); padding-bottom:10px; flex-wrap:wrap;">
          <a class="btn btn-blue btn-sm" href="/student?tab=login">تسجيل الدخول برقم الهاتف</a>
          <a class="btn btn-teal btn-sm" href="/student?tab=center">دخول بكود السنتر</a>
          <a class="btn btn-out btn-sm" href="/student?tab=register&step=1">إنشاء حساب جديد</a>
        </div>
        ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
        ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
        <form method="post" action="/student/login" autocomplete="off">
          <div class="field"><label>رقم الهاتف</label><input name="phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
          <div class="field"><label>كلمة السر</label><input name="password" type="password" required autocomplete="new-password" placeholder="••••••••" /></div>
          <div style="margin-bottom:14px;"><a href="/student?tab=forgot" style="font-size:0.85rem; font-weight:800; color:var(--accent);">هل نسيت كلمة السر؟ اضغط هنا</a></div>
          <button type="submit" class="btn btn-blue" style="width:100%;">تسجيل الدخول</button>
        </form>
      </div>
    </div>`;
  }

  if (authTab === "center") {
    return `
    <div class="split-auth">
      <div class="promo-pane gold-mode">
        <div>
          <h2 style="font-size:1.32rem; font-weight:900;">دخول طلاب السنتر بكود التفعيل</h2>
          <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">أدخل اسمك الرباعي وبياناتك وكلمة السر وكود السنتر لمرة واحدة ليتم فتح المنصة وكل الفروع لك مباشرة.</p>
        </div>
        <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
      </div>
      <div class="card" style="margin-bottom:0;">
        <h2 style="font-weight:900; margin-bottom:8px;">تفعيل المنصة بكود السنتر</h2>
        <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">كلمة السر إجبارية هنا وتُحفظ في ملفك لدى الأدمن.</p>
        ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
        ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
        <form method="post" action="/student/center-login" autocomplete="off">
          <div class="field"><label>كود السنتر (لمرة واحدة) *</label><input name="center_code" type="text" required autocomplete="off" placeholder="مثال: CTR-XXXXXX" /></div>
          <div class="field"><label>اسم الطالب رباعي *</label><input name="name" type="text" required autocomplete="off" placeholder="الاسم الرباعي بالكامل" /></div>
          <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
          <div class="grid2">
            <div class="field"><label>الصف الدراسي *</label><select name="grade">${gradeOpts}</select></div>
            <div class="field"><label>الشعبة *</label><select name="track">${trackOpts}</select></div>
          </div>
          <div class="field"><label>كلمة السر (إجبارية) *</label><input name="password" type="password" required autocomplete="new-password" minlength="4" placeholder="أدخل كلمة سر لحسابك" /></div>
          <button type="submit" class="btn btn-teal" style="width:100%;">فتح المنصة بكود السنتر</button>
        </form>
        <div style="margin-top:14px; text-align:center; font-size:0.86rem;">
          <a href="/student?tab=login" style="color:var(--accent); font-weight:800;">العودة لتسجيل الدخول العادي</a>
        </div>
      </div>
    </div>`;
  }

  if (authTab === "forgot") {
    return `
    <div class="card" style="max-width:520px; margin:24px auto;">
      <h2 style="font-weight:900; margin-bottom:8px;">استعادة كلمة السر</h2>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">أدخل رقم هاتف الطالب ورقم هاتف ولي الأمر (مختلفين) لتعيين كلمة سر جديدة وتحديثها في ملفك.</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
      <form method="post" action="/student/reset-password" autocomplete="off">
        <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
        <div class="field"><label>رقم هاتف ولي الأمر *</label><input name="parent_phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
        <div class="field"><label>كلمة السر الجديدة *</label><input name="new_password" type="password" required autocomplete="new-password" minlength="4" /></div>
        <button type="submit" class="btn btn-teal" style="width:100%;">تعيين كلمة السر الجديدة</button>
      </form>
      <div style="margin-top:12px; text-align:center;"><a href="/student?tab=login" style="font-weight:800; color:var(--accent); font-size:0.86rem;">العودة لتسجيل الدخول</a></div>
    </div>`;
  }

  const isStep2 = step === 2;
  const fullName = `${draft.first_name || ""} ${draft.second_name || ""} ${draft.third_name || ""} ${draft.fourth_name || ""}`.trim();
  return `
  <div class="split-auth">
    <div class="promo-pane gold-mode">
      <div>
        <h2 style="font-size:1.32rem; font-weight:900;">طلب إنشاء حساب طالب جديد</h2>
        <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">أدخل اسمك الرباعي وبياناتك بدقة ورقم ولي الأمر يجب أن يكون مختلفاً عن رقم الطالب.</p>
      </div>
      <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
    </div>
    <div class="card" style="margin-bottom:0;">
      <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:800; color:var(--gold);">
        <span>الخطوة ${isStep2 ? "الثانية" : "الأولى"}</span>
        <span>${isStep2 ? "70%" : "35%"}</span>
      </div>
      <div class="step-track"><div class="step-fill" style="width:${isStep2 ? "70%" : "35%"};"></div></div>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${!isStep2 ? `
        <form method="get" action="/student" autocomplete="off">
          <input type="hidden" name="tab" value="register" />
          <input type="hidden" name="step" value="2" />
          <div class="grid2">
            <div class="field"><label>الاسم الأول *</label><input name="first_name" type="text" value="${esc(draft.first_name)}" autocomplete="off" required /></div>
            <div class="field"><label>الاسم الثاني *</label><input name="second_name" type="text" value="${esc(draft.second_name)}" autocomplete="off" required /></div>
            <div class="field"><label>الاسم الثالث *</label><input name="third_name" type="text" value="${esc(draft.third_name)}" autocomplete="off" required /></div>
            <div class="field"><label>الاسم الرابع *</label><input name="fourth_name" type="text" value="${esc(draft.fourth_name)}" autocomplete="off" required /></div>
          </div>
          <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" value="${esc(draft.phone)}" autocomplete="off" required placeholder="01xxxxxxxxx" /></div>
          <button type="submit" class="btn btn-blue" style="width:100%;">التالي</button>
        </form>
      ` : `
        <form method="post" action="/student/register" id="registerStep2Form" autocomplete="off">
          <input type="hidden" name="full_name" value="${esc(fullName)}" />
          <input type="hidden" name="phone" value="${esc(draft.phone)}" />
          <div class="field"><label>الاسم الرباعي</label><input type="text" value="${esc(fullName)}" readonly /></div>
          <div class="field"><label>الصف الدراسي *</label><select name="grade">${gradeOpts}</select></div>
          <div class="field"><label>الشعبة *</label><select name="track">${trackOpts}</select></div>
          <div class="field"><label>رقم هاتف ولي الأمر (يجب أن يختلف عن رقم الطالب) *</label><input name="parent_phone" id="regParentPhone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
          <div class="grid2">
            <div class="field"><label>المحافظة *</label><select name="governorate" required>${govOpts}</select></div>
            <div class="field"><label>كلمة السر *</label><input name="password" type="password" required autocomplete="new-password" minlength="4" /></div>
          </div>
          <button type="submit" class="btn btn-teal" style="width:100%;">إتمام إنشاء الحساب</button>
        </form>
        <script>
          (function () {
            const stPhone = ${safeJsonForScript(String(draft.phone || "").trim())};
            const f = document.getElementById("registerStep2Form");
            const pEl = document.getElementById("regParentPhone");
            f?.addEventListener("submit", function (e) {
              if ((pEl?.value || "").trim() === stPhone) {
                e.preventDefault();
                alert("يجب أن يكون رقم هاتف ولي الأمر مختلفاً عن رقم هاتف الطالب.");
              }
            });
          })();
        </script>
      `}
      <div style="margin-top:14px; text-align:center; font-size:0.86rem;">
        لديك حساب بالفعل؟ <a href="/student?tab=login" style="color:var(--accent); font-weight:800;">تسجيل الدخول</a>
      </div>
    </div>
  </div>`;
}

function renderStudentDash(settings, student, state) {
  const isCenterStudent = Boolean(student.is_center_student || student.center_code);
  const unlocked = isCenterStudent ? new Set(BRANCHES) : new Set(student.branches || []);
  const unlockedCount = unlocked.size;
  const totalBranches = BRANCHES.length;
  const progressPct = Math.round((unlockedCount / totalBranches) * 100);
  const clipTop = Math.max(0, 100 - progressPct);

  const section = state.section || "dashboard";
  const branchParam = state.branch || "";
  const forumBranchParam = state.forumBranch || BRANCHES[0];
  const lectureId = state.lectureId || "";
  const examIdParam = state.examId || "";
  const error = state.error || "";
  const notice = state.notice || "";

  const allLectures = sortLectures(state.lectures || []);
  const allExams = state.exams || [];
  const mySubmissions = state.submissions || [];
  const myDrafts = state.drafts || [];
  const myWatchedSet = new Set((state.watched || []).map(w => String(w.lecture_id)));
  const activeDiscounts = (state.discounts || []).filter(d => !d.used);
  const allForumPosts = (state.forumPosts || []).slice().sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );

  const solvedExamIds = new Set(mySubmissions.map(s => String(s.exam_id)));

  function getLessonHomework(lecId) {
    return allExams.find(ex => String(ex.lecture_id || "") === String(lecId));
  }

  function isLectureUnlockedForStudent(branchList, idx) {
    if (isCenterStudent) return true;
    if (idx === 0) return true;
    const prevLec = branchList[idx - 1];
    const prevHw = getLessonHomework(prevLec.id);
    if (!prevHw) return true;
    return solvedExamIds.has(String(prevHw.id));
  }

  function buildPlayerFromUrl(videoUrl) {
    const ytId = extractYoutubeId(videoUrl);
    if (ytId) {
      return `<iframe src="https://www.youtube.com/embed/${esc(ytId)}?rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    }
    if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
      return `<iframe src="${esc(videoUrl)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    }
    if (videoUrl) {
      return `<video controls controlsList="nodownload"><source src="${esc(videoUrl)}" /></video>`;
    }
    return "";
  }

  function buildPlayerEmbed(lec) {
    const html = buildPlayerFromUrl(lec.video_url);
    return html || `<div class="msg-err" style="margin:0;">لا يوجد رابط فيديو مضاف لهذه المحاضرة بعد.</div>`;
  }

  const branchCardsHtml = BRANCHES.map(br => {
    const isUnlocked = unlocked.has(br);
    const brLectures = allLectures.filter(l => l.branch === br);
    return `
      <div class="course-card">
        <div>
          <div class="course-banner">
            <div>
              <span class="pill" style="background:rgba(251,191,36,0.22); color:#fbbf24;">${isUnlocked ? (isCenterStudent ? "مفعل سنتر ✓" : "مفعل ✓") : "مغلق 🔒"}</span>
              <div style="font-size:1.22rem; font-weight:900; margin-top:6px;">${esc(br)}</div>
              <div style="font-size:0.8rem; opacity:0.92;">${brLectures.length} محاضرة متاحة • ${COURSE_PRICE_EGP} ج</div>
            </div>
            <img class="book-thumb" src="${esc(settings.teacher_image)}" alt="${esc(br)}" onerror="this.style.display='none';" />
          </div>
          <div class="course-body">
            <div class="course-title">منهج ${esc(br)} — ${esc(student.grade)} (${esc(student.track)})</div>
            <p class="muted" style="font-size:0.84rem; margin-bottom:12px;">
              ${isUnlocked ? "افتح المحاضرة واستعرض أقسامها ومحتواها وحل الواجب." : "هذا الفرع يحتاج إلى كود تفعيل خاص بالفرع لفتحه."}
            </p>
          </div>
        </div>
        <div style="padding:0 16px 16px;">
          ${isUnlocked
            ? `<a class="btn btn-blue btn-sm" style="width:100%;" href="/student?section=branch&branch=${encodeURIComponent(br)}">دخول الفرع</a>`
            : `<a class="btn btn-teal btn-sm" style="width:100%;" href="/student?section=codes">تفعيل / طلب كود (${COURSE_PRICE_EGP} ج)</a>`
          }
        </div>
      </div>
    `;
  }).join("");

  const branchDetailHtml = branchParam ? (() => {
    const canEnter = unlocked.has(branchParam);
    const list = allLectures.filter(l => l.branch === branchParam);
    const wmText = `${student.full_name} • ${student.phone} • ${PLATFORM_NAME}`;
    const denominator = Math.max(list.length, 99);

    return `
      <div class="jakh-week-banner">
        <div>
          <div style="font-size:1.34rem; font-weight:900;">فرع ${esc(branchParam)} — ${esc(student.grade)}</div>
          <div style="font-size:0.88rem; opacity:0.95; margin-top:2px;">${PLATFORM_NAME} • الشعبة: ${esc(student.track)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span class="you-here-pill">أنت هنا</span>
          <div class="branch-book-card">
            <img src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
            <div>
              <div style="font-weight:900; font-size:0.88rem;">أ. محمد يوسف</div>
              <div style="font-size:0.74rem; opacity:0.92;">${PLATFORM_NAME}</div>
            </div>
          </div>
        </div>
      </div>

      ${!canEnter ? `
        <div class="card">
          <div class="msg-err">هذا الفرع مغلق على حسابك حالياً. فعّله بكود خاص بفرع (${esc(branchParam)}) أو اطلب الكود عبر واتساب.</div>
          <form method="post" action="/student/redeem-code" style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
            <div class="field" style="flex:1; min-width:220px; margin:0;">
              <label>كود تفعيل الفرع (لمرة واحدة)</label>
              <input name="code" type="text" required placeholder="مثال: BR-XXXXXX" />
            </div>
            <button type="submit" class="jakh-action-btn">تفعيل الفرع الآن</button>
          </form>
        </div>
      ` : `
        <div class="lecture-accordion-list" id="lecturesAccordion">
          ${list.length ? list.map((l, idx) => {
            const openByOrder = isLectureUnlockedForStudent(list, idx);
            const hw = getLessonHomework(l.id);
            const hwSub = hw ? mySubmissions.find(s => String(s.exam_id) === String(hw.id)) : null;
            const isSeen = myWatchedSet.has(String(l.id));
            const isInitiallyOpen = lectureId ? String(l.id) === String(lectureId) : (idx === 0 && openByOrder);
            const stepNum = Number(l.order_num) > 0 ? Number(l.order_num) : (idx + 1) * 10;

            const rawCustomItems = Array.isArray(l.custom_items) ? l.custom_items : [];
            const customItems = rawCustomItems.length > 0 ? rawCustomItems : [
              { title: "الكتاب", note: `ملخص ومذكرة ${l.title} في فرع ${l.branch}.`, url: "", image_url: "" },
              { title: "الشرح", note: "", url: l.video_url || "", image_url: "" },
              { title: "المذاكرة", note: `راجع قواعد وأمثلة ${l.title} ثم ابدأ حل الواجب.`, url: "", image_url: "" },
              { title: "حل المقالي", note: "اكتب سؤالك المقالي أو صوّر حلك ليراجعه الأستاذ محمد يوسف.", url: "", image_url: "" },
              { title: "حل الكتب", note: `تدريبات واختبارات الكتب الخارجية على ${l.title}.`, url: "", image_url: "" }
            ];

            return `
              <div class="lec-accordion-item ${isInitiallyOpen ? "is-open" : ""}" data-lec-id="${esc(l.id)}">
                <button type="button" class="lec-accordion-header" aria-expanded="${isInitiallyOpen}">
                  <div class="lec-header-left">
                    <span class="lec-chevron-circle">^</span>
                    <span class="lec-counter-badge">(${stepNum}/${denominator})</span>
                  </div>
                  <div class="lec-header-right">
                    <div class="lec-main-title">${esc(l.title)} ${openByOrder ? "" : "🔒"}</div>
                    <div class="lec-sub-icons">
                      <span>${openByOrder ? (isSeen ? "✓ تمت المشاهدة" : "📖 ✍️") : "مغلق لحين تسليم واجب الدرس السابق"}</span>
                    </div>
                  </div>
                </button>

                <div class="lec-accordion-body">
                  ${!openByOrder ? `
                    <div class="msg-err" style="margin-bottom:0;">هذا الدرس مغلق حالياً. يجب حل وتسليم واجب الدرس السابق أولاً لفتح هذا الدرس.</div>
                  ` : `
                    <div class="sub-topic-list">
                      ${customItems.map((ci, cIdx) => {
                        const itemTitle = String(ci.title || "عنصر");
                        const itemNote = String(ci.note || "");
                        const itemUrl = String(ci.url || "");
                        const itemImg = String(ci.image_url || "");
                        const playerHtml = itemUrl ? buildPlayerFromUrl(itemUrl) : (itemTitle.includes("شرح") ? buildPlayerEmbed(l) : "");
                        const isFirstOpen = isInitiallyOpen && cIdx === 0;

                        return `
                          <div class="sub-topic-card ${isFirstOpen ? "sub-open" : ""}">
                            <button type="button" class="sub-topic-head">
                              <span>${esc(itemTitle)}</span>
                              <span class="sub-topic-left"><span>^</span><span>عرض</span></span>
                            </button>
                            <div class="sub-topic-panel">
                              ${itemNote ? `<p class="muted" style="font-size:0.9rem; margin-bottom:10px;">${esc(itemNote)}</p>` : ""}
                              ${itemImg ? `<img class="ticket-img-thumb" src="${esc(itemImg)}" alt="${esc(itemTitle)}" onerror="this.style.display='none';" style="margin-bottom:10px;" />` : ""}
                              ${playerHtml ? `
                                <div class="secure-player-box">
                                  <div class="watermark-layer">
                                    <span class="watermark-tag" style="top:18%; right:10%;">${esc(wmText)}</span>
                                    <span class="watermark-tag" style="top:54%; right:35%; animation-delay:-4s;">${esc(wmText)}</span>
                                  </div>
                                  ${playerHtml}
                                </div>
                              ` : ""}
                              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                                ${itemUrl && /^https?:\/\//i.test(itemUrl) && !extractYoutubeId(itemUrl)
                                  ? `<a class="jakh-action-btn" href="${esc(itemUrl)}" target="_blank" rel="noopener">فتح الرابط / الملف</a>`
                                  : ""
                                }
                                ${hw
                                  ? (hwSub
                                    ? `<a class="btn btn-teal btn-sm" href="/student?section=results">نتيجة الواجب (${hwSub.pct}%)</a>`
                                    : `<a class="btn btn-blue btn-sm" href="/student?section=solve-exam&exam_id=${encodeURIComponent(hw.id)}">حل واجب المحاضرة</a>`
                                  )
                                  : ""
                                }
                              </div>
                            </div>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join("") : `<div class="card"><p class="muted">لا توجد محاضرات مضافة لهذا الفرع حتى الآن.</p></div>`}
        </div>

        <script>
          (function () {
            const root = document.getElementById("lecturesAccordion");
            if (!root) return;
            root.querySelectorAll(".lec-accordion-header").forEach(function (btn) {
              btn.addEventListener("click", function () {
                const item = btn.closest(".lec-accordion-item");
                if (!item) return;
                const willOpen = !item.classList.contains("is-open");
                item.classList.toggle("is-open", willOpen);
                btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
              });
            });
            root.querySelectorAll(".sub-topic-head").forEach(function (sBtn) {
              sBtn.addEventListener("click", function () {
                const card = sBtn.closest(".sub-topic-card");
                if (!card) return;
                card.classList.toggle("sub-open");
              });
            });
          })();
        </script>
      `}
    `;
  })() : "";

  const solveExamHtml = (() => {
    const ex = allExams.find(x => String(x.id) === String(examIdParam));
    if (!ex) {
      return `<div class="card"><div class="msg-err">الواجب أو الاختبار المطلوب غير موجود.</div><a class="btn btn-blue btn-sm" href="/student?section=exams">العودة لقائمة الواجبات</a></div>`;
    }
    const existingSub = mySubmissions.find(s => String(s.exam_id) === String(ex.id));
    if (existingSub) {
      return `
        <div class="card">
          <div class="msg-ok">تم تسليم هذا الواجب/الاختبار مسبقاً ولا يمكن حله مرة أخرى (يُحل مرة واحدة فقط).</div>
          <a class="btn btn-teal" href="/student?section=results">الانتقال إلى نتائجي</a>
        </div>
      `;
    }
    const questions = Array.isArray(ex.questions) ? ex.questions : [];
    const draftDoc = myDrafts.find(d => String(d.exam_id) === String(ex.id));
    const savedAnswers = Array.isArray(draftDoc?.answers) ? draftDoc.answers : [];

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
          <div>
            <span class="pill pill-ok">${esc(ex.branch || "عام")}</span>
            <h2 style="font-weight:900; margin-top:6px;">${esc(ex.title)}</h2>
            <div class="muted" style="font-size:0.85rem;">عدد الأسئلة: ${questions.length} • يُسلّم مرة واحدة فقط</div>
          </div>
          ${draftDoc ? `<span class="pill pill-warn">محفوظ كمسودة للاستكمال</span>` : ""}
        </div>

        <form method="post" action="/student/exam-action" id="solveExamForm">
          <input type="hidden" name="exam_id" value="${esc(ex.id)}" />
          <input type="hidden" name="action_type" id="examActionType" value="finish" />
          ${questions.map((q, qi) => {
            const chosen = savedAnswers[qi] !== undefined && savedAnswers[qi] !== null ? Number(savedAnswers[qi]) : -1;
            return `
              <div class="row" style="display:block; margin-bottom:12px;">
                <div style="font-weight:900; margin-bottom:8px; font-size:1rem;">${qi + 1}. ${esc(q.text || "")}</div>
                ${q.image_url ? `<img class="ticket-img-thumb" src="${esc(q.image_url)}" alt="صورة السؤال" onerror="this.style.display='none';" />` : ""}
                ${(q.options || []).map((opt, oi) => `
                  <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin:6px 0; padding:8px 12px; border-radius:10px; background:var(--surface);">
                    <input type="radio" name="q_${qi}" value="${oi}" style="width:auto;" ${chosen === oi ? "checked" : ""} />
                    <span>${esc(opt)}</span>
                  </label>
                `).join("")}
              </div>
            `;
          }).join("")}

          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
            <button type="button" id="btnResumeLater" class="btn btn-gold" style="flex:1; min-width:200px;">استكمال الواجب لاحقاً</button>
            <button type="button" id="btnFinishExam" class="btn btn-blue" style="flex:1; min-width:200px;">إنهاء الاختبار</button>
          </div>
        </form>
      </div>
      <script>
        (function () {
          const form = document.getElementById("solveExamForm");
          const actInput = document.getElementById("examActionType");
          document.getElementById("btnResumeLater")?.addEventListener("click", function () {
            actInput.value = "save";
            form.submit();
          });
          document.getElementById("btnFinishExam")?.addEventListener("click", function () {
            const totalQ = ${questions.length};
            for (let i = 0; i < totalQ; i++) {
              if (!form.querySelector('input[name="q_' + i + '"]:checked')) {
                alert("من فضلك أجب عن جميع الأسئلة قبل إنهاء الاختبار، أو اضغط استكمال الواجب لاحقاً.");
                return;
              }
            }
            const ok = confirm("هل أنت متأكد من تسليم الواجب؟ لن تتمكن من تعديل إجاباتك أو حله مرة أخرى.");
            if (!ok) return;
            actInput.value = "finish";
            form.submit();
          });
        })();
      </script>
    `;
  })();

  const examsListHtml = allExams.map(ex => {
    const prev = mySubmissions.find(s => String(s.exam_id) === String(ex.id));
    const draftDoc = myDrafts.find(d => String(d.exam_id) === String(ex.id));
    const qCount = Array.isArray(ex.questions) ? ex.questions.length : 0;
    return `
      <div class="row">
        <div>
          <span class="pill pill-ok">${esc(ex.branch || "عام")}</span>
          <div style="font-weight:900; font-size:1rem; margin-top:4px;">${esc(ex.title)}</div>
          <div class="muted" style="font-size:0.82rem;">عدد الأسئلة: ${qCount}</div>
        </div>
        <div>
          ${prev
            ? `<a class="btn btn-teal btn-sm" href="/student?section=results">تم التسليم (${prev.pct}%) — عرض النتيجة</a>`
            : `<a class="btn btn-blue btn-sm" href="/student?section=solve-exam&exam_id=${encodeURIComponent(ex.id)}">${draftDoc ? "استكمال الحل" : "بدء الحل"}</a>`
          }
        </div>
      </div>
    `;
  }).join("") || `<p class="muted">لا توجد امتحانات أو واجبات متاحة حالياً.</p>`;

  const resultsHtml = mySubmissions.slice().reverse().map(sub => {
    const details = Array.isArray(sub.details) ? sub.details : [];
    const wrongItems = details.filter(d => !d.is_correct);
    const pct = Number(sub.pct ?? Math.round(((Number(sub.score || 0)) / Math.max(1, Number(sub.total || 1))) * 100));
    const wrongCount = Number(sub.wrong_count ?? (Number(sub.total || 0) - Number(sub.score || 0)));

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          <div>
            <span class="pill pill-ok">${esc(sub.branch || "عام")}</span>
            <h3 style="font-weight:900; margin-top:4px;">${esc(sub.exam_title || "اختبار")}</h3>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="pill pill-ok">النسبة: ${pct}%</span>
            <span class="pill pill-ok">صح: ${esc(sub.score)} / ${esc(sub.total)}</span>
            <span class="pill pill-err">أخطاء: ${wrongCount}</span>
          </div>
        </div>

        ${wrongItems.length === 0
          ? `<div class="msg-ok" style="margin-bottom:0;">ممتاز! لم تخطئ في أي سؤال في هذا الاختبار.</div>`
          : `
            <div style="font-weight:900; margin:10px 0 6px; color:var(--err);">الأسئلة التي أخطأت فيها وإجاباتها الصحيحة:</div>
            ${wrongItems.map((w, idx) => `
              <div class="row" style="display:block; border-color:rgba(220,38,38,0.35);">
                <div style="font-weight:800;">${idx + 1}. ${esc(w.question)}</div>
                <div style="font-size:0.86rem; color:var(--err); margin-top:4px;">إجابتك: ${esc(w.student_answer || "لم تُجب")}</div>
                <div style="font-size:0.86rem; color:var(--gold); font-weight:800; margin-top:2px;">الإجابة الصحيحة: ${esc(w.correct_answer || "")}</div>
              </div>
            `).join("")}
          `
        }
      </div>
    `;
  }).join("") || `<div class="card"><p class="muted">لم تُسلّم أي واجب أو اختبار حتى الآن.</p></div>`;

  const forumBranchPosts = allForumPosts.filter(p => String(p.branch || "") === String(forumBranchParam));
  const forumPostsHtml = forumBranchPosts.map(p => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill pill-ok">${esc(p.branch)}</span>
          <strong style="margin-right:6px;">${esc(p.student_name || "طالب")}</strong>
        </div>
        <span class="muted" style="font-size:0.78rem;">${esc((p.created_at || "").slice(0, 16).replace("T", " "))}</span>
      </div>
      <p style="margin:8px 0; font-size:0.92rem; font-weight:700;">${esc(p.message || "")}</p>
      ${p.image_url ? `<img class="ticket-img-thumb" src="${esc(p.image_url)}" alt="صورة المنتدى" onerror="this.style.display='none';" />` : ""}
      ${p.reply
        ? `<div class="msg-ok" style="margin-top:10px; margin-bottom:0;">رد (${esc(p.replied_by || "الأدمن")}): ${esc(p.reply)}</div>`
        : `<div class="muted" style="font-size:0.8rem; margin-top:8px;">بانتظار رد الأدمن / الأسيستانت...</div>`
      }
    </div>
  `).join("") || `<p class="muted" style="margin-top:10px;">لا توجد منشورات في منتدى فرع (${esc(forumBranchParam)}) حتى الآن.</p>`;

  const ticketsHtml = (state.tickets || []).map(t => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <strong>${esc(t.subject)}</strong>
        <span class="pill ${t.reply ? "pill-ok" : "pill-warn"}">${t.reply ? `تم الرد (${esc(t.replied_by || "الدعم العلمي")})` : "قيد المراجعة"}</span>
      </div>
      <p class="muted" style="font-size:0.88rem; margin-top:6px;">${esc(t.message)}</p>
      ${t.image_url ? `<img class="ticket-img-thumb" src="${esc(t.image_url)}" alt="صورة السؤال" onerror="this.style.display='none';" />` : ""}
      ${t.reply ? `<div class="msg-ok" style="margin-top:8px; margin-bottom:0;">رد ${esc(t.replied_by || "تيم الدعم العلمي")}: ${esc(t.reply)}</div>` : ""}
    </div>
  `).join("") || `<p class="muted" style="margin-top:10px;">لم ترسل أسئلة من قبل.</p>`;

  const waTargetDigits = normalizeWaPhone(settings.admin_whatsapp || settings.vodafone_number || "01066329782");
  const discountLookupPayload = activeDiscounts.map(d => ({
    code: String(d.code || "").trim().toUpperCase(),
    amount: Number(d.amount || 0)
  }));

  const lectureSelectOptions = allLectures.map(l =>
    `<option value="${esc(l.title)} (${esc(l.branch)})">محاضرة: ${esc(l.title)} — فرع ${esc(l.branch)}</option>`
  ).join("");

  let mainContentHtml = "";
  if (section === "dashboard") {
    mainContentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div><div class="kpi-num">${unlockedCount} / ${totalBranches}</div><div class="kpi-lbl">الفروع المفعلة</div></div>
          <div class="kpi-icon-box">📚</div>
        </div>
        <div class="kpi-card teal-kpi">
          <div><div class="kpi-num">${allLectures.length}</div><div class="kpi-lbl">إجمالي المحاضرات</div></div>
          <div class="kpi-icon-box">🎥</div>
        </div>
        <div class="kpi-card gold-kpi">
          <div><div class="kpi-num">${allExams.length}</div><div class="kpi-lbl">الواجبات والامتحانات</div></div>
          <div class="kpi-icon-box">📝</div>
        </div>
        <div class="kpi-card teal-kpi">
          <div><div class="kpi-num">${mySubmissions.length}</div><div class="kpi-lbl">الاختبارات المحلولة</div></div>
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
          <h3 style="font-weight:900; margin-bottom:6px;">أهلاً بك يا ${esc(student.full_name)} في ${PLATFORM_NAME}</h3>
          <p class="muted" style="font-size:0.88rem; margin-bottom:12px;">
            الصف: <strong>${esc(student.grade)}</strong> • الشعبة: <strong>${esc(student.track)}</strong> • رقم الهاتف: <strong>${esc(student.phone)}</strong> • ولي الأمر: <strong>${esc(student.parent_phone || "-")}</strong>
          </p>
          <div style="margin-bottom:12px;">
            ${isCenterStudent ? `<span class="pill pill-ok">طالب سنتر — كل الفروع مفتوحة</span>` : (
              (student.branches || []).length
                ? (student.branches || []).map(b => `<span class="pill pill-ok" style="margin-left:4px;">${esc(b)}</span>`).join("")
                : `<span class="pill pill-warn">لم يتم تفعيل أي فرع بعد</span>`
            )}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a class="btn btn-teal btn-sm" href="/student?section=codes">تفعيل / طلب كود (${COURSE_PRICE_EGP} ج)</a>
            <a class="btn btn-blue btn-sm" href="/student?section=forum&forum_branch=${encodeURIComponent(BRANCHES[0])}">منتدى الفروع</a>
            <a class="btn btn-out btn-sm" href="/student?section=results">عرض نتائجي</a>
          </div>
        </div>
      </div>

      <h3 style="font-weight:900; margin-bottom:12px;">فروع اللغة العربية السبعة</h3>
      <div class="course-grid">${branchCardsHtml}</div>
    `;
  } else if (section === "branch") {
    mainContentHtml = branchDetailHtml;
  } else if (section === "forum") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:6px;">منتدى فروع اللغة العربية</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">اختر فرع اللغة العربية، ثم اكتب مشاركتك أو أرفق صورة ليظهر اسمك ويرد عليك الأدمن أو الأسيستانت.</p>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
          ${BRANCHES.map(br => `
            <a class="btn ${br === forumBranchParam ? "btn-blue" : "btn-out"} btn-sm" href="/student?section=forum&forum_branch=${encodeURIComponent(br)}">منتدى ${esc(br)}</a>
          `).join("")}
        </div>

        <form method="post" action="/student/forum-post" id="studentForumForm">
          <input type="hidden" name="branch" value="${esc(forumBranchParam)}" />
          <input type="hidden" name="image_url" id="forumImageData" />
          <div class="field">
            <label>مشاركتك أو سؤالك في منتدى ${esc(forumBranchParam)} *</label>
            <textarea name="message" required placeholder="اكتب ما تريد مشاركته في منتدى ${esc(forumBranchParam)}..."></textarea>
          </div>
          <div class="field">
            <label>إرفاق صورة (اختياري)</label>
            <input type="file" id="forumImageFile" accept="image/*" />
            <img id="forumImagePreview" class="ticket-img-thumb" style="display:none;" alt="معاينة صورة المنتدى" />
          </div>
          <button type="submit" class="btn btn-blue">نشر في منتدى ${esc(forumBranchParam)}</button>
        </form>
      </div>

      <div class="card">
        <h3 style="font-weight:900;">مشاركات منتدى ${esc(forumBranchParam)}</h3>
        ${forumPostsHtml}
      </div>

      <script>
        (function () {
          const fInput = document.getElementById("forumImageFile");
          const hInput = document.getElementById("forumImageData");
          const prev = document.getElementById("forumImagePreview");
          fInput?.addEventListener("change", function () {
            const file = fInput.files && fInput.files[0];
            if (!file) {
              if (hInput) hInput.value = "";
              if (prev) { prev.src = ""; prev.style.display = "none"; }
              return;
            }
            const r = new FileReader();
            r.onload = function () {
              const s = String(r.result || "");
              if (hInput) hInput.value = s;
              if (prev) { prev.src = s; prev.style.display = "block"; }
            };
            r.readAsDataURL(file);
          });
        })();
      </script>
    `;
  } else if (section === "codes") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:8px;">تفعيل الفروع بالأكواد</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">لو معاك كود تفعيل جاهز أدخله هنا ليُفعّل الفرع فوراً (يُستخدم مرة واحدة).</p>
        <form method="post" action="/student/redeem-code" class="grid2">
          <div class="field"><label>كود التفعيل *</label><input name="code" type="text" required placeholder="مثال: BR-XXXXXX" /></div>
          <div class="field" style="display:flex; align-items:flex-end;"><button type="submit" class="btn btn-teal" style="width:100%;">تفعيل الكود</button></div>
        </form>
        <div style="margin-top:12px;">
          <strong>الفروع المفعلة حالياً:</strong>
          ${isCenterStudent ? `<span class="pill pill-ok">جميع الفروع (حساب سنتر)</span>` : (
            (student.branches || []).length ? (student.branches || []).map(b => `<span class="pill pill-ok">${esc(b)}</span>`).join(" ") : `<span class="muted">لا يوجد</span>`
          )}
        </div>
      </div>

      <div class="card">
        <h2 style="font-weight:900; margin-bottom:6px;">طلب كود لتفعيل محاضرة أو فرع عبر واتساب</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">
          سعر الكورس <strong>${COURSE_PRICE_EGP} ج</strong>. اختر الفرع أو المحاضرة، وإذا كان لديك كود خصم يمكنك إضافته اختيارياً (يُستخدم مرة واحدة).
        </p>

        <form id="waCodeRequestForm">
          <div class="grid2">
            <div class="field">
              <label>اختر الفرع *</label>
              <select id="reqBranchSelect">
                ${BRANCHES.map(b => `<option value="فرع ${esc(b)}">فرع ${esc(b)} (${COURSE_PRICE_EGP} ج)</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>أو اختر محاضرة محددة (اختياري)</label>
              <select id="reqLectureSelect">
                <option value="">— كل محاضرات الفرع المختار —</option>
                ${lectureSelectOptions}
              </select>
            </div>
          </div>

          <div class="field">
            <label>كود الخصم (اختياري — يُستخدم لمرة واحدة)</label>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input type="text" id="reqDiscountInput" placeholder="اكتب كود الخصم إن وُجد (اختياري)" style="flex:1; min-width:200px;" />
              <button type="button" class="btn btn-out btn-sm" id="applyDiscountBtn">تطبيق الخصم</button>
            </div>
            <div id="discountStatusMsg" style="font-size:0.84rem; font-weight:800; margin-top:6px;"></div>
          </div>

          <div class="price-summary-box">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span>سعر الكورس الأساسي:</span>
              <strong>${COURSE_PRICE_EGP} ج</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span>قيمة الخصم:</span>
              <strong id="summaryDiscountAmt" style="color:var(--gold);">0 ج</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--bdr); padding-top:8px; font-size:1.05rem;">
              <span>المطلوب دفعه:</span>
              <strong id="summaryFinalPrice" style="color:var(--accent);">${COURSE_PRICE_EGP} ج</strong>
            </div>
          </div>

          <button type="submit" class="btn btn-blue" style="width:100%;">طلب الكود على واتساب (${esc(settings.admin_whatsapp || "01066329782")})</button>
        </form>
      </div>

      <script>
        (function () {
          const basePrice = ${COURSE_PRICE_EGP};
          const waPhone = ${safeJsonForScript(waTargetDigits)};
          const stName = ${safeJsonForScript(String(student.full_name || ""))};
          const stPhone = ${safeJsonForScript(String(student.phone || ""))};
          const stGrade = ${safeJsonForScript(String(student.grade || ""))};
          const availableDiscounts = ${safeJsonForScript(discountLookupPayload)};

          const branchEl = document.getElementById("reqBranchSelect");
          const lecEl = document.getElementById("reqLectureSelect");
          const discInput = document.getElementById("reqDiscountInput");
          const applyBtn = document.getElementById("applyDiscountBtn");
          const statusMsg = document.getElementById("discountStatusMsg");
          const discAmtEl = document.getElementById("summaryDiscountAmt");
          const finalPriceEl = document.getElementById("summaryFinalPrice");
          const formEl = document.getElementById("waCodeRequestForm");

          let appliedCode = "";
          let appliedDiscount = 0;

          function checkDiscount() {
            const raw = (discInput?.value || "").trim().toUpperCase();
            if (!raw) {
              appliedCode = "";
              appliedDiscount = 0;
              discAmtEl.textContent = "0 ج";
              finalPriceEl.textContent = basePrice + " ج";
              statusMsg.textContent = "";
              return;
            }
            const found = availableDiscounts.find(d => d.code === raw);
            if (!found) {
              appliedCode = "";
              appliedDiscount = 0;
              discAmtEl.textContent = "0 ج";
              finalPriceEl.textContent = basePrice + " ج";
              statusMsg.style.color = "var(--err)";
              statusMsg.textContent = "كود الخصم غير صحيح أو تم استخدامه من قبل.";
              return;
            }
            appliedCode = found.code;
            appliedDiscount = Math.min(basePrice, Math.max(0, Number(found.amount || 0)));
            const finalP = Math.max(0, basePrice - appliedDiscount);
            discAmtEl.textContent = appliedDiscount + " ج";
            finalPriceEl.textContent = finalP + " ج";
            statusMsg.style.color = "var(--accent)";
            statusMsg.textContent = "تم تطبيق كود الخصم (" + appliedCode + ") بقيمة " + appliedDiscount + " ج.";
          }

          applyBtn?.addEventListener("click", checkDiscount);
          discInput?.addEventListener("change", checkDiscount);

          formEl?.addEventListener("submit", async function (e) {
            e.preventDefault();
            checkDiscount();
            const chosenItem = lecEl?.value ? lecEl.value : (branchEl?.value || "");
            const finalP = Math.max(0, basePrice - appliedDiscount);

            if (appliedCode) {
              try {
                await fetch("/student/consume-discount", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: appliedCode })
                });
              } catch {}
            }

            const lines = [
              "السلام عليكم، أريد طلب كود تفعيل في منصة ${PLATFORM_NAME}",
              "الطالب: " + stName,
              "رقم الهاتف: " + stPhone,
              "الصف: " + stGrade,
              "المطلوب: " + chosenItem,
              "سعر الكورس: " + basePrice + " ج",
              appliedCode ? ("كود الخصم: " + appliedCode + " (خصم " + appliedDiscount + " ج)") : "كود الخصم: بدون",
              "الإجمالي المطلوب: " + finalP + " ج"
            ];
            const waUrl = "https://wa.me/" + waPhone + "?text=" + encodeURIComponent(lines.join("\\n"));
            window.open(waUrl, "_blank", "noopener");
          });
        })();
      </script>
    `;
  } else if (section === "exams") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:8px;">الواجبات والامتحانات</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:12px;">اضغط على الواجب لحله وفتح الدرس التالي، أو استكمل واجباً محفوظاً.</p>
        ${examsListHtml}
      </div>
    `;
  } else if (section === "solve-exam") {
    mainContentHtml = solveExamHtml;
  } else if (section === "results") {
    mainContentHtml = `
      <div style="margin-bottom:12px;">
        <h2 style="font-weight:900;">نتائجي</h2>
        <p class="muted" style="font-size:0.88rem;">هنا تجد نسبتك المئوية وعدد أخطائك والإجابة الصحيحة لكل سؤال أخطأت فيه.</p>
      </div>
      ${resultsHtml}
    `;
  } else if (section === "tickets") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:8px;">تيم الدعم العلمي — اسأل سؤالك</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">اختر صورة سؤالك مباشرة من جهازك ليراجعه تيم الدعم العلمي والأستاذ محمد يوسف ويرد عليك.</p>
        <form method="post" action="/student/tickets" id="studentTicketForm">
          <input type="hidden" name="image_url" id="ticketImageData" />
          <div class="grid2">
            <div class="field"><label>عنوان السؤال *</label><input name="subject" type="text" required placeholder="مثال: استفسار في إعراب أو سؤال" /></div>
            <div class="field"><label>صورة السؤال (من جهازك)</label><input id="ticketImageFile" type="file" accept="image/*" /></div>
          </div>
          <img id="ticketImagePreview" class="ticket-img-thumb" style="display:none;" alt="معاينة صورة السؤال" />
          <div class="field"><label>تفاصيل السؤال *</label><textarea name="message" required placeholder="اكتب سؤالك بوضوح..."></textarea></div>
          <button type="submit" class="btn btn-blue">إرسال إلى تيم الدعم العلمي</button>
        </form>
      </div>
      <div class="card">
        <h3 style="font-weight:900;">ردود تيم الدعم العلمي على أسئلتك</h3>
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
        <div class="row"><span>الاسم الرباعي</span><strong>${esc(student.full_name)}</strong></div>
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
      <a class="nav-item-link ${section === "forum" ? "active" : ""}" href="/student?section=forum&forum_branch=${encodeURIComponent(forumBranchParam)}"><span>💬</span><span class="nav-label">المنتدى</span></a>
      <a class="nav-item-link ${section === "codes" ? "active" : ""}" href="/student?section=codes"><span>🔑</span><span class="nav-label">تفعيل وطلب كود</span></a>
      <a class="nav-item-link ${(section === "exams" || section === "solve-exam") ? "active" : ""}" href="/student?section=exams"><span>📝</span><span class="nav-label">الواجبات والامتحانات</span></a>
      <a class="nav-item-link ${section === "results" ? "active" : ""}" href="/student?section=results"><span>📊</span><span class="nav-label">نتائجي</span></a>
      <a class="nav-item-link ${section === "tickets" ? "active" : ""}" href="/student?section=tickets"><span>❓</span><span class="nav-label">تيم الدعم العلمي</span></a>
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

function renderAdminPage(settings, isAuthed, assistantSession, data, section, error, notice) {
  const isAssistantOnly = Boolean(!isAuthed && assistantSession && assistantSession.role === "assistant");
  const hasStaffAccess = Boolean(isAuthed || isAssistantOnly);
  const currentActorName = isAuthed
    ? "الأدمن"
    : (assistantSession ? String(assistantSession.assistant_name || "أسيستانت") : "");

  if (!hasStaffAccess) {
    return `
    <div class="card" style="max-width:520px; margin:28px auto;">
      <h2 style="font-weight:900; margin-bottom:8px;">دخول الأدمن والأسيستانت</h2>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">يمكن للأدمن تسجيل الدخول بالبريد وكلمة المرور، أو للأسيستانت الدخول بالاسم والكود المخصص مباشرة إلى تيم الدعم العلمي والمنتدى.</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}

      <form method="post" action="/admin/login" autocomplete="off" style="margin-bottom:18px;">
        <h3 style="font-weight:900; font-size:0.98rem; margin-bottom:8px;">دخول الأدمن</h3>
        <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required autocomplete="off" placeholder="mohmed@mr.com" /></div>
        <div class="field"><label>كلمة المرور</label><input name="password" type="password" required autocomplete="new-password" placeholder="••••••••" /></div>
        <button type="submit" class="btn btn-blue" style="width:100%;">دخول الأدمن</button>
      </form>

      <hr style="border:none; border-top:1px solid var(--bdr); margin:16px 0;" />

      <form method="post" action="/assistant/login" autocomplete="off">
        <h3 style="font-weight:900; font-size:0.98rem; margin-bottom:8px;">دخول الأسيستانت بالاسم والكود</h3>
        <div class="field"><label>اسم الأسيستانت *</label><input name="assistant_name" type="text" required autocomplete="off" placeholder="اكتب اسمك..." /></div>
        <div class="field"><label>كود الأسيستانت *</label><input name="assistant_code" type="text" required autocomplete="off" placeholder="مثال: AST-XXXXXX" /></div>
        <button type="submit" class="btn btn-teal" style="width:100%;">دخول الأسيستانت إلى تيم الدعم العلمي</button>
      </form>
    </div>`;
  }

  const activeSec = isAssistantOnly
    ? (["tickets", "forum", "support"].includes(section) ? section : "tickets")
    : (section || "students");

  const allLectures = sortLectures(data.lectures || []);
  const allExams = data.exams || [];
  const allSubmissions = data.submissions || [];
  const allWatched = data.watched || [];
  const allStudents = data.students || [];
  const allDiscounts = data.discounts || [];
  const allAssistants = data.assistants || [];
  const allForumPosts = (data.forumPosts || []).slice().sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
  const allSupportThreads = (data.supportThreads || []).slice().sort((a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  );

  const codesRows = (data.codes || []).slice(-25).reverse().map(c => `
    <div class="row">
      <div>
        <strong class="copyable-code-val">${esc(c.code)}</strong> — <span class="pill pill-ok">${esc(c.type === "center" ? "كود سنتر (لمرة واحدة)" : "كود فرع: " + (c.branch || ""))}</span>
        <span class="pill ${c.used ? "pill-warn" : "pill-ok"}" style="margin-right:6px;">${c.used ? "مستخدم (" + esc(c.used_by || "") + ")" : "متاح"}</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="btn btn-out btn-sm copy-code-btn" data-code="${esc(c.code)}">نسخ الكود</button>
        <form method="post" action="/admin/delete-code" style="margin:0;">
          <input type="hidden" name="code_id" value="${esc(c.id)}" />
          <button type="submit" class="btn btn-red btn-sm">حذف الكود</button>
        </form>
      </div>
    </div>
  `).join("") || `<p class="muted">لا توجد أكواد مولدة بعد.</p>`;

  const assistantRows = allAssistants.slice().reverse().map(a => `
    <div class="row">
      <div>
        <strong>${esc(a.name)}</strong> — <span class="pill pill-ok">${esc(a.code)}</span>
        <div class="muted" style="font-size:0.8rem;">يدخل بالاسم والكود إلى تيم الدعم العلمي والمنتدى وتظهر ردوده باسمه.</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="btn btn-out btn-sm copy-code-btn" data-code="${esc(a.code)}">نسخ الكود</button>
        <form method="post" action="/admin/delete-assistant" style="margin:0;">
          <input type="hidden" name="assistant_id" value="${esc(a.id)}" />
          <button type="submit" class="btn btn-red btn-sm">حذف</button>
        </form>
      </div>
    </div>
  `).join("") || `<p class="muted">لا توجد أكواد أسيستانت مولدة بعد.</p>`;

  const discountsRows = allDiscounts.slice().reverse().map(d => `
    <div class="row">
      <div>
        <strong>${esc(d.code)}</strong> — <span class="pill pill-warn">خصم ${esc(d.amount)} ج</span>
        <span class="pill ${d.used ? "pill-err" : "pill-ok"}" style="margin-right:6px;">${d.used ? "مُستخدم (لمرة واحدة)" : "متاح للاستخدام مرة واحدة"}</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="btn btn-out btn-sm copy-code-btn" data-code="${esc(d.code)}">نسخ الكود</button>
        <form method="post" action="/admin/delete-discount" style="margin:0;">
          <input type="hidden" name="discount_id" value="${esc(d.id)}" />
          <button type="submit" class="btn btn-red btn-sm">حذف كود الخصم</button>
        </form>
      </div>
    </div>
  `).join("") || `<p class="muted">لا توجد أكواد خصم مُنشأة حالياً.</p>`;

  const lecturesRows = allLectures.map(l => {
    const linkedHw = allExams.find(ex => String(ex.lecture_id || "") === String(l.id));
    const cItemsCount = Array.isArray(l.custom_items) ? l.custom_items.length : 0;
    return `
      <div class="row">
        <div>
          <strong>${esc(l.title)}</strong> — <span class="pill pill-ok">${esc(l.branch)}</span>
          <div class="muted" style="font-size:0.8rem;">${esc(l.grade || "")} • ${esc(l.track || "")} • ترتيب: ${esc(l.order_num ?? 0)} • عناصر داخل المحاضرة: ${cItemsCount}</div>
          <div style="margin-top:4px;">
            ${linkedHw
              ? `<span class="pill pill-ok">مرتبط بواجب: ${esc(linkedHw.title)} (${Array.isArray(linkedHw.questions) ? linkedHw.questions.length : 0} أسئلة)</span>`
              : `<span class="pill pill-warn">بدون واجب مرتبط بعد</span>`
            }
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <a class="btn btn-gold btn-sm" href="/admin?section=exams&lecture_id=${encodeURIComponent(l.id)}">إضافة/تعديل أسئلة للدرس</a>
          <form method="post" action="/admin/delete-lecture" style="margin:0;">
            <input type="hidden" name="lecture_id" value="${esc(l.id)}" />
            <button type="submit" class="btn btn-red btn-sm">حذف</button>
          </form>
        </div>
      </div>
    `;
  }).join("") || `<p class="muted">لا توجد محاضرات مضافة بعد.</p>`;

  const examsRows = allExams.slice().reverse().map(ex => {
    const lec = allLectures.find(l => String(l.id) === String(ex.lecture_id || ""));
    const qLen = Array.isArray(ex.questions) ? ex.questions.length : 0;
    return `
      <div class="row">
        <div>
          <strong>${esc(ex.title)}</strong> — <span class="pill pill-ok">${esc(ex.branch || "عام")}</span>
          <div class="muted" style="font-size:0.8rem;">
            عدد الأسئلة: ${qLen} ${lec ? `• واجب محاضرة: ${esc(lec.title)}` : "• اختبار عام"}
          </div>
        </div>
        <form method="post" action="/admin/delete-exam" style="margin:0;">
          <input type="hidden" name="exam_id" value="${esc(ex.id)}" />
          <button type="submit" class="btn btn-red btn-sm">حذف</button>
        </form>
      </div>
    `;
  }).join("") || `<p class="muted">لا توجد واجبات أو اختبارات منشورة بعد.</p>`;

  const ticketsRows = (data.tickets || []).map(t => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <strong>${esc(t.subject)}</strong>
        <span class="pill pill-ok">الطالب: ${esc(t.student_name || "")} (${esc(t.student_phone || "")})</span>
      </div>
      <p style="margin:6px 0; font-size:0.88rem;">${esc(t.message)}</p>
      ${t.image_url ? `<img class="ticket-img-thumb" src="${esc(t.image_url)}" alt="صورة السؤال" onerror="this.style.display='none';" />` : ""}
      <form method="post" action="/admin/reply-ticket" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input type="hidden" name="ticket_id" value="${esc(t.id)}" />
        <input name="reply" type="text" value="${esc(t.reply || "")}" placeholder="اكتب رد ${esc(currentActorName)} هنا..." style="flex:1; min-width:220px;" />
        <button type="submit" class="btn btn-teal btn-sm">حفظ الرد باسم (${esc(currentActorName)})</button>
      </form>
    </div>
  `).join("") || `<p class="muted">لا توجد أسئلة من الطلاب حالياً.</p>`;

  const adminForumRows = allForumPosts.map(p => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill pill-ok">${esc(p.branch || "فرع")}</span>
          <strong style="margin-right:6px;">الطالب: ${esc(p.student_name || "")}</strong>
          <span class="muted" style="font-size:0.8rem;">(${esc(p.student_phone || "")})</span>
        </div>
        <span class="muted" style="font-size:0.78rem;">${esc((p.created_at || "").slice(0, 16).replace("T", " "))}</span>
      </div>
      <p style="margin:8px 0; font-size:0.9rem;">${esc(p.message || "")}</p>
      ${p.image_url ? `<img class="ticket-img-thumb" src="${esc(p.image_url)}" alt="صورة المنتدى" onerror="this.style.display='none';" />` : ""}
      <form method="post" action="/admin/reply-forum" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input type="hidden" name="post_id" value="${esc(p.id)}" />
        <input type="text" name="reply" value="${esc(p.reply || "")}" placeholder="اكتب ردك في المنتدى باسم ${esc(currentActorName)}..." style="flex:1; min-width:220px;" />
        <button type="submit" class="btn btn-blue btn-sm">رد باسم (${esc(currentActorName)})</button>
      </form>
    </div>
  `).join("") || `<p class="muted">لا توجد مشاركات في المنتدى حتى الآن.</p>`;

  const supportRows = allSupportThreads.map(th => {
    const msgs = Array.isArray(th.messages) ? th.messages : [];
    const msgsHtml = msgs.map(m => `
      <div class="${m.sender === "admin" ? "chat-bubble-admin" : "chat-bubble-user"}" style="margin-top:6px;">
        <div style="font-size:0.72rem; opacity:0.82;">${m.sender === "admin" ? ("رد " + esc(m.sender_name || "الأدمن")) : esc(th.visitor_name || "مستخدم")}</div>
        ${m.text ? `<div>${esc(m.text)}</div>` : ""}
        ${m.image_url ? `<img class="chat-msg-img" src="${esc(m.image_url)}" alt="صورة مرفقة" />` : ""}
      </div>
    `).join("");

    return `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
          <div>
            <span class="pill pill-ok">${esc(th.visitor_name || "بدون اسم")}</span>
            ${th.student_phone ? `<span class="muted" style="font-size:0.82rem; margin-right:6px;">هاتف: ${esc(th.student_phone)}</span>` : ""}
          </div>
          <span class="muted" style="font-size:0.78rem;">${esc((th.updated_at || "").slice(0, 16).replace("T", " "))}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
          ${msgsHtml || `<div class="muted" style="font-size:0.85rem;">تم تسجيل الاسم ولم تُرسل رسالة بعد.</div>`}
        </div>
        <form method="post" action="/admin/support-reply" style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="hidden" name="session_id" value="${esc(th.id)}" />
          <input type="text" name="reply_text" required placeholder="اكتب رد الدعم الفني باسم ${esc(currentActorName)}..." style="flex:1; min-width:220px;" />
          <button type="submit" class="btn btn-blue btn-sm">إرسال الرد</button>
        </form>
      </div>
    `;
  }).join("") || `<div class="card"><p class="muted">لا توجد محادثات دعم فني حتى الآن.</p></div>`;

  let sectionHtml = "";
  if (activeSec === "support") {
    sectionHtml = `
      <div style="margin-bottom:10px;">
        <h3 style="font-weight:900;">الدعم الفني</h3>
        <p class="muted" style="font-size:0.86rem;">رسائل وصور الدعم الفني الواردة من الشات المباشر والرد عليها باسم (${esc(currentActorName)}).</p>
      </div>
      ${supportRows}
    `;
  } else if (activeSec === "forum") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">منتدى فروع اللغة العربية — متابعة والرد باسم (${esc(currentActorName)})</h3>
        ${adminForumRows}
      </div>
    `;
  } else if (activeSec === "codes") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إضافة اسم الأسيستانت وتوليد كود دخول له</h3>
        <p class="muted" style="font-size:0.84rem; margin-bottom:12px;">اكتب اسم الأسيستانت ليُستخرج له كود خاص يدخل به إلى تيم الدعم العلمي وتظهر ردوده باسمه.</p>
        <form method="post" action="/admin/create-assistant" class="grid2">
          <div class="field"><label>اسم الأسيستانت *</label><input name="assistant_name" type="text" required placeholder="مثال: أستاذة آية / محمود" /></div>
          <div class="field" style="display:flex; align-items:flex-end;"><button type="submit" class="btn btn-teal" style="width:100%;">استخراج كود للأسيستانت</button></div>
        </form>
        <div style="margin-top:12px;">${assistantRows}</div>
      </div>

      <div class="card">
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
          <div style="grid-column:1/-1;"><button type="submit" class="btn btn-teal">توليد الأكواد الآن</button></div>
        </form>
        <div style="margin-top:12px;">${codesRows}</div>
      </div>

      <div class="card">
        <h3 style="font-weight:900; margin-bottom:6px;">أكواد الخصم (اختيارية للطالب • تُستخدم مرة واحدة • قابلة للحذف)</h3>
        <p class="muted" style="font-size:0.84rem; margin-bottom:12px;">سعر الكورس الأساسي ${COURSE_PRICE_EGP} ج. أنشئ كود خصم بقيمة بالجنيه ليُستخدم مرة واحدة فقط أو احذفه في أي وقت.</p>
        <form method="post" action="/admin/create-discount" class="grid3">
          <div class="field">
            <label>كود الخصم (اختياري كتابته أو يُولّد تلقائياً)</label>
            <input name="discount_code" type="text" placeholder="مثال: NOUR100" />
          </div>
          <div class="field">
            <label>قيمة الخصم بالجنيه *</label>
            <input name="discount_amount" type="number" min="1" max="${COURSE_PRICE_EGP}" value="100" required />
          </div>
          <div class="field" style="display:flex; align-items:flex-end;">
            <button type="submit" class="btn btn-blue" style="width:100%;">إضافة كود خصم</button>
          </div>
        </form>
        <div style="margin-top:12px;">${discountsRows}</div>
      </div>

      <script>
        (function () {
          document.querySelectorAll(".copy-code-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
              const codeStr = btn.getAttribute("data-code") || "";
              if (!codeStr) return;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeStr).catch(function () {});
              } else {
                const tmp = document.createElement("textarea");
                tmp.value = codeStr;
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand("copy");
                tmp.remove();
              }
              const oldTxt = btn.textContent;
              btn.textContent = "تم النسخ ✓";
              setTimeout(function () { btn.textContent = oldTxt; }, 1400);
            });
          });
        })();
      </script>
    `;
  } else if (activeSec === "lectures") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إضافة محاضرة والعناصر التي بداخلها بمزاجك</h3>
        <form method="post" action="/admin/add-lecture" id="addLectureCustomForm">
          <input type="hidden" name="custom_items_json" id="customItemsJsonInput" />
          <div class="grid2">
            <div class="field"><label>عنوان المحاضرة *</label><input name="title" type="text" required placeholder="مثال: المحاضرة الأولى — المبتدأ والخبر" /></div>
            <div class="field"><label>الفرع *</label><select name="branch">${BRANCHES.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select></div>
            <div class="field"><label>الصف الدراسي</label><select name="grade">${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select></div>
            <div class="field"><label>الشعبة</label><select name="track">${TRACKS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></div>
            <div class="field"><label>رقم ترتيب الدرس في الفرع</label><input name="order_num" type="number" min="1" value="${allLectures.length + 1}" /></div>
            <div class="field"><label>رابط الفيديو الرئيسي (اختياري إذا أضفت عناصر بالأسفل)</label><input name="video_url" type="text" placeholder="https://..." /></div>
          </div>

          <div style="margin-top:10px; margin-bottom:8px;">
            <strong style="font-size:0.95rem;">الحاجات التي ستظهر داخل المحاضرة (أضف أو عدّل أو احذف كما تحب):</strong>
          </div>
          <div id="customLectureItemsBuilder"></div>
          <div style="margin:10px 0 16px;">
            <button type="button" class="btn btn-out btn-sm" id="addLectureItemBtn">+ إضافة عنصر جديد داخل المحاضرة</button>
          </div>

          <button type="submit" class="btn btn-blue" style="width:100%;">إضافة المحاضرة بالعناصر المحددة</button>
        </form>
        <div style="margin-top:16px;">${lecturesRows}</div>
      </div>

      <script>
        (function () {
          const builder = document.getElementById("customLectureItemsBuilder");
          const form = document.getElementById("addLectureCustomForm");
          const hiddenJson = document.getElementById("customItemsJsonInput");
          const defaults = ["الكتاب", "الشرح", "المذاكرة", "حل المقالي", "حل الكتب"];

          function addCustomItemRow(defaultTitle = "") {
            const box = document.createElement("div");
            box.className = "q-builder-card";
            box.innerHTML =
              '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">' +
                '<strong class="c-item-lbl">عنصر داخل المحاضرة</strong>' +
                '<button type="button" class="btn btn-red btn-sm rm-c-item">حذف العنصر</button>' +
              '</div>' +
              '<div class="grid2">' +
                '<div class="field"><label>اسم العنصر (مثلاً: الكتاب، الشرح، المذاكرة، حل المقالي، حل الكتب)</label>' +
                  '<input type="text" class="c-item-title" value="' + defaultTitle.replace(/"/g, "&quot;") + '" placeholder="اكتب اسم العنصر..." required />' +
                '</div>' +
                '<div class="field"><label>رابط فيديو أو ملف (اختياري)</label>' +
                  '<input type="text" class="c-item-url" placeholder="https://..." />' +
                '</div>' +
              '</div>' +
              '<div class="field"><label>شرح / ملاحظات تظهر للطالب عند الضغط على عرض</label>' +
                '<input type="text" class="c-item-note" placeholder="اكتب النص أو التعليمات للطالب..." />' +
              '</div>' +
              '<div class="field" style="margin-bottom:0;"><label>صورة مرفقة للعنصر (اختياري)</label>' +
                '<input type="file" accept="image/*" class="c-item-file" />' +
                '<input type="hidden" class="c-item-imgdata" />' +
                '<img class="ticket-img-thumb c-item-preview" style="display:none;" alt="معاينة" />' +
              '</div>';

            const fileEl = box.querySelector(".c-item-file");
            const imgDataEl = box.querySelector(".c-item-imgdata");
            const prevEl = box.querySelector(".c-item-preview");

            fileEl.addEventListener("change", function () {
              const f = fileEl.files && fileEl.files[0];
              if (!f) {
                imgDataEl.value = "";
                prevEl.src = "";
                prevEl.style.display = "none";
                return;
              }
              const r = new FileReader();
              r.onload = function () {
                const resStr = String(r.result || "");
                imgDataEl.value = resStr;
                prevEl.src = resStr;
                prevEl.style.display = "block";
              };
              r.readAsDataURL(f);
            });

            box.querySelector(".rm-c-item").addEventListener("click", function () {
              box.remove();
              renumberItems();
            });

            builder.appendChild(box);
            renumberItems();
          }

          function renumberItems() {
            builder.querySelectorAll(".q-builder-card").forEach(function (el, idx) {
              const l = el.querySelector(".c-item-lbl");
              if (l) l.textContent = "عنصر رقم " + (idx + 1);
            });
          }

          document.getElementById("addLectureItemBtn")?.addEventListener("click", function () {
            addCustomItemRow("");
          });

          defaults.forEach(function (t) {
            addCustomItemRow(t);
          });

          form?.addEventListener("submit", function () {
            const items = [];
            builder.querySelectorAll(".q-builder-card").forEach(function (el) {
              const t = el.querySelector(".c-item-title").value.trim();
              const u = el.querySelector(".c-item-url").value.trim();
              const n = el.querySelector(".c-item-note").value.trim();
              const img = el.querySelector(".c-item-imgdata").value.trim();
              if (t) {
                items.push({ title: t, url: u, note: n, image_url: img });
              }
            });
            hiddenJson.value = JSON.stringify(items);
          });
        })();
      </script>
    `;
  } else if (activeSec === "exams") {
    const preselectLecId = data.preselectLectureId || "";
    const lectureOptions = `<option value="">— اختبار عام (غير مرتبط بفتح درس) —</option>` +
      allLectures.map(l => `<option value="${esc(l.id)}" ${String(l.id) === String(preselectLecId) ? "selected" : ""}>واجب درس: ${esc(l.title)} (${esc(l.branch)})</option>`).join("");

    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:6px;">إنشاء واجب درس أو اختبار بأي عدد أسئلة واختيارات</h3>
        <p class="muted" style="font-size:0.85rem; margin-bottom:14px;">يمكنك إضافة أي عدد من الأسئلة، وإضافة سؤال نصي أو صورة سؤال، ولكل سؤال إضافة أي عدد من الاختيارات وتحديد الإجابة الصحيحة.</p>

        <form method="post" action="/admin/add-exam" id="dynamicExamForm">
          <input type="hidden" name="questions_json" id="questionsJsonInput" />
          <div class="grid3">
            <div class="field"><label>عنوان الواجب / الاختبار *</label><input name="title" type="text" required placeholder="واجب المحاضرة الأولى" /></div>
            <div class="field"><label>الفرع *</label><select name="branch">${BRANCHES.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}</select></div>
            <div class="field"><label>ربط بمحاضرة (لفتح الدرس التالي)</label><select name="lecture_id">${lectureOptions}</select></div>
          </div>

          <div id="questionsBuilderList"></div>

          <div style="display:flex; gap:10px; flex-wrap:wrap; margin:12px 0;">
            <button type="button" class="btn btn-out btn-sm" id="addQuestionBtn">+ إضافة سؤال جديد</button>
            <button type="button" class="btn btn-gold btn-sm" id="presetFiveBtn">تجهيز 5 أسئلة افتراضية للدرس</button>
          </div>

          <button type="submit" class="btn btn-teal" style="width:100%;">حفظ ونشر الواجب / الاختبار</button>
        </form>
      </div>

      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">الواجبات والاختبارات المنشورة</h3>
        ${examsRows}
      </div>

      <script>
        (function () {
          const listEl = document.getElementById("questionsBuilderList");
          const formEl = document.getElementById("dynamicExamForm");
          const jsonInput = document.getElementById("questionsJsonInput");

          function createOptionRow(qCard, optText = "", isChecked = false) {
            const radioName = qCard.dataset.radioName;
            const row = document.createElement("div");
            row.className = "opt-row";
            row.innerHTML =
              '<input type="radio" name="' + radioName + '" style="width:auto;" ' + (isChecked ? "checked" : "") + ' title="الإجابة الصحيحة" />' +
              '<input type="text" class="opt-text-input" placeholder="اكتب نص الاختيار..." value="' + optText.replace(/"/g, "&quot;") + '" required />' +
              '<button type="button" class="btn btn-red btn-sm remove-opt-btn">×</button>';
            row.querySelector(".remove-opt-btn").addEventListener("click", function () {
              if (qCard.querySelectorAll(".opt-row").length <= 2) {
                alert("يجب أن يحتوي السؤال على اختيارين على الأقل.");
                return;
              }
              const wasChecked = row.querySelector('input[type="radio"]').checked;
              row.remove();
              if (wasChecked) {
                const firstRadio = qCard.querySelector('input[type="radio"]');
                if (firstRadio) firstRadio.checked = true;
              }
            });
            qCard.querySelector(".opts-container").appendChild(row);
          }

          let qCounter = 0;
          function addQuestionCard(initialOpts = 4) {
            qCounter++;
            const radioName = "correct_q_" + qCounter + "_" + Date.now();
            const card = document.createElement("div");
            card.className = "q-builder-card";
            card.dataset.radioName = radioName;
            card.innerHTML =
              '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">' +
                '<strong class="q-title-lbl">سؤال</strong>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                  '<button type="button" class="btn btn-out btn-sm toggle-text-btn">سؤال كتابي</button>' +
                  '<button type="button" class="btn btn-out btn-sm toggle-img-btn">سؤال بصورة</button>' +
                  '<button type="button" class="btn btn-red btn-sm remove-q-btn">حذف السؤال</button>' +
                '</div>' +
              '</div>' +
              '<div class="field q-text-box"><input type="text" class="q-text-input" placeholder="اكتب نص السؤال هنا..." required /></div>' +
              '<div class="field q-img-box" style="display:none;">' +
                '<label style="font-size:0.82rem;">اختر صورة السؤال من الجهاز</label>' +
                '<input type="file" accept="image/*" class="q-img-file" />' +
                '<input type="hidden" class="q-img-data" />' +
                '<img class="ticket-img-thumb q-img-preview" style="display:none;" alt="صورة السؤال" />' +
              '</div>' +
              '<div style="font-size:0.82rem; font-weight:800; margin-bottom:4px;">الاختيارات (حدّد الدائرة بجانب الإجابة الصحيحة):</div>' +
              '<div class="opts-container"></div>' +
              '<button type="button" class="btn btn-out btn-sm add-opt-btn" style="margin-top:8px;">+ إضافة اختيار آخر</button>';

            const textInput = card.querySelector(".q-text-input");
            const textBox = card.querySelector(".q-text-box");
            const imgBox = card.querySelector(".q-img-box");
            const imgFile = card.querySelector(".q-img-file");
            const imgData = card.querySelector(".q-img-data");
            const imgPreview = card.querySelector(".q-img-preview");

            card.querySelector(".toggle-text-btn").addEventListener("click", function () {
              textBox.style.display = "block";
              imgBox.style.display = "none";
              textInput.required = true;
            });

            card.querySelector(".toggle-img-btn").addEventListener("click", function () {
              imgBox.style.display = "block";
              textInput.required = false;
              if (!textInput.value.trim()) textInput.value = "أجب عن السؤال الموضح في الصورة";
            });

            imgFile.addEventListener("change", function () {
              const file = imgFile.files && imgFile.files[0];
              if (!file) {
                imgData.value = "";
                imgPreview.src = "";
                imgPreview.style.display = "none";
                return;
              }
              const reader = new FileReader();
              reader.onload = function () {
                const urlVal = String(reader.result || "");
                imgData.value = urlVal;
                imgPreview.src = urlVal;
                imgPreview.style.display = "block";
              };
              reader.readAsDataURL(file);
            });

            card.querySelector(".remove-q-btn").addEventListener("click", function () {
              if (listEl.querySelectorAll(".q-builder-card").length <= 1) {
                alert("يجب وجود سؤال واحد على الأقل.");
                return;
              }
              card.remove();
              renumberQuestions();
            });

            card.querySelector(".add-opt-btn").addEventListener("click", function () {
              createOptionRow(card, "", false);
            });

            listEl.appendChild(card);
            for (let i = 0; i < initialOpts; i++) {
              createOptionRow(card, "", i === 0);
            }
            renumberQuestions();
          }

          function renumberQuestions() {
            listEl.querySelectorAll(".q-builder-card").forEach((c, idx) => {
              const lbl = c.querySelector(".q-title-lbl");
              if (lbl) lbl.textContent = "السؤال رقم " + (idx + 1);
            });
          }

          document.getElementById("addQuestionBtn")?.addEventListener("click", function () {
            addQuestionCard(4);
          });

          document.getElementById("presetFiveBtn")?.addEventListener("click", function () {
            listEl.innerHTML = "";
            for (let i = 0; i < 5; i++) addQuestionCard(4);
          });

          for (let i = 0; i < 5; i++) addQuestionCard(4);

          formEl?.addEventListener("submit", function (e) {
            const questions = [];
            const cards = listEl.querySelectorAll(".q-builder-card");
            cards.forEach((c) => {
              const qText = c.querySelector(".q-text-input").value.trim();
              const qImg = c.querySelector(".q-img-data").value.trim();
              const optRows = c.querySelectorAll(".opt-row");
              const options = [];
              let correctIdx = 0;
              optRows.forEach((r, idx) => {
                const txt = r.querySelector(".opt-text-input").value.trim();
                const checked = r.querySelector('input[type="radio"]').checked;
                if (checked) correctIdx = idx;
                options.push(txt);
              });
              if ((qText || qImg) && options.length >= 2) {
                questions.push({
                  text: qText || "سؤال صورة",
                  image_url: qImg,
                  options,
                  correct_idx: correctIdx
                });
              }
            });
            if (!questions.length) {
              e.preventDefault();
              alert("أضف سؤالاً واحداً على الأقل.");
              return;
            }
            jsonInput.value = JSON.stringify(questions);
          });
        })();
      </script>
    `;
  } else if (activeSec === "students") {
    const enrichedStudents = allStudents.map(st => ({
      student: st,
      metrics: computeStudentMetrics(st, allLectures, allExams, allSubmissions, allWatched)
    }));

    const studentItemsPayload = enrichedStudents.map((item, idx) => ({
      idx,
      full_name: String(item.student.full_name || ""),
      phone: String(item.student.phone || ""),
      parent_phone: String(item.student.parent_phone || "-"),
      governorate: String(item.student.governorate || "-"),
      grade: String(item.student.grade || ""),
      track: String(item.student.track || ""),
      password_plain: String(item.student.password_plain || ""),
      password_hash: String(item.student.password_hash || ""),
      branches: Array.isArray(item.student.branches) ? item.student.branches.map(String) : [],
      watchedCount: item.metrics.watchedCount,
      pendingLectures: item.metrics.pendingLectures,
      solvedExamsCount: item.metrics.solvedExamsCount,
      pendingExams: item.metrics.pendingExams,
      avgPct: item.metrics.avgPct,
      performanceScore: item.metrics.performanceScore,
      performanceLabel: item.metrics.performanceLabel,
      submissions: (item.metrics.submissions || []).map(s => ({
        exam_title: String(s.exam_title || "اختبار"),
        branch: String(s.branch || "عام"),
        score: Number(s.score || 0),
        total: Number(s.total || 1),
        pct: Number(s.pct ?? Math.round((Number(s.score || 0) / Math.max(1, Number(s.total || 1))) * 100))
      }))
    }));

    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">طلاب المنصة</h3>
        <div class="field" style="max-width:420px;">
          <label>اختر الصف</label>
          <select id="studentGradeFilter">
            <option value="">كل الصفوف</option>
            ${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>

        <div id="studentsListContainer"></div>

        <div id="selectedStudentProfile" class="student-detail-box" style="display:none;"></div>
      </div>

      <script>
        (function () {
          const allItems = ${safeJsonForScript(studentItemsPayload)};
          const allBranches = ${safeJsonForScript(BRANCHES)};
          const gradeEl = document.getElementById("studentGradeFilter");
          const listContainer = document.getElementById("studentsListContainer");
          const profileBox = document.getElementById("selectedStudentProfile");

          function escHtml(v) {
            return String(v ?? "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
          }

          function openStudentByIndex(studentIdx) {
            const st = allItems.find(x => Number(x.idx) === Number(studentIdx));
            if (!st) return;

            const subsHtml = st.submissions.length
              ? st.submissions.map(sub =>
                  '<div class="row" style="margin-top:6px;">' +
                    '<div><strong>' + escHtml(sub.exam_title) + '</strong> <span class="muted">(' + escHtml(sub.branch) + ')</span></div>' +
                    '<span class="pill pill-ok">درجته: ' + escHtml(sub.score) + ' / ' + escHtml(sub.total) + ' (' + escHtml(sub.pct) + '%)</span>' +
                  '</div>'
                ).join("")
              : '<div class="muted" style="font-size:0.85rem; margin-top:6px;">لم يحل أي امتحان بعد.</div>';

            const branchesHtml = st.branches.length
              ? st.branches.map(b =>
                  '<span class="pill pill-ok" style="margin-left:6px; display:inline-flex; align-items:center; gap:6px;">' +
                    '<span>' + escHtml(b) + '</span>' +
                    '<form method="post" action="/admin/revoke-branch" style="display:inline; margin:0;">' +
                      '<input type="hidden" name="phone" value="' + escHtml(st.phone) + '" />' +
                      '<input type="hidden" name="branch" value="' + escHtml(b) + '" />' +
                      '<button type="submit" style="border:none; background:rgba(220,38,38,0.85); color:#fff; border-radius:999px; padding:1px 7px; font-size:0.72rem; font-weight:800; cursor:pointer;">إلغاء التفعيل</button>' +
                    '</form>' +
                  '</span>'
                ).join("")
              : '<span class="pill pill-warn">لا يوجد فروع مفعلة</span>';

            const branchChecksHtml = allBranches.map(function (br) {
              const checked = st.branches.indexOf(br) !== -1 ? "checked" : "";
              return '<label class="branch-check-pill"><input type="checkbox" name="branches" value="' + escHtml(br) + '" ' + checked + ' /><span>' + escHtml(br) + '</span></label>';
            }).join("");

            const pwdDisplay = st.password_plain ? st.password_plain : st.password_hash;

            profileBox.style.display = "block";
            profileBox.innerHTML =
              '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">' +
                '<h4 style="font-weight:900; font-size:1.12rem;">ملف الطالب: ' + escHtml(st.full_name) + '</h4>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                  '<form method="post" action="/admin/delete-student" style="margin:0;">' +
                    '<input type="hidden" name="phone" value="' + escHtml(st.phone) + '" />' +
                    '<button type="submit" class="btn btn-red btn-sm">حذف الطالب</button>' +
                  '</form>' +
                  '<button type="button" class="btn btn-out btn-sm" id="closeStudentProfileBtn">إغلاق</button>' +
                '</div>' +
              '</div>' +
              '<div class="row"><span>الاسم الرباعي</span><strong>' + escHtml(st.full_name) + '</strong></div>' +
              '<div class="row"><span>رقمه</span><strong>' + escHtml(st.phone) + '</strong></div>' +
              '<div class="row"><span>رقم ولي أمره</span><strong>' + escHtml(st.parent_phone) + '</strong></div>' +
              '<div class="row"><span>محافظته</span><strong>' + escHtml(st.governorate) + '</strong></div>' +
              '<div class="row"><span>كلمة سره</span><strong style="font-size:0.9rem; word-break:break-all;">' + escHtml(pwdDisplay) + '</strong></div>' +
              '<div class="row"><span>متراكم كام محاضرة</span><strong>متراكم عليه: ' + escHtml(st.pendingLectures) + ' محاضرة (شاهد: ' + escHtml(st.watchedCount) + ')</strong></div>' +
              '<div class="row"><span>جايب كام في الامتحانات</span><strong>متوسط: ' + escHtml(st.avgPct) + '% • حل: ' + escHtml(st.solvedExamsCount) + ' • متراكم: ' + escHtml(st.pendingExams) + '</strong></div>' +
              '<div class="row" style="display:block;">' +
                '<div style="font-weight:800; margin-bottom:8px;">الفروع المفعلة وإلغاء تفعيل أي فرع:</div>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">' + branchesHtml + '</div>' +
                '<form method="post" action="/admin/grant-branches" style="margin-top:8px;">' +
                  '<input type="hidden" name="phone" value="' + escHtml(st.phone) + '" />' +
                  '<div class="branch-toggle-grid">' + branchChecksHtml + '</div>' +
                  '<button type="submit" class="btn btn-teal btn-sm">تفعيل اشتراك الفروع المحددة</button>' +
                '</form>' +
              '</div>' +
              '<div style="margin-top:12px;"><div style="font-weight:900;">درجاته في الامتحانات:</div>' + subsHtml + '</div>';

            document.getElementById("closeStudentProfileBtn")?.addEventListener("click", function () {
              profileBox.style.display = "none";
            });
            profileBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }

          function renderByGrade() {
            const g = (gradeEl?.value || "").trim();
            const filtered = allItems.filter(item => !g || String(item.grade) === g);

            if (!filtered.length) {
              listContainer.innerHTML = '<p class="muted">لا يوجد طلاب في هذا الصف حالياً.</p>';
              return;
            }

            listContainer.innerHTML = filtered.map(item =>
              '<div class="row">' +
                '<div>' +
                  '<strong>' + escHtml(item.full_name) + '</strong> — <span class="muted">' + escHtml(item.phone) + '</span>' +
                  '<div class="muted" style="font-size:0.8rem;">' + escHtml(item.grade) + ' (' + escHtml(item.track) + ') • متراكم: ' + escHtml(item.pendingLectures) + ' محاضرة • الامتحانات: ' + escHtml(item.avgPct) + '%</div>' +
                '</div>' +
                '<button type="button" class="btn btn-blue btn-sm open-st-btn" data-st-idx="' + escHtml(item.idx) + '">فتح ملف الطالب</button>' +
              '</div>'
            ).join("");

            listContainer.querySelectorAll(".open-st-btn").forEach(function (b) {
              b.addEventListener("click", function () {
                openStudentByIndex(b.getAttribute("data-st-idx"));
              });
            });
          }

          gradeEl?.addEventListener("change", renderByGrade);
          renderByGrade();
        })();
      </script>
    `;
  } else if (activeSec === "center_students") {
    const centerStudentsList = allStudents
      .filter(st => Boolean(st.is_center_student || st.center_code))
      .map(st => ({
        full_name: String(st.full_name || ""),
        phone: String(st.phone || ""),
        center_code: String(st.center_code || ""),
        grade: String(st.grade || ""),
        track: String(st.track || ""),
        password_plain: String(st.password_plain || ""),
        password_hash: String(st.password_hash || "")
      }));

    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:6px;">طلاب السنتر</h3>
        <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">كل الطلاب الذين دخلوا بأكواد السنتر ولهم جميع الفروع والمحاضرات مفتوحة تلقائياً. اختر الصف لعرض طلابه:</p>
        <div class="field" style="max-width:420px;">
          <label>اختر الصف</label>
          <select id="centerGradeSelect">
            <option value="">— اختر الصف لعرض طلاب السنتر —</option>
            ${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>
        <div id="centerStudentsListBox"></div>
      </div>

      <script>
        (function () {
          const centerItems = ${safeJsonForScript(centerStudentsList)};
          const selEl = document.getElementById("centerGradeSelect");
          const outBox = document.getElementById("centerStudentsListBox");

          function escLocal(v) {
            return String(v ?? "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
          }

          function drawCenterStudents() {
            const g = (selEl?.value || "").trim();
            if (!g) {
              outBox.innerHTML = '<div class="muted" style="font-size:0.86rem;">اختر الصف من القائمة أعلاه لعرض طلاب السنتر وأرقامهم وأكوادهم وكلمة سرهم.</div>';
              return;
            }
            const list = centerItems.filter(x => String(x.grade) === g);
            if (!list.length) {
              outBox.innerHTML = '<div class="msg-err">لا يوجد طلاب سنتر مسجلون في (' + escLocal(g) + ') بعد.</div>';
              return;
            }
            outBox.innerHTML = list.map(st =>
              '<div class="row" style="display:block;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">' +
                  '<strong>' + escLocal(st.full_name) + '</strong>' +
                  '<span class="pill pill-ok">مفتوح له كل شيء ✓</span>' +
                '</div>' +
                '<div class="row" style="margin-top:8px;"><span>رقمه</span><strong>' + escLocal(st.phone) + '</strong></div>' +
                '<div class="row" style="margin-top:6px;"><span>كود السنتر</span><strong>' + escLocal(st.center_code || "-") + '</strong></div>' +
                '<div class="row" style="margin-top:6px;"><span>كلمة سره</span><strong style="font-size:0.9rem; word-break:break-all;">' + escLocal(st.password_plain || st.password_hash) + '</strong></div>' +
              '</div>'
            ).join("");
          }

          selEl?.addEventListener("change", drawCenterStudents);
          drawCenterStudents();
        })();
      </script>
    `;
  } else if (activeSec === "ranking") {
    const selectedGrade = data.rankingGrade || GRADES[0];
    const rankedStudents = allStudents
      .filter(s => s.grade === selectedGrade)
      .map(st => ({
        student: st,
        metrics: computeStudentMetrics(st, allLectures, allExams, allSubmissions, allWatched)
      }))
      .sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore);

    const rankingRowsHtml = rankedStudents.map((entry, idx) => `
      <div class="row">
        <div>
          <span class="pill pill-ok">الترتيب #${idx + 1}</span>
          <strong style="margin-right:6px;">${esc(entry.student.full_name)}</strong>
          <span class="muted" style="font-size:0.85rem;">— هاتف: <strong>${esc(entry.student.phone)}</strong></span>
          <div class="muted" style="font-size:0.8rem; margin-top:3px;">
            الأداء: <strong>${esc(entry.metrics.performanceLabel)}</strong> (${entry.metrics.performanceScore}%) • متوسط الامتحانات: ${entry.metrics.avgPct}% • المحاضرات المشاهدة: ${entry.metrics.watchedCount}
          </div>
        </div>
        <span class="pill pill-warn">${entry.metrics.performanceScore}%</span>
      </div>
    `).join("") || `<p class="muted">لا يوجد طلاب مسجلون في هذا الصف بعد.</p>`;

    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">ترتيب الطلاب (من الأفضل أداءً للأقوى)</h3>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
          <a class="btn ${selectedGrade === GRADES[0] ? "btn-blue" : "btn-out"} btn-sm" href="/admin?section=ranking&rank_grade=${encodeURIComponent(GRADES[0])}">أولى ثانوي</a>
          <a class="btn ${selectedGrade === GRADES[1] ? "btn-blue" : "btn-out"} btn-sm" href="/admin?section=ranking&rank_grade=${encodeURIComponent(GRADES[1])}">تانية ثانوي</a>
          <a class="btn ${selectedGrade === GRADES[2] ? "btn-blue" : "btn-out"} btn-sm" href="/admin?section=ranking&rank_grade=${encodeURIComponent(GRADES[2])}">تالتة ثانوي</a>
        </div>
        ${rankingRowsHtml}
      </div>
    `;
  } else if (activeSec === "tickets") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">تيم الدعم العلمي — أسئلة الطلاب والرد عليها باسم (${esc(currentActorName)})</h3>
        ${ticketsRows}
      </div>
    `;
  } else if (activeSec === "settings") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">إعدادات المنصة وبيانات الأدمن في Firebase</h3>
        <form method="post" action="/admin/settings">
          <div class="grid2">
            <div class="field"><label>بريد الأدمن (يوزر الدخول)</label><input name="admin_email" type="email" value="${esc(settings.admin_email)}" required /></div>
            <div class="field"><label>كلمة مرور جديدة للأدمن (اتركها فارغة للإبقاء على الحالية)</label><input name="new_admin_password" type="password" placeholder="••••••••" /></div>
          </div>
          <div class="grid2">
            <div class="field"><label>رقم فودافون كاش</label><input name="vodafone_number" type="text" value="${esc(settings.vodafone_number)}" /></div>
            <div class="field"><label>رقم واتساب استقبال طلبات الأكواد (قابل للتغيير من الأدمن)</label><input name="admin_whatsapp" type="text" value="${esc(settings.admin_whatsapp)}" required /></div>
          </div>
          <div class="grid3">
            <div class="field"><label>رابط فيسبوك</label><input name="facebook_url" type="text" value="${esc(settings.facebook_url)}" placeholder="https://facebook.com/..." /></div>
            <div class="field"><label>رابط تيك توك</label><input name="tiktok_url" type="text" value="${esc(settings.tiktok_url)}" placeholder="https://tiktok.com/@..." /></div>
            <div class="field"><label>رابط يوتيوب</label><input name="youtube_url" type="text" value="${esc(settings.youtube_url)}" placeholder="https://youtube.com/@..." /></div>
          </div>
          <div class="field"><label>رابط صورة الأستاذ (اختياري)</label><input name="teacher_image" type="text" value="${esc(settings.teacher_image)}" /></div>
          <div class="field"><label>رسالة إشعار التنبيه الشفاف المتوهج (اتركه فارغاً لعدم ظهوره)</label><input name="global_notice" type="text" value="${esc(settings.global_notice)}" placeholder="اكتب رسالة التنبيه هنا..." /></div>
          <button type="submit" class="btn btn-blue">حفظ الإعدادات في Firebase</button>
        </form>
      </div>
    `;
  }

  return `
  <div class="dash-shell" id="adminShell">
    <div>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}

      <div class="card" style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill pill-ok">${isAuthed ? "وضع الأدمن الكامل" : "وضع الأسيستانت"}</span>
          <strong style="margin-right:8px;">المستخدم الحالي: ${esc(currentActorName)}</strong>
        </div>
        <button type="button" class="btn btn-gold btn-sm" id="enableStaffPushBtn">تفعيل إشعارات المتصفح الفورية</button>
      </div>

      ${isAuthed ? `
        <div class="kpi-grid">
          <div class="kpi-card"><div><div class="kpi-num">${allStudents.length}</div><div class="kpi-lbl">طلاب المنصة</div></div><div class="kpi-icon-box">👨‍🎓</div></div>
          <div class="kpi-card teal-kpi"><div><div class="kpi-num">${allLectures.length}</div><div class="kpi-lbl">المحاضرات</div></div><div class="kpi-icon-box">🎥</div></div>
          <div class="kpi-card gold-kpi"><div><div class="kpi-num">${allExams.length}</div><div class="kpi-lbl">الواجبات والاختبارات</div></div><div class="kpi-icon-box">📝</div></div>
          <div class="kpi-card teal-kpi"><div><div class="kpi-num">${allSupportThreads.length}</div><div class="kpi-lbl">دعم فني</div></div><div class="kpi-icon-box">💬</div></div>
        </div>
      ` : ""}

      ${sectionHtml}
    </div>

    <aside class="right-drawer">
      <div class="drawer-top">
        <span class="drawer-title" style="font-weight:900; font-size:0.92rem;">إدارة ${PLATFORM_NAME}</span>
        <button type="button" class="collapse-btn" onclick="document.getElementById('adminShell')?.classList.toggle('collapsed')">⇄</button>
      </div>
      ${isAuthed ? `
        <a class="nav-item-link ${activeSec === "students" ? "active" : ""}" href="/admin?section=students"><span>👨‍🎓</span><span class="nav-label">طلاب المنصة</span></a>
        <a class="nav-item-link ${activeSec === "center_students" ? "active" : ""}" href="/admin?section=center_students"><span>🏫</span><span class="nav-label">طلاب السنتر</span></a>
        <a class="nav-item-link ${activeSec === "ranking" ? "active" : ""}" href="/admin?section=ranking"><span>🏆</span><span class="nav-label">ترتيب الطلاب</span></a>
        <a class="nav-item-link ${activeSec === "lectures" ? "active" : ""}" href="/admin?section=lectures"><span>🎥</span><span class="nav-label">إضافة محاضرة</span></a>
        <a class="nav-item-link ${activeSec === "codes" ? "active" : ""}" href="/admin?section=codes"><span>🔑</span><span class="nav-label">الأكواد والخصومات</span></a>
        <a class="nav-item-link ${activeSec === "exams" ? "active" : ""}" href="/admin?section=exams"><span>📝</span><span class="nav-label">الواجبات والاختبارات</span></a>
      ` : ""}
      <a class="nav-item-link ${activeSec === "tickets" ? "active" : ""}" href="/admin?section=tickets"><span>❓</span><span class="nav-label">تيم الدعم العلمي</span></a>
      <a class="nav-item-link ${activeSec === "forum" ? "active" : ""}" href="/admin?section=forum"><span>💬</span><span class="nav-label">المنتدى</span></a>
      <a class="nav-item-link ${activeSec === "support" ? "active" : ""}" href="/admin?section=support"><span>🎧</span><span class="nav-label">دعم فني</span></a>
      ${isAuthed ? `
        <a class="nav-item-link ${activeSec === "settings" ? "active" : ""}" href="/admin?section=settings"><span>⚙️</span><span class="nav-label">الإعدادات والإشعار</span></a>
      ` : ""}
    </aside>
  </div>

  <script>
    (function () {
      const pushBtn = document.getElementById("enableStaffPushBtn");
      pushBtn?.addEventListener("click", async function () {
        if (!("Notification" in window)) {
          alert("هذا المتصفح لا يدعم إشعارات الويب.");
          return;
        }
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification("${PLATFORM_NAME} — تم تفعيل الإشعارات", {
            body: "سيصلك تنبيه فوري عند وصول سؤال أو مشاركة جديدة من الطلاب."
          });
        }
      });

      let lastAlertKey = localStorage.getItem("nb_staff_last_alert") || "";
      async function pollStaffAlerts() {
        try {
          const res = await fetch("/api/staff/alerts");
          if (!res.ok) return;
          const d = await res.json();
          if (d.latest_key && d.latest_key !== lastAlertKey) {
            lastAlertKey = d.latest_key;
            localStorage.setItem("nb_staff_last_alert", lastAlertKey);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(d.title || "رسالة جديدة من طالب", {
                body: d.body || "يوجد سؤال أو رسالة جديدة من طالب."
              });
            }
          }
        } catch {}
      }
      pollStaffAlerts();
      setInterval(pollStaffAlerts, 8000);
    })();
  </script>`;
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
    const astCookie = parseToken(getCookie(req, "nb_ast"), secret);
    const isAdmin = Boolean(admCookie && admCookie.role === "admin");
    const assistantSession = (!isAdmin && astCookie && astCookie.role === "assistant") ? astCookie : null;
    const hasStaffAccess = Boolean(isAdmin || assistantSession);
    const currentActorName = isAdmin ? "الأدمن" : (assistantSession ? String(assistantSession.assistant_name || "أسيستانت") : "");

    let student = null;
    if (stCookie && stCookie.phone) {
      student = await fsGet(env, "students", stCookie.phone);
    }

    const allTickets = await fsList(env, "tickets");
    const academicUnreadItems = student
      ? allTickets
          .filter(t => String(t.student_phone || "") === String(student.phone || "") && Boolean(String(t.reply || "").trim()))
          .map(t => ({
            key: `t_${t.id}_${String(t.reply || "").length}`,
            kind: "تيم الدعم العلمي",
            title: String(t.subject || "سؤال طالب"),
            preview: String(t.reply || "").slice(0, 70),
            href: "/student?section=tickets"
          }))
      : [];

    if (path === "/api/staff/alerts" && method === "GET") {
      if (!hasStaffAccess) {
        return new Response(JSON.stringify({ latest_key: "" }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      const alertDoc = await fsGet(env, "staff_alerts", "latest");
      return new Response(JSON.stringify({
        latest_key: alertDoc?.latest_key || "",
        title: alertDoc?.title || "",
        body: alertDoc?.body || ""
      }), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/api/support/thread" && method === "GET") {
      const sid = String(url.searchParams.get("session_id") || "").trim();
      if (!sid) {
        return new Response(JSON.stringify({ visitor_name: "", messages: [], read_admin_ids: [] }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      const doc = await fsGet(env, "support_chats", sid);
      return new Response(JSON.stringify({
        visitor_name: doc?.visitor_name || "",
        messages: Array.isArray(doc?.messages) ? doc.messages : [],
        read_admin_ids: Array.isArray(doc?.read_admin_ids) ? doc.read_admin_ids : []
      }), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/api/support/mark-read" && method === "POST") {
      const body = await parseFormBody(req);
      const sid = String(body.session_id || "").trim();
      const ids = Array.isArray(body.read_admin_ids) ? body.read_admin_ids.map(String) : [];
      if (sid) {
        const doc = await fsGet(env, "support_chats", sid);
        if (doc) {
          const merged = Array.from(new Set([...(Array.isArray(doc.read_admin_ids) ? doc.read_admin_ids : []), ...ids]));
          await fsSet(env, "support_chats", sid, { ...doc, read_admin_ids: merged });
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/api/support/send" && method === "POST") {
      const body = await parseFormBody(req);
      const sid = String(body.session_id || "").trim();
      const visitorName = String(body.visitor_name || "").trim();
      const studentPhone = String(body.student_phone || "").trim();
      const text = String(body.text || "").trim();
      const imageUrl = String(body.image_url || "").trim();
      const msgId = String(body.msg_id || ("m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)));
      const nameOnly = Boolean(body.register_name_only);

      if (!sid) {
        return new Response(JSON.stringify({ ok: false }), { status: 400 });
      }

      const existing = (await fsGet(env, "support_chats", sid)) || {
        visitor_name: visitorName || "زائر",
        student_phone: studentPhone,
        messages: [],
        read_admin_ids: [],
        updated_at: new Date().toISOString()
      };

      const msgs = Array.isArray(existing.messages) ? [...existing.messages] : [];
      if (!nameOnly && (text || imageUrl)) {
        msgs.push({
          id: msgId,
          sender: "user",
          sender_name: visitorName || existing.visitor_name || "زائر",
          text,
          image_url: imageUrl,
          at: new Date().toISOString()
        });
        await fsSet(env, "staff_alerts", "latest", {
          latest_key: `sup_${msgId}`,
          title: `رسالة دعم فني من: ${visitorName || existing.visitor_name || "زائر"}`,
          body: text || "أرسل صورة في الدعم الفني"
        });
      }

      const updatedDoc = {
        visitor_name: visitorName || existing.visitor_name || "زائر",
        student_phone: studentPhone || existing.student_phone || "",
        messages: msgs,
        read_admin_ids: Array.isArray(existing.read_admin_ids) ? existing.read_admin_ids : [],
        updated_at: new Date().toISOString()
      };

      await fsSet(env, "support_chats", sid, updatedDoc);

      return new Response(JSON.stringify({
        ok: true,
        visitor_name: updatedDoc.visitor_name,
        messages: updatedDoc.messages,
        read_admin_ids: updatedDoc.read_admin_ids
      }), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/student/consume-discount" && method === "POST") {
      const body = await parseFormBody(req);
      const code = String(body.code || "").trim().toUpperCase();
      if (code) {
        const dDoc = await fsGet(env, "discount_codes", code);
        if (dDoc && !dDoc.used) {
          await fsSet(env, "discount_codes", code, {
            ...dDoc,
            used: true,
            used_by: student?.phone || "",
            used_at: new Date().toISOString()
          });
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (path === "/logout") {
      return redirectRes("/student?tab=login", {
        "Set-Cookie": `${clearCookieHeader("nb_st")}, ${clearCookieHeader("nb_adm")}, ${clearCookieHeader("nb_ast")}`
      });
    }

    if (path === "/about" && method === "GET") {
      return htmlRes(renderLayout("من نحن", settings, student, hasStaffAccess, renderAboutStandalonePage(settings), {
        showLandingAdminAvatar: false,
        showSupportWidget: true,
        academicUnreadCount: academicUnreadItems.length,
        academicUnreadItems
      }));
    }

    if (path === "/privacy" && method === "GET") {
      return htmlRes(renderLayout("سياسة الخصوصية", settings, student, hasStaffAccess, renderPrivacyStandalonePage(), {
        showLandingAdminAvatar: false,
        showSupportWidget: true,
        academicUnreadCount: academicUnreadItems.length,
        academicUnreadItems
      }));
    }

    if (path === "/" && method === "GET") {
      return htmlRes(renderLayout("الرئيسية", settings, student, hasStaffAccess, renderLanding(settings), {
        showLandingAdminAvatar: true,
        showSupportWidget: true,
        academicUnreadCount: academicUnreadItems.length,
        academicUnreadItems
      }));
    }

    if (path === "/student" && method === "GET") {
      const tab = url.searchParams.get("tab") || "register";
      const step = Number(url.searchParams.get("step") || "1");
      const draft = {
        first_name: url.searchParams.get("first_name") || "",
        second_name: url.searchParams.get("second_name") || "",
        third_name: url.searchParams.get("third_name") || "",
        fourth_name: url.searchParams.get("fourth_name") || "",
        phone: url.searchParams.get("phone") || ""
      };
      const error = url.searchParams.get("error") || "";
      const notice = url.searchParams.get("notice") || "";

      if (!student) {
        return htmlRes(renderLayout("بوابة الطالب", settings, null, hasStaffAccess, renderStudentAuth(settings, tab, step, draft, error, notice), {
          showSupportWidget: true,
          academicUnreadCount: 0,
          academicUnreadItems: []
        }));
      }

      const lectureIdParam = url.searchParams.get("lecture") || "";
      if (lectureIdParam) {
        await fsSet(env, "watched_lectures", `${student.phone}_${lectureIdParam}`, {
          student_phone: student.phone,
          lecture_id: lectureIdParam,
          watched_at: new Date().toISOString()
        });
      }

      const [lectures, exams, submissions, drafts, watched, discounts, forumPosts] = await Promise.all([
        fsList(env, "lectures"),
        fsList(env, "exams"),
        fsList(env, "submissions"),
        fsList(env, "exam_drafts"),
        fsList(env, "watched_lectures"),
        fsList(env, "discount_codes"),
        fsList(env, "forum_posts")
      ]);

      const myTickets = allTickets.filter(t => t.student_phone === student.phone);
      const mySubmissions = submissions.filter(s => s.student_phone === student.phone);
      const myDrafts = drafts.filter(d => d.student_phone === student.phone);
      const myWatched = watched.filter(w => w.student_phone === student.phone);

      const dashHtml = renderStudentDash(settings, student, {
        section: url.searchParams.get("section") || "dashboard",
        branch: url.searchParams.get("branch") || "",
        forumBranch: url.searchParams.get("forum_branch") || BRANCHES[0],
        lectureId: lectureIdParam,
        examId: url.searchParams.get("exam_id") || "",
        lectures,
        exams,
        tickets: myTickets,
        submissions: mySubmissions,
        drafts: myDrafts,
        watched: myWatched,
        discounts,
        forumPosts,
        error,
        notice
      });
      return htmlRes(renderLayout("لوحة الطالب", settings, student, hasStaffAccess, dashHtml, {
        showSupportWidget: true,
        academicUnreadCount: academicUnreadItems.length,
        academicUnreadItems
      }));
    }

    if (path === "/student/forum-post" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const branch = String(form.branch || BRANCHES[0]);
      const message = String(form.message || "").trim();
      const imageUrl = String(form.image_url || "").trim();
      if (!message && !imageUrl) {
        return redirectRes(`/student?section=forum&forum_branch=${encodeURIComponent(branch)}&error=${encodeURIComponent("اكتب مشاركة أو أرفق صورة")}`);
      }
      const id = "fp_" + Date.now();
      await fsSet(env, "forum_posts", id, {
        branch,
        student_phone: student.phone,
        student_name: student.full_name,
        message,
        image_url: imageUrl,
        reply: "",
        replied_by: "",
        created_at: new Date().toISOString()
      });
      await fsSet(env, "staff_alerts", "latest", {
        latest_key: `fp_${id}`,
        title: `منتدى ${branch} — من الطالب: ${student.full_name}`,
        body: message || "أرسل صورة في المنتدى"
      });
      return redirectRes(`/student?section=forum&forum_branch=${encodeURIComponent(branch)}&notice=${encodeURIComponent("تم نشر مشاركتك في المنتدى")}`);
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
      const rawPass = String(form.password || "").trim();

      if (!centerCode || !name || !phone || !rawPass) {
        return redirectRes(`/student?tab=center&error=${encodeURIComponent("يرجى إدخال كود السنتر والاسم الرباعي ورقم الهاتف وكلمة السر")}`);
      }

      const codeDoc = await fsGet(env, "codes", centerCode);
      if (!codeDoc || codeDoc.type !== "center" || codeDoc.used) {
        return redirectRes(`/student?tab=center&error=${encodeURIComponent("كود السنتر غير صحيح أو تم استخدامه من قبل")}`);
      }

      await fsSet(env, "codes", centerCode, { ...codeDoc, used: true, used_by: phone });

      const existing = await fsGet(env, "students", phone);
      const updatedStudent = {
        full_name: name || existing?.full_name || "",
        phone,
        parent_phone: existing?.parent_phone || "",
        grade,
        track,
        governorate: existing?.governorate || "",
        password_plain: rawPass,
        password_hash: await sha256(rawPass),
        branches: [...BRANCHES],
        is_center_student: true,
        center_code: centerCode
      };
      await fsSet(env, "students", phone, updatedStudent);

      const tok = makeToken({ phone, role: "student" }, secret);
      return redirectRes(`/student?section=dashboard&notice=${encodeURIComponent("تم تفعيل المنصة وكل الفروع بكود السنتر بنجاح")}`, {
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

      if (!fullName || !phone || !parentPhone || !password) {
        return redirectRes(`/student?tab=register&step=1&error=${encodeURIComponent("أكمل جميع البيانات المطلوبة")}`);
      }
      if (phone === parentPhone) {
        return redirectRes(`/student?tab=register&step=2&phone=${encodeURIComponent(phone)}&error=${encodeURIComponent("يجب أن يكون رقم هاتف ولي الأمر مختلفاً عن رقم هاتف الطالب")}`);
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
        password_plain: password,
        password_hash: await sha256(password),
        branches: [],
        is_center_student: false,
        center_code: ""
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
      const newPassword = String(form.new_password || "").trim();
      if (phone && parentPhone && phone === parentPhone) {
        return redirectRes(`/student?tab=forgot&error=${encodeURIComponent("يجب أن يكون رقم هاتف ولي الأمر مختلفاً عن رقم الطالب")}`);
      }
      const st = await fsGet(env, "students", phone);
      if (!st || (st.parent_phone && st.parent_phone !== parentPhone)) {
        return redirectRes(`/student?tab=forgot&error=${encodeURIComponent("تعذر التحقق من رقم الطالب أو ولي الأمر")}`);
      }
      await fsSet(env, "students", phone, {
        ...st,
        password_plain: newPassword,
        password_hash: await sha256(newPassword)
      });
      return redirectRes(`/student?tab=login&notice=${encodeURIComponent("تم تعيين كلمة السر الجديدة وتحديثها في ملفك، سجل دخولك الآن")}`);
    }

    if (path === "/student/redeem-code" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const code = String(form.code || "").trim();
      const codeDoc = await fsGet(env, "codes", code);
      if (!codeDoc || codeDoc.used) {
        return redirectRes(`/student?section=codes&error=${encodeURIComponent("الكود غير صحيح أو مستخدم من قبل")}`);
      }

      if (codeDoc.type === "center") {
        await fsSet(env, "codes", code, { ...codeDoc, used: true, used_by: student.phone });
        await fsSet(env, "students", student.phone, {
          ...student,
          branches: [...BRANCHES],
          is_center_student: true,
          center_code: code
        });
        return redirectRes(`/student?section=dashboard&notice=${encodeURIComponent("تم تفعيل المنصة وكل الفروع بكود السنتر")}`);
      }

      const nextBranches = Array.from(new Set([...(student.branches || []), codeDoc.branch]));
      await fsSet(env, "codes", code, { ...codeDoc, used: true, used_by: student.phone });
      await fsSet(env, "students", student.phone, { ...student, branches: nextBranches });
      return redirectRes(`/student?section=branch&branch=${encodeURIComponent(codeDoc.branch)}&notice=${encodeURIComponent("تم تفعيل الفرع بنجاح")}`);
    }

    if (path === "/student/exam-action" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const examId = String(form.exam_id || "");
      const actionType = String(form.action_type || "finish");
      const exam = await fsGet(env, "exams", examId);
      if (!exam) return redirectRes(`/student?section=exams&error=${encodeURIComponent("الواجب غير موجود")}`);

      const questions = Array.isArray(exam.questions) ? exam.questions : [];
      const answers = questions.map((_, i) => {
        const v = form[`q_${i}`];
        return v !== undefined && v !== "" ? Number(v) : -1;
      });

      const draftDocId = `${student.phone}_${examId}`;

      if (actionType === "save") {
        await fsSet(env, "exam_drafts", draftDocId, {
          student_phone: student.phone,
          exam_id: examId,
          answers,
          updated_at: new Date().toISOString()
        });
        return redirectRes(`/student?section=exams&notice=${encodeURIComponent("تم حفظ تقدمك في الواجب، يمكنك استكماله لاحقاً")}`);
      }

      const existingSub = await fsGet(env, "submissions", draftDocId);
      if (existingSub) {
        return redirectRes(`/student?section=results&error=${encodeURIComponent("لقد قمت بتسليم هذا الواجب مسبقاً ولا يمكن حله مرة أخرى")}`);
      }

      let score = 0;
      const details = questions.map((q, i) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const chosenIdx = answers[i];
        const correctIdx = Number(q.correct_idx ?? 0);
        const isCorrect = chosenIdx === correctIdx;
        if (isCorrect) score++;
        return {
          question: String(q.text || ""),
          student_answer: chosenIdx >= 0 && chosenIdx < opts.length ? String(opts[chosenIdx]) : "لم تُجب",
          correct_answer: correctIdx >= 0 && correctIdx < opts.length ? String(opts[correctIdx]) : "",
          is_correct: isCorrect
        };
      });

      const total = questions.length;
      const wrongCount = Math.max(0, total - score);
      const pct = total > 0 ? Math.round((score / total) * 100) : 100;

      await fsSet(env, "submissions", draftDocId, {
        student_phone: student.phone,
        student_name: student.full_name,
        exam_id: examId,
        exam_title: exam.title,
        branch: exam.branch || "عام",
        score,
        wrong_count: wrongCount,
        total,
        pct,
        details,
        submitted_at: new Date().toISOString()
      });

      await fsDelete(env, "exam_drafts", draftDocId);

      return redirectRes(`/student?section=results&notice=${encodeURIComponent(`تم تسليم الواجب بنجاح (${score} من ${total} • ${pct}%)`)}`);
    }

    if (path === "/student/tickets" && method === "POST") {
      if (!student) return redirectRes("/student?tab=login");
      const form = await parseFormBody(req);
      const subject = String(form.subject || "").trim();
      const message = String(form.message || "").trim();
      const imageUrl = String(form.image_url || "").trim();
      if (!subject || !message) {
        return redirectRes(`/student?section=tickets&error=${encodeURIComponent("اكتب عنوان السؤال وتفاصيله")}`);
      }
      const id = "t_" + Date.now();
      await fsSet(env, "tickets", id, {
        student_phone: student.phone,
        student_name: student.full_name,
        subject,
        message,
        image_url: imageUrl,
        reply: "",
        replied_by: "",
        created_at: new Date().toISOString()
      });
      await fsSet(env, "staff_alerts", "latest", {
        latest_key: `t_${id}`,
        title: `سؤال جديد في تيم الدعم العلمي من: ${student.full_name}`,
        body: subject
      });
      return redirectRes(`/student?section=tickets&notice=${encodeURIComponent("تم إرسال سؤالك إلى تيم الدعم العلمي")}`);
    }

    if (path === "/admin" && method === "GET") {
      const sec = url.searchParams.get("section") || (hasStaffAccess ? (isAdmin ? "students" : "tickets") : "");
      const err = url.searchParams.get("error") || "";
      const notice = url.searchParams.get("notice") || "";
      let data = {};
      if (hasStaffAccess) {
        const [students, codes, lectures, exams, submissions, watched, tickets, discounts, assistants, forumPosts, supportThreads] = await Promise.all([
          fsList(env, "students"),
          fsList(env, "codes"),
          fsList(env, "lectures"),
          fsList(env, "exams"),
          fsList(env, "submissions"),
          fsList(env, "watched_lectures"),
          fsList(env, "tickets"),
          fsList(env, "discount_codes"),
          fsList(env, "assistants"),
          fsList(env, "forum_posts"),
          fsList(env, "support_chats")
        ]);
        data = {
          students,
          codes,
          lectures,
          exams,
          submissions,
          watched,
          tickets,
          discounts,
          assistants,
          forumPosts,
          supportThreads,
          preselectLectureId: url.searchParams.get("lecture_id") || "",
          rankingGrade: url.searchParams.get("rank_grade") || GRADES[0]
        };
      }
      return htmlRes(renderLayout("لوحة الأدمن والأسيستانت", settings, student, hasStaffAccess, renderAdminPage(settings, isAdmin, assistantSession, data, sec, err, notice), {
        showSupportWidget: false,
        academicUnreadCount: 0,
        academicUnreadItems: []
      }));
    }

    if (path === "/admin/login" && method === "POST") {
      const form = await parseFormBody(req);
      const email = String(form.email || "").trim().toLowerCase();
      const pass = String(form.password || "");
      const valid = await verifyAdminCredentials(env, settings, email, pass);
      if (!valid) {
        return redirectRes(`/admin?error=${encodeURIComponent("بيانات دخول الأدمن غير صحيحة")}`);
      }
      const tok = makeToken({ email, role: "admin" }, secret);
      return redirectRes("/admin?section=students", {
        "Set-Cookie": `${setCookieHeader("nb_adm", tok)}, ${clearCookieHeader("nb_ast")}`
      });
    }

    if (path === "/assistant/login" && method === "POST") {
      const form = await parseFormBody(req);
      const assistantName = String(form.assistant_name || "").trim();
      const assistantCode = String(form.assistant_code || "").trim();
      if (!assistantName || !assistantCode) {
        return redirectRes(`/admin?error=${encodeURIComponent("اكتب اسم الأسيستانت والكود الخاص به")}`);
      }
      const allAssistants = await fsList(env, "assistants");
      const matched = allAssistants.find(a => String(a.code || "").trim() === assistantCode);
      if (!matched) {
        return redirectRes(`/admin?error=${encodeURIComponent("كود الأسيستانت غير صحيح")}`);
      }
      const tok = makeToken({
        role: "assistant",
        assistant_name: assistantName,
        assistant_code: assistantCode
      }, secret);
      return redirectRes("/admin?section=tickets", {
        "Set-Cookie": `${setCookieHeader("nb_ast", tok)}, ${clearCookieHeader("nb_adm")}`
      });
    }

    if (path === "/admin/create-assistant" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const assistantName = String(form.assistant_name || "").trim();
      if (!assistantName) {
        return redirectRes(`/admin?section=codes&error=${encodeURIComponent("اكتب اسم الأسيستانت")}`);
      }
      const code = "AST-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      await fsSet(env, "assistants", code, {
        name: assistantName,
        code,
        created_at: new Date().toISOString()
      });
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent(`تم إنشاء كود للأسيستانت (${assistantName}): ${code}`)}`);
    }

    if (path === "/admin/delete-assistant" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const id = String(form.assistant_id || "").trim();
      if (id) await fsDelete(env, "assistants", id);
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent("تم حذف كود الأسيستانت")}`);
    }

    if (path === "/admin/generate-codes" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const codeType = String(form.code_type || "center");
      const branch = String(form.branch || BRANCHES[0]);
      const count = Math.min(50, Math.max(1, Number(form.count || 1)));
      const prefix = codeType === "center" ? "CTR" : "BR";
      for (let i = 0; i < count; i++) {
        const code = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await fsSet(env, "codes", code, {
          code,
          type: codeType,
          branch: codeType === "center" ? "" : branch,
          used: false,
          used_by: ""
        });
      }
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent(`تم توليد ${count} كود بنجاح`)}`);
    }

    if (path === "/admin/delete-code" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const codeId = String(form.code_id || "").trim();
      if (codeId) await fsDelete(env, "codes", codeId);
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent("تم حذف الكود")}`);
    }

    if (path === "/admin/create-discount" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      let code = String(form.discount_code || "").trim().toUpperCase();
      if (!code) {
        code = "DISC-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      }
      const amount = Math.min(COURSE_PRICE_EGP, Math.max(1, Number(form.discount_amount || 0)));
      await fsSet(env, "discount_codes", code, {
        code,
        amount,
        used: false,
        used_by: "",
        created_at: new Date().toISOString()
      });
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent(`تم إنشاء كود الخصم (${code}) بقيمة ${amount} ج`)}`);
    }

    if (path === "/admin/delete-discount" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const discountId = String(form.discount_id || "").trim();
      if (discountId) await fsDelete(env, "discount_codes", discountId);
      return redirectRes(`/admin?section=codes&notice=${encodeURIComponent("تم حذف كود الخصم")}`);
    }

    if (path === "/admin/grant-branches" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      const rawBranches = form.branches;
      const chosen = Array.isArray(rawBranches) ? rawBranches : (rawBranches ? [rawBranches] : []);
      const st = await fsGet(env, "students", phone);
      if (st) {
        const merged = Array.from(new Set([...(st.branches || []), ...chosen]));
        await fsSet(env, "students", phone, { ...st, branches: merged });
      }
      return redirectRes(`/admin?section=students&notice=${encodeURIComponent("تم تفعيل اشتراك الفروع المحددة للطالب")}`);
    }

    if (path === "/admin/revoke-branch" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      const branchToRemove = String(form.branch || "").trim();
      const st = await fsGet(env, "students", phone);
      if (st) {
        const nextBranches = (st.branches || []).filter(b => String(b) !== branchToRemove);
        await fsSet(env, "students", phone, { ...st, branches: nextBranches });
      }
      return redirectRes(`/admin?section=students&notice=${encodeURIComponent("تم إلغاء تفعيل الفرع عن الطالب")}`);
    }

    if (path === "/admin/delete-student" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const phone = String(form.phone || "").trim();
      if (phone) await fsDelete(env, "students", phone);
      return redirectRes(`/admin?section=students&notice=${encodeURIComponent("تم حذف الطالب")}`);
    }

    if (path === "/admin/add-lecture" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const title = String(form.title || "").trim();
      const branch = String(form.branch || BRANCHES[0]);
      const grade = String(form.grade || GRADES[0]);
      const track = String(form.track || TRACKS[0]);
      const orderNum = Math.max(1, Number(form.order_num || 1));
      const videoUrl = String(form.video_url || "").trim();
      let customItems = [];
      try {
        const parsed = JSON.parse(String(form.custom_items_json || "[]"));
        if (Array.isArray(parsed)) customItems = parsed;
      } catch {
        customItems = [];
      }
      if (title) {
        const id = "lec_" + Date.now();
        await fsSet(env, "lectures", id, {
          title,
          branch,
          grade,
          track,
          order_num: orderNum,
          video_url: videoUrl,
          custom_items: customItems
        });
      }
      return redirectRes(`/admin?section=lectures&notice=${encodeURIComponent("تمت إضافة المحاضرة وعناصرها بنجاح")}`);
    }

    if (path === "/admin/delete-lecture" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const lecId = String(form.lecture_id || "").trim();
      if (lecId) await fsDelete(env, "lectures", lecId);
      return redirectRes(`/admin?section=lectures&notice=${encodeURIComponent("تم حذف المحاضرة")}`);
    }

    if (path === "/admin/add-exam" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const title = String(form.title || "").trim();
      const branch = String(form.branch || BRANCHES[0]);
      const lectureId = String(form.lecture_id || "").trim();
      let questions = [];
      try {
        const parsed = JSON.parse(String(form.questions_json || "[]"));
        if (Array.isArray(parsed)) questions = parsed;
      } catch {
        questions = [];
      }
      if (title && questions.length) {
        const id = "ex_" + Date.now();
        await fsSet(env, "exams", id, { title, branch, lecture_id: lectureId, questions });
      }
      return redirectRes(`/admin?section=exams&notice=${encodeURIComponent("تم حفظ ونشر الواجب / الاختبار بنجاح")}`);
    }

    if (path === "/admin/delete-exam" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const examId = String(form.exam_id || "").trim();
      if (examId) await fsDelete(env, "exams", examId);
      return redirectRes(`/admin?section=exams&notice=${encodeURIComponent("تم حذف الواجب / الاختبار")}`);
    }

    if (path === "/admin/reply-ticket" && method === "POST") {
      if (!hasStaffAccess) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const ticketId = String(form.ticket_id || "").trim();
      const reply = String(form.reply || "").trim();
      const t = await fsGet(env, "tickets", ticketId);
      if (t) {
        await fsSet(env, "tickets", ticketId, {
          ...t,
          reply,
          replied_by: currentActorName
        });
      }
      return redirectRes(`/admin?section=tickets&notice=${encodeURIComponent(`تم حفظ الرد باسم (${currentActorName})`)}`);
    }

    if (path === "/admin/reply-forum" && method === "POST") {
      if (!hasStaffAccess) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const postId = String(form.post_id || "").trim();
      const reply = String(form.reply || "").trim();
      const fp = await fsGet(env, "forum_posts", postId);
      if (fp) {
        await fsSet(env, "forum_posts", postId, {
          ...fp,
          reply,
          replied_by: currentActorName
        });
      }
      return redirectRes(`/admin?section=forum&notice=${encodeURIComponent(`تم نشر الرد في المنتدى باسم (${currentActorName})`)}`);
    }

    if (path === "/admin/support-reply" && method === "POST") {
      if (!hasStaffAccess) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const sid = String(form.session_id || "").trim();
      const replyText = String(form.reply_text || "").trim();
      const existing = await fsGet(env, "support_chats", sid);
      if (existing && replyText) {
        const msgs = Array.isArray(existing.messages) ? [...existing.messages] : [];
        msgs.push({
          id: "adm_" + Date.now(),
          sender: "admin",
          sender_name: currentActorName,
          text: replyText,
          at: new Date().toISOString()
        });
        await fsSet(env, "support_chats", sid, {
          ...existing,
          messages: msgs,
          updated_at: new Date().toISOString()
        });
      }
      return redirectRes(`/admin?section=support&notice=${encodeURIComponent(`تم إرسال الرد باسم (${currentActorName})`)}`);
    }

    if (path === "/admin/settings" && method === "POST") {
      if (!isAdmin) return redirectRes("/admin");
      const form = await parseFormBody(req);
      const nextAdminEmail = String(form.admin_email || settings.admin_email || DEFAULT_ADMIN_EMAIL).trim();
      const newPass = String(form.new_admin_password || "").trim();
      const nextVodafone = String(form.vodafone_number || "").trim();
      const nextWhatsapp = String(form.admin_whatsapp || "").trim();
      const nextTeacherImg = String(form.teacher_image || "").trim() || TEACHER_MAIN_PHOTO;
      const nextNotice = String(form.global_notice || "").trim();
      const nextFb = String(form.facebook_url || "").trim();
      const nextTt = String(form.tiktok_url || "").trim();
      const nextYt = String(form.youtube_url || "").trim();

      const updatedPayload = {
        admin_email: nextAdminEmail,
        vodafone_number: nextVodafone,
        admin_whatsapp: nextWhatsapp,
        teacher_image: nextTeacherImg,
        global_notice: nextNotice,
        facebook_url: nextFb,
        tiktok_url: nextTt,
        youtube_url: nextYt
      };

      if (newPass) {
        updatedPayload.admin_password = newPass;
        updatedPayload.admin_password_hash = await sha256(newPass);
      }

      await fsSet(env, "settings", "main", updatedPayload);
      return redirectRes(`/admin?section=settings&notice=${encodeURIComponent("تم حفظ الإعدادات بنجاح في Firebase")}`);
    }

    return redirectRes("/");
  }
};