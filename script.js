const md = window.markdownit();


const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const fileInput = document.getElementById('fileInput');
const exportBtn = document.getElementById('exportBtn');


// 实时预览
editor.addEventListener('input', () => {
preview.innerHTML = md.render(editor.value);
});


// 上传 Markdown 文件
fileInput.addEventListener('change', (e) => {
const file = e.target.files[0];
if (!file) return;


const reader = new FileReader();
reader.onload = () => {
editor.value = reader.result;
preview.innerHTML = md.render(editor.value);
};
reader.readAsText(file);
});


// 导出 HTML
exportBtn.addEventListener('click', () => {
const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Markdown Export</title>
</head>
<body>
${preview.innerHTML}
</body>
</html>`;


const blob = new Blob([htmlContent], { type: 'text/html' });
const url = URL.createObjectURL(blob);


const a = document.createElement('a');
a.href = url;
a.download = 'export.html';
a.click();


URL.revokeObjectURL(url);
});