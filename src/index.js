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
const ABSENCE_LESSON_PRICE_EGP = 70;

function generateCenterCodeMO() {
  let digits = "";
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  digits = String(arr[0] % 90000000 + 10000000);
  return "MO" + digits;
}

function normalizeMoCode(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";
  if (s.startsWith("MO")) return s;
  return "MO" + s;
}

function normalizePhone(raw) {
  return String(raw || "").replace(/\s+/g, "").trim();
}

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
  const projectId = (env && env.FIREBASE_PROJECT_ID) || "mr-mohmed";
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function fsKeyQuery(env) {
  const apiKey = (env && env.FIREBASE_API_KEY) || "AIzaSyDmCu9lIUv7LDCw4VTwrhpA1PrIN7pa6Po";
  return apiKey ? `?key=${encodeURIComponent(apiKey)}` : "";
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
  if ("booleanValue" in fv) return Boolean(fv.booleanValue);
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

function checkCenterStudentLectureAccess(student, lecture) {
  const isCenter = Boolean(student && (student.is_center_student || student.center_code));
  if (!isCenter) return { allowed: true, reason: "" };

  const lecId = String(lecture.id || "");
  const lockedList = Array.isArray(student.locked_lectures) ? student.locked_lectures.map(String) : [];
  if (lockedList.includes(lecId)) {
    return { allowed: false, reason: "absent" };
  }

  const unlockedList = Array.isArray(student.unlocked_lectures) ? student.unlocked_lectures.map(String) : [];
  if (unlockedList.includes(lecId)) {
    return { allowed: true, reason: "" };
  }

  const requiresAtt = Boolean(lecture.requires_attendance);
  const attendedCodes = Array.isArray(lecture.attended_codes)
    ? lecture.attended_codes.map(c => String(c || "").trim().toUpperCase())
    : [];
  const stCode = String(student.center_code || "").trim().toUpperCase();

  if (requiresAtt) {
    if (stCode && attendedCodes.includes(stCode)) {
      return { allowed: true, reason: "" };
    }
    return { allowed: false, reason: "absent" };
  }

  return { allowed: true, reason: "" };
}

function buildStudentPaymentWaUrl(settings, student, itemLabel, priceEgp, extraLines = []) {
  const waPhone = normalizeWaPhone(settings.admin_whatsapp || settings.vodafone_number || "01066329782");
  const isCenter = Boolean(student && (student.is_center_student || student.center_code));
  const studentTypeLabel = isCenter ? "طالب سنتر" : "طالب منصة";
  const lines = [
    `السلام عليكم، طلب دفع وتفعيل في منصة ${PLATFORM_NAME}`,
    `اسم الطالب: ${student?.full_name || ""}`,
    `رقم الهاتف: ${student?.phone || ""}`,
    `نوع الطالب: ${studentTypeLabel}`,
    isCenter ? `كود طالب السنتر: ${student?.center_code || "-"}` : "",
    `الصف: ${student?.grade || ""}`,
    `المطلوب: ${itemLabel}`,
    ...extraLines,
    `المبلغ المطلوب دفعه: ${priceEgp} ج`
  ].filter(Boolean);

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
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
      <div style="background:var(--surface-soft); border:1px solid var(--bdr); border-radius:20px; padding:12px; text-align:center;">
        <img src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" style="width:100%; max-height:290px; object-fit:contain; object-position:center top; border-radius:14px;" onerror="this.style.display='none';" />
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
        <h3 style="font-weight:900; color:var(--accent); margin-bottom:8px;">متابعة المنتدى والغياب</h3>
        <p class="muted" style="font-size:0.9rem; line-height:1.8;">
          فريق متخصص لمتابعة مشاركات الطلاب في منتديات الفروع وتسجيل حضور وغياب طلاب السنتر وتفعيل المحاضرات لهم بانتظام.
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
      desc: "الاسم الرباعي، رقم هاتف الطالب، رقم هاتف ولي الأمر، الصف، الشعبة، والمحافظة تُحفظ بسرية ولا تُعرض أو تُباع لأي جهة خارجية."
    },
    {
      enTitle: "Educational & Assessment Privacy",
      arTitle: "خصوصية السجل التعليمي والدرجات",
      desc: "درجات الواجبات والامتحانات، نسبة الإنجاز، وسجل الحضور والغياب مخصصة للطالب والإدارة لمتابعة التحصيل الدراسي."
    },
    {
      enTitle: "Intellectual Property & Video Content Privacy",
      arTitle: "خصوصية المحتوى التعليمي والملكية الفكرية",
      desc: "جميع المحاضرات والشروحات والملفات محفوظة لمنصة نور البيان والأستاذ محمد يوسف، ويُمنع تصوير الشاشة أو إعادة نشر المحتوى."
    },
    {
      enTitle: "Account & Single-Device Session Security",
      arTitle: "خصوصية أمان الحساب والجلسة الفردية",
      desc: "يسمح النظام بجلسة نشطة على جهاز واحد فقط (لابتوب أو موبايل) لحماية الحساب ومنع مشاركته بين أجهزة متعددة."
    },
    {
      enTitle: "Local Storage & Cookies Privacy",
      arTitle: "خصوصية التخزين المحلي وملفات تعريف الارتباط",
      desc: "نستخدم التخزين المحلي لحفظ تفضيلات العرض وحالة الجلسة لتحسين سرعة الاستخدام."
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

function renderLayout(title, settings, student, isStaff, bodyHtml, options = {}) {
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
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Aref+Ruqaa:wght@700&display=swap" />
  <style>
    :root {
      --bg: #f3f6fb;
      --surface: #ffffff;
      --surface-soft: #edf3f9;
      --txt: #132238;
      --muted: #667894;
      --accent: #246bfd;
      --accent-dark: #1647c6;
      --accent-2: #6d4aff;
      --err: #dc2626;
      --bdr: rgba(36, 107, 253, 0.15);
      --thuluth-color: rgba(36, 107, 253, 0.035);
      --shadow-sm: 0 8px 22px rgba(30, 55, 90, 0.07);
      --shadow-md: 0 18px 46px rgba(30, 55, 90, 0.10);
      --shadow-lg: 0 28px 70px rgba(30, 55, 90, 0.16);
    }
    body.dark {
      --bg: #070a12;
      --surface: #0d1320;
      --surface-soft: #121a2a;
      --txt: #f7f9ff;
      --muted: #a1abc0;
      --accent: #7c8cff;
      --accent-dark: #5d6fe8;
      --accent-2: #b267ff;
      --err: #f87171;
      --bdr: rgba(154, 163, 255, 0.14);
      --thuluth-color: rgba(124, 140, 255, 0.035);
      --shadow-sm: 0 6px 18px rgba(0, 0, 0, 0.28);
      --shadow-md: 0 18px 44px rgba(0, 0, 0, 0.38);
      --shadow-lg: 0 28px 65px rgba(0, 0, 0, 0.52);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
    body {
      background: var(--bg);
      color: var(--txt);
      min-height: 100vh;
      line-height: 1.72;
      position: relative;
      overflow-x: hidden;
      transition: background-color 0.28s ease, color 0.22s ease;
    }
    body.dark {
      background:
        radial-gradient(circle at 82% 8%, rgba(178, 103, 255, 0.10), transparent 24rem),
        radial-gradient(circle at 12% 55%, rgba(93, 111, 232, 0.10), transparent 26rem),
        var(--bg);
    }
    body.dark .topbar {
      background: rgba(12, 20, 36, 0.86);
      border-bottom-color: rgba(125, 211, 252, 0.12);
    }
    body.dark .card,
    body.dark .right-drawer,
    body.dark .landing-hero-card,
    body.dark .course-card,
    body.dark .student-detail-box,
    body.dark .q-builder-card,
    body.dark .landing-feature,
    body.dark .admin-table-wrap,
    body.dark .support-chat-window {
      background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.018), transparent 55%),
        var(--surface);
      border-color: var(--bdr);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    body.dark input,
    body.dark select,
    body.dark textarea {
      background: #09111f;
      color: var(--txt);
      border-color: rgba(125, 211, 252, 0.15);
    }
    body.dark input:focus,
    body.dark select:focus,
    body.dark textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.10);
    }
    body.dark .btn-blue,
    body.dark .btn-teal,
    body.dark .btn-gold {
      background: linear-gradient(135deg, #5d6fe8, #9c5cf1);
      box-shadow: 0 10px 28px rgba(124, 140, 255, 0.18);
    }
    body.dark .btn-out {
      background: rgba(255, 255, 255, 0.035);
    }
    body.dark ::selection {
      background: rgba(56, 189, 248, 0.28);
      color: #ffffff;
    }
    body.dark ::-webkit-scrollbar { width: 10px; height: 10px; }
    body.dark ::-webkit-scrollbar-track { background: #060b16; }
    body.dark ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #5d6fe8, #9c5cf1);
      border: 2px solid #060b16;
      border-radius: 999px;
    }
    body.dark .topbar {
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.24);
    }
    body.dark .landing-hero-card {
      background:
        radial-gradient(circle at 88% 12%, rgba(178, 103, 255, 0.16), transparent 30%),
        radial-gradient(circle at 8% 90%, rgba(93, 111, 232, 0.12), transparent 28%),
        linear-gradient(145deg, #0d1320 0%, #121a2a 100%);
    }
    body.dark .hero-teacher-frame {
      box-shadow:
        0 22px 54px rgba(124, 140, 255, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    body.dark .hero-eyebrow {
      background: rgba(56, 189, 248, 0.08);
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.06);
    }
    body.dark .landing-feature {
      position: relative;
      isolation: isolate;
      overflow: hidden;
    }
    body.dark .landing-feature::before {
      content: "";
      position: absolute;
      inset: auto -40% -80% 20%;
      height: 130%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.10), transparent 55%);
      z-index: -1;
      transition: transform 0.45s ease;
    }
    body.dark .landing-feature:hover::before {
      transform: translateY(-18%) scale(1.12);
    }
    body.dark .table-wrap,
    body.dark .admin-table-wrap,
    body.dark .student-detail-box {
      border-radius: 18px;
      overflow: hidden;
    }

    #screenBlackoutGuard {
      display: none;
      position: fixed;
      inset: 0;
      background: #000000;
      z-index: 99999;
    }
    body.screen-blackout #screenBlackoutGuard { display: block; }
    @media print {
      body * { visibility: hidden !important; }
      body { background: #000000 !important; }
    }

    #thuluthBg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      align-items: center;
      justify-items: center;
      padding: 36px 20px;
      gap: 48px;
      overflow: hidden;
    }
    .thuluth-phrase {
      font-family: 'Aref Ruqaa', 'Cairo', serif;
      font-size: clamp(2.1rem, 4.4vw, 3.6rem);
      font-weight: 700;
      color: var(--thuluth-color);
      transform: rotate(-14deg);
      user-select: none;
      white-space: nowrap;
      line-height: 1.3;
    }
    @media (max-width: 760px) {
      #thuluthBg { grid-template-columns: repeat(2, 1fr); gap: 36px; }
    }

    .page-layer { position: relative; z-index: 1; }

    .topbar {
      background: color-mix(in srgb, var(--surface) 88%, transparent);
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      border-bottom: 1px solid var(--bdr);
      padding: 12px clamp(16px, 3vw, 38px);
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
    .brand-box { display: flex; align-items: center; gap: 13px; }
    .brand-logo-badge {
      width: 50px; height: 50px; border-radius: 15px;
      background: linear-gradient(135deg, #5d6fe8 0%, #9c5cf1 100%);
      color: #fff; font-weight: 900; display: grid; place-items: center; font-size: 0.88rem;
      box-shadow: 0 12px 28px rgba(93, 111, 232, 0.30);
      letter-spacing: -0.5px;
    }

    .notif-bell-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .blue-bell-btn {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      border: 1.5px solid var(--accent-2);
      background: linear-gradient(135deg, var(--accent-dark), var(--accent-2));
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 900;
      display: grid;
      place-items: center;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(21, 101, 192, 0.28);
      transition: transform 0.16s ease;
    }
    .blue-bell-btn:hover { transform: translateY(-1px) scale(1.04); }
    .blue-bell-btn.has-alert { animation: bellPulse 1.4s infinite ease-in-out; }
    @keyframes bellPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(30, 136, 229, 0.65); }
      50% { box-shadow: 0 0 0 9px rgba(30, 136, 229, 0); }
    }
    .bell-badge-num {
      position: absolute;
      top: -6px;
      left: -6px;
      min-width: 21px;
      height: 21px;
      padding: 0 5px;
      border-radius: 999px;
      background: #ef4444;
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
      top: 70px;
      left: 24px;
      width: min(360px, calc(100vw - 28px));
      max-height: 390px;
      overflow-y: auto;
      background: var(--surface);
      border: 1.5px solid var(--bdr);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 15px;
      z-index: 90;
    }
    .notif-popover.open { display: block; }
    .notif-item-card {
      padding: 11px 13px;
      border-radius: 14px;
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
      background: #9bb4d8;
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
      box-shadow: 0 2px 6px rgba(13, 71, 161, 0.25);
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .mode-switch input:checked + .mode-track { background: #1565c0; }
    .mode-switch input:checked + .mode-track::after { transform: translateX(22px); }
    .mode-text { font-size: 0.82rem; font-weight: 800; color: var(--txt); }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 11px 20px;
      border-radius: 14px;
      border: 1px solid transparent;
      font-weight: 800;
      cursor: pointer;
      text-decoration: none;
      font-size: 0.9rem;
      transition: transform 0.16s ease, box-shadow 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn:active { transform: translateY(0) scale(0.985); }

    .btn-blue {
      background: linear-gradient(135deg, #5d6fe8 0%, #8c62f1 100%);
      color: #fff;
      box-shadow: 0 9px 24px rgba(93, 111, 232, 0.30);
    }
    .btn-blue:hover { box-shadow: 0 13px 32px rgba(93, 111, 232, 0.42); }

    .btn-teal {
      background: linear-gradient(135deg, #16a085 0%, #37c6a4 100%);
      color: #fff;
      box-shadow: 0 7px 20px rgba(25, 118, 210, 0.28);
    }
    .btn-teal:hover { box-shadow: 0 11px 26px rgba(25, 118, 210, 0.4); }

    .btn-gold {
      background: linear-gradient(135deg, #1e88e5, #0d47a1);
      color: #ffffff;
      box-shadow: 0 6px 18px rgba(30, 136, 229, 0.28);
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
    .btn-sm { padding: 7px 14px; font-size: 0.82rem; border-radius: 11px; }
    .btn {
      position: relative;
      overflow: hidden;
      transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
    }
    .btn::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.18) 48%, transparent 70%);
      transform: translateX(130%);
      transition: transform 0.55s ease;
    }
    .btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
    .btn:hover::after { transform: translateX(-130%); }

    .card, .right-drawer, .landing-hero-card, .course-card, .student-detail-box, .q-builder-card {
      background: var(--surface);
      border: 1px solid var(--bdr);
      border-radius: 24px;
      box-shadow: var(--shadow-md);
      transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    }
    .card { padding: 24px; margin-bottom: 18px; position: relative; }
    body.dark .card,
    body.dark .landing-hero-card {
      animation: panelEnter 0.55s cubic-bezier(.2,.75,.25,1) both;
    }
    @keyframes panelEnter {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes softFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-7px); }
    }
    body.dark .hero-teacher-frame,
    body.dark .support-fab-btn,
    body.dark .floating-admin-avatar {
      animation: softFloat 5.5s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
    .course-card:hover, .landing-hero-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: var(--accent);
    }

    .jakh-week-banner {
      background: linear-gradient(125deg, #0d47a1 0%, #1976d2 100%);
      color: #fff;
      padding: 22px 26px;
      border-radius: 22px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      box-shadow: var(--shadow-md);
    }
    .you-here-pill {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 6px 15px; border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff; font-weight: 800; font-size: 0.84rem; white-space: nowrap;
    }
    .lecture-accordion-list { display: flex; flex-direction: column; gap: 13px; }
    .lec-accordion-item {
      border-radius: 18px;
      border: 1.5px solid var(--bdr);
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
      padding: 17px 21px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      text-align: right;
      transition: background-color 0.22s ease, color 0.22s ease;
    }
    .lec-accordion-item.is-open .lec-accordion-header {
      background: linear-gradient(125deg, #0d47a1 0%, #1976d2 100%);
      color: #ffffff;
    }
    .lec-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .lec-chevron-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #1e88e5;
      color: #ffffff;
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(30, 136, 229, 0.35);
      transition: transform 0.25s ease;
    }
    .lec-accordion-item:not(.is-open) .lec-chevron-circle { transform: rotate(180deg); }
    .lec-counter-badge { font-weight: 800; font-size: 0.9rem; opacity: 0.92; direction: ltr; }
    .lec-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex: 1;
    }
    .lec-main-title { font-weight: 900; font-size: 1.05rem; line-height: 1.45; }
    .lec-sub-icons { font-size: 0.85rem; opacity: 0.9; display: flex; align-items: center; gap: 6px; }

    .lec-accordion-body {
      display: none;
      padding: 18px;
      background: var(--surface);
      border-top: 1px solid var(--bdr);
    }
    .lec-accordion-item.is-open .lec-accordion-body { display: block; }

    .sub-topic-list { display: flex; flex-direction: column; gap: 10px; }
    .sub-topic-card {
      border: 1px solid var(--bdr);
      border-radius: 15px;
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
      padding: 15px 18px 17px;
      background: var(--surface);
      border-top: 1px solid var(--bdr);
    }
    .sub-topic-card.sub-open .sub-topic-panel { display: block; }

    .jakh-action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px 17px; border-radius: 12px;
      background: linear-gradient(135deg, #0d47a1, #1976d2);
      color: #ffffff; font-weight: 800; font-size: 0.85rem;
      text-decoration: none; border: none; cursor: pointer;
      box-shadow: 0 5px 14px rgba(13, 71, 161, 0.28);
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .jakh-action-btn:hover { transform: translateY(-1px); opacity: 0.96; }

    .field { margin-bottom: 14px; }
    label { display: block; font-weight: 800; margin-bottom: 6px; font-size: 0.88rem; color: var(--txt); }

    .pwd-input-wrap { position: relative; display: flex; align-items: center; }
    .pwd-input-wrap input { padding-left: 44px; }
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
    .pwd-eye-btn:hover { color: var(--accent); }

    input, select, textarea {
      width: 100%;
      padding: 12px 15px;
      border-radius: 14px;
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
      box-shadow: 0 0 0 4px rgba(93, 111, 232, 0.13);
    }
    textarea { min-height: 96px; resize: vertical; }
    input[type="radio"], input[type="checkbox"] { width: auto; box-shadow: none; }

    .floating-admin-wrap {
      position: fixed;
      bottom: 18px;
      left: 18px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .floating-admin-menu {
      display: none;
      flex-direction: column;
      gap: 8px;
      background: var(--surface);
      border: 1.5px solid var(--bdr);
      border-radius: 18px;
      padding: 12px;
      box-shadow: var(--shadow-lg);
      min-width: 195px;
    }
    .floating-admin-menu.open { display: flex; }
    .floating-admin-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;
      border: 2.5px solid var(--accent);
      box-shadow: var(--shadow-md);
      background: var(--surface);
      cursor: pointer;
      padding: 0;
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
      padding: 0 22px;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #5d6fe8 0%, #9c5cf1 100%);
      color: #ffffff;
      font-weight: 900;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 14px 32px rgba(93, 111, 232, 0.38);
      z-index: 80;
      transition: transform 0.18s ease, box-shadow 0.2s ease;
    }
    .support-fab-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 18px 38px rgba(13, 71, 161, 0.52);
    }
    .support-fab-icon {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
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
      background: #ef4444;
      color: #ffffff;
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
      border: 1.5px solid var(--bdr);
      border-radius: 24px;
      box-shadow: var(--shadow-lg);
      z-index: 85;
      flex-direction: column;
      overflow: hidden;
    }
    .support-chat-window.open { display: flex; }
    .support-chat-header {
      background: linear-gradient(125deg, #0d47a1, #1976d2);
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
      border-radius: 16px 16px 16px 4px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-start;
      box-shadow: var(--shadow-sm);
    }
    .chat-bubble-user {
      background: linear-gradient(135deg, #1565c0, #1976d2);
      color: #ffffff;
      padding: 11px 14px;
      border-radius: 16px 16px 4px 16px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-end;
      box-shadow: var(--shadow-sm);
    }
    .chat-bubble-admin {
      background: rgba(21, 101, 192, 0.14);
      border: 1px solid rgba(21, 101, 192, 0.35);
      color: var(--txt);
      padding: 11px 14px;
      border-radius: 16px 16px 16px 4px;
      font-size: 0.9rem;
      font-weight: 700;
      max-width: 88%;
      align-self: flex-start;
    }
    .chat-msg-img {
      max-width: 100%;
      max-height: 190px;
      border-radius: 12px;
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
      border-radius: 11px;
      padding: 6px 10px;
      margin-bottom: 8px;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .support-img-chip.has-img { display: flex; }
    .support-composer-row { display: flex; align-items: center; gap: 8px; }
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
    .plus-attach-btn:hover { background: var(--accent); color: #ffffff; }

    .inline-dua-banner {
      max-width: 1240px;
      margin: 14px auto 0;
      padding: 15px 22px;
      border-radius: 20px;
      background: linear-gradient(125deg, #0d47a1, #1976d2);
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
      width: 52px; height: 64px; border-radius: 13px;
      object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.16);
      border: 1.5px solid rgba(255, 255, 255, 0.7); flex-shrink: 0;
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
      border: 1.5px solid var(--accent);
      border-right: 5px solid var(--accent);
      border-radius: 16px;
      padding: 13px 18px;
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
      border-radius: 16px;
      padding: 14px 17px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }
    .pill-ok { background: rgba(21, 101, 192, 0.14); color: var(--accent); }
    .pill-warn { background: rgba(30, 136, 229, 0.16); color: var(--accent-2); }
    .pill-err { background: rgba(239, 68, 68, 0.14); color: var(--err); }
    .msg-err {
      background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35);
      color: var(--err); padding: 12px 16px; border-radius: 14px; font-weight: 800; margin-bottom: 14px;
    }
    .msg-ok {
      background: rgba(21, 101, 192, 0.12); border: 1px solid rgba(21, 101, 192, 0.35);
      color: var(--accent); padding: 12px 16px; border-radius: 14px; font-weight: 800; margin-bottom: 14px;
    }
    .muted { color: var(--muted); }

    .dash-shell {
      max-width: 1240px; margin: 22px auto; padding: 0 16px 48px;
      display: grid; grid-template-columns: 1fr 264px; gap: 20px; align-items: start;
    }
    .dash-shell.collapsed { grid-template-columns: 1fr 78px; }
    @media (max-width: 880px) { .dash-shell, .dash-shell.collapsed { grid-template-columns: 1fr; } }

    .right-drawer { padding: 17px 13px; position: sticky; top: 78px; }
    .drawer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
    .collapse-btn {
      width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--bdr);
      background: var(--surface-soft); color: var(--txt); font-weight: 900; cursor: pointer;
    }
    .nav-item-link {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: right;
      padding: 11px 13px; border-radius: 13px; border: none; background: transparent;
      color: var(--txt); font-weight: 800; text-decoration: none; cursor: pointer;
      font-size: 0.9rem; margin-bottom: 5px; transition: background-color 0.18s ease, color 0.18s ease;
    }
    .nav-item-link:hover { background: var(--surface-soft); }
    .nav-item-link.active {
      background: linear-gradient(135deg, #5d6fe8 0%, #9c5cf1 100%);
      color: #fff;
      box-shadow: 0 8px 22px rgba(93, 111, 232, 0.22);
    }
    .sub-nav { padding-right: 14px; margin-bottom: 8px; }
    .sub-link {
      display: block; padding: 6px 12px; border-radius: 10px; color: var(--muted);
      text-decoration: none; font-weight: 700; font-size: 0.83rem; margin-bottom: 2px;
    }
    .sub-link.active, .sub-link:hover { background: var(--surface-soft); color: var(--accent); }
    .dash-shell.collapsed .nav-label, .dash-shell.collapsed .sub-nav, .dash-shell.collapsed .drawer-title { display: none; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi-card {
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%);
      color: #fff; border-radius: 20px; padding: 19px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: var(--shadow-md);
    }
    .kpi-card.teal-kpi { background: linear-gradient(135deg, #1565c0 0%, #1e88e5 100%); }
    .kpi-card.gold-kpi { background: linear-gradient(135deg, #0b3c8a 0%, #2196f3 100%); }
    .kpi-num { font-size: 1.65rem; font-weight: 900; line-height: 1.1; }
    .kpi-lbl { font-size: 0.86rem; font-weight: 700; opacity: 0.94; margin-top: 4px; }
    .kpi-icon-box {
      width: 48px; height: 48px; border-radius: 15px; background: rgba(255, 255, 255, 0.2);
      display: grid; place-items: center; font-size: 1.25rem; font-weight: 900;
    }

    .progress-layout { display: grid; grid-template-columns: 280px 1fr; gap: 18px; margin-bottom: 18px; }
    @media (max-width: 820px) { .progress-layout { grid-template-columns: 1fr; } }
    .progress-frame {
      background: var(--surface); border: 1.5px solid var(--bdr);
      border-radius: 22px; padding: 18px; text-align: center; box-shadow: var(--shadow-md);
    }
    .teacher-color-meter {
      position: relative; width: 144px; height: 184px; margin: 10px auto;
      border-radius: 16px; overflow: hidden; border: 1.5px solid var(--bdr); background: var(--surface-soft);
    }
    .teacher-color-meter img { width: 100%; height: 100%; object-fit: contain; object-position: center top; display: block; }
    .teacher-color-meter .bw-layer { filter: grayscale(100%) contrast(1.05); }
    .teacher-color-meter .color-reveal { position: absolute; inset: 0; overflow: hidden; transition: clip-path 0.45s ease; }
    .prog-bar-bg { height: 9px; border-radius: 999px; background: var(--surface-soft); overflow: hidden; margin: 10px 0; }
    .prog-bar-fill { height: 100%; background: linear-gradient(90deg, #1565c0, #42a5f5); border-radius: 999px; transition: width 0.4s ease; }

    .course-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(265px, 1fr)); gap: 16px; }
    .course-card { overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
    .branch-book-card {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 7px 11px; border-radius: 14px;
    }
    .branch-book-card img {
      width: 52px; height: 66px; object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.25); border-radius: 9px; border: 1.5px solid #fff;
    }
    .course-banner {
      min-height: 158px; position: relative; overflow: hidden;
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%);
      color: #fff; padding: 17px; display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
    }
    .course-banner img.book-thumb {
      width: 72px; height: 94px; object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.22); border-radius: 11px; border: 1.5px solid rgba(255, 255, 255, 0.85); flex-shrink: 0;
    }
    .course-body { padding: 16px; }
    .course-title { font-weight: 900; font-size: 1rem; margin-bottom: 6px; }

    .landing-hero-box { max-width: 1480px; margin: 24px auto 0; padding: 0 16px; }
    .landing-hero-card {
      position: relative; overflow: hidden; padding: 38px;
      display: grid; grid-template-columns: 370px 1fr; gap: 42px; align-items: center;
      min-height: 510px;
      background:
        radial-gradient(circle at 85% 15%, rgba(156, 92, 241, 0.16), transparent 28%),
        linear-gradient(135deg, var(--surface) 0%, var(--surface-soft) 100%);
    }
    .landing-hero-card::before {
      content: ""; position: absolute; width: 260px; height: 260px; border-radius: 50%;
      left: -150px; bottom: -170px; border: 36px solid rgba(30, 136, 229, 0.08);
    }
    @media (max-width: 860px) {
      .landing-hero-card { grid-template-columns: 1fr; min-height: auto; padding: 22px; gap: 20px; }
      .hero-teacher-frame { max-width: 380px; width: 100%; margin: 0 auto; }
    }
    .hero-teacher-frame {
      position: relative; z-index: 1;
      background: linear-gradient(155deg, rgba(93, 111, 232, 0.16), rgba(178, 103, 255, 0.20));
      border-radius: 28px; padding: 10px; display: flex; justify-content: center; align-items: center;
      min-height: 390px; border: 1.5px solid var(--bdr);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), var(--shadow-sm);
    }
    .hero-teacher-frame img {
      width: 100%; max-height: 390px; object-fit: contain; object-position: center bottom;
      border-radius: 20px; display: block;
    }
    .hero-copy { position: relative; z-index: 1; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 8px; border-radius: 999px;
      padding: 7px 13px; background: rgba(21, 101, 192, 0.1); color: var(--accent);
      border: 1px solid var(--bdr); font-weight: 900; font-size: 0.84rem;
    }
    .hero-title { font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.25; font-weight: 900; margin-top: 14px; color: var(--txt); }
    .hero-title span { color: var(--accent); }
    .hero-subtitle { margin-top: 10px; font-size: clamp(1.05rem, 2vw, 1.28rem); color: var(--accent-2); font-weight: 900; }
    .hero-description { max-width: 760px; margin-top: 14px; color: var(--muted); line-height: 1.95; font-size: 0.98rem; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
    .hero-actions .btn { min-width: 190px; padding: 12px 18px; justify-content: center; }
    .hero-trust-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; margin-top: 18px; }
    .hero-trust-item { display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 0.82rem; font-weight: 800; }
    .hero-trust-icon {
      width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
      background: var(--surface); border: 1px solid var(--bdr); color: var(--accent); font-size: 0.75rem;
    }
    .landing-start-section { max-width: 1480px; margin: 22px auto 36px; padding: 0 16px; }
    .landing-feature-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px;
    }
    @media (max-width: 760px) { .landing-feature-grid { grid-template-columns: 1fr; } }
    .landing-feature {
      display: flex; align-items: flex-start; gap: 12px; min-height: 118px;
      padding: 18px; border: 1.5px solid var(--bdr); border-radius: 18px;
      background: var(--surface); box-shadow: var(--shadow-sm); text-decoration: none; color: var(--txt);
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .landing-feature:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: var(--shadow-md); }
    .landing-feature-icon {
      flex: 0 0 44px; width: 44px; height: 44px; border-radius: 14px;
      display: grid; place-items: center; background: var(--surface-soft); font-size: 1.25rem;
    }
    .landing-feature strong { display: block; color: var(--accent); font-size: 0.98rem; }
    .landing-feature p { margin-top: 3px; color: var(--muted); font-size: 0.82rem; line-height: 1.75; }
    .landing-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      max-width: 1480px; margin: 18px auto 0; padding: 0 16px;
    }
    @media (max-width: 760px) { .landing-stats { grid-template-columns: repeat(2, 1fr); } }
    .landing-stat {
      text-align: center; padding: 20px 12px; border-radius: 18px;
      background: var(--surface); border: 1.5px solid var(--bdr); box-shadow: var(--shadow-sm);
    }
    .landing-stat strong {
      display: block; color: var(--accent); font-size: 1.55rem; line-height: 1.2;
      font-weight: 900;
    }
    .landing-stat span { display: block; margin-top: 5px; color: var(--muted); font-size: 0.82rem; font-weight: 800; }
    .landing-journey {
      max-width: 1480px; margin: 22px auto 0; padding: 0 16px;
    }
    .journey-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
    }
    @media (max-width: 760px) { .journey-grid { grid-template-columns: 1fr; } }
    .journey-step {
      min-height: 145px; padding: 20px; border-radius: 20px;
      border: 1.5px solid var(--bdr); background: var(--surface); box-shadow: var(--shadow-sm);
      position: relative; overflow: hidden;
    }
    .journey-number {
      width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--accent-dark), var(--accent-2));
      color: #fff; font-weight: 900; box-shadow: var(--shadow-sm);
    }
    .journey-step h3 { margin-top: 12px; color: var(--accent); font-size: 1rem; }
    .journey-step p { margin-top: 4px; color: var(--muted); font-size: 0.84rem; line-height: 1.75; }
    .landing-cta {
      max-width: 1480px; margin: 22px auto 36px; padding: 0 16px;
    }
    .landing-cta-box {
      border-radius: 24px; padding: 30px;
      background: linear-gradient(135deg, var(--accent-dark), var(--accent-2));
      color: #fff; text-align: center; box-shadow: var(--shadow-md);
    }
    .landing-cta-box h2 { font-size: clamp(1.35rem, 3vw, 2rem); font-weight: 900; }
    .landing-cta-box p { margin: 7px auto 18px; max-width: 650px; opacity: 0.92; font-size: 0.92rem; }

    .split-auth {
      max-width: 1060px; margin: 22px auto; padding: 0 16px;
      display: grid; grid-template-columns: 1fr 1.12fr; gap: 20px; align-items: stretch;
    }
    @media (max-width: 840px) { .split-auth { grid-template-columns: 1fr; } }
    .promo-pane {
      background: linear-gradient(155deg, #0d47a1 0%, #1976d2 100%);
      color: #fff; border-radius: 22px; padding: 26px; box-shadow: var(--shadow-md);
      display: flex; flex-direction: column; justify-content: space-between; min-height: 440px;
    }
    .promo-pane.gold-mode { background: linear-gradient(155deg, #1565c0 0%, #2196f3 100%); }
    .promo-img {
      width: 215px; height: 265px; object-fit: contain; object-position: center top;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 16px; border: 1.5px solid rgba(255, 255, 255, 0.65); margin: 14px auto 0; display: block;
    }
    .step-track { height: 7px; background: var(--surface-soft); border-radius: 999px; overflow: hidden; margin-bottom: 14px; }
    .step-fill { height: 100%; background: linear-gradient(90deg, #1565c0, #42a5f5); }

    .secure-player-box {
      position: relative; width: 100%; max-width: 920px; aspect-ratio: 16 / 9; margin: 12px auto 0;
      border-radius: 18px; overflow: hidden; background: #000;
      border: 1.5px solid var(--bdr); user-select: none; box-shadow: var(--shadow-md);
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
    .ticket-img-thumb { max-width: 260px; max-height: 220px; object-fit: contain; border-radius: 12px; border: 1px solid var(--bdr); margin-top: 8px; display: block; }
    .branch-toggle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 10px 0; }
    .branch-check-pill {
      display: flex; align-items: center; gap: 6px; padding: 8px 12px;
      border-radius: 11px; background: var(--surface); border: 1px solid var(--bdr);
      font-size: 0.84rem; font-weight: 800; cursor: pointer;
    }
    .branch-check-pill input { width: auto; }
    .q-builder-card { padding: 17px; margin-bottom: 14px; }
    .opt-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .student-detail-box { padding: 19px; margin-top: 16px; }
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
      background:
        radial-gradient(circle at 82% 0%, rgba(178, 103, 255, 0.12), transparent 18rem),
        linear-gradient(135deg, #090d18, #0d1320);
      color: #ffffff;
      border-top: 1px solid rgba(154, 163, 255, 0.16);
      padding: 36px 24px 26px;
    }
    .footer-inner { max-width: 1180px; margin: 0 auto; }
    .footer-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1.1fr;
      gap: 28px;
      align-items: center;
    }
    @media (max-width: 780px) {
      .footer-columns { grid-template-columns: 1fr; text-align: center; }
    }
    .footer-col-title { font-weight: 900; font-size: 1.04rem; margin-bottom: 12px; color: #ffffff; }
    .footer-social-list { display: flex; flex-direction: column; gap: 10px; }
    @media (max-width: 780px) { .footer-social-list { align-items: center; } }
    .social-row-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 0.94rem;
      transition: transform 0.16s ease, color 0.16s ease;
    }
    .social-row-link:hover { transform: translateX(-3px); color: #90caf9; }
    .social-row-link.disabled-link { opacity: 0.45; pointer-events: none; }
    .social-sq-icon {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      display: inline-grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.85rem;
      color: #ffffff;
      flex-shrink: 0;
    }
    .icon-fb { background: #1877f2; }
    .icon-tt { background: #111827; border: 1px solid #374151; }
    .icon-yt { background: #ef4444; }

    .footer-nav-stack { display: flex; flex-direction: column; gap: 14px; }
    .footer-page-link {
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 1rem;
      transition: color 0.16s ease;
    }
    .footer-page-link:hover { color: #90caf9; }

    .footer-brand-box { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    @media (max-width: 780px) { .footer-brand-box { align-items: center; } }
    .footer-brand-emblem { font-size: 2rem; font-weight: 900; color: #90caf9; letter-spacing: 0.5px; }
    .footer-copyright-line { font-size: 0.9rem; font-weight: 800; color: #dbeafe; }
    .footer-dev-line { font-size: 0.86rem; font-weight: 800; color: #64b5f6; direction: ltr; }
  </style>
</head>
<body>
  <div id="screenBlackoutGuard" aria-hidden="true"></div>
  <div id="thuluthBg" aria-hidden="true">
    <div class="thuluth-phrase">أنت جخ</div>
    <div class="thuluth-phrase">أنت جخ</div>
    <div class="thuluth-phrase">أنت جخ</div>
    <div class="thuluth-phrase">أنت جخ</div>
    <div class="thuluth-phrase">أنت جخ</div>
    <div class="thuluth-phrase">أنت جخ</div>
  </div>

  ${showLandingAdminAvatar ? `
    <div class="floating-admin-wrap">
      <div class="floating-admin-menu" id="floatingAdminMenu">
        <a class="btn btn-blue btn-sm" href="/admin" style="width:100%;">الأدمن</a>
        <a class="btn btn-teal btn-sm" href="/team" style="width:100%;">تيم الأدمن</a>
      </div>
      <button type="button" class="floating-admin-avatar" id="floatingAdminToggleBtn" title="الأدمن وتيم الأدمن" aria-label="الأدمن وتيم الأدمن">
        <img src="${esc(settings.teacher_image)}" alt="أ. محمد يوسف" onerror="this.style.display='none';" />
      </button>
    </div>
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
        ${!isStaff ? `
          <div class="notif-bell-wrap">
            <button type="button" class="blue-bell-btn ${academicUnreadCount > 0 ? "has-alert" : ""}" id="yellowNotifBellBtn" title="إشعارات الردود">
              <span>🔔</span>
              <span class="bell-badge-num ${academicUnreadCount > 0 ? "" : "hidden-badge"}" id="yellowBellBadge">${academicUnreadCount}</span>
            </button>
            <div class="notif-popover" id="yellowNotifPopover">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--bdr); padding-bottom:8px;">
                <strong style="font-size:0.92rem;">إشعارات الردود</strong>
                <span class="pill pill-warn">الدعم الفني والمنتدى</span>
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
        <a class="btn btn-out btn-sm" href="/student?tab=login">بوابة الطالب</a>
        ${(student || isStaff) ? `<a class="btn btn-red btn-sm" href="/logout">خروج</a>` : ""}
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
      const admBtn = document.getElementById("floatingAdminToggleBtn");
      const admMenu = document.getElementById("floatingAdminMenu");
      admBtn?.addEventListener("click", function (e) {
        e.stopPropagation();
        admMenu?.classList.toggle("open");
      });
      document.addEventListener("click", function (e) {
        if (admMenu && !admMenu.contains(e.target) && !admBtn?.contains(e.target)) {
          admMenu.classList.remove("open");
        }
      });
    })();

    (function () {
      const toggleEl = document.getElementById("themeToggle");
      const labelEl = document.getElementById("themeLabelText");
      const savedTheme = localStorage.getItem("nb_py_theme");
      const isDark = savedTheme === null || savedTheme === "dark";
      if (isDark) {
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

    (function initSingleSessionGuard() {
      const isLoggedStudent = ${student ? "true" : "false"};
      const isLoggedStaff = ${isStaff ? "true" : "false"};
      if (!isLoggedStudent && !isLoggedStaff) return;

      async function checkSingleStudentSession() {
        try {
          const res = await fetch("/api/session/check");
          if (!res.ok) return;
          const data = await res.json();
          if (data.kicked) {
            window.location.href = data.redirect || "/student?tab=login";
          }
        } catch {}
      }
      checkSingleStudentSession();
      setInterval(checkSingleStudentSession, 1000);
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
            const senderLbl = m.sender_name ? ("تيم الدعم • " + m.sender_name) : "تيم الدعم • مستر محمد يوسف";
            parts.push(
              '<div class="chat-bubble-admin">' +
                '<div style="font-size:0.74rem; opacity:0.82; margin-bottom:2px;">' + escLocal(senderLbl) + '</div>' +
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
    <div class="hero-copy">
      <span class="hero-eyebrow"><span>★</span> معلم أول لغة عربية</span>
      <h1 class="hero-title">تعلم العربية بثقة مع <span>محمد يوسف</span></h1>
      <div class="hero-subtitle">مسيرة عطاء تمتد لأكثر من 30 عاماً</div>
      <p class="hero-description">
        معلم أول لغة عربية بمسيرة تمتد إلى 30 عاماً من العطاء والتميز والتأسيس الدقيق في فروع اللغة العربية السبعة للمرحلة الثانوية الأزهرية (الأول، الثاني، والثالث الثانوي — علمي وأدبي)، مما يجعله جديراً تماماً بقيادة طلابه نحو التفوق والدرجة النهائية بمنهج واضح ومنظم.
      </p>
      <div class="hero-actions">
        <a class="btn btn-blue" href="/student?tab=register&step=1">ابدأ رحلتك الآن <span>←</span></a>
        <a class="btn btn-out" href="/student?tab=login">دخول إلى حسابي</a>
      </div>
      <div class="hero-trust-row">
        <div class="hero-trust-item"><span class="hero-trust-icon">✓</span>شرح منظم ومتبسط</div>
        <div class="hero-trust-item"><span class="hero-trust-icon">✓</span>امتحانات وتقييم مستمر</div>
        <div class="hero-trust-item"><span class="hero-trust-icon">✓</span>متابعة دقيقة للطلاب</div>
      </div>
    </div>
  </div>
</div>

<div class="landing-stats">
  <div class="landing-stat"><strong>30+</strong><span>عاما من الخبرة</span></div>
  <div class="landing-stat"><strong>7</strong><span>فروع للغة العربية</span></div>
  <div class="landing-stat"><strong>3</strong><span>صفوف ثانوية أزهرية</span></div>
  <div class="landing-stat"><strong>1</strong><span>منهج واضح ومتكامل</span></div>
</div>

<div class="landing-start-section">
  <div class="card" style="margin-bottom:0; padding:24px;">
    <div style="text-align:center;">
      <h2 style="font-size:1.45rem; font-weight:900;">كل ما تحتاجه في مكان واحد</h2>
      <p class="muted" style="margin-top:5px; font-size:0.88rem;">تابع دروسك وواجباتك ونتائجك من حساب واحد</p>
    </div>
    <div class="landing-feature-grid">
      <a class="landing-feature" href="/student?tab=login">
        <span class="landing-feature-icon">📚</span>
        <span><strong>دروس ومراجعات</strong><p>شروحات مرتبة تغطي الفروع السبعة للمناهج الأزهرية.</p></span>
      </a>
      <a class="landing-feature" href="/student?tab=login">
        <span class="landing-feature-icon">📝</span>
        <span><strong>واجبات وامتحانات</strong><p>تدريبات تقيس مستواك وتساعدك على الاستعداد بقوة.</p></span>
      </a>
      <a class="landing-feature" href="/student?tab=login">
        <span class="landing-feature-icon">📊</span>
        <span><strong>متابعة تقدمك</strong><p>راجع نتيجتك وأداءك خطوة بخطوة مع فريق المنصة.</p></span>
      </a>
    </div>
  </div>
</div>

<div class="landing-journey">
  <div class="card" style="margin-bottom:0; padding:24px;">
    <div style="text-align:center; margin-bottom:16px;">
      <h2 style="font-size:1.42rem; font-weight:900;">رحلتك في المنصة من البداية للنهاية</h2>
      <p class="muted" style="margin-top:5px; font-size:0.88rem;">خطوات بسيطة تعينك على المذاكرة والتفوق باستمرار</p>
    </div>
    <div class="journey-grid">
      <div class="journey-step">
        <div class="journey-number">1</div>
        <h3>أنشئ حسابك</h3>
        <p>سجّل بياناتك الدراسية وابدأ رحلتك على المنصة بسهولة وأمان.</p>
      </div>
      <div class="journey-step">
        <div class="journey-number">2</div>
        <h3>تابع الدروس والواجبات</h3>
        <p>ادخل إلى الدروس والتمارين والمراجعات المصنّفة حسب الصف والشعبة.</p>
      </div>
      <div class="journey-step">
        <div class="journey-number">3</div>
        <h3>حل الامتحانات وراقب تقدمك</h3>
        <p>اختبر نفسك، اعرف نتيجتك، وتابع مستواك للتطوير قبل الامتحان الرسمي.</p>
      </div>
    </div>
  </div>
</div>

<div class="landing-cta">
  <div class="landing-cta-box">
    <h2>جاهز تبدأ أقوى؟</h2>
    <p>انضم الآن للمنصة، ونظّم مذاكرتك مع شرح واضح وواجبات ومتابعة مستمرة في اللغة العربية.</p>
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
      <a class="btn" style="background:#fff; color:#0d47a1; min-width:190px;" href="/student?tab=register&step=1">إنشاء حساب جديد</a>
      <a class="btn" style="background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.55); min-width:170px;" href="/student?tab=login">تسجيل الدخول</a>
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
        <p class="muted" style="text-align:center; font-size:0.86rem; margin-bottom:14px;">ادخل على حسابك برقم الهاتف وكلمة السر (جلسة واحدة نشطة لكل حساب)، أو أدخل كود السنتر لفتح المنصة فوراً.</p>
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
          <p style="margin-top:10px; font-size:0.92rem; opacity:0.95;">أدخل اسمك الرباعي وبياناتك وكلمة السر وكود السنتر (يبدأ بـ MO متبوعاً بأرقام) لمرة واحدة لفتح المنصة.</p>
        </div>
        <img class="promo-img" src="${esc(settings.teacher_image)}" alt="الأستاذ محمد يوسف" onerror="this.style.display='none';" />
      </div>
      <div class="card" style="margin-bottom:0;">
        <h2 style="font-weight:900; margin-bottom:8px;">تفعيل المنصة بكود السنتر</h2>
        <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">كلمة السر إجبارية هنا وتُحفظ في ملفك لدى الأدمن.</p>
        ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
        ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
        <form method="post" action="/student/center-login" autocomplete="off">
          <div class="field"><label>كود السنتر (لمرة واحدة) *</label><input name="center_code" type="text" required autocomplete="off" placeholder="مثال: MO12345678" /></div>
          <div class="field"><label>اسم الطالب رباعي *</label><input name="name" type="text" required autocomplete="off" placeholder="الاسم الرباعي بالكامل" /></div>
          <div class="field"><label>رقم هاتف الطالب *</label><input name="phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
          <div class="grid2">
            <div class="field"><label>الصف الدراسي *</label><select name="grade">${gradeOpts}</select></div>
            <div class="field"><label>الشعبة *</label><select name="track">${trackOpts}</select></div>
          </div>
          <div class="field"><label>رقم هاتف ولي الأمر (يجب أن يختلف عن رقم الطالب) *</label><input name="parent_phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
          <div class="field"><label>المحافظة *</label><select name="governorate" required>${govOpts}</select></div>
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
      <div style="display:flex; justify-content:space-between; font-size:0.84rem; font-weight:800; color:var(--accent);">
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
              <span class="pill" style="background:rgba(255,255,255,0.22); color:#fff;">${isUnlocked ? (isCenterStudent ? "مفعل سنتر ✓" : "مفعل ✓") : "مغلق 🔒"}</span>
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
            const centerAccess = checkCenterStudentLectureAccess(student, l);
            const openByOrder = isLectureUnlockedForStudent(list, idx);
            const isLessonAccessible = centerAccess.allowed && openByOrder;

            const hw = getLessonHomework(l.id);
            const hwSub = hw ? mySubmissions.find(s => String(s.exam_id) === String(hw.id)) : null;
            const isSeen = myWatchedSet.has(String(l.id));
            const isInitiallyOpen = lectureId ? String(l.id) === String(lectureId) : (idx === 0 && isLessonAccessible);
            const stepNum = Number(l.order_num) > 0 ? Number(l.order_num) : (idx + 1) * 10;

            const absencePayUrl = buildStudentPaymentWaUrl(
              settings,
              student,
              `حصة غياب: ${l.title} (فرع ${l.branch})`,
              ABSENCE_LESSON_PRICE_EGP,
              ["سبب الفتح: تعويض غياب الحصة"]
            );

            const rawCustomItems = Array.isArray(l.custom_items) ? l.custom_items : [];
            const customItems = rawCustomItems.length > 0 ? rawCustomItems : [
              { title: "الكتاب", note: `ملخص ومذكرة ${l.title} في فرع ${l.branch}.`, url: "", image_url: "" },
              { title: "الشرح", note: "", url: l.video_url || "", image_url: "" },
              { title: "المذاكرة", note: `راجع قواعد وأمثلة ${l.title} ثم ابدأ حل الواجب.`, url: "", image_url: "" },
              { title: "حل المقالي", note: "اكتب سؤالك المقالي أو صوّر حلك ليراجعه الأستاذ محمد يوسف.", url: "", image_url: "" },
              { title: "حل الكتب", note: `تدريبات واختبارات الكتب الخارجية على ${l.title}.`, url: "", image_url: "" }
            ];

            let statusText = "📖 ✍️";
            if (!centerAccess.allowed) {
              statusText = `مغلقة للغياب • الحصة بـ ${ABSENCE_LESSON_PRICE_EGP} ج`;
            } else if (!openByOrder) {
              statusText = "مغلق لحين تسليم واجب الدرس السابق";
            } else if (isSeen) {
              statusText = "✓ تمت المشاهدة";
            }

            return `
              <div class="lec-accordion-item ${isInitiallyOpen ? "is-open" : ""}" data-lec-id="${esc(l.id)}">
                <button type="button" class="lec-accordion-header" aria-expanded="${isInitiallyOpen}">
                  <div class="lec-header-left">
                    <span class="lec-chevron-circle">^</span>
                    <span class="lec-counter-badge">(${stepNum}/${denominator})</span>
                  </div>
                  <div class="lec-header-right">
                    <div class="lec-main-title">${esc(l.title)} ${isLessonAccessible ? "" : "🔒"}</div>
                    <div class="lec-sub-icons">
                      <span>${esc(statusText)}</span>
                    </div>
                  </div>
                </button>

                <div class="lec-accordion-body">
                  ${!centerAccess.allowed ? `
                    <div class="msg-err" style="margin-bottom:12px;">
                      لم يتم تسجيل حضورك في هذه الحصة بالسنتر. الحصة بـ <strong>${ABSENCE_LESSON_PRICE_EGP} ج</strong> لفتحها.
                    </div>
                    <a class="btn btn-blue" href="${esc(absencePayUrl)}" target="_blank" rel="noopener">دفع (${ABSENCE_LESSON_PRICE_EGP} ج) عبر واتساب</a>
                  ` : (!openByOrder ? `
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
                  `)}
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
                  <label style="display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; margin:6px 0; padding:8px 12px; border-radius:11px; background:var(--surface);">
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
              <div class="row" style="display:block; border-color:rgba(239,68,68,0.35);">
                <div style="font-weight:800;">${idx + 1}. ${esc(w.question)}</div>
                <div style="font-size:0.86rem; color:var(--err); margin-top:4px;">إجابتك: ${esc(w.student_answer || "لم تُجب")}</div>
                <div style="font-size:0.86rem; color:var(--accent); font-weight:800; margin-top:2px;">الإجابة الصحيحة: ${esc(w.correct_answer || "")}</div>
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
          <span class="muted" style="font-size:0.8rem;">(${esc(p.student_grade || "")})</span>
        </div>
        <span class="muted" style="font-size:0.78rem;">${esc((p.created_at || "").slice(0, 16).replace("T", " "))}</span>
      </div>
      <p style="margin:8px 0; font-size:0.92rem; font-weight:700;">${esc(p.message || "")}</p>
      ${p.image_url ? `<img class="ticket-img-thumb" src="${esc(p.image_url)}" alt="صورة المنتدى" onerror="this.style.display='none';" />` : ""}
      ${p.reply
        ? `<div class="msg-ok" style="margin-top:10px; margin-bottom:0;">رد (${esc(p.replied_by || "تيم الأدمن")}): ${esc(p.reply)}</div>`
        : `<div class="muted" style="font-size:0.8rem; margin-top:8px;">بانتظار رد تيم الأدمن...</div>`
      }
    </div>
  `).join("") || `<p class="muted" style="margin-top:10px;">لا توجد منشورات في منتدى فرع (${esc(forumBranchParam)}) حتى الآن.</p>`;

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
            ${isCenterStudent ? `<span class="pill pill-ok">طالب سنتر — كود: ${esc(student.center_code || "-")}</span>` : (
              (student.branches || []).length
                ? (student.branches || []).map(b => `<span class="pill pill-ok" style="margin-left:4px;">${esc(b)}</span>`).join("")
                : `<span class="pill pill-warn">طالب منصة • لم يتم تفعيل أي فرع بعد</span>`
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
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">اختر فرع اللغة العربية، ثم اكتب مشاركتك أو أرفق صورة ليقوم تيم الأدمن بالرد عليها (الردود مخصصة لتيم الأدمن فقط).</p>

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
          ${isCenterStudent ? `<span class="pill pill-ok">حساب سنتر (كود: ${esc(student.center_code || "-")})</span>` : (
            (student.branches || []).length ? (student.branches || []).map(b => `<span class="pill pill-ok">${esc(b)}</span>`).join(" ") : `<span class="muted">لا يوجد</span>`
          )}
        </div>
      </div>

      <div class="card">
        <h2 style="font-weight:900; margin-bottom:6px;">طلب كود لتفعيل محاضرة أو فرع عبر واتساب</h2>
        <p class="muted" style="font-size:0.88rem; margin-bottom:14px;">
          سعر الكورس <strong>${COURSE_PRICE_EGP} ج</strong>. عند الضغط على طلب الكود سترسل المنصة تلقائياً اسمك ورقمك ونوعك (طالب سنتر أم منصة) وكودك إن كنت طالب سنتر.
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
              <strong id="summaryDiscountAmt" style="color:var(--accent);">0 ج</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--bdr); padding-top:8px; font-size:1.05rem;">
              <span>المطلوب دفعه:</span>
              <strong id="summaryFinalPrice" style="color:var(--accent-2);">${COURSE_PRICE_EGP} ج</strong>
            </div>
          </div>

          <button type="submit" class="btn btn-blue" style="width:100%;">طلب الكود والدفع على واتساب (${esc(settings.admin_whatsapp || "01066329782")})</button>
        </form>
      </div>

      <script>
        (function () {
          const basePrice = ${COURSE_PRICE_EGP};
          const waPhone = ${safeJsonForScript(waTargetDigits)};
          const stName = ${safeJsonForScript(String(student.full_name || ""))};
          const stPhone = ${safeJsonForScript(String(student.phone || ""))};
          const stGrade = ${safeJsonForScript(String(student.grade || ""))};
          const isCenterSt = ${isCenterStudent ? "true" : "false"};
          const stCenterCode = ${safeJsonForScript(String(student.center_code || ""))};
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
              "السلام عليكم، أريد الدفع وطلب تفعيل في منصة ${PLATFORM_NAME}",
              "اسم الطالب: " + stName,
              "رقم الهاتف: " + stPhone,
              "نوع الطالب: " + (isCenterSt ? "طالب سنتر" : "طالب منصة"),
              isCenterSt ? ("كود طالب السنتر: " + (stCenterCode || "-")) : "",
              "الصف: " + stGrade,
              "المطلوب: " + chosenItem,
              "سعر الكورس: " + basePrice + " ج",
              appliedCode ? ("كود الخصم: " + appliedCode + " (خصم " + appliedDiscount + " ج)") : "كود الخصم: بدون",
              "المبلغ المطلوب دفعه: " + finalP + " ج"
            ].filter(Boolean);

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
  } else if (section === "account") {
    mainContentHtml = `
      <div class="card">
        <h2 style="font-weight:900; margin-bottom:12px;">بيانات الحساب</h2>
        <div class="row"><span>الاسم الرباعي</span><strong>${esc(student.full_name)}</strong></div>
        <div class="row"><span>رقم هاتف الطالب</span><strong>${esc(student.phone)}</strong></div>
        <div class="row"><span>نوع الحساب</span><strong>${isCenterStudent ? `طالب سنتر (كود: ${esc(student.center_code || "-")})` : "طالب منصة"}</strong></div>
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

function renderTeamStandalonePage(teamSession, forumPosts, lectures, students, teamSection, error, notice) {
  if (!teamSession) {
    return `
    <div class="card" style="max-width:520px; margin:28px auto;">
      <span class="pill pill-ok">بوابة تيم الأدمن • المنتدى والغياب</span>
      <h2 style="font-weight:900; margin-top:8px; margin-bottom:6px;">دخول تيم الأدمن</h2>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">أدخل اسمك ورقم هاتفك والكود المخصص لك للدخول إلى المنتدى وتسجيل الغياب (جلسة واحدة على جهاز واحد).</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}
      <form method="post" action="/team/login" autocomplete="off">
        <div class="field"><label>اسم عضو التيم *</label><input name="team_name" type="text" required autocomplete="off" placeholder="اكتب اسمك كما أضافه الأدمن" /></div>
        <div class="field"><label>رقم الهاتف *</label><input name="team_phone" type="tel" required autocomplete="off" placeholder="01xxxxxxxxx" /></div>
        <div class="field"><label>الكود الخاص بك *</label><input name="team_code" type="text" required autocomplete="off" placeholder="أدخل الكود المخصص لك" /></div>
        <button type="submit" class="btn btn-blue" style="width:100%;">دخول تيم الأدمن</button>
      </form>
    </div>`;
  }

  const activeTab = teamSection === "absence" ? "absence" : "forum";
  const actorLabel = `${teamSession.team_name} (${teamSession.team_phone})`;
  const sortedPosts = (forumPosts || []).slice().sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
  const allLectures = sortLectures(lectures || []);
  const centerStudents = (students || []).filter(s => Boolean(s.is_center_student || s.center_code));

  const lecturesPayload = allLectures.map(l => ({
    id: String(l.id || ""),
    title: String(l.title || ""),
    branch: String(l.branch || ""),
    grade: String(l.grade || ""),
    requires_attendance: Boolean(l.requires_attendance),
    attended_codes: Array.isArray(l.attended_codes) ? l.attended_codes : []
  }));

  const centerStudentsPayload = centerStudents.map(st => ({
    full_name: String(st.full_name || ""),
    phone: String(st.phone || ""),
    grade: String(st.grade || ""),
    center_code: String(st.center_code || "").trim().toUpperCase(),
    unlocked_lectures: Array.isArray(st.unlocked_lectures) ? st.unlocked_lectures.map(String) : [],
    locked_lectures: Array.isArray(st.locked_lectures) ? st.locked_lectures.map(String) : []
  }));

  const postsHtml = sortedPosts.map(p => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill pill-ok">${esc(p.branch || "فرع")}</span>
          <strong style="margin-right:6px;">الطالب: ${esc(p.student_name || "")}</strong>
          <span class="pill pill-warn">هاتف: ${esc(p.student_phone || "-")}</span>
          <span class="pill pill-warn">الصف: ${esc(p.student_grade || "-")}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="muted" style="font-size:0.78rem;">${esc((p.created_at || "").slice(0, 16).replace("T", " "))}</span>
          <form method="post" action="/team/delete-forum" style="margin:0;">
            <input type="hidden" name="post_id" value="${esc(p.id)}" />
            <button type="submit" class="btn btn-red btn-sm">حذف الرسالة</button>
          </form>
        </div>
      </div>
      <p style="margin:8px 0; font-size:0.92rem; font-weight:700;">${esc(p.message || "")}</p>
      ${p.image_url ? `<img class="ticket-img-thumb" src="${esc(p.image_url)}" alt="صورة المنتدى" onerror="this.style.display='none';" />` : ""}
      <form method="post" action="/team/reply-forum" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input type="hidden" name="post_id" value="${esc(p.id)}" />
        <input type="text" name="reply" value="${esc(p.reply || "")}" placeholder="اكتب ردك في المنتدى باسم ${esc(actorLabel)}..." style="flex:1; min-width:220px;" />
        <button type="submit" class="btn btn-blue btn-sm">رد</button>
      </form>
    </div>
  `).join("") || `<p class="muted">لا توجد رسائل في المنتدى حالياً.</p>`;

  const absenceTabHtml = `
    <div class="card" style="margin-bottom:0;">
      <h3 style="font-weight:900; margin-bottom:6px;">الغياب — التحقق من الكود وتأكيد حضور طلاب السنتر</h3>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">
        اختر الصف الدراسي والمحاضرة، ثم اكتب الكود (مثال: MO12345678). سيظهر لك اسم الطالب صاحب الكود تلقائياً، وعند الضغط على <strong>تأكيد</strong> يتم فتح المحاضرة له وتظهر القائمة تحت الخانة مباشرة.
        أما طلاب السنتر الغائبون فتُغلق عنهم المحاضرة وتظهر لهم بسعر <strong>${ABSENCE_LESSON_PRICE_EGP} ج</strong> مع زر دفع عبر واتساب.
      </p>

      <div class="grid2">
        <div class="field">
          <label>1. اختر الصف الدراسي *</label>
          <select id="teamAbsenceGradeSelect">
            ${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>2. اختر المحاضرة *</label>
          <select id="teamAbsenceLectureSelect"></select>
        </div>
      </div>

      <form method="post" action="/team/confirm-absence-code" id="teamConfirmAbsenceForm">
        <input type="hidden" name="grade" id="hiddenAbsenceGrade" />
        <input type="hidden" name="lecture_id" id="hiddenAbsenceLectureId" />

        <div class="field">
          <label>3. اكتب كود الطالب (يبدأ بـ MO متبوعاً بأرقام) *</label>
          <input type="text" name="center_code" id="teamCodeInput" required autocomplete="off" placeholder="مثال: MO12345678" />
        </div>

        <div id="codeLookupResultBox" class="row" style="display:none; margin-bottom:14px;"></div>

        <button type="submit" class="btn btn-blue" id="confirmAbsenceBtn" style="width:100%;">تأكيد</button>
      </form>

      <div id="confirmedCodesBelowBox" style="margin-top:18px;"></div>
    </div>

    <div class="card" style="margin-top:16px; margin-bottom:0;">
      <h3 style="font-weight:900; margin-bottom:6px;">إلغاء محاضرة عن طالب سنتر</h3>
      <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">اختر الطالب والصف والمحاضرة لإلغاء المحاضرة وقفلها عنه فوراً.</p>

      <form method="post" action="/team/revoke-student-lecture" class="grid3">
        <div class="field">
          <label>اختر الصف *</label>
          <select id="revokeGradeSelect">
            ${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>اختر الطالب *</label>
          <select name="student_phone" id="revokeStudentSelect" required></select>
        </div>
        <div class="field">
          <label>اختر المحاضرة المراد إلغاؤها *</label>
          <select name="lecture_id" id="revokeLectureSelect" required></select>
        </div>
        <div style="grid-column:1/-1;">
          <button type="submit" class="btn btn-red">إلغاء المحاضرة عن الطالب</button>
        </div>
      </form>
    </div>

    <script>
      (function () {
        const lecturesData = ${safeJsonForScript(lecturesPayload)};
        const centerStudentsData = ${safeJsonForScript(centerStudentsPayload)};

        const gradeSel = document.getElementById("teamAbsenceGradeSelect");
        const lecSel = document.getElementById("teamAbsenceLectureSelect");
        const hiddenGrade = document.getElementById("hiddenAbsenceGrade");
        const hiddenLecId = document.getElementById("hiddenAbsenceLectureId");
        const codeInput = document.getElementById("teamCodeInput");
        const lookupBox = document.getElementById("codeLookupResultBox");
        const confirmedBelowBox = document.getElementById("confirmedCodesBelowBox");
        const formEl = document.getElementById("teamConfirmAbsenceForm");

        const revGradeSel = document.getElementById("revokeGradeSelect");
        const revStudentSel = document.getElementById("revokeStudentSelect");
        const revLecSel = document.getElementById("revokeLectureSelect");

        function escLocal(s) {
          return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        }

        function normCode(raw) {
          const s = String(raw || "").trim().toUpperCase();
          if (!s) return "";
          return s.startsWith("MO") ? s : ("MO" + s);
        }

        function refreshLectureDropdowns() {
          const g = (gradeSel?.value || "").trim();
          const filtered = lecturesData.filter(l => !g || String(l.grade) === g);
          if (!filtered.length) {
            lecSel.innerHTML = '<option value="">لا توجد محاضرات لهذا الصف</option>';
          } else {
            lecSel.innerHTML = filtered.map(l =>
              '<option value="' + escLocal(l.id) + '">' + escLocal(l.title) + ' (' + escLocal(l.branch) + ')</option>'
            ).join("");
          }
          syncHiddenFields();
          lookupCodeAndShowName();
          renderConfirmedCodesList();
        }

        function syncHiddenFields() {
          if (hiddenGrade) hiddenGrade.value = (gradeSel?.value || "").trim();
          if (hiddenLecId) hiddenLecId.value = (lecSel?.value || "").trim();
        }

        function lookupCodeAndShowName() {
          const raw = (codeInput?.value || "").trim();
          if (!raw) {
            lookupBox.style.display = "none";
            lookupBox.innerHTML = "";
            return;
          }
          const normalized = normCode(raw);
          const matchedStudent = centerStudentsData.find(st =>
            String(st.center_code || "").trim().toUpperCase() === normalized ||
            String(st.center_code || "").trim().toUpperCase() === raw.toUpperCase()
          );

          lookupBox.style.display = "flex";
          if (matchedStudent) {
            lookupBox.innerHTML =
              '<div>' +
                '<span class="pill pill-ok">الكود موجود ✓</span> ' +
                '<strong style="margin-right:6px;">اسم الطالب: ' + escLocal(matchedStudent.full_name) + '</strong>' +
                '<span class="muted" style="font-size:0.82rem;"> • كود: ' + escLocal(matchedStudent.center_code) + ' • ' + escLocal(matchedStudent.grade) + '</span>' +
              '</div>';
          } else {
            lookupBox.innerHTML =
              '<div>' +
                '<span class="pill pill-err">تنبيه</span> ' +
                '<strong style="margin-right:6px;">لا يوجد طالب سنتر مسجل بهذا الكود (' + escLocal(normalized) + ') حالياً</strong>' +
              '</div>';
          }
        }

        function renderConfirmedCodesList() {
          const g = (gradeSel?.value || "").trim();
          const selectedLecId = (lecSel?.value || "").trim();
          const lecObj = lecturesData.find(l => String(l.id) === selectedLecId);
          const attendedCodes = Array.isArray(lecObj?.attended_codes) ? lecObj.attended_codes : [];

          const manuallyUnlockedStudents = centerStudentsData.filter(st =>
            (!g || String(st.grade) === g) &&
            Array.isArray(st.unlocked_lectures) &&
            st.unlocked_lectures.includes(selectedLecId)
          );

          const rows = [];
          attendedCodes.forEach(c => {
            const stMatch = centerStudentsData.find(s => String(s.center_code || "").toUpperCase() === String(c).toUpperCase());
            rows.push(
              '<div class="row">' +
                '<div>' +
                  '<span class="pill pill-ok">مفعّل ✓</span> ' +
                  '<strong>' + escLocal(c) + '</strong>' +
                  (stMatch ? (' — <span>' + escLocal(stMatch.full_name) + '</span>') : '') +
                '</div>' +
                '<span class="muted" style="font-size:0.8rem;">تم تأكيد حضوره</span>' +
              '</div>'
            );
          });

          manuallyUnlockedStudents.forEach(st => {
            if (!attendedCodes.some(c => String(c).toUpperCase() === String(st.center_code).toUpperCase())) {
              rows.push(
                '<div class="row">' +
                  '<div>' +
                    '<span class="pill pill-ok">مفعّل ✓</span> ' +
                    '<strong>' + escLocal(st.center_code || "-") + '</strong> — <span>' + escLocal(st.full_name) + '</span>' +
                  '</div>' +
                  '<span class="muted" style="font-size:0.8rem;">مفتوحة للطالب</span>' +
                '</div>'
              );
            }
          });

          confirmedBelowBox.innerHTML =
            '<h4 style="font-weight:900; margin-bottom:6px;">الأكواد والطلاب الذين تم تفعيلهم وتأكيدهم لهذه المحاضرة:</h4>' +
            (rows.length ? rows.join("") : '<div class="muted" style="font-size:0.84rem;">لم يتم تأكيد أي كود لهذه المحاضرة بعد.</div>');
        }

        function refreshRevokeDropdowns() {
          const g = (revGradeSel?.value || "").trim();
          const stList = centerStudentsData.filter(s => !g || String(s.grade) === g);
          const lecList = lecturesData.filter(l => !g || String(l.grade) === g);

          revStudentSel.innerHTML = stList.length
            ? stList.map(s => '<option value="' + escLocal(s.phone) + '">' + escLocal(s.full_name) + ' (' + escLocal(s.center_code || s.phone) + ')</option>').join("")
            : '<option value="">لا يوجد طلاب سنتر في هذا الصف</option>';

          revLecSel.innerHTML = lecList.length
            ? lecList.map(l => '<option value="' + escLocal(l.id) + '">' + escLocal(l.title) + ' (' + escLocal(l.branch) + ')</option>').join("")
            : '<option value="">لا توجد محاضرات في هذا الصف</option>';
        }

        gradeSel?.addEventListener("change", refreshLectureDropdowns);
        lecSel?.addEventListener("change", function () {
          syncHiddenFields();
          renderConfirmedCodesList();
        });
        codeInput?.addEventListener("input", lookupCodeAndShowName);

        formEl?.addEventListener("submit", function () {
          syncHiddenFields();
          if (codeInput && codeInput.value.trim()) {
            codeInput.value = normCode(codeInput.value);
          }
        });

        revGradeSel?.addEventListener("change", refreshRevokeDropdowns);

        refreshLectureDropdowns();
        refreshRevokeDropdowns();
        if (codeInput) codeInput.value = "";
      })();
    </script>
  `;

  return `
  <div class="card" style="max-width:1040px; margin:24px auto;">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
      <div>
        <span class="pill pill-ok">بوابة تيم الأدمن</span>
        <h2 style="font-weight:900; margin-top:6px;">أهلاً بك يا ${esc(teamSession.team_name)}</h2>
        <div class="muted" style="font-size:0.84rem;">رقم الهاتف: <strong>${esc(teamSession.team_phone)}</strong></div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn btn-gold btn-sm" id="enableTeamPushBtn">تفعيل إشعارات الجهاز</button>
        <a class="btn btn-red btn-sm" href="/logout">تسجيل الخروج</a>
      </div>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; border-bottom:1px solid var(--bdr); padding-bottom:12px;">
      <a class="btn ${activeTab === "forum" ? "btn-blue" : "btn-out"} btn-sm" href="/team?section=forum">المنتدى</a>
      <a class="btn ${activeTab === "absence" ? "btn-blue" : "btn-out"} btn-sm" href="/team?section=absence">الغياب</a>
    </div>

    <div class="card" style="margin:0 0 16px;">
      <h3 style="font-weight:900; margin-bottom:6px;">توليد أكواد السنتر</h3>
      <p class="muted" style="font-size:0.85rem; margin-bottom:10px;">يمكن للتيم توليد أكواد سنتر فقط بصيغة MO متبوعة بأرقام.</p>
      <form method="post" action="/team/generate-center-codes" class="grid3" style="align-items:end;">
        <div class="field" style="margin:0;"><label>عدد الأكواد *</label><input name="count" type="number" min="1" max="50" value="1" required /></div>
        <div style="grid-column:2/-1;"><button type="submit" class="btn btn-teal">توليد أكواد السنتر</button></div>
      </form>
    </div>

    ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
    ${notice ? `<div class="msg-ok">${esc(notice)}</div>` : ""}

    ${activeTab === "absence" ? absenceTabHtml : `
      <h3 style="font-weight:900; margin-bottom:10px;">رسائل الطلاب في المنتدى</h3>
      ${postsHtml}
    `}
  </div>

  <script>
    (function () {
      document.getElementById("enableTeamPushBtn")?.addEventListener("click", async function () {
        if (!("Notification" in window)) {
          alert("هذا المتصفح لا يدعم إشعارات الويب.");
          return;
        }
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification("${PLATFORM_NAME} — إشعارات التيم", {
            body: "سيصلك إشعار عند إرسال طالب رسالة أو عند رد عضو من التيم بأنها تم الرد."
          });
        }
      });

      let lastAlertKey = localStorage.getItem("nb_team_last_alert") || "";
      async function pollTeamAlerts() {
        try {
          const res = await fetch("/api/staff/alerts");
          if (!res.ok) return;
          const d = await res.json();
          if (d.latest_key && d.latest_key !== lastAlertKey) {
            lastAlertKey = d.latest_key;
            localStorage.setItem("nb_team_last_alert", lastAlertKey);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(d.title || "إشعار المنتدى", {
                body: d.body || ""
              });
            }
          }
        } catch {}
      }
      pollTeamAlerts();
      setInterval(pollTeamAlerts, 6000);
    })();
  </script>`;
}

function renderAdminPage(settings, isAuthed, data, section, error, notice) {
  if (!isAuthed) {
    return `
    <div class="card" style="max-width:480px; margin:28px auto;">
      <h2 style="font-weight:900; margin-bottom:8px;">دخول الأدمن</h2>
      <p class="muted" style="font-size:0.86rem; margin-bottom:14px;">لوحة تحكم منصة ${PLATFORM_NAME} (الأدمن).</p>
      ${error ? `<div class="msg-err">${esc(error)}</div>` : ""}
      <form method="post" action="/admin/login" autocomplete="off">
        <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required autocomplete="off" placeholder="mohmed@mr.com" /></div>
        <div class="field"><label>كلمة المرور</label><input name="password" type="password" required autocomplete="new-password" placeholder="••••••••" /></div>
        <button type="submit" class="btn btn-blue" style="width:100%;">دخول الأدمن</button>
      </form>
    </div>`;
  }

  const activeSec = section || "students";
  const allLectures = sortLectures(data.lectures || []);
  const allExams = data.exams || [];
  const allSubmissions = data.submissions || [];
  const allWatched = data.watched || [];
  const allStudents = data.students || [];
  const allDiscounts = data.discounts || [];
  const allTeamMembers = data.teamMembers || [];
  const allForumPosts = (data.forumPosts || []).slice().sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
  const allSupportThreads = (data.supportThreads || []).slice().sort((a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  );

  const codesRows = (data.codes || []).slice(-25).reverse().map(c => `
    <div class="row">
      <div>
        <strong class="copyable-code-val">${esc(c.code)}</strong> — <span class="pill pill-ok">${esc(c.type === "center" ? "كود سنتر (يبدأ بـ MO وأرقام)" : "كود فرع: " + (c.branch || ""))}</span>
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

  const teamMemberRows = allTeamMembers.slice().reverse().map(m => `
    <div class="row">
      <div>
        <strong>${esc(m.name)}</strong> — <span class="muted">هاتف: <strong>${esc(m.phone || "-")}</strong></span>
        <div style="margin-top:4px;"><span class="pill pill-ok">الكود: ${esc(m.code)}</span></div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button type="button" class="btn btn-out btn-sm copy-code-btn" data-code="${esc(m.code)}">نسخ الكود</button>
        <form method="post" action="/admin/update-team" class="grid3" style="margin:0; min-width:420px;">
          <input type="hidden" name="team_id" value="${esc(m.id)}" />
          <input class="field" name="team_name" value="${esc(m.name)}" required aria-label="اسم عضو التيم" />
          <input class="field" name="team_phone" value="${esc(m.phone || "")}" required aria-label="رقم هاتف عضو التيم" />
          <input class="field" name="team_code" value="${esc(m.code || "")}" required aria-label="كود عضو التيم" />
          <button type="submit" class="btn btn-blue btn-sm" style="grid-column:1/-1;">حفظ تعديل التيم</button>
        </form>
        <form method="post" action="/admin/delete-team" style="margin:0;">
          <input type="hidden" name="team_id" value="${esc(m.id)}" />
          <button type="submit" class="btn btn-red btn-sm">حذف عضو التيم</button>
        </form>
      </div>
    </div>
  `).join("") || `<p class="muted">لم يتم إضافة أي عضو تيم بعد.</p>`;

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

  const adminForumRows = allForumPosts.map(p => `
    <div class="row" style="display:block;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <span class="pill pill-ok">${esc(p.branch || "فرع")}</span>
          <strong style="margin-right:6px;">الطالب: ${esc(p.student_name || "")}</strong>
          <span class="pill pill-warn">هاتف: ${esc(p.student_phone || "")}</span>
          <span class="pill pill-warn">الصف: ${esc(p.student_grade || "-")}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="muted" style="font-size:0.78rem;">${esc((p.created_at || "").slice(0, 16).replace("T", " "))}</span>
          <form method="post" action="/admin/delete-forum" style="margin:0;">
            <input type="hidden" name="post_id" value="${esc(p.id)}" />
            <button type="submit" class="btn btn-red btn-sm">حذف الرسالة</button>
          </form>
        </div>
      </div>
      <p style="margin:8px 0; font-size:0.9rem;">${esc(p.message || "")}</p>
      ${p.image_url ? `<img class="ticket-img-thumb" src="${esc(p.image_url)}" alt="صورة المنتدى" onerror="this.style.display='none';" />` : ""}
      <form method="post" action="/admin/reply-forum" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
        <input type="hidden" name="post_id" value="${esc(p.id)}" />
        <input type="text" name="reply" value="${esc(p.reply || "")}" placeholder="اكتب ردك في المنتدى..." style="flex:1; min-width:220px;" />
        <button type="submit" class="btn btn-blue btn-sm">رد</button>
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
          <input type="text" name="reply_text" required placeholder="اكتب رد الدعم الفني هنا..." style="flex:1; min-width:220px;" />
          <button type="submit" class="btn btn-blue btn-sm">إرسال الرد</button>
        </form>
      </div>
    `;
  }).join("") || `<div class="card"><p class="muted">لا توجد محادثات دعم فني حتى الآن.</p></div>`;

  let sectionHtml = "";
  if (activeSec === "activate_center_lectures") {
    const centerStudentsData = allStudents
      .filter(st => Boolean(st.is_center_student || st.center_code))
      .map((st, idx) => ({
        idx,
        full_name: String(st.full_name || ""),
        phone: String(st.phone || ""),
        center_code: String(st.center_code || ""),
        grade: String(st.grade || ""),
        track: String(st.track || ""),
        unlocked_lectures: Array.isArray(st.unlocked_lectures) ? st.unlocked_lectures.map(String) : [],
        locked_lectures: Array.isArray(st.locked_lectures) ? st.locked_lectures.map(String) : []
      }));

    const lecturesForCenterControl = allLectures.map(l => ({
      id: String(l.id || ""),
      title: String(l.title || ""),
      branch: String(l.branch || ""),
      grade: String(l.grade || ""),
      requires_attendance: Boolean(l.requires_attendance),
      attended_codes: Array.isArray(l.attended_codes) ? l.attended_codes.map(c => String(c || "").trim().toUpperCase()) : []
    }));

    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:6px;">تفعيل طلاب سنتر — فتح وقفل المحاضرات لكل طالب</h3>
        <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">اختر الصف الدراسي ثم اضغط على الطالب لتفعيل وفتح المحاضرة التي تريدها له أو قفلها مرة أخرى في أي وقت.</p>

        <div class="field" style="max-width:420px;">
          <label>اختر الصف الدراسي</label>
          <select id="actCenterGradeSelect">
            <option value="">— اختر الصف لعرض طلاب السنتر —</option>
            ${GRADES.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>

        <div id="actCenterStudentsList"></div>
        <div id="actCenterStudentControlBox" class="student-detail-box" style="display:none;"></div>
      </div>

      <script>
        (function () {
          const studentsData = ${safeJsonForScript(centerStudentsData)};
          const lecturesData = ${safeJsonForScript(lecturesForCenterControl)};
          const gradeSel = document.getElementById("actCenterGradeSelect");
          const listBox = document.getElementById("actCenterStudentsList");
          const ctrlBox = document.getElementById("actCenterStudentControlBox");

          function escLocal(v) {
            return String(v ?? "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
          }

          function openCenterStudentController(stIdx) {
            const st = studentsData.find(x => Number(x.idx) === Number(stIdx));
            if (!st) return;

            const gradeLectures = lecturesData.filter(l => !st.grade || String(l.grade) === String(st.grade));
            const stCode = String(st.center_code || "").trim().toUpperCase();

            const lecsHtml = gradeLectures.length
              ? gradeLectures.map(function (lec) {
                  const isExplicitlyLocked = st.locked_lectures.includes(String(lec.id));
                  const isManualOpen = st.unlocked_lectures.includes(String(lec.id));
                  const isAttendedOpen = !lec.requires_attendance || (stCode && lec.attended_codes.includes(stCode));
                  const isCurrentlyOpen = !isExplicitlyLocked && (isManualOpen || isAttendedOpen);

                  return (
                    '<div class="row">' +
                      '<div>' +
                        '<span class="pill pill-ok">' + escLocal(lec.branch) + '</span> ' +
                        '<strong>' + escLocal(lec.title) + '</strong>' +
                        '<div style="margin-top:4px;">' +
                          (isCurrentlyOpen
                            ? '<span class="pill pill-ok">مفتوحة للطالب حالياً ✓</span>'
                            : '<span class="pill pill-err">مقفولة على الطالب 🔒</span>') +
                        '</div>' +
                      '</div>' +
                      '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<form method="post" action="/admin/toggle-center-lecture" style="margin:0;">' +
                          '<input type="hidden" name="phone" value="' + escLocal(st.phone) + '" />' +
                          '<input type="hidden" name="lecture_id" value="' + escLocal(lec.id) + '" />' +
                          '<input type="hidden" name="mode" value="' + (isCurrentlyOpen ? "lock" : "unlock") + '" />' +
                          '<button type="submit" class="btn ' + (isCurrentlyOpen ? "btn-red" : "btn-blue") + ' btn-sm">' +
                            (isCurrentlyOpen ? "قفل المحاضرة" : "فتح المحاضرة") +
                          '</button>' +
                        '</form>' +
                      '</div>' +
                    '</div>'
                  );
                }).join("")
              : '<p class="muted">لا توجد محاضرات مضافة لهذا الصف بعد.</p>';

            ctrlBox.style.display = "block";
            ctrlBox.innerHTML =
              '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px;">' +
                '<div>' +
                  '<h4 style="font-weight:900; font-size:1.1rem;">الطالب: ' + escLocal(st.full_name) + '</h4>' +
                  '<div class="muted" style="font-size:0.84rem;">رقمه: <strong>' + escLocal(st.phone) + '</strong> • كود السنتر: <strong>' + escLocal(st.center_code || "-") + '</strong></div>' +
                '</div>' +
                '<button type="button" class="btn btn-out btn-sm" id="closeCenterCtrlBtn">إغلاق</button>' +
              '</div>' +
              '<div style="font-weight:900; margin-bottom:8px;">محاضرات الصف (' + escLocal(st.grade) + '):</div>' +
              lecsHtml;

            document.getElementById("closeCenterCtrlBtn")?.addEventListener("click", function () {
              ctrlBox.style.display = "none";
            });
            ctrlBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }

          function renderStudentsForGrade() {
            const g = (gradeSel?.value || "").trim();
            if (!g) {
              listBox.innerHTML = '<div class="muted" style="font-size:0.86rem;">اختر الصف الدراسي من القائمة أعلاه لعرض طلاب السنتر.</div>';
              return;
            }
            const list = studentsData.filter(x => String(x.grade) === g);
            if (!list.length) {
              listBox.innerHTML = '<div class="msg-err">لا يوجد طلاب سنتر في (' + escLocal(g) + ') حالياً.</div>';
              return;
            }
            listBox.innerHTML = list.map(function (st) {
              return (
                '<div class="row">' +
                  '<div>' +
                    '<strong>' + escLocal(st.full_name) + '</strong> — <span class="muted">' + escLocal(st.phone) + '</span>' +
                    '<div class="muted" style="font-size:0.8rem;">كود السنتر: <strong>' + escLocal(st.center_code || "-") + '</strong></div>' +
                  '</div>' +
                  '<button type="button" class="btn btn-blue btn-sm open-center-st-btn" data-st-idx="' + escLocal(st.idx) + '">تحكم في المحاضرات</button>' +
                '</div>'
              );
            }).join("");

            listBox.querySelectorAll(".open-center-st-btn").forEach(function (btn) {
              btn.addEventListener("click", function () {
                openCenterStudentController(btn.getAttribute("data-st-idx"));
              });
            });
          }

          gradeSel?.addEventListener("change", renderStudentsForGrade);
          renderStudentsForGrade();
        })();
      </script>
    `;
  } else if (activeSec === "add_team") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:6px;">إضافة تيم الأدمن (الاسم + رقم الهاتف + الكود)</h3>
        <p class="muted" style="font-size:0.85rem; margin-bottom:14px;">أضف اسم عضو التيم ورقم هاتفه والكود الخاص به ليتمكن من الدخول لصفحة التيم الخاصة بالمنتدى والغياب (وجلسة واحدة على جهاز واحد).</p>
        <form method="post" action="/admin/create-team" class="grid3">
          <div class="field"><label>اسم عضو التيم *</label><input name="team_name" type="text" required placeholder="اكتب اسم عضو التيم..." /></div>
          <div class="field"><label>رقم الهاتف *</label><input name="team_phone" type="tel" required placeholder="01xxxxxxxxx" /></div>
          <div class="field"><label>كود التيم *</label><input name="team_code" type="text" required placeholder="اكتب الكود الخاص به..." /></div>
          <div style="grid-column:1/-1;"><button type="submit" class="btn btn-teal">حفظ وإضافة عضو التيم</button></div>
        </form>
        <div style="margin-top:16px;">${teamMemberRows}</div>
      </div>
      <script>
        (function () {
          document.querySelectorAll(".copy-code-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
              const codeStr = btn.getAttribute("data-code") || "";
              if (!codeStr) return;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeStr).catch(function () {});
              }
              const oldTxt = btn.textContent;
              btn.textContent = "تم النسخ ✓";
              setTimeout(function () { btn.textContent = oldTxt; }, 1400);
            });
          });
        })();
      </script>
    `;
  } else if (activeSec === "support") {
    sectionHtml = `
      <div style="margin-bottom:10px;">
        <h3 style="font-weight:900;">الدعم الفني</h3>
        <p class="muted" style="font-size:0.86rem;">رسائل وصور الدعم الفني الواردة من الشات المباشر والرد عليها.</p>
      </div>
      ${supportRows}
    `;
  } else if (activeSec === "forum") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">منتدى فروع اللغة العربية — متابعة والرد أو الحذف</h3>
        ${adminForumRows}
      </div>
    `;
  } else if (activeSec === "codes") {
    sectionHtml = `
      <div class="card">
        <h3 style="font-weight:900; margin-bottom:10px;">توليد أكواد (سنتر تبدأ بـ MO وأرقام فقط / فروع)</h3>
        <form method="post" action="/admin/generate-codes" class="grid3">
          <div class="field">
            <label>نوع الكود</label>
            <select name="code_type">
              <option value="center">كود سنتر (MO + أرقام فقط، لمرة واحدة)</option>
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
      is_center_student: Boolean(item.student.is_center_student || item.student.center_code),
      center_code: String(item.student.center_code || ""),
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
                      '<button type="submit" style="border:none; background:#ef4444; color:#fff; border-radius:999px; padding:1px 7px; font-size:0.72rem; font-weight:800; cursor:pointer;">إلغاء التفعيل</button>' +
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
              '<form method="post" action="/admin/update-student" class="grid3" style="margin:10px 0 14px;">' +
                '<input type="hidden" name="old_phone" value="' + escHtml(st.phone) + '" />' +
                '<div class="field"><label>الاسم الرباعي</label><input name="full_name" value="' + escHtml(st.full_name) + '" required /></div>' +
                '<div class="field"><label>رقم الهاتف</label><input name="phone" value="' + escHtml(st.phone) + '" required /></div>' +
                '<div class="field"><label>رقم ولي الأمر</label><input name="parent_phone" value="' + escHtml(st.parent_phone === "-" ? "" : st.parent_phone) + '" /></div>' +
                '<div class="field"><label>المحافظة</label><input name="governorate" value="' + escHtml(st.governorate === "-" ? "" : st.governorate) + '" /></div>' +
                '<div class="field"><label>الصف</label><input name="grade" value="' + escHtml(st.grade) + '" required /></div>' +
                '<div class="field"><label>الشعبة</label><input name="track" value="' + escHtml(st.track) + '" required /></div>' +
                '<div class="field"><label>كود السنتر</label><input name="center_code" value="' + escHtml(st.center_code) + '" /></div>' +
                '<div class="field"><label>كلمة سر جديدة (اختياري)</label><input name="password" type="password" autocomplete="new-password" minlength="4" /></div>' +
                '<div style="grid-column:1/-1;"><button type="submit" class="btn btn-teal btn-sm">حفظ تعديل بيانات الطالب</button></div>' +
              '</form>' +
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
        <p class="muted" style="font-size:0.85rem; margin-bottom:12px;">كل الطلاب الذين دخلوا بأكواد السنتر. اختر الصف لعرض طلابه:</p>
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
                  '<span class="pill pill-ok">طالب سنتر ✓</span>' +
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
      <div class="kpi-grid">
        <div class="kpi-card"><div><div class="kpi-num">${allStudents.length}</div><div class="kpi-lbl">الطلاب</div></div><div class="kpi-icon-box">👥</div></div>
        <div class="kpi-card teal-kpi"><div><div class="kpi-num">${allLectures.length}</div><div class="kpi-lbl">المحاضرات</div></div><div class="kpi-icon-box">🎥</div></div>
        <div class="kpi-card gold-kpi"><div><div class="kpi-num">${allExams.length}</div><div class="kpi-lbl">الواجبات والامتحانات</div></div><div class="kpi-icon-box">📝</div></div>
        <div class="kpi-card teal-kpi"><div><div class="kpi-num">${allForumPosts.length}</div><div class="kpi-lbl">منشورات المنتدى</div></div><div class="kpi-icon-box">💬</div></div>
      </div>
      ${sectionHtml}
    </div>
    <aside class="right-drawer">
      <div class="drawer-top">
        <span class="drawer-title" style="font-weight:900; font-size:0.92rem;">قائمة الأدمن</span>
        <button type="button" class="collapse-btn" id="collapseAdminBtn">⇄</button>
      </div>
      <a class="nav-item-link ${activeSec === "students" ? "active" : ""}" href="/admin?section=students"><span>👥</span><span class="nav-label">طلاب المنصة</span></a>
      <a class="nav-item-link ${activeSec === "center_students" ? "active" : ""}" href="/admin?section=center_students"><span>🏫</span><span class="nav-label">طلاب السنتر</span></a>
      <a class="nav-item-link ${activeSec === "activate_center_lectures" ? "active" : ""}" href="/admin?section=activate_center_lectures"><span>🔓</span><span class="nav-label">تفعيل طلاب سنتر</span></a>
      <a class="nav-item-link ${activeSec === "ranking" ? "active" : ""}" href="/admin?section=ranking"><span>🏆</span><span class="nav-label">ترتيب الطلاب</span></a>
      <a class="nav-item-link ${activeSec === "lectures" ? "active" : ""}" href="/admin?section=lectures"><span>🎥</span><span class="nav-label">المحاضرات</span></a>
      <a class="nav-item-link ${activeSec === "exams" ? "active" : ""}" href="/admin?section=exams"><span>📝</span><span class="nav-label">الواجبات والامتحانات</span></a>
      <a class="nav-item-link ${activeSec === "forum" ? "active" : ""}" href="/admin?section=forum"><span>💬</span><span class="nav-label">المنتدى</span></a>
      <a class="nav-item-link ${activeSec === "support" ? "active" : ""}" href="/admin?section=support"><span>🎧</span><span class="nav-label">الدعم الفني</span></a>
      <a class="nav-item-link ${activeSec === "codes" ? "active" : ""}" href="/admin?section=codes"><span>🔑</span><span class="nav-label">الأكواد والخصومات</span></a>
      <a class="nav-item-link ${activeSec === "add_team" ? "active" : ""}" href="/admin?section=add_team"><span>🛡️</span><span class="nav-label">إضافة تيم الأدمن</span></a>
      <a class="nav-item-link ${activeSec === "settings" ? "active" : ""}" href="/admin?section=settings"><span>⚙️</span><span class="nav-label">الإعدادات</span></a>
      <a class="nav-item-link" href="/logout" style="color:var(--err);"><span>🚪</span><span class="nav-label">تسجيل الخروج</span></a>
    </aside>
  </div>
  <script>
    document.getElementById("collapseAdminBtn")?.addEventListener("click", function () {
      document.getElementById("adminShell")?.classList.toggle("collapsed");
    });
  </script>`;
}

async function handleRequest(req, env) {
  const safeEnv = env || {};
  const url = new URL(req.url);
  const path = url.pathname;
  const secret = safeEnv.SESSION_SECRET || "jakh-secret-2026";
  const settings = await getSettings(safeEnv);

  const adminToken = getCookie(req, "nb_admin");
  const adminSession = parseToken(adminToken, secret);
  const isAdminAuthed = Boolean(adminSession && adminSession.role === "admin");

  const teamToken = getCookie(req, "nb_team");
  const teamSessionParsed = parseToken(teamToken, secret);
  let teamSession = null;
  if (teamSessionParsed && teamSessionParsed.role === "team" && teamSessionParsed.team_id) {
    const memberDoc = await fsGet(safeEnv, "team_members", teamSessionParsed.team_id);
    if (memberDoc && (!memberDoc.active_session_id || memberDoc.active_session_id === teamSessionParsed.sid)) {
      teamSession = teamSessionParsed;
    }
  }

  const isStaff = Boolean(isAdminAuthed || teamSession);

  const studentToken = getCookie(req, "nb_student");
  const studentSession = parseToken(studentToken, secret);
  let student = null;
  if (studentSession && studentSession.phone) {
    const stDoc = await fsGet(safeEnv, "students", studentSession.phone);
    if (stDoc && (!stDoc.active_session_id || stDoc.active_session_id === studentSession.sid)) {
      student = stDoc;
    }
  }

  if (path === "/api/session/check") {
    let kicked = false;
    let redirect = "/student?tab=login";
    if (studentSession && studentSession.phone) {
      const stDoc = await fsGet(safeEnv, "students", studentSession.phone);
      if (!stDoc || (stDoc.active_session_id && stDoc.active_session_id !== studentSession.sid)) {
        kicked = true;
        redirect = "/student?tab=login";
      }
    } else if (teamSessionParsed && teamSessionParsed.team_id) {
      const mDoc = await fsGet(safeEnv, "team_members", teamSessionParsed.team_id);
      if (!mDoc || (mDoc.active_session_id && mDoc.active_session_id !== teamSessionParsed.sid)) {
        kicked = true;
        redirect = "/team";
      }
    }
    const headers = { "Content-Type": "application/json" };
    if (kicked) {
      headers["Set-Cookie"] = clearCookieHeader(studentSession?.phone ? "nb_student" : "nb_team");
    }
    return new Response(JSON.stringify({ kicked, redirect }), { headers });
  }

  if (path === "/api/staff/alerts") {
    if (!isStaff) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const posts = await fsList(safeEnv, "forum_posts");
    posts.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const latest = posts[0];
    if (!latest) {
      return new Response(JSON.stringify({ latest_key: "" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const hasReply = Boolean(latest.reply && String(latest.reply).trim());
    const key = `${latest.id}_${hasReply ? "replied" : "new"}_${latest.created_at || ""}`;
    return new Response(JSON.stringify({
      latest_key: key,
      title: hasReply ? `تم الرد في المنتدى (${latest.branch || ""})` : `رسالة جديدة في المنتدى (${latest.branch || ""})`,
      body: hasReply
        ? `تم الرد على مشاركة الطالب ${latest.student_name || ""}`
        : `${latest.student_name || "طالب"}: ${String(latest.message || "").slice(0, 70)}`
    }), { headers: { "Content-Type": "application/json" } });
  }

  if (path === "/api/support/thread" && req.method === "GET") {
    const sid = String(url.searchParams.get("session_id") || "").trim();
    if (!sid) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const thread = await fsGet(safeEnv, "support_threads", sid);
    return new Response(JSON.stringify({
      visitor_name: thread?.visitor_name || "",
      messages: Array.isArray(thread?.messages) ? thread.messages : [],
      read_admin_ids: Array.isArray(thread?.read_admin_ids) ? thread.read_admin_ids : []
    }), { headers: { "Content-Type": "application/json" } });
  }

  if (path === "/api/support/mark-read" && req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    const sid = String(body.session_id || "").trim();
    const incomingIds = Array.isArray(body.read_admin_ids) ? body.read_admin_ids.map(String) : [];
    if (!sid) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const existing = (await fsGet(safeEnv, "support_threads", sid)) || {
      id: sid,
      visitor_name: "",
      student_phone: "",
      messages: [],
      read_admin_ids: [],
      updated_at: new Date().toISOString()
    };
    const merged = Array.from(new Set([
      ...(Array.isArray(existing.read_admin_ids) ? existing.read_admin_ids.map(String) : []),
      ...incomingIds
    ]));
    existing.read_admin_ids = merged;
    await fsSet(safeEnv, "support_threads", sid, existing);
    return new Response(JSON.stringify({ ok: true, read_admin_ids: merged }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (path === "/api/support/send" && req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    const sid = String(body.session_id || "").trim();
    const visitorName = String(body.visitor_name || "").trim();
    const studentPhone = normalizePhone(body.student_phone || "");
    const text = String(body.text || "").trim();
    const imageUrl = String(body.image_url || "").trim();
    const msgId = String(body.msg_id || ("m_" + Date.now()));
    const registerNameOnly = Boolean(body.register_name_only);

    if (!sid) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const existing = (await fsGet(safeEnv, "support_threads", sid)) || {
      id: sid,
      visitor_name: visitorName || "مستخدم",
      student_phone: studentPhone,
      messages: [],
      read_admin_ids: [],
      updated_at: new Date().toISOString()
    };

    if (visitorName) existing.visitor_name = visitorName;
    if (studentPhone) existing.student_phone = studentPhone;
    existing.updated_at = new Date().toISOString();

    if (!registerNameOnly && (text || imageUrl)) {
      const msgs = Array.isArray(existing.messages) ? existing.messages : [];
      msgs.push({
        id: msgId,
        sender: "user",
        sender_name: existing.visitor_name || "مستخدم",
        text,
        image_url: imageUrl,
        at: new Date().toISOString()
      });
      existing.messages = msgs;
    }

    await fsSet(safeEnv, "support_threads", sid, existing);
    return new Response(JSON.stringify({ ok: true, messages: existing.messages || [] }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (path === "/logout") {
    const headers = new Headers();
    headers.append("Set-Cookie", clearCookieHeader("nb_student"));
    headers.append("Set-Cookie", clearCookieHeader("nb_admin"));
    headers.append("Set-Cookie", clearCookieHeader("nb_team"));
    headers.set("Location", "/");
    return new Response(null, { status: 302, headers });
  }

  if (path === "/about") {
    return htmlRes(
      renderLayout("من نحن", settings, student, isStaff, renderAboutStandalonePage(settings), {
        showLandingAdminAvatar: false
      })
    );
  }

  if (path === "/privacy") {
    return htmlRes(
      renderLayout("سياسة الخصوصية", settings, student, isStaff, renderPrivacyStandalonePage(), {
        showLandingAdminAvatar: false
      })
    );
  }

  if (path === "/") {
    return htmlRes(
      renderLayout("الرئيسية", settings, student, isStaff, renderLanding(settings), {
        showLandingAdminAvatar: true
      })
    );
  }

  if (path === "/team") {
    const teamSec = url.searchParams.get("section") || "forum";
    const notice = url.searchParams.get("notice") || "";
    const error = url.searchParams.get("error") || "";
    const posts = teamSession ? await fsList(safeEnv, "forum_posts") : [];
    const lectures = teamSession ? await fsList(safeEnv, "lectures") : [];
    const students = teamSession ? await fsList(safeEnv, "students") : [];
    return htmlRes(
      renderLayout("بوابة تيم الأدمن", settings, student, isStaff, renderTeamStandalonePage(teamSession, posts, lectures, students, teamSec, error, notice), {
        showLandingAdminAvatar: false,
        showSupportWidget: false
      })
    );
  }

  if (path === "/team/login" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?error=" + encodeURIComponent("تعذر قراءة بيانات النموذج.")); }
    const nameInput = String(fd.get("team_name") || "").trim();
    const phoneInput = normalizePhone(fd.get("team_phone") || "");
    const codeInput = String(fd.get("team_code") || "").trim();

    if (!nameInput || !phoneInput || !codeInput) {
      return redirectRes("/team?error=" + encodeURIComponent("يرجى إدخال الاسم ورقم الهاتف والكود."));
    }

    const members = await fsList(safeEnv, "team_members");
    const matched = members.find(m =>
      String(m.name || "").trim() === nameInput &&
      normalizePhone(m.phone || "") === phoneInput &&
      String(m.code || "").trim() === codeInput
    );

    if (!matched) {
      return redirectRes("/team?error=" + encodeURIComponent("بيانات عضو التيم غير صحيحة."));
    }

    const newSid = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    matched.active_session_id = newSid;
    await fsSet(safeEnv, "team_members", matched.id, matched);

    const token = makeToken({
      role: "team",
      team_id: matched.id,
      team_name: matched.name,
      team_phone: matched.phone,
      sid: newSid
    }, secret);
    return redirectRes("/team?section=forum", { "Set-Cookie": setCookieHeader("nb_team", token) });
  }

  if (path === "/team/generate-center-codes" && req.method === "POST") {
    if (!teamSession) return redirectRes("/team");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const count = Math.min(50, Math.max(1, Number(fd.get("count") || 1)));
    for (let i = 0; i < count; i++) {
      const codeStr = generateCenterCodeMO();
      const id = `${codeStr}_${Date.now()}_${i}`;
      await fsSet(safeEnv, "codes", id, {
        code: codeStr,
        type: "center",
        branch: "ALL",
        used: false,
        used_by: ""
      });
    }
    return redirectRes("/team?section=forum&notice=" + encodeURIComponent(`تم توليد ${count} كود سنتر بواسطة التيم.`));
  }

  if (path === "/team/reply-forum" && req.method === "POST") {
    if (!teamSession) return redirectRes("/team");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?error=" + encodeURIComponent("تعذر قراءة الرد.")); }
    const postId = String(fd.get("post_id") || "");
    const reply = String(fd.get("reply") || "").trim();
    const post = await fsGet(safeEnv, "forum_posts", postId);
    if (post) {
      post.reply = reply;
      post.replied_by = `${teamSession.team_name} (${teamSession.team_phone})`;
      await fsSet(safeEnv, "forum_posts", postId, post);
    }
    return redirectRes("/team?section=forum&notice=" + encodeURIComponent("تم حفظ الرد في المنتدى."));
  }

  if (path === "/team/delete-forum" && req.method === "POST") {
    if (!teamSession) return redirectRes("/team");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const postId = String(fd.get("post_id") || "");
    if (postId) await fsDelete(safeEnv, "forum_posts", postId);
    return redirectRes("/team?section=forum&notice=" + encodeURIComponent("تم حذف الرسالة من المنتدى."));
  }

  if (path === "/team/confirm-absence-code" && req.method === "POST") {
    if (!teamSession) return redirectRes("/team");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?section=absence&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const lecId = String(fd.get("lecture_id") || "").trim();
    const rawCode = String(fd.get("center_code") || "").trim();
    const normCode = normalizeMoCode(rawCode);

    if (!lecId || !normCode) {
      return redirectRes("/team?section=absence&error=" + encodeURIComponent("يرجى اختيار المحاضرة وإدخال الكود."));
    }

    const lec = await fsGet(safeEnv, "lectures", lecId);
    if (!lec) {
      return redirectRes("/team?section=absence&error=" + encodeURIComponent("المحاضرة غير موجودة."));
    }

    const codes = Array.isArray(lec.attended_codes) ? lec.attended_codes.map(c => String(c || "").trim().toUpperCase()) : [];
    if (!codes.includes(normCode)) {
      codes.push(normCode);
    }
    lec.requires_attendance = true;
    lec.attended_codes = codes;
    await fsSet(safeEnv, "lectures", lecId, lec);

    const allSt = await fsList(safeEnv, "students");
    const matchedStudent = allSt.find(s => String(s.center_code || "").trim().toUpperCase() === normCode);
    if (matchedStudent) {
      const unlockedList = Array.isArray(matchedStudent.unlocked_lectures) ? matchedStudent.unlocked_lectures.map(String) : [];
      if (!unlockedList.includes(lecId)) unlockedList.push(lecId);
      const lockedList = Array.isArray(matchedStudent.locked_lectures) ? matchedStudent.locked_lectures.map(String).filter(id => id !== lecId) : [];
      matchedStudent.unlocked_lectures = unlockedList;
      matchedStudent.locked_lectures = lockedList;
      await fsSet(safeEnv, "students", matchedStudent.id, matchedStudent);
    }

    const stInfoText = matchedStudent ? ` (${matchedStudent.full_name})` : "";
    return redirectRes("/team?section=absence&notice=" + encodeURIComponent(`تم تأكيد الكود ${normCode}${stInfoText} وفتح المحاضرة له.`));
  }

  if (path === "/team/revoke-student-lecture" && req.method === "POST") {
    if (!teamSession) return redirectRes("/team");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/team?section=absence&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("student_phone") || "");
    const lecId = String(fd.get("lecture_id") || "").trim();
    if (!phone || !lecId) {
      return redirectRes("/team?section=absence&error=" + encodeURIComponent("اختر الطالب والمحاضرة."));
    }

    const st = await fsGet(safeEnv, "students", phone);
    if (!st) {
      return redirectRes("/team?section=absence&error=" + encodeURIComponent("الطالب غير موجود."));
    }

    const unlockedList = Array.isArray(st.unlocked_lectures) ? st.unlocked_lectures.map(String).filter(id => id !== lecId) : [];
    const lockedList = Array.isArray(st.locked_lectures) ? st.locked_lectures.map(String) : [];
    if (!lockedList.includes(lecId)) lockedList.push(lecId);

    st.unlocked_lectures = unlockedList;
    st.locked_lectures = lockedList;
    await fsSet(safeEnv, "students", phone, st);

    const lec = await fsGet(safeEnv, "lectures", lecId);
    if (lec && st.center_code) {
      const stCodeUp = String(st.center_code).trim().toUpperCase();
      lec.attended_codes = (Array.isArray(lec.attended_codes) ? lec.attended_codes : [])
        .map(c => String(c || "").trim().toUpperCase())
        .filter(c => c !== stCodeUp);
      await fsSet(safeEnv, "lectures", lecId, lec);
    }

    return redirectRes("/team?section=absence&notice=" + encodeURIComponent(`تم إلغاء المحاضرة عن الطالب ${st.full_name} وقفلها عليه.`));
  }

  if (path === "/student") {
    const forceAuthMode = url.searchParams.has("tab");
    if (student && !forceAuthMode) {
      const section = url.searchParams.get("section") || "dashboard";
      const branch = url.searchParams.get("branch") || "";
      const forumBranch = url.searchParams.get("forum_branch") || BRANCHES[0];
      const lectureId = url.searchParams.get("lecture_id") || "";
      const examId = url.searchParams.get("exam_id") || "";
      const error = url.searchParams.get("error") || "";
      const notice = url.searchParams.get("notice") || "";
      const lectures = await fsList(safeEnv, "lectures");
      const exams = await fsList(safeEnv, "exams");
      const submissions = await fsList(safeEnv, "submissions");
      const drafts = await fsList(safeEnv, "exam_drafts");
      const watched = await fsList(safeEnv, "watched");
      const discounts = await fsList(safeEnv, "discounts");
      const forumPosts = await fsList(safeEnv, "forum_posts");

      const myPosts = forumPosts.filter(p => String(p.student_phone || "") === String(student.phone || ""));
      const academicUnreadItems = myPosts
        .filter(p => p.reply && String(p.reply).trim())
        .slice(0, 8)
        .map(p => ({
          key: `forum_${p.id}_${String(p.reply).slice(0, 18)}`,
          kind: "رد المنتدى",
          title: `تم الرد على مشاركتك في ${p.branch || "المنتدى"}`,
          preview: String(p.reply).slice(0, 75),
          href: `/student?section=forum&forum_branch=${encodeURIComponent(p.branch || BRANCHES[0])}`
        }));

      const myDrafts = drafts.filter(d => String(d.student_phone || "") === String(student.phone || ""));
      const body = renderStudentDash(settings, student, {
        section, branch, forumBranch, lectureId, examId, error, notice,
        lectures, exams, submissions, drafts: myDrafts, watched, discounts, forumPosts
      });
      return htmlRes(
        renderLayout("بوابة الطالب", settings, student, isStaff, body, {
          academicUnreadCount: academicUnreadItems.length,
          academicUnreadItems
        })
      );
    }

    const tab = url.searchParams.get("tab") || "login";
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
    return htmlRes(renderLayout("بوابة الطالب", settings, student, isStaff, renderStudentAuth(settings, tab, step, draft, error, notice)));
  }

  if (path === "/student/register" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?tab=register&step=1&error=" + encodeURIComponent("تعذر قراءة بيانات التسجيل.")); }
    const fullName = String(fd.get("full_name") || "").trim();
    const phone = normalizePhone(fd.get("phone") || "");
    const grade = String(fd.get("grade") || GRADES[0]).trim();
    const track = String(fd.get("track") || TRACKS[0]).trim();
    const parentPhone = normalizePhone(fd.get("parent_phone") || "");
    const governorate = String(fd.get("governorate") || EGYPT_GOVERNORATES[0]).trim();
    const password = String(fd.get("password") || "");

    if (!fullName || !phone || !parentPhone || !password) {
      return redirectRes("/student?tab=register&step=1&error=" + encodeURIComponent("يرجى إكمال جميع الحقول المطلوبة."));
    }
    if (parentPhone === phone) {
      return redirectRes("/student?tab=register&step=2&phone=" + encodeURIComponent(phone) + "&error=" + encodeURIComponent("يجب أن يكون رقم هاتف ولي الأمر مختلفاً عن رقم هاتف الطالب."));
    }
    const existing = await fsGet(safeEnv, "students", phone);
    if (existing) {
      return redirectRes("/student?tab=login&error=" + encodeURIComponent("رقم الهاتف مسجل بالفعل، سجل الدخول."));
    }
    const newSid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const studentDoc = {
      full_name: fullName,
      phone,
      grade,
      track,
      parent_phone: parentPhone,
      governorate,
      password_plain: password,
      password_hash: await sha256(password),
      branches: [],
      is_center_student: false,
      center_code: "",
      unlocked_lectures: [],
      locked_lectures: [],
      active_session_id: newSid
    };
    await fsSet(safeEnv, "students", phone, studentDoc);
    const token = makeToken({ phone, sid: newSid }, secret);
    return redirectRes("/student", { "Set-Cookie": setCookieHeader("nb_student", token) });
  }

  if (path === "/student/login" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?tab=login&error=" + encodeURIComponent("تعذر قراءة بيانات الدخول.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    const password = String(fd.get("password") || "");
    const st = await fsGet(safeEnv, "students", phone);
    if (!st) {
      return redirectRes("/student?tab=login&error=" + encodeURIComponent("رقم الهاتف غير مسجل."));
    }
    const inputHash = await sha256(password);
    const validPwd = (st.password_plain && String(st.password_plain) === password) ||
                     (st.password_hash && String(st.password_hash) === inputHash);
    if (!validPwd) {
      return redirectRes("/student?tab=login&error=" + encodeURIComponent("كلمة السر غير صحيحة."));
    }
    const newSid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    st.active_session_id = newSid;
    await fsSet(safeEnv, "students", phone, st);

    const token = makeToken({ phone, sid: newSid }, secret);
    return redirectRes("/student", { "Set-Cookie": setCookieHeader("nb_student", token) });
  }

  if (path === "/student/center-login" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?tab=center&error=" + encodeURIComponent("تعذر قراءة بيانات الكود.")); }
    const centerCode = normalizeMoCode(fd.get("center_code") || "");
    const name = String(fd.get("name") || "").trim();
    const phone = normalizePhone(fd.get("phone") || "");
    const grade = String(fd.get("grade") || GRADES[0]).trim();
    const track = String(fd.get("track") || TRACKS[0]).trim();
    const parentPhone = normalizePhone(fd.get("parent_phone") || "");
    const governorate = String(fd.get("governorate") || EGYPT_GOVERNORATES[0]).trim();
    const password = String(fd.get("password") || "");

    if (!centerCode || !name || !phone || !parentPhone || !password) {
      return redirectRes("/student?tab=center&error=" + encodeURIComponent("يرجى إدخال كود السنتر والاسم والهاتف وولي الأمر وكلمة السر."));
    }
    if (parentPhone === phone) {
      return redirectRes("/student?tab=center&error=" + encodeURIComponent("رقم ولي الأمر يجب أن يختلف عن رقم الطالب."));
    }

    const codes = await fsList(safeEnv, "codes");
    const matchedCode = codes.find(c =>
      c.type === "center" &&
      String(c.code || "").trim().toUpperCase() === centerCode &&
      !c.used
    );
    if (!matchedCode) {
      return redirectRes("/student?tab=center&error=" + encodeURIComponent("كود السنتر غير صحيح أو تم استخدامه من قبل."));
    }

    matchedCode.used = true;
    matchedCode.used_by = phone;
    await fsSet(safeEnv, "codes", matchedCode.id, matchedCode);

    const newSid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const existing = (await fsGet(safeEnv, "students", phone)) || {};
    const stDoc = {
      full_name: name,
      phone,
      grade,
      track,
      parent_phone: parentPhone,
      governorate,
      password_plain: password,
      password_hash: await sha256(password),
      branches: Array.from(new Set([...(existing.branches || []), ...BRANCHES])),
      is_center_student: true,
      center_code: centerCode,
      unlocked_lectures: Array.isArray(existing.unlocked_lectures) ? existing.unlocked_lectures : [],
      locked_lectures: Array.isArray(existing.locked_lectures) ? existing.locked_lectures : [],
      active_session_id: newSid
    };
    await fsSet(safeEnv, "students", phone, stDoc);

    const token = makeToken({ phone, sid: newSid }, secret);
    return redirectRes("/student", { "Set-Cookie": setCookieHeader("nb_student", token) });
  }

  if (path === "/student/reset-password" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?tab=forgot&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    const parentPhone = normalizePhone(fd.get("parent_phone") || "");
    const newPassword = String(fd.get("new_password") || "");

    if (!phone || !parentPhone || !newPassword) {
      return redirectRes("/student?tab=forgot&error=" + encodeURIComponent("يرجى إدخال جميع الحقول."));
    }
    if (parentPhone === phone) {
      return redirectRes("/student?tab=forgot&error=" + encodeURIComponent("يجب أن يختلف رقم ولي الأمر عن رقم الطالب."));
    }

    const st = await fsGet(safeEnv, "students", phone);
    if (!st) {
      return redirectRes("/student?tab=forgot&error=" + encodeURIComponent("رقم هاتف الطالب غير مسجل."));
    }
    if (!st.parent_phone || normalizePhone(st.parent_phone) !== parentPhone) {
      return redirectRes("/student?tab=forgot&error=" + encodeURIComponent("رقم هاتف ولي الأمر غير مطابق للمسجل في الحساب."));
    }

    st.password_plain = newPassword;
    st.password_hash = await sha256(newPassword);
    await fsSet(safeEnv, "students", phone, st);

    return redirectRes("/student?tab=login&notice=" + encodeURIComponent("تم تغيير كلمة السر بنجاح وتحديثها في ملفك."));
  }

  if (path === "/student/redeem-code" && req.method === "POST") {
    if (!student) return redirectRes("/student?tab=login");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?section=codes&error=" + encodeURIComponent("تعذر قراءة الكود.")); }
    const codeVal = String(fd.get("code") || "").trim().toUpperCase();
    const codes = await fsList(safeEnv, "codes");
    const found = codes.find(c => String(c.code || "").toUpperCase() === codeVal && !c.used);
    if (!found) {
      return redirectRes("/student?section=codes&error=" + encodeURIComponent("الكود غير صحيح أو مستخدم من قبل."));
    }
    found.used = true;
    found.used_by = student.phone;
    await fsSet(safeEnv, "codes", found.id, found);

    const setB = new Set(student.branches || []);
    if (found.type === "center") {
      BRANCHES.forEach(b => setB.add(b));
      student.is_center_student = true;
      student.center_code = normalizeMoCode(found.code);
    } else if (found.branch) {
      setB.add(found.branch);
    }
    student.branches = Array.from(setB);
    await fsSet(safeEnv, "students", student.phone, student);

    return redirectRes("/student?section=codes&notice=" + encodeURIComponent("تم تفعيل الكود بنجاح!"));
  }

  if (path === "/student/consume-discount" && req.method === "POST") {
    if (!student) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    let body = {};
    try { body = await req.json(); } catch {}
    const codeUpper = String(body.code || "").trim().toUpperCase();
    const discounts = await fsList(safeEnv, "discounts");
    const matched = discounts.find(d => String(d.code || "").trim().toUpperCase() === codeUpper && !d.used);
    if (matched) {
      matched.used = true;
      matched.used_by = student.phone;
      await fsSet(safeEnv, "discounts", matched.id, matched);
      return new Response(JSON.stringify({ ok: true, amount: Number(matched.amount || 0) }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: false }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (path === "/student/forum-post" && req.method === "POST") {
    if (!student) return redirectRes("/student?tab=login");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?section=forum&error=" + encodeURIComponent("تعذر قراءة المشاركة.")); }
    const branch = String(fd.get("branch") || BRANCHES[0]).trim();
    const message = String(fd.get("message") || "").trim();
    const imageUrl = String(fd.get("image_url") || "").trim();
    if (!message && !imageUrl) {
      return redirectRes(`/student?section=forum&forum_branch=${encodeURIComponent(branch)}&error=` + encodeURIComponent("اكتب مشاركتك أو أرفق صورة."));
    }
    const id = "fp_" + Date.now();
    await fsSet(safeEnv, "forum_posts", id, {
      branch,
      student_name: student.full_name,
      student_phone: student.phone,
      student_grade: student.grade,
      message,
      image_url: imageUrl,
      reply: "",
      replied_by: "",
      created_at: new Date().toISOString()
    });
    return redirectRes(`/student?section=forum&forum_branch=${encodeURIComponent(branch)}&notice=` + encodeURIComponent("تم نشر مشاركتك في المنتدى بنجاح."));
  }

  if (path === "/student/exam-action" && req.method === "POST") {
    if (!student) return redirectRes("/student?tab=login");
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/student?section=exams&error=" + encodeURIComponent("تعذر قراءة إجابات الواجب.")); }
    const examId = String(fd.get("exam_id") || "");
    const actionType = String(fd.get("action_type") || "finish");
    const ex = await fsGet(safeEnv, "exams", examId);
    if (!ex) return redirectRes("/student?section=exams&error=" + encodeURIComponent("الواجب غير موجود."));

    const questions = Array.isArray(ex.questions) ? ex.questions : [];
    const answers = questions.map((_, i) => {
      const raw = fd.get(`q_${i}`);
      return raw === null || raw === undefined || raw === "" ? -1 : Number(raw);
    });

    const draftId = `${student.phone}_${examId}`;

    if (actionType === "save") {
      await fsSet(safeEnv, "exam_drafts", draftId, {
        student_phone: student.phone,
        exam_id: examId,
        answers,
        updated_at: new Date().toISOString()
      });
      return redirectRes("/student?section=exams&notice=" + encodeURIComponent("تم حفظ الواجب كمسودة. يمكنك استكماله في أي وقت."));
    }

    const existingSubs = await fsList(safeEnv, "submissions");
    const alreadySubmitted = existingSubs.some(s => String(s.student_phone) === String(student.phone) && String(s.exam_id) === String(examId));
    if (alreadySubmitted) {
      return redirectRes("/student?section=results&error=" + encodeURIComponent("تم تسليم هذا الواجب مسبقاً ولا يمكن حله مرة أخرى."));
    }

    let score = 0;
    const details = questions.map((q, i) => {
      const chosenIdx = answers[i];
      const correctIdx = Number(q.correct_idx ?? 0);
      const isCorrect = chosenIdx === correctIdx;
      if (isCorrect) score++;
      const opts = Array.isArray(q.options) ? q.options : [];
      return {
        question: q.text || "",
        student_answer: chosenIdx >= 0 && chosenIdx < opts.length ? opts[chosenIdx] : "لم تُجب",
        correct_answer: opts[correctIdx] || "",
        is_correct: isCorrect
      };
    });

    const total = Math.max(1, questions.length);
    const wrongCount = total - score;
    const pct = Math.round((score / total) * 100);

    await fsSet(safeEnv, "submissions", `${student.phone}_${examId}_${Date.now()}`, {
      student_phone: student.phone,
      student_name: student.full_name,
      exam_id: examId,
      exam_title: ex.title,
      branch: ex.branch || "عام",
      score,
      wrong_count: wrongCount,
      total,
      pct,
      details,
      submitted_at: new Date().toISOString()
    });

    await fsDelete(safeEnv, "exam_drafts", draftId);
    return redirectRes("/student?section=results&notice=" + encodeURIComponent(`تم تسليم الواجب! نسبتك ${pct}% وعدد أخطائك ${wrongCount}.`));
  }

  if (path === "/admin") {
    const section = url.searchParams.get("section") || "students";
    const error = url.searchParams.get("error") || "";
    const notice = url.searchParams.get("notice") || "";
    const rankGrade = url.searchParams.get("rank_grade") || GRADES[0];
    const preselectLectureId = url.searchParams.get("lecture_id") || "";

    let data = {
      students: [],
      lectures: [],
      exams: [],
      submissions: [],
      watched: [],
      codes: [],
      discounts: [],
      teamMembers: [],
      forumPosts: [],
      supportThreads: [],
      rankingGrade: rankGrade,
      preselectLectureId
    };
    if (isAdminAuthed) {
      data = {
        students: await fsList(safeEnv, "students"),
        lectures: await fsList(safeEnv, "lectures"),
        exams: await fsList(safeEnv, "exams"),
        submissions: await fsList(safeEnv, "submissions"),
        watched: await fsList(safeEnv, "watched"),
        codes: await fsList(safeEnv, "codes"),
        discounts: await fsList(safeEnv, "discounts"),
        teamMembers: await fsList(safeEnv, "team_members"),
        forumPosts: await fsList(safeEnv, "forum_posts"),
        supportThreads: await fsList(safeEnv, "support_threads"),
        rankingGrade: rankGrade,
        preselectLectureId
      };
    }
    return htmlRes(
      renderLayout("لوحة الأدمن", settings, student, isStaff, renderAdminPage(settings, isAdminAuthed, data, section, error, notice), {
        showLandingAdminAvatar: false,
        showSupportWidget: false
      })
    );
  }

  if (path === "/admin/login" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?error=" + encodeURIComponent("تعذر قراءة بيانات الدخول.")); }
    const emailInput = String(fd.get("email") || "").trim();
    const passInput = String(fd.get("password") || "");
    const ok = await verifyAdminCredentials(safeEnv, settings, emailInput, passInput);
    if (!ok) {
      return redirectRes("/admin?error=" + encodeURIComponent("بيانات دخول الأدمن غير صحيحة."));
    }
    const token = makeToken({ role: "admin", email: emailInput }, secret);
    return redirectRes("/admin?section=students", { "Set-Cookie": setCookieHeader("nb_admin", token) });
  }

  if (!isAdminAuthed) return redirectRes("/admin");

  if (path === "/admin/toggle-center-lecture" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=activate_center_lectures&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    const lecId = String(fd.get("lecture_id") || "").trim();
    const mode = String(fd.get("mode") || "unlock");

    const st = await fsGet(safeEnv, "students", phone);
    if (!st) {
      return redirectRes("/admin?section=activate_center_lectures&error=" + encodeURIComponent("الطالب غير موجود."));
    }

    let unlockedList = Array.isArray(st.unlocked_lectures) ? st.unlocked_lectures.map(String) : [];
    let lockedList = Array.isArray(st.locked_lectures) ? st.locked_lectures.map(String) : [];

    if (mode === "lock") {
      unlockedList = unlockedList.filter(id => id !== lecId);
      if (!lockedList.includes(lecId)) lockedList.push(lecId);
      const lec = await fsGet(safeEnv, "lectures", lecId);
      if (lec && st.center_code) {
        const stCodeUp = String(st.center_code).trim().toUpperCase();
        lec.attended_codes = (Array.isArray(lec.attended_codes) ? lec.attended_codes : [])
          .map(c => String(c || "").trim().toUpperCase())
          .filter(c => c !== stCodeUp);
        await fsSet(safeEnv, "lectures", lecId, lec);
      }
    } else {
      lockedList = lockedList.filter(id => id !== lecId);
      if (!unlockedList.includes(lecId)) unlockedList.push(lecId);
    }

    st.unlocked_lectures = unlockedList;
    st.locked_lectures = lockedList;
    await fsSet(safeEnv, "students", phone, st);

    return redirectRes("/admin?section=activate_center_lectures&notice=" + encodeURIComponent(mode === "lock" ? `تم قفل المحاضرة عن الطالب ${st.full_name}.` : `تم فتح المحاضرة للطالب ${st.full_name}.`));
  }

  if (path === "/admin/create-team" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const teamName = String(fd.get("team_name") || "").trim();
    const teamPhone = normalizePhone(fd.get("team_phone") || "");
    const teamCode = String(fd.get("team_code") || "").trim();
    if (!teamName || !teamPhone || !teamCode) {
      return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("يرجى إدخال اسم عضو التيم ورقم هاتفه والكود."));
    }
    const id = "tm_" + Date.now();
    await fsSet(safeEnv, "team_members", id, {
      name: teamName,
      phone: teamPhone,
      code: teamCode,
      active_session_id: "",
      created_at: new Date().toISOString()
    });
    return redirectRes("/admin?section=add_team&notice=" + encodeURIComponent(`تم إضافة عضو التيم (${teamName}) بنجاح.`));
  }

  if (path === "/admin/update-team" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("تعذر قراءة بيانات التيم.")); }
    const teamId = String(fd.get("team_id") || "").trim();
    const teamName = String(fd.get("team_name") || "").trim();
    const teamPhone = normalizePhone(fd.get("team_phone") || "");
    const teamCode = String(fd.get("team_code") || "").trim();
    if (!teamId || !teamName || !teamPhone || !teamCode) {
      return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("يرجى إدخال اسم التيم ورقم هاتفه والكود."));
    }
    const member = await fsGet(safeEnv, "team_members", teamId);
    if (!member) {
      return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("عضو التيم غير موجود."));
    }
    member.name = teamName;
    member.phone = teamPhone;
    member.code = teamCode;
    member.active_session_id = "";
    await fsSet(safeEnv, "team_members", teamId, member);
    return redirectRes("/admin?section=add_team&notice=" + encodeURIComponent(`تم تعديل بيانات عضو التيم (${teamName}) بنجاح.`));
  }

  if (path === "/admin/delete-team" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=add_team&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const teamId = String(fd.get("team_id") || "");
    if (teamId) await fsDelete(safeEnv, "team_members", teamId);
    return redirectRes("/admin?section=add_team&notice=" + encodeURIComponent("تم حذف عضو التيم."));
  }

  if (path === "/admin/support-reply" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=support&error=" + encodeURIComponent("تعذر قراءة الرد.")); }
    const sid = String(fd.get("session_id") || "").trim();
    const replyText = String(fd.get("reply_text") || "").trim();
    if (sid && replyText) {
      const th = await fsGet(safeEnv, "support_threads", sid);
      if (th) {
        const msgs = Array.isArray(th.messages) ? th.messages : [];
        msgs.push({
          id: "adm_" + Date.now(),
          sender: "admin",
          sender_name: "الأدمن",
          text: replyText,
          image_url: "",
          at: new Date().toISOString()
        });
        th.messages = msgs;
        th.updated_at = new Date().toISOString();
        await fsSet(safeEnv, "support_threads", sid, th);
      }
    }
    return redirectRes("/admin?section=support&notice=" + encodeURIComponent("تم إرسال رد الدعم الفني."));
  }

  if (path === "/admin/reply-forum" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=forum&error=" + encodeURIComponent("تعذر قراءة الرد.")); }
    const postId = String(fd.get("post_id") || "");
    const reply = String(fd.get("reply") || "").trim();
    const post = await fsGet(safeEnv, "forum_posts", postId);
    if (post) {
      post.reply = reply;
      post.replied_by = "الأدمن";
      await fsSet(safeEnv, "forum_posts", postId, post);
    }
    return redirectRes("/admin?section=forum&notice=" + encodeURIComponent("تم حفظ الرد في المنتدى."));
  }

  if (path === "/admin/delete-forum" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=forum&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const postId = String(fd.get("post_id") || "");
    if (postId) await fsDelete(safeEnv, "forum_posts", postId);
    return redirectRes("/admin?section=forum&notice=" + encodeURIComponent("تم حذف الرسالة من المنتدى."));
  }

  if (path === "/admin/generate-codes" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=codes&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const type = String(fd.get("code_type") || "center");
    const branch = String(fd.get("branch") || BRANCHES[0]);
    const count = Math.min(50, Math.max(1, Number(fd.get("count") || 1)));

    for (let i = 0; i < count; i++) {
      const codeStr = type === "center"
        ? generateCenterCodeMO()
        : ("BR-" + Math.random().toString(36).slice(2, 8).toUpperCase());
      const id = `${codeStr}_${Date.now()}_${i}`;
      await fsSet(safeEnv, "codes", id, {
        code: codeStr,
        type,
        branch: type === "center" ? "ALL" : branch,
        used: false,
        used_by: ""
      });
    }
    return redirectRes("/admin?section=codes&notice=" + encodeURIComponent(`تم توليد ${count} كود بنجاح.`));
  }

  if (path === "/admin/delete-code" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=codes&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const codeId = String(fd.get("code_id") || "");
    if (codeId) await fsDelete(safeEnv, "codes", codeId);
    return redirectRes("/admin?section=codes&notice=" + encodeURIComponent("تم حذف الكود."));
  }

  if (path === "/admin/create-discount" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=codes&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const rawCode = String(fd.get("discount_code") || "").trim().toUpperCase();
    const amount = Math.min(COURSE_PRICE_EGP, Math.max(1, Number(fd.get("discount_amount") || 50)));
    const codeStr = rawCode || ("DISC-" + Math.random().toString(36).slice(2, 7).toUpperCase());
    const id = `disc_${codeStr}_${Date.now()}`;
    await fsSet(safeEnv, "discounts", id, {
      code: codeStr,
      amount,
      used: false,
      used_by: "",
      created_at: new Date().toISOString()
    });
    return redirectRes("/admin?section=codes&notice=" + encodeURIComponent(`تم إنشاء كود الخصم (${codeStr}) بقيمة ${amount} ج لمرة واحدة.`));
  }

  if (path === "/admin/delete-discount" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=codes&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const discountId = String(fd.get("discount_id") || "");
    if (discountId) await fsDelete(safeEnv, "discounts", discountId);
    return redirectRes("/admin?section=codes&notice=" + encodeURIComponent("تم حذف كود الخصم."));
  }

  if (path === "/admin/add-lecture" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=lectures&error=" + encodeURIComponent("تعذر قراءة بيانات المحاضرة.")); }
    const title = String(fd.get("title") || "").trim();
    const branch = String(fd.get("branch") || BRANCHES[0]).trim();
    const grade = String(fd.get("grade") || GRADES[0]).trim();
    const track = String(fd.get("track") || TRACKS[0]).trim();
    const orderNum = Math.max(1, Number(fd.get("order_num") || 1));
    const videoUrl = String(fd.get("video_url") || "").trim();
    const customJsonRaw = String(fd.get("custom_items_json") || "[]");

    let customItems = [];
    try {
      const parsed = JSON.parse(customJsonRaw);
      if (Array.isArray(parsed)) customItems = parsed;
    } catch {}

    if (title) {
      const id = "lec_" + Date.now();
      await fsSet(safeEnv, "lectures", id, {
        title,
        branch,
        grade,
        track,
        order_num: orderNum,
        video_url: videoUrl,
        custom_items: customItems
      });
    }
    return redirectRes("/admin?section=lectures&notice=" + encodeURIComponent("تمت إضافة المحاضرة وعناصرها بنجاح."));
  }

  if (path === "/admin/delete-lecture" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=lectures&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const id = String(fd.get("lecture_id") || "");
    if (id) await fsDelete(safeEnv, "lectures", id);
    return redirectRes("/admin?section=lectures&notice=" + encodeURIComponent("تم حذف المحاضرة."));
  }

  if (path === "/admin/add-exam" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=exams&error=" + encodeURIComponent("تعذر قراءة بيانات الاختبار.")); }
    const title = String(fd.get("title") || "").trim();
    const branch = String(fd.get("branch") || BRANCHES[0]).trim();
    const lectureId = String(fd.get("lecture_id") || "").trim();
    const questionsJson = String(fd.get("questions_json") || "[]");

    let questions = [];
    try {
      const parsed = JSON.parse(questionsJson);
      if (Array.isArray(parsed)) questions = parsed;
    } catch {}

    if (title && questions.length > 0) {
      const id = "ex_" + Date.now();
      await fsSet(safeEnv, "exams", id, {
        title,
        branch,
        lecture_id: lectureId,
        questions
      });
    }
    return redirectRes("/admin?section=exams&notice=" + encodeURIComponent("تم حفظ ونشر الواجب / الاختبار بنجاح."));
  }

  if (path === "/admin/delete-exam" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=exams&error=" + encodeURIComponent("تعذر قراءة الطلب.")); }
    const id = String(fd.get("exam_id") || "");
    if (id) await fsDelete(safeEnv, "exams", id);
    return redirectRes("/admin?section=exams&notice=" + encodeURIComponent("تم حذف الواجب / الاختبار."));
  }

  if (path === "/admin/grant-branches" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=students&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    const selectedBranches = fd.getAll("branches").map(String);
    const st = await fsGet(safeEnv, "students", phone);
    if (st) {
      st.branches = Array.from(new Set([...(st.branches || []), ...selectedBranches]));
      await fsSet(safeEnv, "students", phone, st);
    }
    return redirectRes("/admin?section=students&notice=" + encodeURIComponent("تم تفعيل اشتراك الفروع المحددة للطالب."));
  }

  if (path === "/admin/revoke-branch" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=students&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    const branchToRemove = String(fd.get("branch") || "").trim();
    const st = await fsGet(safeEnv, "students", phone);
    if (st && branchToRemove) {
      st.branches = (Array.isArray(st.branches) ? st.branches : []).filter(b => String(b) !== branchToRemove);
      await fsSet(safeEnv, "students", phone, st);
    }
    return redirectRes("/admin?section=students&notice=" + encodeURIComponent(`تم إلغاء تفعيل فرع (${branchToRemove}) عن الطالب.`));
  }

  if (path === "/admin/delete-student" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=students&error=" + encodeURIComponent("تعذر قراءة البيانات.")); }
    const phone = normalizePhone(fd.get("phone") || "");
    if (phone) {
      await fsDelete(safeEnv, "students", phone);
    }
    return redirectRes("/admin?section=students&notice=" + encodeURIComponent("تم حذف الطالب من المنصة."));
  }

  if (path === "/admin/update-student" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=students&error=" + encodeURIComponent("تعذر قراءة بيانات الطالب.")); }
    const oldPhone = normalizePhone(fd.get("old_phone") || "");
    const newPhone = normalizePhone(fd.get("phone") || "");
    const fullName = String(fd.get("full_name") || "").trim();
    if (!oldPhone || !newPhone || !fullName) {
      return redirectRes("/admin?section=students&error=" + encodeURIComponent("الاسم ورقم الهاتف حقول إلزامية."));
    }

    const student = await fsGet(safeEnv, "students", oldPhone);
    if (!student) {
      return redirectRes("/admin?section=students&error=" + encodeURIComponent("الطالب غير موجود."));
    }
    if (newPhone !== oldPhone) {
      const existing = await fsGet(safeEnv, "students", newPhone);
      if (existing) {
        return redirectRes("/admin?section=students&error=" + encodeURIComponent("رقم الهاتف الجديد مسجل لطالب آخر."));
      }
    }

    const parentPhone = normalizePhone(fd.get("parent_phone") || "");
    if (parentPhone === newPhone) {
      return redirectRes("/admin?section=students&error=" + encodeURIComponent("رقم ولي الأمر يجب أن يختلف عن رقم الطالب."));
    }
    const centerCode = normalizeMoCode(fd.get("center_code") || "");
    const newPassword = String(fd.get("password") || "").trim();

    student.full_name = fullName;
    student.phone = newPhone;
    student.parent_phone = parentPhone;
    student.governorate = String(fd.get("governorate") || "").trim();
    student.grade = String(fd.get("grade") || GRADES[0]).trim();
    student.track = String(fd.get("track") || TRACKS[0]).trim();
    student.center_code = centerCode;
    student.is_center_student = Boolean(centerCode);
    if (newPassword) {
      student.password_plain = newPassword;
      student.password_hash = await sha256(newPassword);
    }

    if (newPhone !== oldPhone) {
      await fsDelete(safeEnv, "students", oldPhone);
      await fsSet(safeEnv, "students", newPhone, student);

      for (const col of ["submissions", "watched", "exam_drafts", "forum_posts", "support_threads"]) {
        const docs = await fsList(safeEnv, col);
        for (const doc of docs) {
          if (col === "submissions" && normalizePhone(doc.student_phone) === oldPhone) {
            doc.student_phone = newPhone;
            await fsSet(safeEnv, col, doc.id, doc);
          } else if (col === "watched" && normalizePhone(doc.student_phone) === oldPhone) {
            doc.student_phone = newPhone;
            await fsSet(safeEnv, col, doc.id, doc);
          } else if (col === "exam_drafts" && normalizePhone(doc.student_phone) === oldPhone) {
            doc.student_phone = newPhone;
            await fsSet(safeEnv, col, doc.id, doc);
          } else if (col === "forum_posts" && normalizePhone(doc.student_phone) === oldPhone) {
            doc.student_phone = newPhone;
            await fsSet(safeEnv, col, doc.id, doc);
          } else if (col === "support_threads" && normalizePhone(doc.student_phone) === oldPhone) {
            doc.student_phone = newPhone;
            await fsSet(safeEnv, col, doc.id, doc);
          }
        }
      }
    } else {
      await fsSet(safeEnv, "students", oldPhone, student);
    }

    return redirectRes("/admin?section=students&notice=" + encodeURIComponent(`تم تعديل بيانات الطالب (${fullName}) بنجاح.`));
  }

  if (path === "/admin/settings" && req.method === "POST") {
    let fd;
    try { fd = await req.formData(); } catch { return redirectRes("/admin?section=settings&error=" + encodeURIComponent("تعذر قراءة الإعدادات.")); }
    const newAdminEmail = String(fd.get("admin_email") || settings.admin_email || DEFAULT_ADMIN_EMAIL).trim();
    const newAdminPass = String(fd.get("new_admin_password") || "").trim();

    const updatedSettings = {
      admin_email: newAdminEmail,
      admin_password: newAdminPass ? newAdminPass : (settings.admin_password || ""),
      admin_password_hash: newAdminPass ? (await sha256(newAdminPass)) : settings.admin_password_hash,
      vodafone_number: String(fd.get("vodafone_number") || "").trim(),
      admin_whatsapp: String(fd.get("admin_whatsapp") || "").trim(),
      facebook_url: String(fd.get("facebook_url") || "").trim(),
      tiktok_url: String(fd.get("tiktok_url") || "").trim(),
      youtube_url: String(fd.get("youtube_url") || "").trim(),
      teacher_image: String(fd.get("teacher_image") || TEACHER_MAIN_PHOTO).trim(),
      global_notice: String(fd.get("global_notice") || "").trim()
    };

    await fsSet(safeEnv, "settings", "main", updatedSettings);
    return redirectRes("/admin?section=settings&notice=" + encodeURIComponent("تم حفظ الإعدادات بنجاح."));
  }

  return htmlRes(renderLayout("غير موجود", settings, student, isStaff, `<div class="card" style="max-width:500px; margin:30px auto;"><h2>الصفحة غير موجودة</h2><a class="btn btn-blue" href="/">العودة للرئيسية</a></div>`), 404);
}

export default {
  async fetch(req, env) {
    try {
      return await handleRequest(req, env);
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "حدث خطأ غير متوقع في الخادم.";
      return new Response(
        `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>خطأ</title></head><body style="font-family:sans-serif;padding:24px;"><h3>حدث خطأ أثناء معالجة الطلب</h3><p>${esc(msg)}</p><a href="/">العودة للرئيسية</a></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }
};