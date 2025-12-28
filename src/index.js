/**
 * Cloudflare Worker: Icon Manager (Final JSON API Version)
 * 功能：
 * 1. 上传页面认证 (密码保护)
 * 2. 拖拽/点击上传 + 纯字母名称校验
 * 3. 自动裁剪 108x108
 * 4. API 返回标准 JSON 格式供软件调用
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 静态资源路由：获取图片文件
    if (path.startsWith('/file/')) {
      return handleServeImage(path, env);
    }

    // 2. 页面路由
    switch (path) {
      case '/':
        return handleAdminPage(request, env);
      case '/api/icon':
        return handleApiJson(request, env); // 改为返回 JSON
      case '/auth/login':
        return handleLoginAction(request, env);
      case '/api/upload':
        return handleUploadAction(request, env);
      default:
        return new Response('404 Not Found', { status: 404 });
    }
  }
};

/**
 * ------------------------------------------------
 * 逻辑处理部分
 * ------------------------------------------------
 */

// 检查是否已登录
function isAuthorized(request, env) {
  const cookie = request.headers.get('Cookie');
  return cookie && cookie.includes(`auth_token=${env.ADMIN_PASSWORD}`);
}

// 1. 认证页面 (原管理员登录)
async function handleAdminPage(request, env) {
  if (!isAuthorized(request, env)) {
    return new Response(htmlLogin(), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
  return new Response(htmlUpload(), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

// 2. 登录动作
async function handleLoginAction(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  
  const formData = await request.formData();
  const password = formData.get('password');

  if (password === env.ADMIN_PASSWORD) {
    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': `auth_token=${password}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`,
        'Location': '/'
      }
    });
  }
  return new Response('密码错误 <a href="/">返回</a>', { headers: {'Content-Type': 'text/html;charset=utf-8'}, status: 403 });
}

// 3. 上传动作
async function handleUploadAction(request, env) {
  if (!isAuthorized(request, env)) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file'); 
  const name = formData.get('name'); 

  // 后端二次校验：只能是字母
  if (!file || !name || !/^[a-zA-Z]+$/.test(name)) {
    return new Response('参数错误或名称包含非字母字符', { status: 400 });
  }

  const filename = `${name}.png`; // 统一存为 png

  await env.ICON_BUCKET.put(filename, file);
  await env.ICON_KV.put(name, filename);

  return new Response('OK');
}

// 4. API JSON 输出 (核心修改)
async function handleApiJson(request, env) {
  const list = await env.ICON_KV.list();
  const origin = new URL(request.url).origin; // 获取当前域名 (例如 https://your-worker.workers.dev)
  
  const iconsArray = [];
  
  // 遍历 KV 构建数组
  for (const key of list.keys) {
    const filename = await env.ICON_KV.get(key.name);
    iconsArray.push({
      name: key.name,
      url: `${origin}/file/${filename}` // 拼接完整 URL
    });
  }

  // 构建最终 JSON 结构
  const finalJson = {
    name: "Asonlino icon",
    description: "By Asonlino",
    icons: iconsArray
  };

  return new Response(JSON.stringify(finalJson, null, 2), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*' // 允许跨域调用
    }
  });
}

// 5. 读取 R2 图片
async function handleServeImage(path, env) {
  const filename = path.replace('/file/', '');
  if (!env.ICON_BUCKET) return new Response('Server Configuration Error: R2 Not Bound', { status: 500 });
  
  const object = await env.ICON_BUCKET.get(filename);
  if (!object) return new Response('Image not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000'); 

  return new Response(object.body, { headers });
}

/**
 * ------------------------------------------------
 * HTML 模板部分
 * ------------------------------------------------
 */

const COMMON_STYLE = `
  <style>
    :root { --primary: #2563eb; --bg: #f8fafc; --card: #ffffff; --text: #1e293b; --border: #cbd5e1; }
    body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
        background: var(--bg); 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        margin: 0; 
        padding: 1rem;
        box-sizing: border-box;
    }
    .container { 
        background: var(--card); 
        padding: 2.5rem 2rem; 
        border-radius: 20px; 
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1); 
        width: 100%; 
        max-width: 400px; 
        text-align: center;
    }
    h1 { margin: 0 0 1.5rem 0; font-size: 1.5rem; color: var(--text); font-weight: 700; }
    
    input[type="text"], input[type="password"] { 
        width: 100%; padding: 0.9rem; margin: 0.5rem 0; 
        border: 2px solid #e2e8f0; border-radius: 12px; 
        box-sizing: border-box; font-size: 1rem; text-align: center;
        transition: all 0.2s;
    }
    input:focus { outline: none; border-color: var(--primary); background: #f0f9ff; }
    
    button { 
        width: 100%; padding: 0.9rem; 
        background: var(--primary); color: white; 
        border: none; border-radius: 12px; 
        font-weight: 600; cursor: pointer; margin-top: 1.5rem; 
        font-size: 1rem; transition: transform 0.1s, opacity 0.2s; 
    }
    button:active { transform: scale(0.98); }
    button:disabled { background: #94a3b8; cursor: not-allowed; }
  </style>
`;

// 登录页
function htmlLogin() {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>上传认证页面</title><meta name="viewport" content="width=device-width, initial-scale=1">${COMMON_STYLE}</head>
    <body>
      <div class="container">
        <h1>认证页面</h1>
        <form action="/auth/login" method="POST">
          <input type="password" name="password" placeholder="请输入访问密码" required>
          <button type="submit">进入上传页面</button>
        </form>
      </div>
    </body>
    </html>
  `;
}

// 上传页 (包含拖拽和JS校验)
function htmlUpload() {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>icon 上传</title><meta name="viewport" content="width=device-width, initial-scale=1">${COMMON_STYLE}
    <style>
      /* 拖拽上传区域样式 */
      #drop-area {
        width: 100%;
        height: 180px;
        border: 3px dashed var(--border);
        border-radius: 16px;
        margin: 1.5rem 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: #f8fafc;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
      }
      #drop-area.highlight { border-color: var(--primary); background: #eff6ff; }
      #drop-area:hover { border-color: var(--primary); }
      
      .upload-icon { font-size: 3rem; color: #94a3b8; margin-bottom: 0.5rem; }
      .upload-text { color: #64748b; font-size: 0.9rem; }
      
      /* 预览图覆盖 */
      #preview-img { 
        position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
        object-fit: contain; background: white; display: none; padding: 10px; box-sizing: border-box;
      }
      
      .error-msg { color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem; min-height: 1.2em; }
    </style>
    </head>
    <body>
      <div class="container">
        <h1>icon 上传</h1>
        
        <input type="text" id="iconName" placeholder="图标名称 (仅限字母)" autocomplete="off" oninput="validateName(this)">
        <div class="error-msg" id="nameError"></div>

        <input type="file" id="fileInput" accept="image/*" style="display:none">
        
        <div id="drop-area">
            <div class="upload-icon">☁️</div>
            <div class="upload-text">点击或拖拽图片到此处</div>
            <img id="preview-img">
        </div>
        
        <button id="uploadBtn" disabled onclick="upload()">上传</button>
      </div>

      <script>
        let processedBlob = null;
        const dropArea = document.getElementById('drop-area');
        const fileInput = document.getElementById('fileInput');
        const previewImg = document.getElementById('preview-img');
        const uploadBtn = document.getElementById('uploadBtn');
        const nameInput = document.getElementById('iconName');
        const nameError = document.getElementById('nameError');

        // 1. 名称校验：只允许字母
        function validateName(input) {
            const original = input.value;
            // 替换掉非字母字符
            const clean = original.replace(/[^a-zA-Z]/g, '');
            
            if (original !== clean) {
                input.value = clean;
                nameError.innerText = "已自动过滤非字母字符";
            } else {
                nameError.innerText = "";
            }
            checkSubmit();
        }

        // 2. 点击区域触发文件选择
        dropArea.addEventListener('click', () => fileInput.click());

        // 3. 拖拽事件处理
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
        });

        // 处理拖拽放置
        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        });

        // 处理点击选择
        fileInput.addEventListener('change', function(e) {
            handleFiles(this.files);
        });

        function handleFiles(files) {
            if (files.length > 0) {
                processImage(files[0]);
            }
        }

        // 图片处理 (108x108)
        function processImage(file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = 108;
                    canvas.height = 108;
                    const ctx = canvas.getContext('2d');
                    
                    // 白色背景
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, 108, 108);
                    ctx.drawImage(img, 0, 0, 108, 108);

                    canvas.toBlob((blob) => {
                        processedBlob = blob;
                        // 显示预览
                        previewImg.src = URL.createObjectURL(blob);
                        previewImg.style.display = 'block';
                        checkSubmit();
                    }, 'image/png', 0.9);
                }
                img.src = event.target.result;
            }
            reader.readAsDataURL(file);
        }

        function checkSubmit() {
            if (processedBlob && nameInput.value.length > 0) {
                uploadBtn.disabled = false;
                uploadBtn.innerText = "上传";
            } else {
                uploadBtn.disabled = true;
            }
        }

        async function upload() {
            const name = nameInput.value.trim();
            if(!name || !processedBlob) return;

            uploadBtn.disabled = true;
            uploadBtn.innerText = '上传中...';

            const formData = new FormData();
            formData.append('file', processedBlob);
            formData.append('name', name);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if(res.ok) {
                    alert('上传成功！');
                    location.reload(); // 刷新清空
                } else if (res.status === 400) {
                    alert('名称包含非法字符，请检查');
                } else {
                    alert('上传失败');
                }
            } catch(e) {
                alert('网络错误');
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.innerText = '上传';
            }
        }
      </script>
    </body>
    </html>
  `;
}
