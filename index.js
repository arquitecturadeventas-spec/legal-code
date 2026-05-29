export default {
  async fetch(request, env) {

    const raw = await env.CODES_KV.get("codes");
    let codes = JSON.parse(raw || "[]");

    let code = "NO_CODES_LEFT";

    if (codes.length > 0) {
      code = codes.shift();

      await env.CODES_KV.put(
        "codes",
        JSON.stringify(codes)
      );
    }

    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Confidential Access</title>

<style>

body{
  margin:0;
  background:#0b1020;
  color:white;
  font-family:Arial,sans-serif;
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:100vh;
}

.box{
  width:90%;
  max-width:700px;
  padding:40px;
  border-radius:20px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1);
}

h1{
  font-size:48px;
  margin:0 0 20px;
}

.code{
  margin-top:20px;
  padding:20px;
  font-size:30px;
  background:black;
  border-radius:14px;
  word-break:break-all;
}

.info{
  margin-top:15px;
  opacity:.7;
}

.buttons{
  margin-top:30px;
  display:grid;
  gap:10px;
}

a{
  text-decoration:none;
  padding:16px;
  border-radius:12px;
  text-align:center;
  color:white;
  font-weight:bold;
}

.ai{
  background:#d4af37;
  color:black;
}

.ebook{
  background:#1f3f7a;
}

</style>
</head>

<body>

<div class="box">

<h1>One code. Limited visibility.</h1>

<div class="code" id="code">${code}</div>

<div class="info">
Remaining server codes: ${codes.length}
</div>

<div class="buttons">
  <a class="ai" href="#">OPEN AI</a>
  <a class="ebook" href="#">OPEN EBOOK</a>
</div>

</div>

<script>

const LIMIT = 5;
const KEY = "views";

let views = Number(localStorage.getItem(KEY) || "0");

if(views >= LIMIT){
  document.getElementById("code").innerText = "REDACTED";
}else{
  views++;
  localStorage.setItem(KEY, views);
}

</script>

</body>
</html>
`, {
      headers: {
        "content-type": "text/html;charset=UTF-8"
      }
    });
  }
}
