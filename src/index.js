const BRANCHES = [
  "النحو",
  "الصرف",
  "البلاغة",
  "الأدب",
  "النصوص",
  "القراءة",
  "التعبير"
];

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function htmlRes(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeToken(payloadObj, secret) {
  const body = btoa(unescape(encodeURIComponent(JSON.stringify(payloadObj))));
  return `${body}.${secret.slice(0, 14)}`;
}

function parseToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (sig !== secret.slice(0, 14)) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(body))));
  } catch {
    return null;
  }
}

function fsBase(env) {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function toFsValue(v) {
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (v && typeof v === "object") {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFsValue(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v ?? "") };
}

function fromFsValue(fv) {
  if (!fv) return null;
  if ("stringValue" in fv) return fv.stringValue;
  if ("integerValue" in fv) return Number(fv.integerValue);
  if ("doubleValue" in fv) return Number(fv.doubleValue);
  if ("booleanValue" in fv) return fv.booleanValue;
  if ("arrayValue" in fv) return (fv.arrayValue.values || []).map(fromFsValue);
  if ("mapValue" in fv) {
    const out = {};
    for (const [k, val] of Object.entries(fv.mapValue.fields || {})) out[k] = fromFsValue(val);
    return out;
  }
  return null;
}

function docToObj(doc) {
  const id = doc.name.split("/").pop();
  const obj = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fromFsValue(v);
  return obj;
}

async function fsList(env, col) {
  const url = `${fsBase(env)}/${col}?key=${env.FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(docToObj);
}

async function fsGet(env, col, id) {
  const url = `${fsBase(env)}/${col}/${encodeURIComponent(id)}?key=${env.FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  return docToObj(doc);
}

async function fsSet(env, col, id, obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== "id") fields[k] = toFsValue(v);
  }
  const url = `${fsBase(env)}/${col}/${encodeURIComponent(id)}?key=${env.FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return res.ok;
}

function getAuth(req, env) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return parseToken(token, env.FIREBASE_API_KEY || "secret");
}

const APP_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>جَخّ — منصة الأستاذ محمد يوسف للغة العربية</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0b0d12;
    --panel: #131722;
    --panel-2: #191f2e;
    --gold: #d4af37;
    --gold-soft: rgba(212, 175, 55, 0.14);
    --text: #f3f5f9;
    --muted: #9aa4b8;
    --border: rgba(255, 255, 255, 0.08);
    --ok: #16a34a;
    --err: #dc2626;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Cairo', Tahoma, sans-serif;
    background: radial-gradient(circle at top, #181e2f 0%, var(--bg) 55%);
    color: var(--text);
    min-height: 100vh;
    user-select: none;
  }
  .topbar {
    position: sticky; top: 0; z-index: 20;
    backdrop-filter: blur(12px);
    background: rgba(11, 13, 18, 0.85);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .badge-jakh {
    background: linear-gradient(135deg, #f0cf65, #b68a1b);
    color: #0b0d12;
    font-weight: 900;
    padding: 6px 14px;
    border-radius: 12px;
    font-size: 18px;
    letter-spacing: 0.5px;
  }
  .brand-title { font-weight: 800; font-size: 17px; }
  .brand-sub { color: var(--muted); font-size: 12px; }
  .container { max-width: 1140px; margin: 26px auto; padding: 0 18px 50px; }
  .hero {
    background: linear-gradient(135deg, rgba(212,175,55,0.14), rgba(25,31,46,0.9));
    border: 1px solid rgba(212,175,55,0.28);
    border-radius: 22px;
    padding: 28px;
    margin-bottom: 24px;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px;
  }
  .hero h1 { margin: 0 0 8px; font-size: 26px; font-weight: 900; }
  .hero p { margin: 0; color: var(--muted); font-size: 14px; }
  .stats { display: flex; gap: 12px; flex-wrap: wrap; }
  .stat {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 12px 18px;
    min-width: 125px;
    text-align: center;
  }
  .stat b { display: block; font-size: 20px; color: var(--gold); }
  .stat span { font-size: 12px; color: var(--muted); }
  .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 900px) { .grid-3 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 720px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.25);
  }
  .card h2, .card h3 { margin: 0 0 14px; font-size: 18px; font-weight: 800; }
  label { display: block; font-size: 12px; color: var(--muted); margin: 8px 0 4px; }
  input, select, textarea {
    width: 100%;
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 11px 13px;
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--gold); }
  button {
    background: linear-gradient(135deg, #e5c158, #c29520);
    color: #0b0d12;
    border: none;
    border-radius: 12px;
    padding: 11px 18px;
    font-family: inherit;
    font-weight: 800;
    font-size: 14px;
    cursor: pointer;
    margin-top: 10px;
    transition: transform 0.12s ease, opacity 0.12s ease;
  }
  button:hover { transform: translateY(-1px); opacity: 0.96; }
  button.ghost {
    background: var(--panel-2);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
  .tab-btn.active { outline: 2px solid var(--gold); }
  .pill {
    display: inline-block;
    background: var(--gold-soft);
    color: var(--gold);
    border: 1px solid rgba(212,175,55,0.35);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    margin: 2px;
  }
  .lec-card {
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    margin-top: 12px;
  }
  .watermark {
    background: rgba(212,175,55,0.12);
    border-right: 3px solid var(--gold);
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: #f6e29c;
    margin: 8px 0 10px;
  }
  .locked {
    background: rgba(220,38,38,0.12);
    border: 1px solid rgba(220,38,38,0.35);
    color: #fca5a5;
    padding: 12px;
    border-radius: 12px;
    font-size: 13px;
  }
  .alert {
    padding: 12px 16px;
    border-radius: 14px;
    margin-bottom: 18px;
    font-weight: 700;
    font-size: 14px;
  }
  .alert.ok { background: rgba(22,163,74,0.18); border: 1px solid rgba(22,163,74,0.45); color: #86efac; }
  .alert.err { background: rgba(220,38,38,0.18); border: 1px solid rgba(220,38,38,0.45); color: #fca5a5; }
  .hidden { display: none !important; }
  iframe, img { width: 100%; border-radius: 14px; border: 1px solid var(--border); background: #000; }
</style>
</head>
<body oncontextmenu="return false">
<header class="topbar">
  <div class="brand">
    <span class="badge-jakh">إنت جَخّ</span>
    <div>
      <div class="brand-title">منصة الأستاذ محمد يوسف</div>
      <div class="brand-sub">اللغة العربية — الثانوية العامة والأزهرية</div>
    </div>
  </div>
  <div id="topActions">
    <button class="ghost hidden" id="logoutBtn" onclick="logout()">تسجيل الخروج</button>
  </div>
</header>

<main class="container">
  <section class="hero">
    <div>
      <h1>أهلاً بك في منصة الجَخّ للغة العربية</h1>
      <p>فروع متكاملة، أكواد تفعيل لمرة واحدة، محاضرات iNK Player بعلامة مائية، اختبارات وتذاكر دعم سريعة.</p>
    </div>
    <div class="stats">
      <div class="stat"><b>7</b><span>فروع اللغة</span></div>
      <div class="stat"><b>24/7</b><span>تشغيل سحابي</span></div>
      <div class="stat"><b>HD</b><span>مشاهدة iNK</span></div>
    </div>
  </section>

  <div id="alertBox" class="alert hidden"></div>

  <!-- شاشة الدخول والتسجيل -->
  <section id="authView" class="grid-2">
    <div class="card">
      <h3>تسجيل الدخول</h3>
      <label>رقم الهاتف (للطالب) أو البريد الإلكتروني (للأدمن)</label>
      <input id="loginId" placeholder="01xxxxxxxxx أو mohmed@mr.com" />
      <label>كلمة المرور</label>
      <input id="loginPass" type="password" placeholder="••••••••" />
      <button onclick="loginUser()">دخول إلى المنصة</button>
    </div>

    <div class="card">
      <h3>إنشاء حساب طالب جديد</h3>
      <label>اسم الطالب ثلاثي</label>
      <input id="regName" placeholder="اكتب اسمك الكامل" />
      <label>رقم هاتف الطالب</label>
      <input id="regPhone" placeholder="01xxxxxxxxx" />
      <label>رقم هاتف ولي الأمر</label>
      <input id="regParent" placeholder="01xxxxxxxxx" />
      <label>كلمة المرور</label>
      <input id="regPass" type="password" placeholder="اختر كلمة مرور قوية" />
      <label>كود التفعيل (يُستخدم مرة واحدة)</label>
      <input id="regCode" placeholder="مثال: JAKH-A1B2C3" />
      <button onclick="registerStudent()">إنشاء الحساب وتفعيل الدخول</button>
    </div>
  </section>

  <!-- واجهة الطالب -->
  <section id="studentView" class="hidden">
    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <h2 id="stGreeting" style="margin-bottom:4px;"></h2>
          <div id="stParent" style="color:var(--muted); font-size:13px;"></div>
        </div>
        <div id="stBranches"></div>
      </div>
      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <input id="branchCodeInp" placeholder="أدخل كود تفعيل فرع جديد..." style="max-width:280px; margin:0;" />
        <button onclick="redeemBranch()" style="margin:0;">تفعيل الفرع</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" id="tabLec" onclick="switchStTab('lec')">المحاضرات</button>
      <button class="tab-btn ghost" id="tabQuiz" onclick="switchStTab('quiz')">الاختبارات والكويزات</button>
      <button class="tab-btn ghost" id="tabTicket" onclick="switchStTab('ticket')">تذكرة دعم فني</button>
    </div>

    <div id="stTabLec" class="card">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
        <h3 style="margin:0;">محاضرات الفروع</h3>
        <select id="branchFilter" onchange="loadLectures()" style="max-width:220px; margin:0;">
          <option value="">جميع الفروع</option>
        </select>
      </div>
      <div id="lecturesContainer"></div>
    </div>

    <div id="stTabQuiz" class="card hidden">
      <h3>الاختبار الإلكتروني</h3>
      <div id="quizContainer"></div>
      <button onclick="submitQuiz()">تسليم الإجابات وحساب الدرجة</button>
      <div id="quizScoreBox" style="margin-top:14px;"></div>
    </div>

    <div id="stTabTicket" class="card hidden">
      <h3>إرسال تذكرة دعم</h3>
      <label>عنوان المشكلة</label>
      <input id="tTitle" placeholder="مثال: مشكلة في كود أو سؤال" />
      <label>رابط الصورة (ImgBB / Cloudinary / رابط مباشر)</label>
      <input id="tImg" placeholder="https://..." />
      <label>شرح التفاصيل</label>
      <textarea id="tBody" rows="4" placeholder="اكتب تفاصيل مشكلتك بوضوح..."></textarea>
      <button onclick="createTicket()">إرسال التذكرة</button>
    </div>
  </section>

  <!-- واجهة الأدمن -->
  <section id="adminView" class="hidden">
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card">
        <h3>توليد كود لمرة واحدة</h3>
        <label>نوع الكود</label>
        <select id="codeType">
          <option value="center">كود تسجيل حساب طالب جديد</option>
          <option value="branch">كود تفعيل فرع لطالب حالي</option>
        </select>
        <label>الفرع (في حالة كود الفرع)</label>
        <select id="codeBranch"></select>
        <button onclick="genCode()">توليد كود الآن</button>
        <div id="codeOut" style="margin-top:12px;"></div>
      </div>

      <div class="card">
        <h3>إضافة محاضرة (iNK Player)</h3>
        <label>الفرع</label>
        <select id="lecBranch"></select>
        <label>عنوان المحاضرة</label>
        <input id="lecTitle" placeholder="مثال: مراجعة كان وأخواتها" />
        <label>رابط الفيديو من iNK Player</label>
        <input id="lecUrl" placeholder="https://..." />
        <button onclick="addLecture()">نشر المحاضرة</button>
      </div>

      <div class="card">
        <h3>إضافة سؤال اختبار</h3>
        <label>نص السؤال</label>
        <input id="qText" placeholder="اكتب نص السؤال..." />
        <label>الاختيارات</label>
        <input id="qO0" placeholder="الاختيار الأول" style="margin-bottom:6px;" />
        <input id="qO1" placeholder="الاختيار الثاني" style="margin-bottom:6px;" />
        <input id="qO2" placeholder="الاختيار الثالث" />
        <label>الإجابة الصحيحة</label>
        <select id="qAns">
          <option value="0">الاختيار الأول</option>
          <option value="1">الاختيار الثاني</option>
          <option value="2">الاختيار الثالث</option>
        </select>
        <button onclick="addQuestion()">إضافة السؤال</button>
      </div>
    </div>

    <div class="card">
      <h3>متابعة الطلاب والتذاكر</h3>
      <div id="adminData"></div>
    </div>
  </section>
</main>

<script>
const BRANCHES = ["النحو","الصرف","البلاغة","الأدب","النصوص","القراءة","التعبير"];
let token = localStorage.getItem("jakh_token") || "";
let role = localStorage.getItem("jakh_role") || "";
let studentProfile = null;
let quizItems = [];

function fillBranches() {
  for (const b of BRANCHES) {
    for (const id of ["branchFilter", "codeBranch", "lecBranch"]) {
      const el = document.getElementById(id);
      if (el) {
        const opt = document.createElement("option");
        opt.value = b; opt.textContent = b;
        el.appendChild(opt);
      }
    }
  }
}
fillBranches();

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey && ["u","s","c","x"].includes(e.key.toLowerCase())) || e.key === "F12") {
    e.preventDefault();
  }
});

function notify(msg, isErr = false) {
  const box = document.getElementById("alertBox");
  box.textContent = msg;
  box.className = "alert " + (isErr ? "err" : "ok");
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4500);
}

async function api(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch("/api" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

async function loginUser() {
  const res = await api("/login", "POST", {
    identifier: loginId.value.trim(),
    password: loginPass.value
  });
  if (res.error) return notify(res.error, true);
  token = res.token; role = res.role;
  localStorage.setItem("jakh_token", token);
  localStorage.setItem("jakh_role", role);
  notify("تم تسجيل الدخول بنجاح");
  render();
}

async function registerStudent() {
  const res = await api("/register", "POST", {
    name: regName.value.trim(),
    phone: regPhone.value.trim(),
    parentPhone: regParent.value.trim(),
    password: regPass.value,
    code: regCode.value.trim()
  });
  if (res.error) return notify(res.error, true);
  token = res.token; role = "student";
  localStorage.setItem("jakh_token", token);
  localStorage.setItem("jakh_role", role);
  notify("تم إنشاء حسابك بنجاح");
  render();
}

function logout() {
  token = ""; role = ""; studentProfile = null;
  localStorage.removeItem("jakh_token");
  localStorage.removeItem("jakh_role");
  render();
}

function switchStTab(tab) {
  for (const [k, btnId, secId] of [
    ["lec", "tabLec", "stTabLec"],
    ["quiz", "tabQuiz", "stTabQuiz"],
    ["ticket", "tabTicket", "stTabTicket"]
  ]) {
    document.getElementById(secId).classList.toggle("hidden", k !== tab);
    document.getElementById(btnId).className = "tab-btn " + (k === tab ? "active" : "ghost");
  }
}

async function redeemBranch() {
  const res = await api("/redeem-branch", "POST", { code: branchCodeInp.value.trim() });
  if (res.error) return notify(res.error, true);
  branchCodeInp.value = "";
  notify("تم تفعيل فرع: " + res.branch);
  await initStudent();
}

async function initStudent() {
  const me = await api("/me");
  if (me.error) return logout();
  studentProfile = me;
  stGreeting.textContent = "أهلاً يا بطل: " + me.name;
  stParent.textContent = "رقم الطالب: " + me.phone + " | هاتف ولي الأمر: " + (me.parentPhone || "غير مسجل");
  const unlocked = me.branches || [];
  stBranches.innerHTML = unlocked.length
    ? unlocked.map(b => \`<span class="pill">\${b}</span>\`).join("")
    : \`<span class="pill">لا توجد فروع مفعلة بعد</span>\`;
  await loadLectures();
  await loadQuiz();
}

async function loadLectures() {
  const br = encodeURIComponent(branchFilter.value);
  const data = await api("/lectures?branch=" + br);
  const unlocked = new Set(studentProfile?.branches || []);
  const list = data.lectures || [];
  lecturesContainer.innerHTML = list.length ? list.map(l => {
    const canWatch = unlocked.has(l.branch);
    return \`
      <div class="lec-card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <strong>\${l.title}</strong>
          <span class="pill">\${l.branch}</span>
        </div>
        <div class="watermark">علامة مائية خاصة بالطالب: \${l.watermark}</div>
        \${canWatch ? \`
          <iframe src="\${l.videoUrl}" height="340" allow="autoplay; fullscreen" allowfullscreen></iframe>
          <div style="margin-top:8px;"><a href="\${l.videoUrl}" target="_blank" rel="noopener" style="color:var(--gold); font-size:13px;">فتح المشغل في نافذة جديدة</a></div>
        \` : \`
          <div class="locked">هذا الفرع غير مفعل على حسابك. فعّل كود فرع (\${l.branch}) لمشاهدة المحاضرة.</div>
        \`}
      </div>
    \`;
  }).join("") : "<p style='color:var(--muted)'>لا توجد محاضرات متاحة حالياً.</p>";
}

async function loadQuiz() {
  const data = await api("/quiz");
  quizItems = data.questions || [];
  quizContainer.innerHTML = quizItems.length ? quizItems.map((q, idx) => \`
    <div class="lec-card">
      <div style="font-weight:700; margin-bottom:8px;">\${idx + 1}. \${q.text}</div>
      \${(q.options || []).map((opt, oi) => \`
        <label style="display:flex; align-items:center; gap:8px; color:var(--text); cursor:pointer; margin:6px 0;">
          <input type="radio" name="ans_\${idx}" value="\${oi}" style="width:auto; margin:0;" />
          <span>\${opt}</span>
        </label>
      \`).join("")}
    </div>
  \`).join("") : "<p style='color:var(--muted)'>لا توجد أسئلة متاحة حالياً.</p>";
}

async function submitQuiz() {
  const answers = quizItems.map((_, idx) => {
    const el = document.querySelector(\`input[name="ans_\${idx}"]:checked\`);
    return el ? Number(el.value) : -1;
  });
  const res = await api("/quiz/submit", "POST", { answers });
  if (res.error) return notify(res.error, true);
  quizScoreBox.innerHTML = \`<div class="alert ok">درجتك في الاختبار: \${res.score} من \${res.total}</div>\`;
}

async function createTicket() {
  const res = await api("/tickets", "POST", {
    title: tTitle.value.trim(),
    imageUrl: tImg.value.trim(),
    body: tBody.value.trim()
  });
  if (res.error) return notify(res.error, true);
  tTitle.value = ""; tImg.value = ""; tBody.value = "";
  notify("تم إرسال تذكرة الدعم بنجاح");
}

async function genCode() {
  const res = await api("/admin/codes", "POST", {
    type: codeType.value,
    branch: codeBranch.value
  });
  if (res.error) return notify(res.error, true);
  codeOut.innerHTML = \`<div class="pill" style="font-size:15px; padding:8px 14px;">الكود: \${res.code}</div>\`;
}

async function addLecture() {
  const res = await api("/admin/lectures", "POST", {
    branch: lecBranch.value,
    title: lecTitle.value.trim(),
    videoUrl: lecUrl.value.trim()
  });
  if (res.error) return notify(res.error, true);
  lecTitle.value = ""; lecUrl.value = "";
  notify("تمت إضافة المحاضرة");
  await initAdmin();
}

async function addQuestion() {
  const res = await api("/admin/questions", "POST", {
    text: qText.value.trim(),
    options: [qO0.value.trim(), qO1.value.trim(), qO2.value.trim()],
    correctIndex: Number(qAns.value)
  });
  if (res.error) return notify(res.error, true);
  qText.value = ""; qO0.value = ""; qO1.value = ""; qO2.value = "";
  notify("تمت إضافة السؤال");
}

async function initAdmin() {
  const data = await api("/admin/overview");
  if (data.error) return logout();
  const studentsHtml = (data.students || []).map(s => \`
    <div class="lec-card">
      <strong>\${s.name}</strong> — <span style="color:var(--muted)">\${s.phone}</span> — ولي الأمر: \${s.parentPhone || "-"}<br/>
      <div style="margin-top:6px;">\${(s.branches || []).map(b => \`<span class="pill">\${b}</span>\`).join("") || "لا توجد فروع"}</div>
    </div>
  \`).join("") || "<p style='color:var(--muted)'>لا يوجد طلاب مسجلون بعد.</p>";

  const ticketsHtml = (data.tickets || []).map(t => \`
    <div class="lec-card">
      <strong>\${t.title}</strong> — <span style="color:var(--muted)">\${t.by}</span>
      <p style="margin:6px 0;">\${t.body}</p>
      \${t.imageUrl ? \`<img src="\${t.imageUrl}" alt="صورة التذكرة" style="max-width:340px;" />\` : ""}
    </div>
  \`).join("") || "<p style='color:var(--muted)'>لا توجد تذاكر دعم حالياً.</p>";

  adminData.innerHTML = \`<div class="grid-2"><div><h4>الطلاب (\${(data.students||[]).length})</h4>\${studentsHtml}</div><div><h4>التذاكر (\${(data.tickets||[]).length})</h4>\${ticketsHtml}</div></div>\`;
}

function render() {
  logoutBtn.classList.toggle("hidden", !token);
  authView.classList.toggle("hidden", Boolean(token));
  studentView.classList.toggle("hidden", !(token && role === "student"));
  adminView.classList.toggle("hidden", !(token && role === "admin"));
  if (token && role === "student") initStudent();
  if (token && role === "admin") initAdmin();
}
render();
</script>
</body>
</html>`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" && req.method === "GET") {
      return htmlRes(APP_HTML);
    }

    const auth = getAuth(req, env);

    if (url.pathname === "/api/register" && req.method === "POST") {
      const { name, phone, parentPhone, password, code } = await req.json();
      if (!name || !phone || !password || !code) {
        return jsonRes({ error: "يرجى استكمال جميع البيانات وكود التفعيل" }, 400);
      }
      const existing = await fsGet(env, "students", phone);
      if (existing) return jsonRes({ error: "رقم الهاتف مسجل من قبل" }, 400);

      const codeDoc = await fsGet(env, "codes", code);
      if (!codeDoc || codeDoc.used || codeDoc.type !== "center") {
        return jsonRes({ error: "كود التسجيل غير صحيح أو مستخدم من قبل" }, 400);
      }

      await fsSet(env, "codes", code, { ...codeDoc, used: true, usedBy: phone });
      const passHash = await sha256(password);
      await fsSet(env, "students", phone, {
        name,
        phone,
        parentPhone: parentPhone || "",
        passHash,
        branches: []
      });

      const token = makeToken({ role: "student", phone, name }, env.FIREBASE_API_KEY || "secret");
      return jsonRes({ token, role: "student" });
    }

    if (url.pathname === "/api/login" && req.method === "POST") {
      const { identifier, password } = await req.json();
      if (identifier === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
        const token = makeToken({ role: "admin", email: identifier }, env.FIREBASE_API_KEY || "secret");
        return jsonRes({ token, role: "admin" });
      }
      const st = await fsGet(env, "students", identifier);
      if (!st) return jsonRes({ error: "بيانات الدخول غير صحيحة" }, 401);
      const passHash = await sha256(password);
      if (st.passHash !== passHash) return jsonRes({ error: "كلمة المرور غير صحيحة" }, 401);

      const token = makeToken({ role: "student", phone: st.phone, name: st.name }, env.FIREBASE_API_KEY || "secret");
      return jsonRes({ token, role: "student" });
    }

    if (!auth) return jsonRes({ error: "غير مصرح" }, 401);

    if (url.pathname === "/api/me" && req.method === "GET") {
      if (auth.role === "admin") return jsonRes({ role: "admin", name: "الأدمن" });
      const st = await fsGet(env, "students", auth.phone);
      if (!st) return jsonRes({ error: "الحساب غير موجود" }, 404);
      return jsonRes({
        name: st.name,
        phone: st.phone,
        parentPhone: st.parentPhone,
        branches: st.branches || []
      });
    }

    if (url.pathname === "/api/redeem-branch" && req.method === "POST" && auth.role === "student") {
      const { code } = await req.json();
      const codeDoc = await fsGet(env, "codes", code);
      if (!codeDoc || codeDoc.used || codeDoc.type !== "branch") {
        return jsonRes({ error: "كود الفرع غير صالح أو تم استخدامه مسبقاً" }, 400);
      }
      const st = await fsGet(env, "students", auth.phone);
      const branches = Array.from(new Set([...(st.branches || []), codeDoc.branch]));
      await fsSet(env, "students", auth.phone, { ...st, branches });
      await fsSet(env, "codes", code, { ...codeDoc, used: true, usedBy: auth.phone });
      return jsonRes({ branch: codeDoc.branch, branches });
    }

    if (url.pathname === "/api/lectures" && req.method === "GET") {
      const br = url.searchParams.get("branch") || "";
      const all = await fsList(env, "lectures");
      const filtered = br ? all.filter(l => l.branch === br) : all;
      const nowStr = new Date().toLocaleDateString("ar-EG");
      const watermark = auth.role === "student"
        ? `${auth.name} — ${auth.phone} — ${nowStr}`
        : `إدارة المنصة — ${nowStr}`;
      return jsonRes({ lectures: filtered.map(l => ({ ...l, watermark })) });
    }

    if (url.pathname === "/api/quiz" && req.method === "GET") {
      const qs = await fsList(env, "questions");
      return jsonRes({
        questions: qs.map(q => ({ id: q.id, text: q.text, options: q.options || [] }))
      });
    }

    if (url.pathname === "/api/quiz/submit" && req.method === "POST" && auth.role === "student") {
      const { answers } = await req.json();
      const qs = await fsList(env, "questions");
      let score = 0;
      qs.forEach((q, i) => { if (answers[i] === q.correctIndex) score++; });
      await fsSet(env, "results", `${auth.phone}_${Date.now()}`, {
        phone: auth.phone,
        name: auth.name,
        score,
        total: qs.length,
        date: new Date().toISOString()
      });
      return jsonRes({ score, total: qs.length });
    }

    if (url.pathname === "/api/tickets" && req.method === "POST") {
      const { title, imageUrl, body } = await req.json();
      if (!title || !body) return jsonRes({ error: "اكتب عنوان التذكرة وتفاصيلها" }, 400);
      const id = `t_${Date.now()}`;
      await fsSet(env, "tickets", id, {
        title,
        imageUrl: imageUrl || "",
        body,
        by: auth.phone || auth.email || "user",
        date: new Date().toISOString()
      });
      return jsonRes({ ok: true, id });
    }

    if (auth.role !== "admin") return jsonRes({ error: "ممنوع الوصول" }, 403);

    if (url.pathname === "/api/admin/codes" && req.method === "POST") {
      const { type, branch } = await req.json();
      const code = "JAKH-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await fsSet(env, "codes", code, {
        type,
        branch: type === "branch" ? branch : "CENTER",
        used: false
      });
      return jsonRes({ code });
    }

    if (url.pathname === "/api/admin/lectures" && req.method === "POST") {
      const { branch, title, videoUrl } = await req.json();
      if (!branch || !title || !videoUrl) return jsonRes({ error: "أكمل بيانات المحاضرة" }, 400);
      const id = `lec_${Date.now()}`;
      await fsSet(env, "lectures", id, { branch, title, videoUrl });
      return jsonRes({ ok: true, id });
    }

    if (url.pathname === "/api/admin/questions" && req.method === "POST") {
      const { text, options, correctIndex } = await req.json();
      if (!text || !Array.isArray(options) || options.some(o => !o)) {
        return jsonRes({ error: "أكمل السؤال والاختيارات الثلاثة" }, 400);
      }
      const id = `q_${Date.now()}`;
      await fsSet(env, "questions", id, { text, options, correctIndex });
      return jsonRes({ ok: true, id });
    }

    if (url.pathname === "/api/admin/overview" && req.method === "GET") {
      const students = await fsList(env, "students");
      const tickets = await fsList(env, "tickets");
      return jsonRes({ students, tickets });
    }

    return jsonRes({ error: "المسار غير موجود" }, 404);
  }
};