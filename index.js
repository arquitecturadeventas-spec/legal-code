export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =============================
    // MODO PRUEBA (sin modificar KV)
    // =============================
    const TEST_MODE = true;
    const TEST_CODES = ["CODE001", "CODE002", "CODE003", "CODE004", "CODE005"];

    // =============================
    // 1. CHECK SESIÓN (cookie o token)
    // =============================
    const cookies = request.headers.get("cookie") || "";
    const sessionMatch = cookies.match(/session=([^;]+)/);
    let userId = null;

    if (sessionMatch) {
      userId = sessionMatch[1];
    } else {
      const body = await safeJson(request);
      if (body?.token) {
        userId = parseJwt(body.token)?.sub || null;
      }
    }

    if (!userId) {
      return html(renderLoginPage());
    }

    const userKey = "user:" + userId;

    // =============================
    // 2. GET USER RECORD
    // =============================
    let record = await env.CODES_KV.get(userKey);
    record = record ? JSON.parse(record) : null;

    let code;

    // =============================
    // 3. ASSIGN CODE IF NEW USER
    // =============================
    if (!record) {

      let codes = TEST_MODE ? TEST_CODES : JSON.parse(await env.CODES_KV.get("codes") || "[]");

      if (codes.length === 0) {
        code = "NO_CODES_LEFT";
      } else {
        code = codes[0];

        record = {
          code,
          views: 0,
          created: Date.now()
        };

        if (!TEST_MODE) {
          await env.CODES_KV.put(userKey, JSON.stringify(record));
          await env.CODES_KV.put("codes", JSON.stringify(codes.slice(1)));
        }
      }

    } else {
      code = record.code;
    }

    // =============================
    // 4. VIEW LIMIT
    // =============================
    let hidden = false;

    if (record) {
      if (record.views >= 5) {
        hidden = true;
      } else {
        record.views++;
        
        if (!TEST_MODE) {
          await env.CODES_KV.put(userKey, JSON.stringify(record));
        }
      }
    }

    // =============================
    // 5. CREAR RESPUESTA CON COOKIE
    // =============================
    const response = new Response(renderApp(code, hidden), {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "set-cookie": `session=${userId}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`
      }
    });

    return response;
  }
};

// =============================
// UX CLEAN (NO "HACKER LOOK")
// =============================

function renderApp(code, hidden) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard</title>

<style>
body{
  margin:0;
  font-family:system-ui, Arial;
  background:#f4f6f8;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}

.card{
  width:92%;
  max-width:520px;
  background:white;
  border-radius:18px;
  padding:30px;
  box-shadow:0 10px 30px rgba(0,0,0,.08);
}

h1{
  font-size:22px;
  margin-bottom:20px;
  color:#111;
}

.code{
  font-size:26px;
  padding:18px;
  background:#111;
  color:#fff;
  border-radius:12px;
  word-break:break-all;
  margin-bottom:20px;
}

.info{
  margin-bottom:20px;
  color:#666;
  font-size:14px;
}

.buttons{
  display:flex;
  gap:12px;
}

.btn{
  flex:1;
  padding:14px;
  border:none;
  border-radius:10px;
  color:white;
  font-weight:600;
  cursor:pointer;
  font-size:14px;
  transition:0.2s;
}

.btn-gemini{
  background:#7c3aed;
}

.btn-gemini:hover{
  background:#6d28d9;
}

.btn-ebook{
  background:#2563eb;
}

.btn-ebook:hover{
  background:#1d4ed8;
}
</style>

</head>

<body>

<div class="card">

<h1>Your Access Code</h1>

<div class="code">
${hidden ? "REDACTED" : code}
</div>

<div class="info">
Limited access: 5 views per account
</div>

<div class="buttons">
  <button class="btn btn-gemini" onclick="openGemini()">GEMINI LEGAL CORE</button>
  <button class="btn btn-ebook" onclick="openEbook()">EBOOK</button>
</div>

</div>

<script>
function openGemini(){
  window.open('https://gemini.google.com', '_blank');
}

function openEbook(){
  window.open('https://ejemplo.com/ebook', '_blank');
}
</script>

</body>
</html>
`;
}
// =============================
// HELPERS
// =============================

function html(str) {
  return new Response(str, {
    headers: { "content-type": "text/html;charset=UTF-8" }
  });
}

async function safeJson(req) {
  try { return await req.json(); } catch { return null; }
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}
