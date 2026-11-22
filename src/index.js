export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const projectId = env.FIREBASE_PROJECT_ID;
    const apiKey = env.FIREBASE_API_KEY;

    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...corsHeaders
        }
      });

    function toFirestoreFields(obj) {
      const fields = {};
      for (const [key, val] of Object.entries(obj)) {
        if (val === null || val === undefined) {
          fields[key] = { nullValue: null };
        } else if (typeof val === "boolean") {
          fields[key] = { booleanValue: val };
        } else if (typeof val === "number") {
          fields[key] = Number.isInteger(val)
            ? { integerValue: String(val) }
            : { doubleValue: val };
        } else if (Array.isArray(val)) {
          fields[key] = {
            arrayValue: {
              values: val.map((v) => ({ stringValue: String(v) }))
            }
          };
        } else if (typeof val === "object") {
          fields[key] = { stringValue: JSON.stringify(val) };
        } else {
          fields[key] = { stringValue: String(val) };
        }
      }
      return fields;
    }

    function fromFirestoreDoc(doc) {
      const out = { id: doc.name ? doc.name.split("/").pop() : undefined };
      const fields = doc.fields || {};
      for (const [key, valObj] of Object.entries(fields)) {
        if ("stringValue" in valObj) out[key] = valObj.stringValue;
        else if ("integerValue" in valObj) out[key] = Number(valObj.integerValue);
        else if ("doubleValue" in valObj) out[key] = Number(valObj.doubleValue);
        else if ("booleanValue" in valObj) out[key] = valObj.booleanValue;
        else if ("nullValue" in valObj) out[key] = null;
        else if ("arrayValue" in valObj) {
          out[key] = (valObj.arrayValue.values || []).map((v) => v.stringValue ?? null);
        }
      }
      return out;
    }

    function firestoreCollectionUrl(collection) {
      if (!projectId) return null;
      const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}`;
      return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
    }

    function firestoreDocUrl(collection, docId) {
      if (!projectId) return null;
      const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
      return apiKey ? `${base}?key=${encodeURIComponent(apiKey)}` : base;
    }

    async function firestoreCreateDoc(collection, data) {
      const endpoint = firestoreCollectionUrl(collection);
      if (!endpoint) {
        throw new Error("FIREBASE_PROJECT_ID غير مضبوط في wrangler.jsonc");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: toFirestoreFields(data) })
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `Firestore POST error (${res.status})`);
      }
      return fromFirestoreDoc(body);
    }

    async function firestoreListDocs(collection) {
      const endpoint = firestoreCollectionUrl(collection);
      if (!endpoint) {
        throw new Error("FIREBASE_PROJECT_ID غير مضبوط في wrangler.jsonc");
      }

      const res = await fetch(endpoint, { method: "GET" });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || `Firestore GET error (${res.status})`);
      }
      return (body.documents || []).map(fromFirestoreDoc);
    }

    async function firestoreDeleteDoc(collection, docId) {
      const endpoint = firestoreDocUrl(collection, docId);
      if (!endpoint) {
        throw new Error("FIREBASE_PROJECT_ID غير مضبوط في wrangler.jsonc");
      }

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Firestore DELETE error (${res.status})`);
      }
      return true;
    }

    // Health & config status check
    if (path === "/api/health" && method === "GET") {
      return jsonResponse({
        ok: true,
        hasProjectId: Boolean(projectId),
        projectId: projectId || null,
        hasApiKey: Boolean(apiKey)
      });
    }

    // Register student in Firestore ("users")
    if (path === "/api/register" && method === "POST") {
      try {
        const { name, phone, email, password, grade } = await req.json();
        if (!name || !email || !password) {
          return jsonResponse(
            { ok: false, error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" },
            400
          );
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPhone = String(phone || "").trim();
        const existingUsers = await firestoreListDocs("users");

        const duplicateEmail = existingUsers.some(
          (u) => String(u.email || "").trim().toLowerCase() === cleanEmail
        );
        if (duplicateEmail) {
          return jsonResponse(
            { ok: false, error: "هذا البريد الإلكتروني مسجل بالفعل" },
            409
          );
        }

        const created = await firestoreCreateDoc("users", {
          name: String(name).trim(),
          phone: cleanPhone,
          email: cleanEmail,
          password: String(password),
          grade: String(grade || "الثانوية").trim(),
          role: "student",
          createdAt: new Date().toISOString()
        });

        return jsonResponse({
          ok: true,
          message: "تم إنشاء الحساب وحفظه في قاعدة البيانات بنجاح",
          user: {
            id: created.id,
            name: created.name,
            phone: created.phone,
            email: created.email,
            grade: created.grade,
            role: created.role
          }
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "فشل إنشاء الحساب" }, 500);
      }
    }

    // Login (Admin via env or Student via Firestore "users")
    if (path === "/api/login" && method === "POST") {
      try {
        const { identifier, email, password } = await req.json();
        const loginInput = String(identifier || email || "").trim().toLowerCase();
        const passInput = String(password || "");

        if (!loginInput || !passInput) {
          return jsonResponse(
            { ok: false, error: "يرجى إدخال البريد/رقم الهاتف وكلمة المرور" },
            400
          );
        }

        if (
          env.ADMIN_EMAIL &&
          env.ADMIN_PASSWORD &&
          loginInput === String(env.ADMIN_EMAIL).trim().toLowerCase() &&
          passInput === String(env.ADMIN_PASSWORD)
        ) {
          return jsonResponse({
            ok: true,
            user: {
              name: "أ. محمد يوسف (أدمن)",
              email: env.ADMIN_EMAIL,
              role: "admin"
            }
          });
        }

        const users = await firestoreListDocs("users");
        const found = users.find((u) => {
          const uEmail = String(u.email || "").trim().toLowerCase();
          const uPhone = String(u.phone || "").trim().toLowerCase();
          return (uEmail === loginInput || (uPhone && uPhone === loginInput)) && String(u.password) === passInput;
        });

        if (!found) {
          return jsonResponse({ ok: false, error: "بيانات الدخول غير صحيحة" }, 401);
        }

        return jsonResponse({
          ok: true,
          user: {
            id: found.id,
            name: found.name,
            email: found.email,
            phone: found.phone || "",
            role: found.role || "student"
          }
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "فشل تسجيل الدخول" }, 500);
      }
    }

    // Generic collection endpoints: /api/data/:collection
    const colMatch = path.match(/^\/api\/data\/([a-zA-Z0-9_-]+)$/);
    if (colMatch) {
      const collection = colMatch[1];

      if (method === "GET") {
        try {
          const items = await firestoreListDocs(collection);
          return jsonResponse({ ok: true, items });
        } catch (err) {
          return jsonResponse({ ok: false, error: err.message || "تعذر قراءة البيانات" }, 500);
        }
      }

      if (method === "POST") {
        try {
          const payload = await req.json();
          const created = await firestoreCreateDoc(collection, {
            ...payload,
            createdAt: new Date().toISOString()
          });
          return jsonResponse({ ok: true, item: created });
        } catch (err) {
          return jsonResponse({ ok: false, error: err.message || "تعذر حفظ البيانات" }, 500);
        }
      }
    }

    // Delete document endpoint: /api/data/:collection/:id
    const docMatch = path.match(/^\/api\/data\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/);
    if (docMatch && method === "DELETE") {
      try {
        await firestoreDeleteDoc(docMatch[1], docMatch[2]);
        return jsonResponse({ ok: true, deletedId: docMatch[2] });
      } catch (err) {
        return jsonResponse({ ok: false, error: err.message || "تعذر الحذف" }, 500);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>نور البيان — أ. محمد يوسف</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #0b1120;
      color: #f8fafc;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }

    /* حروف عربية متحركة بسرعة متوسطة متوازنة */
    .bg-letters {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .bg-letter {
      position: absolute;
      font-size: 64px;
      font-weight: 800;
      color: rgba(148, 163, 184, 0.08);
      user-select: none;
      animation: driftMedium 12s ease-in-out infinite;
    }
    .bg-letter:nth-child(1) { top: 7%; right: 5%; animation-delay: 0s; }
    .bg-letter:nth-child(2) { top: 20%; right: 32%; animation-delay: -2s; font-size: 54px; }
    .bg-letter:nth-child(3) { top: 12%; left: 16%; animation-delay: -4s; font-size: 72px; }
    .bg-letter:nth-child(4) { top: 48%; right: 10%; animation-delay: -6s; font-size: 60px; }
    .bg-letter:nth-child(5) { top: 62%; left: 24%; animation-delay: -8s; font-size: 68px; }
    .bg-letter:nth-child(6) { top: 80%; right: 38%; animation-delay: -10s; font-size: 58px; }

    @keyframes driftMedium {
      0% { transform: translate(0px, 0px) rotate(0deg); }
      33% { transform: translate(-14px, -20px) rotate(4deg); }
      66% { transform: translate(12px, -10px) rotate(-4deg); }
      100% { transform: translate(0px, 0px) rotate(0deg); }
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 1020px;
      margin: 0 auto;
    }

    /* زر الأدمن الصغير في أقصى اليمين بعيداً عن لوحة الطالب */
    .admin-corner-bar {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      margin-bottom: 14px;
    }
    .admin-mini-btn {
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid #475569;
      background: rgba(30, 41, 59, 0.9);
      color: #cbd5e1;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .admin-mini-btn:hover {
      background: #334155;
      color: #ffffff;
    }

    .header-banner {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand-title { margin: 0; font-size: 22px; color: #f8fafc; }
    .brand-sub { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }

    .layout-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 820px) {
      .layout-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: rgba(30, 41, 59, 0.94);
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
    }

    /* صورة المستر كاملة الظهور (الوجه والجسم بوضوح بدون قص) */
    .teacher-box {
      text-align: center;
    }
    .teacher-frame {
      width: 100%;
      max-width: 275px;
      aspect-ratio: 3 / 4.2;
      margin: 0 auto 12px;
      border-radius: 12px;
      overflow: hidden;
      background: #0f172a;
      border: 1px solid #475569;
    }
    .teacher-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .teacher-name { margin: 0; font-size: 18px; font-weight: 700; }
    .teacher-role { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }

    h2, h3 { margin-top: 0; }
    label { display: block; margin-top: 8px; font-size: 13px; color: #e2e8f0; }
    input, textarea, select {
      width: 100%;
      padding: 10px 12px;
      margin: 6px 0 12px;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #0f172a;
      color: #ffffff;
      font-family: inherit;
      font-size: 14px;
    }
    textarea { min-height: 85px; resize: vertical; }

    .btn-primary {
      width: 100%;
      padding: 11px 14px;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    .btn-primary:hover { background: #1d4ed8; }

    .btn-secondary {
      padding: 8px 12px;
      border: 1px solid #475569;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #1e293b; }

    .btn-danger {
      padding: 6px 10px;
      border: 0;
      border-radius: 6px;
      background: #dc2626;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }

    .img-preview {
      display: none;
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      margin-top: 8px;
      margin-bottom: 10px;
      border: 1px solid #475569;
    }

    .status-box {
      display: none;
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      white-space: pre-wrap;
    }
    .status-ok { display: block; background: #14532d; color: #dcfce7; }
    .status-err { display: block; background: #7f1d1d; color: #fecaca; }

    .admin-section {
      display: none;
      margin-top: 22px;
    }
    .item-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 12px;
      margin-top: 10px;
    }
    .item-card img {
      max-width: 240px;
      border-radius: 8px;
      margin-top: 8px;
      display: block;
    }
    .item-meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="bg-letters" aria-hidden="true">
    <span class="bg-letter">ض</span>
    <span class="bg-letter">ع</span>
    <span class="bg-letter">ن</span>
    <span class="bg-letter">ب</span>
    <span class="bg-letter">ي</span>
    <span class="bg-letter">ل</span>
  </div>

  <div class="container">
    <div class="admin-corner-bar">
      <button type="button" class="admin-mini-btn" id="adminCornerBtn">أدمن</button>
    </div>

    <div class="header-banner">
      <div>
        <h1 class="brand-title">منصة نور البيان التعليمية</h1>
        <p class="brand-sub">اللغة العربية — أ. محمد يوسف</p>
      </div>
      <div id="dbBadge" style="font-size:12px;color:#94a3b8;">جاري التحقق من الاتصال...</div>
    </div>

    <div class="layout-grid">
      <div>
        <div class="card teacher-box">
          <div class="teacher-frame">
            <img
              id="teacherPhoto"
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=85"
              alt="أ. محمد يوسف"
            />
          </div>
          <p class="teacher-name">أ. محمد يوسف</p>
          <p class="teacher-role">مدرس أول اللغة العربية</p>
        </div>

        <div class="card">
          <h3>تسجيل دخول</h3>
          <form id="loginForm" autocomplete="off">
            <label>البريد الإلكتروني أو رقم الهاتف</label>
            <input type="text" id="loginIdentifier" required placeholder="student@example.com" autocomplete="off" />
            <label>كلمة المرور</label>
            <input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="new-password" />
            <button type="submit" class="btn-primary">دخول</button>
          </form>
          <div id="loginStatus" class="status-box"></div>
        </div>
      </div>

      <div>
        <div class="card">
          <h2>إنشاء حساب طالب جديد</h2>
          <form id="registerForm" autocomplete="off">
            <label>اسم الطالب</label>
            <input type="text" id="regName" required placeholder="اكتب الاسم الثلاثي" autocomplete="off" />
            <label>رقم الهاتف</label>
            <input type="text" id="regPhone" placeholder="01xxxxxxxxx" autocomplete="off" />
            <label>البريد الإلكتروني</label>
            <input type="email" id="regEmail" required placeholder="student@example.com" autocomplete="off" />
            <label>الصف الدراسي</label>
            <select id="regGrade">
              <option value="الأول الثانوي">الأول الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
            </select>
            <label>كلمة المرور</label>
            <input type="password" id="regPassword" required placeholder="••••••••" autocomplete="new-password" />
            <button type="submit" class="btn-primary">تسجيل الحساب</button>
          </form>
          <div id="regStatus" class="status-box"></div>
        </div>

        <div class="card">
          <h2>اسأل سؤالاً (أرفق صورة)</h2>
          <form id="questionForm" autocomplete="off">
            <label>اسم الطالب</label>
            <input type="text" id="qName" required placeholder="اكتب اسمك" autocomplete="off" />
            <label>نص السؤال</label>
            <textarea id="qText" required placeholder="اكتب سؤالك هنا..."></textarea>
            <label>صورة السؤال من جهازك</label>
            <input type="file" id="qFile" accept="image/*" />
            <img id="qPreview" class="img-preview" alt="معاينة الصورة المرفقة" />
            <button type="submit" class="btn-primary">إرسال السؤال</button>
          </form>
          <div id="qStatus" class="status-box"></div>
        </div>
      </div>
    </div>

    <div class="card admin-section" id="adminSection">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h3 style="margin:0;">لوحة الأدمن</h3>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-secondary" id="loadQuestionsBtn">تحديث الأسئلة</button>
          <button type="button" class="btn-secondary" id="loadUsersBtn">عرض الطلاب</button>
        </div>
      </div>
      <div id="adminOutput" style="margin-top:12px;"></div>
    </div>
  </div>

  <script>
    (async function checkHealth() {
      const badge = document.getElementById("dbBadge");
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (data.ok && data.hasProjectId) {
          badge.textContent = "متصل بـ Firestore: " + data.projectId;
          badge.style.color = "#4ade80";
        } else {
          badge.textContent = "تحقق من FIREBASE_PROJECT_ID في wrangler.jsonc";
          badge.style.color = "#f87171";
        }
      } catch {
        badge.textContent = "تعذر فحص حالة الاتصال";
        badge.style.color = "#f87171";
      }
    })();

    const registerForm = document.getElementById("registerForm");
    const regStatus = document.getElementById("regStatus");
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      regStatus.className = "status-box";
      regStatus.style.display = "block";
      regStatus.textContent = "جاري حفظ الحساب في Firestore...";

      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.getElementById("regName").value,
            phone: document.getElementById("regPhone").value,
            email: document.getElementById("regEmail").value,
            grade: document.getElementById("regGrade").value,
            password: document.getElementById("regPassword").value
          })
        });
        const data = await res.json();
        regStatus.className = data.ok ? "status-box status-ok" : "status-box status-err";
        regStatus.textContent = data.ok
          ? data.message + "\\nID: " + data.user.id
          : (data.error || "تعذر التسجيل");
        if (data.ok) registerForm.reset();
      } catch (err) {
        regStatus.className = "status-box status-err";
        regStatus.textContent = "خطأ في الاتصال: " + err.message;
      }
    });

    const loginForm = document.getElementById("loginForm");
    const loginStatus = document.getElementById("loginStatus");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginStatus.className = "status-box";
      loginStatus.style.display = "block";
      loginStatus.textContent = "جاري التحقق...";

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: document.getElementById("loginIdentifier").value,
            password: document.getElementById("loginPassword").value
          })
        });
        const data = await res.json();
        loginStatus.className = data.ok ? "status-box status-ok" : "status-box status-err";
        loginStatus.textContent = data.ok
          ? "مرحباً " + data.user.name + " (" + data.user.role + ")"
          : (data.error || "فشل الدخول");
        if (data.ok && data.user.role === "admin") {
          document.getElementById("adminSection").style.display = "block";
          fetchAdminCollection("questions");
        }
      } catch (err) {
        loginStatus.className = "status-box status-err";
        loginStatus.textContent = "خطأ في الاتصال: " + err.message;
      }
    });

    const qFile = document.getElementById("qFile");
    const qPreview = document.getElementById("qPreview");
    let questionImageBase64 = "";

    qFile.addEventListener("change", () => {
      const file = qFile.files && qFile.files[0];
      if (!file) {
        questionImageBase64 = "";
        qPreview.src = "";
        qPreview.style.display = "none";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        questionImageBase64 = String(reader.result || "");
        qPreview.src = questionImageBase64;
        qPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    const questionForm = document.getElementById("questionForm");
    const qStatus = document.getElementById("qStatus");
    questionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      qStatus.className = "status-box";
      qStatus.style.display = "block";
      qStatus.textContent = "جاري إرسال السؤال وحفظه...";

      try {
        const res = await fetch("/api/data/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: document.getElementById("qName").value,
            question: document.getElementById("qText").value,
            imageData: questionImageBase64
          })
        });
        const data = await res.json();
        qStatus.className = data.ok ? "status-box status-ok" : "status-box status-err";
        qStatus.textContent = data.ok ? "تم إرسال سؤالك بنجاح" : (data.error || "فشل إرسال السؤال");
        if (data.ok) {
          questionForm.reset();
          questionImageBase64 = "";
          qPreview.src = "";
          qPreview.style.display = "none";
        }
      } catch (err) {
        qStatus.className = "status-box status-err";
        qStatus.textContent = "خطأ أثناء الإرسال: " + err.message;
      }
    });

    const adminCornerBtn = document.getElementById("adminCornerBtn");
    const adminSection = document.getElementById("adminSection");
    const adminOutput = document.getElementById("adminOutput");

    function escapeHtml(str) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    async function fetchAdminCollection(col) {
      adminOutput.innerHTML = "جاري التحميل...";
      try {
        const res = await fetch("/api/data/" + col);
        const data = await res.json();
        if (!data.ok) {
          adminOutput.textContent = data.error || "تعذر تحميل البيانات";
          return;
        }
        const items = data.items || [];
        if (!items.length) {
          adminOutput.textContent = "لا توجد عناصر في " + col + " حالياً.";
          return;
        }

        adminOutput.innerHTML = items
          .map((item) => {
            const imgTag = item.imageData
              ? \`<img src="\${escapeHtml(item.imageData)}" alt="صورة مرفقة" />\`
              : "";
            const title = col === "questions"
              ? \`<strong>\${escapeHtml(item.studentName || "طالب")}:</strong> \${escapeHtml(item.question || "")}\`
              : \`<strong>\${escapeHtml(item.name || "مستخدم")}</strong> — \${escapeHtml(item.email || "")} (\${escapeHtml(item.grade || "")})\`;
            return \`
              <div class="item-card">
                <div>\${title}</div>
                \${imgTag}
                <div class="item-meta">ID: \${escapeHtml(item.id || "")}</div>
                <div style="margin-top:8px;">
                  <button type="button" class="btn-danger" onclick="deleteDocItem('\${col}','\${escapeHtml(item.id || "")}')">حذف</button>
                </div>
              </div>
            \`;
          })
          .join("");
      } catch (err) {
        adminOutput.textContent = "خطأ: " + err.message;
      }
    }

    window.deleteDocItem = async function (col, id) {
      if (!id) return;
      try {
        const res = await fetch("/api/data/" + col + "/" + id, { method: "DELETE" });
        const data = await res.json();
        if (data.ok) fetchAdminCollection(col);
      } catch {}
    };

    adminCornerBtn.addEventListener("click", () => {
      const open = adminSection.style.display === "block";
      adminSection.style.display = open ? "none" : "block";
      if (!open) fetchAdminCollection("questions");
      document.getElementById("loginIdentifier").focus();
    });

    document.getElementById("loadQuestionsBtn").addEventListener("click", () => fetchAdminCollection("questions"));
    document.getElementById("loadUsersBtn").addEventListener("click", () => fetchAdminCollection("users"));
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders
      }
    });
  }
};