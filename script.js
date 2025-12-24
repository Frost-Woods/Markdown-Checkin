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

// 👇 新增：全局变量 - 当前选中的代码块
let currentCodeBlock = null; 

// 👇 替换原有renderPreview函数为新的版本
function renderPreview() {
  preview.innerHTML = md.render(editor.value);
  
  // 为每个代码块添加样式选择器
  document.querySelectorAll('#preview pre.hljs').forEach((codeBlock, index) => {
    // 创建样式选择器元素
    const stylePicker = document.createElement('div');
    stylePicker.className = 'code-block-style-picker';
    stylePicker.innerHTML = '+';
    stylePicker.dataset.codeBlockIndex = index;
    
    // 点击事件 - 打开样式设置面板
    stylePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      currentCodeBlock = codeBlock;
      
      // 读取当前样式并设置到选择器
      const currentBg = codeBlock.style.backgroundColor || '#000000';
      const currentOpacity = codeBlock.style.opacity || 0.8;
      const currentColor = codeBlock.style.color || '#ffffff';
      
      document.getElementById('bgColorPicker').value = rgbToHex(currentBg) || '#000000';
      document.getElementById('opacitySlider').value = currentOpacity;
      document.getElementById('opacityValue').textContent = currentOpacity;
      document.getElementById('fontColorPicker').value = rgbToHex(currentColor) || '#ffffff';
      
      // 显示面板
      document.getElementById('codeStylePanel').classList.add('active');
    });
    
    // 添加到代码块
    codeBlock.appendChild(stylePicker);
  });
}

// 👇 新增：RGB转HEX工具函数
function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb;
  
  // 匹配rgb(r, g, b)格式
  const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // 匹配rgba(r, g, b, a)格式
  const rgbaMatch = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  return null;
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

  // 7. 处理当前文件删除后的逻辑（满足“编辑区清空”的核心需求）
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

/* ================= 代码块样式面板事件监听（新增） ================= */
// 等待DOM加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
  // 透明度滑块值显示
  const opacitySlider = document.getElementById('opacitySlider');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      document.getElementById('opacityValue').textContent = e.target.value;
    });
  }

  // 应用样式按钮
  const applyStyleBtn = document.getElementById('applyStyleBtn');
  if (applyStyleBtn) {
    applyStyleBtn.addEventListener('click', () => {
      if (!currentCodeBlock) return;
      
      const bgColor = document.getElementById('bgColorPicker').value;
      const opacity = document.getElementById('opacitySlider').value;
      const fontColor = document.getElementById('fontColorPicker').value;
      
      // 应用样式到当前代码块
      currentCodeBlock.style.backgroundColor = `${bgColor}`;
      currentCodeBlock.style.opacity = opacity;
      currentCodeBlock.style.color = fontColor;
      
      // 关闭面板
      document.getElementById('codeStylePanel').classList.remove('active');
    });
  }

  // 关闭面板按钮
  const closeStylePanel = document.getElementById('closeStylePanel');
  if (closeStylePanel) {
    closeStylePanel.addEventListener('click', () => {
      document.getElementById('codeStylePanel').classList.remove('active');
    });
  }

  // 点击页面其他地方关闭面板
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('codeStylePanel');
    if (!panel) return;
    
    const picker = document.querySelector('.code-block-style-picker:hover');
    if (!panel.contains(e.target) && !picker) {
      panel.classList.remove('active');
    }
  });
});

/* 初始化 */
updateStats();
renderPreview();
initFileSystem();