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
  return `${body}.${secret.slice(0, 12)}`;
}

function parseToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (sig !== secret.slice(0, 12)) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(body))));
  } catch {
    return null;
  }
}

// واجهة Firestore REST API المجانية بدون حزم خارجية
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
<title>منصة اللغة العربية — الثانوية والأزهرية</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; background:#0f172a; color:#f8fafc; margin:0; padding:20px; }
  .box { max-width:980px; margin:auto; background:#1e293b; padding:24px; border-radius:14px; }
  h1,h2,h3 { margin-top:0; }
  input, select, textarea, button { padding:10px; margin:6px 0; border-radius:8px; border:1px solid #475569; font-size:14px; }
  input, select, textarea { width:100%; box-sizing:border-box; background:#0f172a; color:#fff; }
  button { background:#2563eb; color:#fff; border:none; cursor:pointer; font-weight:bold; }
  button.sec { background:#334155; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:700px) { .row { grid-template-columns:1fr; } }
  .card { background:#0f172a; padding:14px; border-radius:10px; margin:10px 0; border:1px solid #334155; }
  .hidden { display:none; }
  .msg { padding:10px; border-radius:8px; margin:10px 0; background:#14532d; }
  .err { background:#7f1d1d; }
  iframe, img { max-width:100%; border-radius:10px; }
</style>
</head>
<body oncontextmenu="return false">
<div class="box">
  <h1>منصة الأستاذ محمد يوسف للغة العربية</h1>
  <div id="statusMsg" class="msg hidden"></div>

  <!-- شاشة الدخول وإنشاء الحساب -->
  <div id="authSection">
    <div class="row">
      <div class="card">
        <h3>إنشاء حساب طالب جديد</h3>
        <input id="regName" placeholder="اسم الطالب" />
        <input id="regPhone" placeholder="رقم هاتف الطالب" />
        <input id="regParentPhone" placeholder="رقم هاتف ولي الأمر" />
        <input id="regPassword" type="password" placeholder="كلمة المرور" />
        <input id="regCode" placeholder="كود السنتر (يُستخدم مرة واحدة)" />
        <button onclick="registerStudent()">إنشاء الحساب</button>
      </div>

      <div class="card">
        <h3>تسجيل الدخول (طالب / أدمن)</h3>
        <input id="loginId" placeholder="رقم الهاتف للطالب أو البريد للأدمن" />
        <input id="loginPass" type="password" placeholder="كلمة المرور" />
        <button onclick="loginUser()">دخول</button>
      </div>
    </div>
  </div>

  <!-- لوحة الطالب -->
  <div id="studentSection" class="hidden">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 id="studentWelcome"></h2>
      <button class="sec" onclick="logout()">تسجيل خروج</button>
    </div>

    <div class="card">
      <h3>تفعيل كود فرع (يُستخدم مرة واحدة)</h3>
      <input id="branchCodeInput" placeholder="أدخل كود الفرع" />
      <button onclick="redeemBranchCode()">تفعيل الفرع</button>
      <div id="unlockedBranches"></div>
    </div>

    <div class="card">
      <h3>المحاضرات (فيديوهات iNK Player)</h3>
      <select id="filterBranch" onchange="loadLectures()"><option value="">كل الفروع</option></select>
      <div id="lecturesList"></div>
    </div>

    <div class="card">
      <h3>الامتحان / الكويز</h3>
      <div id="quizBox"></div>
      <button onclick="submitQuiz()">إرسال الإجابات</button>
      <div id="quizResult"></div>
    </div>

    <div class="card">
      <h3>إرسال تذكرة دعم (رابط صورة خارجي)</h3>
      <input id="ticketTitle" placeholder="عنوان المشكلة" />
      <input id="ticketImg" placeholder="رابط الصورة (مثلاً من Cloudinary أو ImgBB)" />
      <textarea id="ticketBody" placeholder="تفاصيل المشكلة"></textarea>
      <button onclick="sendTicket()">إرسال التذكرة</button>
    </div>
  </div>

  <!-- لوحة الأدمن -->
  <div id="adminSection" class="hidden">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2>لوحة تحكم الأدمن</h2>
      <button class="sec" onclick="logout()">تسجيل خروج</button>
    </div>

    <div class="row">
      <div class="card">
        <h3>توليد أكواد (سنتر / فرع)</h3>
        <select id="codeType">
          <option value="center">كود سنتر</option>
          <option value="branch">كود فرع</option>
        </select>
        <select id="codeBranch"></select>
        <button onclick="createCode()">توليد كود</button>
        <div id="generatedCode"></div>
      </div>

      <div class="card">
        <h3>إضافة محاضرة (رابط iNK Player)</h3>
        <select id="lecBranch"></select>
        <input id="lecTitle" placeholder="عنوان المحاضرة" />
        <input id="lecUrl" placeholder="رابط الفيديو من iNK Player" />
        <button onclick="addLecture()">حفظ المحاضرة</button>
      </div>
    </div>

    <div class="card">
      <h3>إضافة سؤال امتحان / كويز</h3>
      <input id="qText" placeholder="نص السؤال" />
      <input id="qOpt0" placeholder="الاختيار 1" />
      <input id="qOpt1" placeholder="الاختيار 2" />
      <input id="qOpt2" placeholder="الاختيار 3" />
      <select id="qCorrect">
        <option value="0">الاختيار 1 هو الصحيح</option>
        <option value="1">الاختيار 2 هو الصحيح</option>
        <option value="2">الاختيار 3 هو الصحيح</option>
      </select>
      <button onclick="addQuestion()">حفظ السؤال</button>
    </div>

    <div class="card">
      <h3>الطلاب والتذاكر</h3>
      <div id="adminOverview"></div>
    </div>
  </div>
</div>

<script>
const BRANCHES = ["النحو","الصرف","البلاغة","الأدب","النصوص","القراءة","التعبير"];
let token = localStorage.getItem("token") || "";
let role = localStorage.getItem("role") || "";

function initSelects() {
  for (const b of BRANCHES) {
    for (const id of ["filterBranch", "codeBranch", "lecBranch"]) {
      const el = document.getElementById(id);
      if (el) {
        const opt = document.createElement("option");
        opt.value = b; opt.textContent = b;
        el.appendChild(opt);
      }
    }
  }
}
initSelects();

function showMsg(text, isErr = false) {
  const el = document.getElementById("statusMsg");
  el.textContent = text;
  el.className = isErr ? "msg err" : "msg";
  el.classList.remove("hidden");
}

async function api(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch("/api" + path, { method, headers, body: body ? JSON.stringify(body) : null });
  return res.json();
}

async function registerStudent() {
  const data = await api("/register", "POST", {
    name: regName.value.trim(),
    phone: regPhone.value.trim(),
    parentPhone: regParentPhone.value.trim(),
    password: regPassword.value,
    centerCode: regCode.value.trim()
  });
  if (data.error) return showMsg(data.error, true);
  token = data.token; role = "student";
  localStorage.setItem("token", token); localStorage.setItem("role", role);
  showMsg("تم إنشاء الحساب بنجاح");
  renderApp();
}

async function loginUser() {
  const data = await api("/login", "POST", {
    identifier: loginId.value.trim(),
    password: loginPass.value
  });
  if (data.error) return showMsg(data.error, true);
  token = data.token; role = data.role;
  localStorage.setItem("token", token); localStorage.setItem("role", role);
  showMsg("تم تسجيل الدخول");
  renderApp();
}

function logout() {
  token = ""; role = "";
  localStorage.removeItem("token"); localStorage.removeItem("role");
  renderApp();
}

async function redeemBranchCode() {
  const data = await api("/redeem-branch", "POST", { code: branchCodeInput.value.trim() });
  if (data.error) return showMsg(data.error, true);
  showMsg("تم تفعيل الفرع: " + data.branch);
  loadStudentData();
}

async function loadLectures() {
  const br = encodeURIComponent(filterBranch.value);
  const items = await api("/lectures?branch=" + br);
  lecturesList.innerHTML = (items.lectures || []).map(l => \`
    <div class="card">
      <strong>\${l.title}</strong> — <span>\${l.branch}</span><br/>
      <p>العلامة المائية للطالب: \${l.watermark}</p>
      <a href="\${l.videoUrl}" target="_blank" rel="noopener">فتح الفيديو على iNK Player</a>
      <div style="margin-top:8px"><iframe src="\${l.videoUrl}" width="100%" height="320" frameborder="0" allowfullscreen></iframe></div>
    </div>
  \`).join("") || "<p>لا توجد محاضرات متاحة حالياً.</p>";
}

let currentQuestions = [];
async function loadQuiz() {
  const data = await api("/quiz");
  currentQuestions = data.questions || [];
  quizBox.innerHTML = currentQuestions.map((q, idx) => \`
    <div class="card">
      <div><strong>\${idx + 1}. \${q.text}</strong></div>
      \${q.options.map((o, oi) => \`<label><input type="radio" name="q\${idx}" value="\${oi}"/> \${o}</label><br/>\`).join("")}
    </div>
  \`).join("") || "<p>لا توجد أسئلة حالياً.</p>";
}

async function submitQuiz() {
  const answers = currentQuestions.map((_, idx) => {
    const checked = document.querySelector(\`input[name="q\${idx}"]:checked\`);
    return checked ? Number(checked.value) : -1;
  });
  const res = await api("/quiz/submit", "POST", { answers });
  if (res.error) return showMsg(res.error, true);
  quizResult.innerHTML = \`<strong>نتيجتك: \${res.score} من \${res.total}</strong>\`;
}

async function sendTicket() {
  const res = await api("/tickets", "POST", {
    title: ticketTitle.value.trim(),
    imageUrl: ticketImg.value.trim(),
    body: ticketBody.value.trim()
  });
  if (res.error) return showMsg(res.error, true);
  showMsg("تم إرسال التذكرة بنجاح");
}

async function createCode() {
  const res = await api("/admin/codes", "POST", {
    type: codeType.value,
    branch: codeBranch.value
  });
  if (res.error) return showMsg(res.error, true);
  generatedCode.innerHTML = \`<p>الكود الجديد (مرة واحدة): <strong>\${res.code}</strong></p>\`;
}

async function addLecture() {
  const res = await api("/admin/lectures", "POST", {
    branch: lecBranch.value,
    title: lecTitle.value.trim(),
    videoUrl: lecUrl.value.trim()
  });
  if (res.error) return showMsg(res.error, true);
  showMsg("تمت إضافة المحاضرة");
}

async function addQuestion() {
  const res = await api("/admin/questions", "POST", {
    text: qText.value.trim(),
    options: [qOpt0.value.trim(), qOpt1.value.trim(), qOpt2.value.trim()],
    correctIndex: Number(qCorrect.value)
  });
  if (res.error) return showMsg(res.error, true);
  showMsg("تمت إضافة السؤال");
}

async function loadStudentData() {
  const me = await api("/me");
  if (me.error) return logout();
  studentWelcome.textContent = \`مرحباً \${me.name} (هاتف ولي الأمر: \${me.parentPhone})\`;
  unlockedBranches.innerHTML = "الفروع المفعلة: " + ((me.branches || []).join("، ") || "لا يوجد");
  loadLectures();
  loadQuiz();
}

async function loadAdminData() {
  const data = await api("/admin/overview");
  if (data.error) return logout();
  adminOverview.innerHTML = \`
    <h4>الطلاب (\${data.students.length})</h4>
    \${data.students.map(s => \`<div>• \${s.name} — \${s.phone} — الفروع: \${(s.branches||[]).join(", ")}</div>\`).join("")}
    <h4>التذاكر (\${data.tickets.length})</h4>
    \${data.tickets.map(t => \`
      <div class="card">
        <strong>\${t.title}</strong> — \${t.body}
        \${t.imageUrl ? \`<div><img src="\${t.imageUrl}" alt="صورة التذكرة"/></div>\` : ""}
      </div>
    \`).join("")}
  \`;
}

function renderApp() {
  authSection.classList.add("hidden");
  studentSection.classList.add("hidden");
  adminSection.classList.add("hidden");
  if (!token) {
    authSection.classList.remove("hidden");
  } else if (role === "admin") {
    adminSection.classList.remove("hidden");
    loadAdminData();
  } else {
    studentSection.classList.remove("hidden");
    loadStudentData();
  }
}
renderApp();
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
      const { name, phone, parentPhone, password, centerCode } = await req.json();
      if (!name || !phone || !password || !centerCode) return jsonRes({ error: "أكمل جميع البيانات" }, 400);
      const existing = await fsGet(env, "students", phone);
      if (existing) return jsonRes({ error: "رقم الهاتف مسجل بالفعل" }, 400);
      const codeDoc = await fsGet(env, "codes", centerCode);
      if (!codeDoc || codeDoc.used || codeDoc.type !== "center") {
        return jsonRes({ error: "كود السنتر غير صحيح أو مستخدم من قبل" }, 400);
      }
      await fsSet(env, "codes", centerCode, { ...codeDoc, used: true, usedBy: phone });
      const passHash = await sha256(password);
      await fsSet(env, "students", phone, {
        name, phone, parentPhone: parentPhone || "", passHash, branches: []
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
      return jsonRes({ name: st.name, phone: st.phone, parentPhone: st.parentPhone, branches: st.branches || [] });
    }

    if (url.pathname === "/api/redeem-branch" && req.method === "POST" && auth.role === "student") {
      const { code } = await req.json();
      const codeDoc = await fsGet(env, "codes", code);
      if (!codeDoc || codeDoc.used || codeDoc.type !== "branch") {
        return jsonRes({ error: "كود الفرع غير صالح أو مستخدم من قبل" }, 400);
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
      const watermark = auth.role === "student" ? `${auth.name} (${auth.phone})` : "مشاهدة إدارية";
      return jsonRes({ lectures: filtered.map(l => ({ ...l, watermark })) });
    }

    if (url.pathname === "/api/quiz" && req.method === "GET") {
      const qs = await fsList(env, "questions");
      return jsonRes({ questions: qs.map(q => ({ id: q.id, text: q.text, options: q.options || [] })) });
    }

    if (url.pathname === "/api/quiz/submit" && req.method === "POST" && auth.role === "student") {
      const { answers } = await req.json();
      const qs = await fsList(env, "questions");
      let score = 0;
      qs.forEach((q, i) => { if (answers[i] === q.correctIndex) score++; });
      await fsSet(env, "results", `${auth.phone}_${Date.now()}`, {
        phone: auth.phone, name: auth.name, score, total: qs.length, date: new Date().toISOString()
      });
      return jsonRes({ score, total: qs.length });
    }

    if (url.pathname === "/api/tickets" && req.method === "POST") {
      const { title, imageUrl, body } = await req.json();
      const id = `t_${Date.now()}`;
      await fsSet(env, "tickets", id, {
        title, imageUrl: imageUrl || "", body, by: auth.phone || auth.email || "user", date: new Date().toISOString()
      });
      return jsonRes({ ok: true, id });
    }

    if (auth.role !== "admin") return jsonRes({ error: "ممنوع الوصول للأدمن" }, 403);

    if (url.pathname === "/api/admin/codes" && req.method === "POST") {
      const { type, branch } = await req.json();
      const code = "CODE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      await fsSet(env, "codes", code, { type, branch: type === "branch" ? branch : "CENTER", used: false });
      return jsonRes({ code });
    }

    if (url.pathname === "/api/admin/lectures" && req.method === "POST") {
      const { branch, title, videoUrl } = await req.json();
      const id = `lec_${Date.now()}`;
      await fsSet(env, "lectures", id, { branch, title, videoUrl });
      return jsonRes({ ok: true, id });
    }

    if (url.pathname === "/api/admin/questions" && req.method === "POST") {
      const { text, options, correctIndex } = await req.json();
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