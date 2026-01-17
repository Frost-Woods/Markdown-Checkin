/* ================= Markdown + 高亮 ================= */

const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (e) {
        console.error('代码高亮失败:', e);
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function renderPreview() {
  preview.innerHTML = md.render(editor.value);
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
  themeToggle.textContent = dark ? '☀️' : '🌙';
  
  // 主题切换后立即应用颜色设置
  applyColorSettings();
}

setTheme(localStorage.getItem('theme') || 'dark');

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
const fileNameInput = document.getElementById('fileNameInput');
const importFileBtn = document.getElementById('importFileBtn');
const newFileBtn = document.getElementById('newFileBtn'); // 新建文件按钮
const fileInput = document.getElementById('fileInput'); // 文件导入input

// 初始化文件系统
function initFileSystem() {
  try {
    const savedFiles = localStorage.getItem(fileSystem.FILE_STORAGE_KEY);
    if (savedFiles) {
      fileSystem.files = JSON.parse(savedFiles);
      // 加载第一个文件
      const fileNames = Object.keys(fileSystem.files);
      if (fileNames.length > 0) {
        openFile(fileNames[0]);
      }
    }
  } catch (e) {
    console.error('加载文件系统失败:', e);
    fileSystem.files = {};
    localStorage.setItem(fileSystem.FILE_STORAGE_KEY, JSON.stringify({}));
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

  // 7. 处理当前文件删除后的逻辑（满足“编辑区清空”的核心需求）
  if (isDeleteCurrentFile) {
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
  fileInput.click();
}

// 处理文件导入
fileInput.addEventListener('change', (e) => {
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
    
    // 清空input值，允许重复导入同一文件
    fileInput.value = '';
  };
  reader.readAsText(file);
});

// 保存文件到localStorage
function saveFilesToStorage() {
  try {
    localStorage.setItem(fileSystem.FILE_STORAGE_KEY, JSON.stringify(fileSystem.files));
  } catch (e) {
    console.error('保存文件失败:', e);
    alert('文件保存失败，请检查本地存储是否已满');
  }
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
newFileBtn.addEventListener('click', newFile); // 绑定新建文件按钮

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

// 音效文件加载容错
let editAudio, exportAudio;
try {
  editAudio = new Audio('audio/edit.mp3');
  exportAudio = new Audio('audio/export.mp3');
  editAudio.volume = 0.4;
  exportAudio.volume = 0.6;
} catch (e) {
  console.warn('音效文件加载失败，将禁用音效:', e);
}

let audioUnlocked = false;
let soundEnabled = localStorage.getItem('soundEnabled') !== '0';
let editPlaying = false;

document.addEventListener('click', () => {
  if (!audioUnlocked && editAudio) {
    editAudio.play().then(() => {
      editAudio.pause();
      editAudio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {
      console.warn('音频解锁失败');
    });
  }
}, { once: true });

function playEditSound() {
  if (!editAudio || !audioUnlocked || !soundEnabled || editPlaying) return;
  editPlaying = true;
  editAudio.currentTime = 0;
  editAudio.play().catch(e => console.error('播放编辑音效失败:', e)).finally(() => {
    editAudio.onended = () => editPlaying = false;
  });
}

function playExportSound() {
  if (!exportAudio || !audioUnlocked || !soundEnabled) return;
  exportAudio.currentTime = 0;
  exportAudio.play().catch(e => console.error('播放导出音效失败:', e));
}

/* 音效开关 */
const soundToggle = document.getElementById('soundToggle');
function updateSoundBtn() {
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
}
updateSoundBtn();

soundToggle.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled ? '1' : '0');
  updateSoundBtn();
};

/* ================= 导出功能 ================= */

const exportBtn = document.getElementById('exportBtn');
const exportMdBtn = document.getElementById('exportMdBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// 导出HTML
exportBtn.onclick = () => {
  playExportSound();
  const blob = new Blob([preview.innerHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'export.html';
  a.click();
  URL.revokeObjectURL(a.href); // 释放URL
};

// 导出MD文件
exportMdBtn.onclick = () => {
  playExportSound();
  // 使用当前文件名（如果有），否则用默认名
  const fileName = fileSystem.currentFile ? `${fileSystem.currentFile}.md` : 'export.md';
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href); // 释放URL
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
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    const t = today();
    s[t] = (s[t] || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(s));
    updateStats();
  } catch (e) {
    console.error('记录上传统计失败:', e);
  }
}

uploadGithubBtn.onclick = async () => {
  const owner = repoOwner.value.trim();
  const repo = repoName.value.trim();
  const path = filePath.value.trim();
  const token = tokenInput.value.trim();
  
  if (!owner || !repo || !path || !token) {
    return alert('请填写完整的仓库信息');
  }

  // 显示加载状态
  uploadGithubBtn.disabled = true;
  uploadGithubBtn.textContent = '上传中...';

  try {
    const content = btoa(unescape(encodeURIComponent(editor.value)));
    const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    let sha = null;
    const r = await fetch(api, { headers: { Authorization: `token ${token}` } });
    if (r.ok) {
      const data = await r.json();
      sha = data.sha;
    }

    const res = await fetch(api, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Update Markdown', content, sha })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || '上传失败');
    }
    
    recordUploadSuccess();
    alert('✅ 已上传到 GitHub');
  } catch (e) {
    console.error('GitHub上传失败:', e);
    alert(`上传失败: ${e.message}`);
  } finally {
    // 恢复按钮状态
    uploadGithubBtn.disabled = false;
    uploadGithubBtn.textContent = '⬆️ 上传 Markdown';
  }
};

/* ================= 上传统计 ================= */

let chart;

function updateStats() {
  try {
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
        data: { 
          labels, 
          datasets: [{ 
            data,
            label: '上传次数',
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }] 
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    } else {
      chart.data.datasets[0].data = data;
      chart.update();
    }
  } catch (e) {
    console.error('更新统计图表失败:', e);
  }
}

/* ================= 代码高亮颜色自定义 ================= */

// 定义可自定义的语法元素
const syntaxElements = [
  { id: 'keyword', name: '关键字' },
  { id: 'variable', name: '变量名' },
  { id: 'string', name: '字符串' },
  { id: 'number', name: '数字' },
  { id: 'comment', name: '注释' },
  { id: 'function', name: '函数名' },
  { id: 'class', name: '类名' },
  { id: 'meta', name: '元数据' },
  { id: 'built_in', name: '内置类型' }
];

// 默认颜色配置
const defaultColors = {
  light: {
    keyword: '#6ABFFA',
    variable: '#C898FA',
    string: '#F0A898',
    number: '#88E888',
    comment: '#78C878',
    function: '#F8D878',
    class: '#98D8F8',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
  },
  dark: {
    keyword: '#61AFEF',
    variable: '#A7D8FF',
    string: '#E59866',
    number: '#98C379',
    comment: '#72B865',
    function: '#E5E58A',
    class: '#56D9B9',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
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
        <input type="text" id="${element.id}ColorHex" value="${currentColor}" placeholder="输入十六进制颜色值">
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
      const value = hexInput.value.trim();
      // 支持简写和完整格式
      if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
        colorInput.value = value;
        saveColorSetting(element.id, value);
        applyColorSettings();
      } else if (value === '') {
        // 清空时恢复默认值
        colorInput.value = defaultColor;
        hexInput.value = defaultColor;
      }
    });
    
    // 失去焦点时校验
    hexInput.addEventListener('blur', () => {
      const value = hexInput.value.trim();
      if (!/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
        hexInput.value = colorInput.value;
        alert('请输入有效的十六进制颜色值（如 #FF0000 或 #F00）');
      }
    });
  });
  
  // 绑定重置按钮事件
  document.getElementById('resetColorsBtn').addEventListener('click', () => {
    if (confirm('确定要重置为默认颜色吗？')) {
      localStorage.removeItem('customHighlightColors');
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
      applyColorSettings();
    }
  });
  
  // 主题切换时更新颜色设置
  themeToggle.addEventListener('click', () => {
    setTimeout(() => {
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
    }, 0);
  });
}

// 获取用户颜色设置
function getUserColors() {
  try {
    const saved = localStorage.getItem('customHighlightColors');
    return saved ? JSON.parse(saved) : { light: {}, dark: {} };
  } catch (e) {
    console.error('加载颜色设置失败:', e);
    return { light: {}, dark: {} };
  }
}

// 保存颜色设置
function saveColorSetting(elementId, color) {
  const theme = document.documentElement.getAttribute('data-theme');
  const userColors = getUserColors();
  
  if (!userColors[theme]) {
    userColors[theme] = {};
  }
  
  userColors[theme][elementId] = color;
  try {
    localStorage.setItem('customHighlightColors', JSON.stringify(userColors));
  } catch (e) {
    console.error('保存颜色设置失败:', e);
    alert('颜色设置保存失败，请检查本地存储');
  }
}

// 应用颜色设置
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
    
    // 为不同元素生成对应的CSS选择器
    if (element.id === 'function') {
      css += `[data-theme="${theme}"] .hljs-function { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title.function_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-name { color: ${color} !important; }\n`;
    } else if (element.id === 'punctuation') {
      css += `[data-theme="${theme}"] .hljs-punctuation { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-operator { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-symbol { color: ${color} !important; }\n`;
    } else if (element.id === 'variable') {
      css += `[data-theme="${theme}"] .hljs-variable { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-variable.language_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-name { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-var { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-identifier { color: ${color} !important; }\n`;
    } else if (element.id === 'class') {
      css += `[data-theme="${theme}"] .hljs-class { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title.class_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-type { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-built_in { color: ${color} !important; }\n`;
    } else {
      css += `[data-theme="${theme}"] .hljs-${element.id} { color: ${color} !important; }\n`;
    }
  });
  
  style.textContent = css;
  document.head.appendChild(style);
  
  // 重新渲染预览以应用新样式
  renderPreview();
}

/* ================= 底边栏/状态栏功能 ================= */

// 获取DOM元素
const statusBar = document.getElementById('statusBar');
const statusBarFloatBtn = document.getElementById('statusBarFloatBtn');
const toggleStatusBarBtn = document.getElementById('toggleStatusBar');
const toggleFixedModeBtn = document.getElementById('toggleFixedMode');
const totalCharsEl = document.getElementById('totalChars');
const textWordsEl = document.getElementById('textWords');
const lineCountEl = document.getElementById('lineCount');
const previewStatusEl = document.getElementById('previewStatus');

// 状态管理
const statusBarState = {
  isFixed: true,
  isCollapsed: true,
  updateTimer: null
};

// 初始化状态栏状态
function initStatusBar() {
  try {
    const savedState = localStorage.getItem('statusBarState');
    if (savedState) {
      Object.assign(statusBarState, JSON.parse(savedState));
    }
  } catch (e) {
    console.error('加载状态栏状态失败:', e);
  }
  
  // 设置初始样式
  statusBar.classList.toggle('collapsed', statusBarState.isCollapsed);
  statusBar.classList.toggle('fixed', statusBarState.isFixed);
  statusBar.classList.toggle('floating', !statusBarState.isFixed);
  
  // 更新按钮文本
  updateModeButtonText();
  
  // 首次计算统计信息
  updateStatusStats();
  
  // 设置悬浮按钮显示
  statusBarFloatBtn.style.display = statusBarState.isCollapsed ? 'flex' : 'none';
}

// 更新状态栏统计信息
function updateStatusStats() {
  const content = editor.value;
  
  // 1. 总字符数（包括空格、换行）
  const totalChars = content.length;
  
  // 2. 纯文本字数
  let plainText = content
    .replace(/[#*`~>_\[\](){}|!@$%^&+=\\]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ');
  
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (plainText.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length;
  const textWords = chineseChars + englishWords;
  
  // 3. 行数
  const lineCount = content.split('\n').length;
  
  // 更新DOM显示
  totalCharsEl.textContent = totalChars;
  textWordsEl.textContent = textWords;
  lineCountEl.textContent = lineCount;
  
  // 更新预览状态
  previewStatusEl.textContent = '已同步';
  
  // 3秒后重置预览状态
  clearTimeout(statusBarState.updateTimer);
  statusBarState.updateTimer = setTimeout(() => {
    previewStatusEl.textContent = '已同步';
  }, 3000);
}

// 切换状态栏收放
function toggleStatusBar() {
  statusBarState.isCollapsed = !statusBarState.isCollapsed;
  statusBar.classList.toggle('collapsed', statusBarState.isCollapsed);
  
  // 保存状态到本地存储
  saveStatusBarState();
  
  // 更新悬浮按钮显示
  statusBarFloatBtn.style.display = statusBarState.isCollapsed ? 'flex' : 'none';
  
  // 更新主容器高度
  updateContainerHeight();
}

// 切换固定/悬浮模式
function toggleFixedMode() {
  statusBarState.isFixed = !statusBarState.isFixed;
  statusBar.classList.toggle('fixed', statusBarState.isFixed);
  statusBar.classList.toggle('floating', !statusBarState.isFixed);
  
  // 更新按钮文本
  updateModeButtonText();
  
  // 保存状态
  saveStatusBarState();
  
  // 更新主容器高度
  updateContainerHeight();
}

// 更新模式按钮文本
function updateModeButtonText() {
  toggleFixedModeBtn.textContent = statusBarState.isFixed ? '🗕 悬浮' : '📌 固定';
}

// 保存状态栏状态到本地存储
function saveStatusBarState() {
  try {
    localStorage.setItem('statusBarState', JSON.stringify({
      isFixed: statusBarState.isFixed,
      isCollapsed: statusBarState.isCollapsed
    }));
  } catch (e) {
    console.error('保存状态栏状态失败:', e);
  }
}

// 更新主容器高度
function updateContainerHeight() {
  const container = document.querySelector('.container');
  if (statusBarState.isCollapsed || !statusBarState.isFixed) {
    container.style.height = 'calc(100vh - 52px)';
  } else {
    container.style.height = 'calc(100vh - 52px - 36px)';
  }
}

// 绑定事件监听
function bindStatusBarEvents() {
  // 悬浮按钮点击 - 展开状态栏
  statusBarFloatBtn.addEventListener('click', () => {
    statusBarState.isCollapsed = false;
    statusBar.classList.remove('collapsed');
    statusBarFloatBtn.style.display = 'none';
    saveStatusBarState();
    updateContainerHeight();
  });
  
  // 收放按钮点击
  toggleStatusBarBtn.addEventListener('click', toggleStatusBar);
  
  // 模式切换按钮点击
  toggleFixedModeBtn.addEventListener('click', toggleFixedMode);
  
  // 编辑器输入时更新统计信息
  editor.addEventListener('input', () => {
    previewStatusEl.textContent = '更新中...';
    updateStatusStats();
  });
  
  // 窗口大小变化时重新计算
  window.addEventListener('resize', () => {
    updateStatusStats();
    updateContainerHeight();
  });
}

/* 初始化 */
function init() {
  updateStats();
  renderPreview();
  initFileSystem();
  initColorSettings();
  applyColorSettings();
  initStatusBar();
  bindStatusBarEvents();
  updateContainerHeight(); // 初始化容器高度
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
