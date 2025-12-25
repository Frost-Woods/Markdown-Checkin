/* ================= Markdown + 高亮 ================= */

const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function renderPreview() {
  preview.innerHTML = md.render(editor.value);
  // 重新应用自定义颜色
  applyColorSettings();
}
editor.addEventListener('input', () => {
  renderPreview();
  playEditSound();
});

/* ================= 深色模式 ================= */

const themeToggle = document.getElementById('themeToggle');
const hljsLight = document.getElementById('hljs-light');
const hljsDark = document.getElementById('hljs-dark');

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const dark = theme === 'dark';
  hljsLight.disabled = dark;
  hljsDark.disabled = !dark;
  themeToggle.textContent = dark ? '☀☀️' : '🌙🌙';
  
  // 主题切换后重新应用颜色设置
  setTimeout(() => {
    applyColorSettings();
  }, 100);
}

setTheme(localStorage.getItem('theme') || 'light');

themeToggle.onclick = () => {
  setTheme(
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'light' : 'dark'
  );
};

/* ================= 左侧侧边栏控制 ================= */

const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');

function setSidebar(collapsed) {
  sidebar.classList.toggle('collapsed', collapsed);
  localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
}

const savedSidebarState = localStorage.getItem('sidebarCollapsed');
// 默认折叠左侧侧边栏
if (savedSidebarState === null) {
  setSidebar(true);
} else {
  setSidebar(savedSidebarState === '1');
}

toggleSidebar.onclick = () => {
  setSidebar(!sidebar.classList.contains('collapsed'));
};

/* ================= 右侧侧边栏及文件管理 ================= */

// 文件系统状态
const fileSystem = {
  files: {},           // 存储所有文件内容 { filename: content }
  currentFile: null,   // 当前激活的文件名
  FILE_STORAGE_KEY: 'markdownStudioFiles' // localStorage存储键名
};

// DOM元素
const sidebarRight = document.getElementById('sidebarRight');
const toggleRightSidebarBtn = document.getElementById('toggleRightSidebarBtn');
const toggleRightSidebar = document.getElementById('toggleRightSidebar');
const fileList = document.getElementById('fileList');

const saveFileBtn = document.getElementById('saveFileBtn');

const deleteFileBtn = document.getElementById('deleteFileBtn');
// 修复：删除当前文件按钮的事件绑定（显式传递当前文件参数，兜底校验）
deleteFileBtn.addEventListener('click', () => {
  // 兜底：若currentFile为空，提示用户
  if (!fileSystem.currentFile) {
    alert('暂无当前编辑的文件，无法删除！');
    return;
  }
  // 显式调用删除当前文件
  deleteFile(fileSystem.currentFile);
});


const fileNameInput = document.getElementById('fileNameInput');
const importFileBtn = document.getElementById('importFileBtn');

// 初始化文件系统
function initFileSystem() {
  const savedFiles = localStorage.getItem(fileSystem.FILE_STORAGE_KEY);
  if (savedFiles) {
    fileSystem.files = JSON.parse(savedFiles);
    // 加载第一个文件
    const fileNames = Object.keys(fileSystem.files);
    if (fileNames.length > 0) {
      openFile(fileNames[0]);
    }
  }
  renderFileList();
}

// 渲染文件列表
function renderFileList() {
  fileList.innerHTML = '';
  const fileNames = Object.keys(fileSystem.files);
  
  if (fileNames.length === 0) {
    fileList.innerHTML = '<div style="padding: 12px; text-align: center; color: #888;">无文件</div>';
    return;
  }
  
  fileNames.forEach(filename => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${fileSystem.currentFile === filename ? 'active' : ''}`;
    fileItem.innerHTML = `
      <span>${filename}.md</span>
      <span class="delete-icon" data-file="${filename}">×</span>
    `;
    
    // 点击文件切换
    fileItem.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-icon')) {
        openFile(filename);
      }
    });
    
    fileList.appendChild(fileItem);
  });
  
  // 添加删除文件事件监听
  document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = e.target.getAttribute('data-file');
      deleteFile(filename);
    });
  });
}

// 打开文件
function openFile(filename) {
  if (!fileSystem.files[filename]) return;
  
  // 保存当前文件内容
  if (fileSystem.currentFile) {
    fileSystem.files[fileSystem.currentFile] = editor.value;
    saveFilesToStorage();
  }
  
  // 加载新文件内容
  fileSystem.currentFile = filename;
  editor.value = fileSystem.files[filename];
  fileNameInput.value = filename;
  renderPreview();
  renderFileList();
}

// 新建文件
function newFile() {
  let defaultName = '新文件';
  let count = 1;
  
  // 确保文件名唯一
  while (fileSystem.files[defaultName]) {
    defaultName = `新文件${count}`;
    count++;
  }
  
  // 创建新文件
  fileSystem.files[defaultName] = '';
  saveFilesToStorage();
  openFile(defaultName);
}

// 保存文件
function saveFile() {
  const newFilename = fileNameInput.value.trim();
  if (!newFilename) {
    alert('请输入文件名');
    return;
  }
  
  // 如果文件名已更改且存在
  if (newFilename !== fileSystem.currentFile && fileSystem.files[newFilename]) {
    if (!confirm(`文件 "${newFilename}" 已存在，是否覆盖？`)) {
      return;
    }
  }
  
  // 如果是重命名
  if (fileSystem.currentFile && newFilename !== fileSystem.currentFile) {
    delete fileSystem.files[fileSystem.currentFile];
  }
  
  // 保存文件内容
  fileSystem.files[newFilename] = editor.value;
  saveFilesToStorage();
  openFile(newFilename);
}

// 删除文件
function deleteFile(filename) {
  // 1. 补全参数：未传文件名则删除当前文件
  if (!filename) filename = fileSystem.currentFile;
  
  // 2. 校验文件存在性：避免删除不存在的文件
  if (!filename || !fileSystem.files[filename]) {
    alert(`文件 "${filename || '未知'}.md" 不存在或已被删除`);
    return;
  }

  // 3. 确认删除操作
  if (!confirm(`确定要删除 "${filename}.md" 吗？`)) {
    return;
  }

  // 4. 标记是否为当前文件（核心：提前缓存状态）
  const isDeleteCurrentFile = fileSystem.currentFile === filename;

  // 5. 核心操作：删除文件（先删内存中的文件）
  delete fileSystem.files[filename];

  // 6. 同步删除结果到本地存储（优先同步，避免后续操作覆盖）
  saveFilesToStorage();

  // 7. 处理当前文件删除后的逻辑（满足"编辑区清空"的核心需求）
  if (isDeleteCurrentFile) {
    // 无论是否有其他文件，都清空编辑区（你要的核心效果）
    fileSystem.currentFile = null; // 重置当前文件状态，阻断回写
    editor.value = '';            // 清空编辑器内容
    fileNameInput.value = '';     // 清空文件名输入框
    renderPreview();              // 刷新预览区（清空预览）
  }

  // 8. 刷新文件列表UI，确保删除后的列表同步
  renderFileList();

  // 9. 友好反馈：告知删除成功
  alert(`文件 "${filename}.md" 已成功删除`);
}

// 导入文件
function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // 获取不带扩展名的文件名
      const filename = file.name.replace(/\.md$/i, '');
      let finalName = filename;
      let count = 1;
      
      // 确保文件名唯一
      while (fileSystem.files[finalName]) {
        finalName = `${filename}${count}`;
        count++;
      }
      
      // 保存导入的文件
      fileSystem.files[finalName] = event.target.result;
      saveFilesToStorage();
      openFile(finalName);
      alert(`已导入文件: ${finalName}.md`);
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// 保存文件到localStorage
function saveFilesToStorage() {
  localStorage.setItem(fileSystem.FILE_STORAGE_KEY, JSON.stringify(fileSystem.files));
}

// 右侧侧边栏控制
function setRightSidebar(collapsed) {
  sidebarRight.classList.toggle('collapsed', collapsed);
  localStorage.setItem('rightSidebarCollapsed', collapsed ? '1' : '0');
}

// 右侧侧边栏事件监听

saveFileBtn.addEventListener('click', saveFile);
deleteFileBtn.addEventListener('click', deleteFile);
importFileBtn.addEventListener('click', importFile);

toggleRightSidebarBtn.addEventListener('click', () => {
  setRightSidebar(!sidebarRight.classList.contains('collapsed'));
});

toggleRightSidebar.addEventListener('click', () => {
  setRightSidebar(true);
});

// 初始化右侧侧边栏状态（默认折叠）
const rightSidebarSaved = localStorage.getItem('rightSidebarCollapsed');
if (rightSidebarSaved === null) {
  setRightSidebar(true); // 首次加载默认折叠
} else {
  setRightSidebar(rightSidebarSaved === '1');
}

/* ================= 音效系统 ================= */

const editAudio = new Audio('audio/edit.mp3');
const exportAudio = new Audio('audio/export.mp3');

editAudio.volume = 0.4;
exportAudio.volume = 0.6;

let audioUnlocked = false;
let soundEnabled = localStorage.getItem('soundEnabled') !== '0';
let editPlaying = false;

document.addEventListener('click', () => {
  if (!audioUnlocked) {
    editAudio.play().then(() => {
      editAudio.pause();
      editAudio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }
}, { once: true });

function playEditSound() {
  if (!audioUnlocked || !soundEnabled || editPlaying) return;
  editPlaying = true;
  editAudio.currentTime = 0;
  editAudio.play().finally(() => {
    editAudio.onended = () => editPlaying = false;
  });
}

function playExportSound() {
  if (!audioUnlocked || !soundEnabled) return;
  exportAudio.currentTime = 0;
  exportAudio.play().catch(() => {});
}

/* 音效开关 */
const soundToggle = document.getElementById('soundToggle');
function updateSoundBtn() {
  soundToggle.textContent = soundEnabled ? '🔊🔊' : '🔇🔇';
}
updateSoundBtn();

soundToggle.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled ? '1' : '0');
  updateSoundBtn();
};

/* ================= 导出功能 ================= */

const exportBtn = document.getElementById('exportBtn');
const exportMdBtn = document.getElementById('exportMdBtn'); // 导出MD按钮
const exportPdfBtn = document.getElementById('exportPdfBtn');

// 导出HTML
exportBtn.onclick = () => {
  playExportSound();
  const blob = new Blob([preview.innerHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'export.html';
  a.click();
};

// 新增：导出MD文件
exportMdBtn.onclick = () => {
  playExportSound();
  // 使用当前文件名（如果有），否则用默认名
  const fileName = fileSystem.currentFile ? `${fileSystem.currentFile}.md` : 'export.md';
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  // 释放URL对象
  URL.revokeObjectURL(a.href);
};

// 导出PDF
exportPdfBtn.onclick = () => {
  playExportSound();
  html2pdf().from(preview).save();
};

/* ================= GitHub 上传 + 指标 ================= */

const KEY = 'uploadStats';
const uploadGithubBtn = document.getElementById('uploadGithubBtn');
const repoOwner = document.getElementById('repoOwner');
const repoName = document.getElementById('repoName');
const filePath = document.getElementById('filePath');
const tokenInput = document.getElementById('tokenInput');
const todayCount = document.getElementById('todayCount');
const uploadChart = document.getElementById('uploadChart');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function recordUploadSuccess() {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  const t = today();
  s[t] = (s[t] || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(s));
  updateStats();
}

uploadGithubBtn.onclick = async () => {
  const owner = repoOwner.value.trim();
  const repo = repoName.value.trim();
  const path = filePath.value.trim();
  const token = tokenInput.value.trim();
  if (!owner || !repo || !path || !token) return alert('信息不完整');

  const content = btoa(unescape(encodeURIComponent(editor.value)));
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  let sha = null;
  const r = await fetch(api, { headers: { Authorization: `token ${token}` } });
  if (r.ok) sha = (await r.json()).sha;

  const res = await fetch(api, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Update Markdown', content, sha })
  });

  if (!res.ok) return alert('上传失败');
  recordUploadSuccess();
  alert('✅ 已上传到 GitHub');
};

/* ================= 上传统计 ================= */

let chart;

function updateStats() {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  todayCount.textContent = `今日上传：${s[today()] || 0} 次`;

  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    labels.push(k.slice(5));
    data.push(s[k] || 0);
  }

  if (!chart) {
    chart = new Chart(uploadChart, {
      type: 'bar',
      data: { labels, datasets: [{ data }] }
    });
  } else {
    chart.data.datasets[0].data = data;
    chart.update();
  }
}

/* ================= 代码高亮颜色自定义 ================= */

// 扩展语法元素定义，覆盖更多语言和类名
const syntaxElements = [
  { id: 'keyword', name: '关键字', languages: ['c', 'cpp', 'java', 'javascript', 'python', 'go', 'rust'] },
  { id: 'built_in', name: '内置函数/类型', languages: ['c', 'cpp', 'python', 'javascript'] },
  { id: 'type', name: '类型声明', languages: ['c', 'cpp', 'java', 'go', 'rust'] },
  { id: 'function', name: '函数名', languages: ['c', 'cpp', 'javascript', 'python'] },
  { id: 'title.function_', name: '函数标题', languages: ['c', 'cpp', 'python'] },
  { id: 'variable', name: '变量名', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'string', name: '字符串', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'number', name: '数字', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'comment', name: '注释', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'class', name: '类名', languages: ['cpp', 'java', 'python', 'javascript'] },
  { id: 'meta', name: '元数据', languages: ['python', 'javascript'] },
  { id: 'punctuation', name: '标点符号', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'operator', name: '运算符', languages: ['c', 'cpp', 'java', 'javascript', 'python'] },
  { id: 'params', name: '函数参数', languages: ['c', 'cpp', 'javascript', 'python'] }
];

// 增强的默认颜色配置
const defaultColors = {
  light: {
    keyword: '#6ABFFA',
    built_in: '#88C8F8',
    type: '#6ABFFA',
    function: '#F8D878',
    'title.function_': '#F8D878',
    variable: '#C898FA',
    string: '#F0A898',
    number: '#88E888',
    comment: '#78C878',
    class: '#98D8F8',
    meta: '#FF9878',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8',
    params: '#C898FA'
  },
  dark: {
    keyword: '#61AFEF',
    built_in: '#88C8F8',
    type: '#61AFEF',
    function: '#E5E58A',
    'title.function_': '#E5E58A',
    variable: '#A7D8FF',
    string: '#E59866',
    number: '#98C379',
    comment: '#72B865',
    class: '#56D9B9',
    meta: '#FF9878',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8',
    params: '#A7D8FF'
  }
};

// 初始化颜色设置面板
function initColorSettings() {
  const colorSettings = document.getElementById('colorSettings');
  const userColors = getUserColors();
  
  syntaxElements.forEach(element => {
    const theme = document.documentElement.getAttribute('data-theme');
    const defaultColor = defaultColors[theme][element.id];
    const currentColor = userColors[theme][element.id] || defaultColor;
    
    const settingDiv = document.createElement('div');
    settingDiv.className = 'color-setting';
    settingDiv.innerHTML = `
      <label for="${element.id}Color">${element.name}</label>
      <div class="color-input-group">
        <input type="color" id="${element.id}Color" value="${currentColor}">
        <input type="text" id="${element.id}ColorHex" value="${currentColor}">
        <span class="language-tags">${element.languages.join(', ')}</span>
      </div>
    `;
    
    colorSettings.appendChild(settingDiv);
    
    // 绑定颜色选择事件
    const colorInput = document.getElementById(`${element.id}Color`);
    const hexInput = document.getElementById(`${element.id}ColorHex`);
    
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value;
      saveColorSetting(element.id, colorInput.value);
      applyColorSettings();
    });
    
    hexInput.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
        colorInput.value = hexInput.value;
        saveColorSetting(element.id, hexInput.value);
        applyColorSettings();
      }
    });
  });
  
  // 绑定重置按钮事件
  document.getElementById('resetColorsBtn').addEventListener('click', () => {
    if (confirm('确定要重置为默认颜色吗？')) {
      localStorage.removeItem('customHighlightColors');
      // 清空现有设置
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
      applyColorSettings();
    }
  });
  
  // 主题切换时更新颜色设置
  themeToggle.addEventListener('click', () => {
    setTimeout(() => {
      // 等待主题切换完成
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
    }, 0);
  });
}

// 获取用户颜色设置
function getUserColors() {
  const saved = localStorage.getItem('customHighlightColors');
  return saved ? JSON.parse(saved) : { light: {}, dark: {} };
}

// 保存颜色设置
function saveColorSetting(elementId, color) {
  const theme = document.documentElement.getAttribute('data-theme');
  const userColors = getUserColors();
  
  if (!userColors[theme]) {
    userColors[theme] = {};
  }
  
  userColors[theme][elementId] = color;
  localStorage.setItem('customHighlightColors', JSON.stringify(userColors));
}

// 增强的颜色应用函数
function applyColorSettings() {
  const userColors = getUserColors();
  const theme = document.documentElement.getAttribute('data-theme');
  
  // 移除已存在的自定义样式
  const existingStyle = document.getElementById('customHighlightStyles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // 创建新的样式元素
  const style = document.createElement('style');
  style.id = 'customHighlightStyles';
  
  let css = '';
  syntaxElements.forEach(element => {
    const color = userColors[theme][element.id] || defaultColors[theme][element.id];
    
    // 处理包含点的类名（如 title.function_）
    const className = element.id.includes('.') 
      ? element.id.replace('.', '.')  // 保持原样，如 .hljs-title.function_
      : element.id;
    
    // 为每个语法元素生成CSS规则
    css += `[data-theme="${theme}"] .hljs-${className} { color: ${color} !important; }\n`;
    
    // 针对特定语言的额外规则
    if (element.id === 'function') {
      // 为C语言的main函数添加特殊规则
      css += `[data-theme="${theme}"] .hljs-function.hljs-title { color: ${color} !important; }\n`;
    }
    
    if (element.id === 'title.function_') {
      // 确保函数标题被正确着色
      css += `[data-theme="${theme}"] .hljs-title.hljs-function { color: ${color} !important; }\n`;
    }
  });
  
  // 添加通用规则确保标点符号和运算符被着色
  css += `
    [data-theme="${theme}"] .hljs-punctuation { color: ${userColors[theme]?.punctuation || defaultColors[theme].punctuation} !important; }
    [data-theme="${theme}"] .hljs-operator { color: ${userColors[theme]?.operator || defaultColors[theme].operator} !important; }
    [data-theme="${theme}"] .hljs-keyword { color: ${userColors[theme]?.keyword || defaultColors[theme].keyword} !important; }
    [data-theme="${theme}"] .hljs-built_in { color: ${userColors[theme]?.built_in || defaultColors[theme].built_in} !important; }
  `;
  
  style.textContent = css;
  document.head.appendChild(style);
  
  // 强制重新高亮所有代码块
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}

/* 初始化 */
function init() {
  updateStats();
  renderPreview();
  initFileSystem();
  initColorSettings();
  applyColorSettings();
}

init();
