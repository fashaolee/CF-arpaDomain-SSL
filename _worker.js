    // 代码用的老王发的代码 然后二开创造
    // 不会用就加tg群https://t.me/yifang_chat

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API 接口
    if (path === '/api/add-ssl' && request.method === 'POST') {
      return handleApiRequest(request);
    }
    if (path === '/api/add-dns' && request.method === 'POST') {
      return handleDnsRequest(request);
    }

    // 返回后台页面
    return new Response(getAdminHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  },
};

async function handleApiRequest(request) {
  try {
    const { email, zone_id, api_key } = await request.json();
    if (!email || !zone_id || !api_key)
      return jsonResponse({ success: false, errors: ['所有字段都是必需的'] }, 400);

    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id}/ssl/universal/settings`, {
      method: 'PATCH',
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true, certificate_authority: 'ssl_com' }),
    });

    const result = await response.json();
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ success: false, errors: [`请求失败: ${error.message}`] }, 500);
  }
}

async function handleDnsRequest(request) {
  try {
    const { email, zone_id, api_key, record_name, ns_targets } = await request.json();
    if (!email || !zone_id || !api_key || !record_name || !ns_targets || ns_targets.length === 0)
      return jsonResponse({ success: false, errors: ['所有字段都是必需的'] }, 400);

    const added = [];
    const failed = [];

    for (const ns_target of ns_targets) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`, {
        method: 'POST',
        headers: {
          'X-Auth-Email': email,
          'X-Auth-Key': api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'NS',
          name: record_name,
          content: ns_target.trim(),
          ttl: 3600,
        }),
      });

      const result = await res.json();
      if (result.success) added.push(ns_target);
      else failed.push({ ns_target, error: result.errors?.[0]?.message || '未知错误' });
    }

    return jsonResponse({ success: failed.length === 0, added, failed });
  } catch (error) {
    return jsonResponse({ success: false, errors: [`请求失败: ${error.message}`] }, 500);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/* -------------------- 后台页面 HTML -------------------- */
function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IP6.ARPA 域名管理后台</title>
<style>
body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
header { background: linear-gradient(90deg,#1a2a6c,#b21f1f); color: white; padding: 20px; text-align: center; font-size: 20px; font-weight: bold; position: relative; }
header a.tg-icon { position: absolute; right: 20px; top: 20px; text-decoration: none; }
header a.tg-icon img { width: 28px; height: 28px; vertical-align: middle; }
main { max-width: 800px; margin: 30px auto; padding: 25px; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
form { margin-bottom: 30px; display: flex; flex-direction: column; gap: 10px; }
input,textarea,button,select,a { padding: 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing:border-box; }
textarea { height: 100px; resize:none; font-size:14px; }
button { background: linear-gradient(to right,#1a2a6c,#b21f1f); color: white; font-weight: bold; cursor: pointer; transition:.3s; border: none; }
button:hover { opacity: 0.9; }
#result { margin-top: 20px; padding: 12px; border-radius: 6px; text-align: center; display:none; }
.success {background:#d4edda;color:#155724;}
.error {background:#f8d7da;color:#721c24;}
.flex-row { display: flex; gap: 5px; align-items: center; }
.flex-row input { flex: 1; }
.flex-row select { width: 100px; }
.flex-row button { width: 100px; padding: 10px; }
a.register-btn { display: block; margin: 0 auto 15px auto; padding: 14px 0; background: #28a745; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; width: 60%; text-align: center; transition: .3s; }
a.register-btn:hover { opacity: 0.9; }
</style>
</head>
<body>
<header>
  IP6.ARPA 域名管理后台
  <a class="tg-icon" href="https://t.me/yifang_chat" target="_blank">
    <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg" alt="Telegram">
  </a>
</header>
<main>
<a class="register-btn" href="https://tb.netassist.ua/" target="_blank">注册ip6.arpa域名</a>
  <h2>添加 SSL证书</h2>
  <form id="ssl-form">
    <input type="email" id="email" placeholder="Cloudflare 邮箱">
    <input type="text" id="zone-id" placeholder="Zone ID">
    <input type="text" id="api-key" placeholder="API Key">
    <button type="button" id="ssl-btn">添加 SSL证书</button>
  </form>

  <h2>批量添加 NS 记录</h2>
  <form id="dns-form">
    <input type="email" id="dns-email" placeholder="Cloudflare 邮箱">
    <input type="text" id="dns-zone-id" placeholder="Zone ID">
    <input type="text" id="dns-api-key" placeholder="API Key">
    <div class="flex-row">
      <input type="text" id="dns-name" placeholder="记录名称 (可自定义或生成随机)">
      <select id="segment-count">
        <option value="1">1 段</option>
        <option value="2">2 段</option>
        <option value="3">3 段</option>
        <option value="4">4 段</option>
        <option value="random">随机 1~4 段</option>
      </select>
      <button type="button" id="gen-random-ip">随机生成</button>
    </div>
    <textarea id="dns-targets" placeholder="每行一个 NS 名称服务器"></textarea>
    <button type="button" id="dns-btn">批量添加 NS</button>
  </form>
  <div id="result"></div>
</main>

<script>
async function post(url,data){
  try {
    const res = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
    return await res.json();
  } catch(e){
    return { success:false, errors:['请求失败: '+e.message] };
  }
}

function showResult(msg, type){
  const el = document.getElementById('result');
  el.style.display='block';
  el.textContent = msg;
  el.className = type==='success' ? 'success' : 'error';
}

function getRandomHex() {
  const hexChars = '0123456789abcdef';
  return hexChars[Math.floor(Math.random() * 16)];
}

function generateRandomIP(segments) {
  const segs = [];
  const count = segments === 'random' ? Math.floor(Math.random() * 4) + 1 : parseInt(segments);
  for (let i = 0; i < count; i++) {
    segs.push(getRandomHex());
  }
  return segs.join('.');
}

document.getElementById('ssl-btn').addEventListener('click', async()=>{
  const email = document.getElementById('email').value.trim();
  const zone_id = document.getElementById('zone-id').value.trim();
  const api_key = document.getElementById('api-key').value.trim();
  if(!email || !zone_id || !api_key) return showResult('请填写完整信息', 'error');
  showResult('正在启用 SSL...', 'success');
  const data = await post('/api/add-ssl',{email,zone_id,api_key});
  if(data.success) showResult('✅ SSL 启用成功', 'success');
  else showResult('❌ 添加失败: '+(data.errors?.[0]||data.message||'未知错误'), 'error');
});

document.getElementById('dns-btn').addEventListener('click', async()=>{
  const email = document.getElementById('dns-email').value.trim();
  const zone_id = document.getElementById('dns-zone-id').value.trim();
  const api_key = document.getElementById('dns-api-key').value.trim();
  const record_name = document.getElementById('dns-name').value.trim();
  const ns_targets = document.getElementById('dns-targets').value.split(/\\n/).map(v=>v.trim()).filter(v=>v);
  if(!email||!zone_id||!api_key||!record_name||ns_targets.length===0) return showResult('请填写完整信息', 'error');
  showResult('正在添加 NS...', 'success');
  const data = await post('/api/add-dns',{email,zone_id,api_key,record_name,ns_targets});
  if(data.success) showResult('✅ NS 添加成功: '+data.added.join(','), 'success');
  else showResult('❌ 添加失败: '+(data.failed.map(f=>f.ns_target+':'+f.error).join('; ')||'未知错误'), 'error');
});

document.getElementById('gen-random-ip').addEventListener('click', ()=>{
  const segments = document.getElementById('segment-count').value;
  const randomIP = generateRandomIP(segments);
  document.getElementById('dns-name').value = randomIP;
});
</script>
</body>
</html>`;
}

