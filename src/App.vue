<template>
  <div :data-theme="theme">
    <TopBar
      :soundEnabled="soundEnabled"
      @toggle-left-sidebar="toggleLeftSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
      @toggle-sound="toggleSound"
      @toggle-theme="toggleTheme"
      @export-html="handleExportHTML"
      @export-md="handleExportMD"
      @export-pdf="handleExportPDF"
    />

    <div class="container">
      <SidebarLeft
        :collapsed="leftSidebarCollapsed"
        :repoOwner="repoOwner"
        :repoName="repoName"
        :filePath="filePath"
        :token="token"
        :todayCount="todayCount"
        :uploadChartData="uploadChartData"
        :currentTheme="theme"
        @upload-github="uploadToGitHub"
        @update-repo-owner="repoOwner = $event"
        @update-repo-name="repoName = $event"
        @update-file-path="filePath = $event"
        @update-token="token = $event"
        @reset-colors="resetHighlightColors"
      />

      <main class="main">
        <EditorPane
          v-model="currentContent"
          :previewContent="previewContent"
          @update:modelValue="handleEditorInput"
        />
      </main>

      <SidebarRight
        :collapsed="rightSidebarCollapsed"
        :files="files"
        :currentFile="currentFile"
        :fileNameInput="fileNameInput"
        @toggle-sidebar="toggleRightSidebar"
        @new-file="newFile"
        @open-file="openFile"
        @save-file="saveFile"
        @delete-file="deleteFile"
        @import-file="importFile"
        @update-file-name="fileNameInput = $event"
      />
    </div>

    <!-- 原有桌宠组件：保持完全不变 -->
    <DesktopPet v-if="showPet" />
    <!-- 新增AnotherDeskPet组件：独立控制显示 -->
    <AnotherDeskPet v-if="showAnotherPet" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import SidebarLeft from './components/SidebarLeft.vue'
import SidebarRight from './components/SidebarRight.vue'
import EditorPane from './components/EditorPane.vue'
// 原有桌宠组件：保留不动
import DesktopPet from './components/DesktopPet.vue'
// 新增：导入AnotherDeskPet组件
import AnotherDeskPet from './components/AnotherDeskPet.vue'

import { useTheme } from './composables/useTheme'
import { useFileSystem } from './composables/useFileSystem'
import { useAudio } from './composables/useAudio'
import { useGitHub } from './composables/useGitHub'
import { useHighlightColors } from './composables/useHighlightColors'
import { useSidebar } from './composables/useSidebar'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil, exportPDF as exportPDFUtil } from './utils/exportUtils'
import { markdownToHtml } from './utils/markdownParser'

// 使用组合式函数
const { theme, toggleTheme } = useTheme()
const { 
  files, 
  currentFile, 
  currentContent, 
  fileNameInput,
  previewContent,
  newFile, 
  openFile, 
  saveFile, 
  deleteFile, 
  importFile,
  renderPreview
} = useFileSystem(markdownToHtml)
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { 
  repoOwner, 
  repoName, 
  filePath, 
  token, 
  todayCount, 
  uploadChartData, 
  uploadToGitHub, 
  updateStats 
} = useGitHub()
const { resetHighlightColors } = useHighlightColors()
const { 
  leftSidebarCollapsed, 
  rightSidebarCollapsed, 
  toggleLeftSidebar, 
  toggleRightSidebar 
} = useSidebar()

// 原有桌宠显示控制：保持不变
const showPet = ref(true)
// 新增：AnotherDeskPet显示控制（独立开关，默认开启）
const showAnotherPet = ref(true)

// 处理编辑器输入
const handleEditorInput = (content) => {
  currentContent.value = content
  renderPreview()
  playEditSound()
}

// 导出功能
const handleExportHTML = () => {
  playExportSound()
  exportHTMLUtil(previewContent.value)
}

const handleExportMD = () => {
  playExportSound()
  exportMDUtil(currentContent.value, currentFile.value)
}

const handleExportPDF = () => {
  playExportSound()
  exportPDFUtil()
}

// 初始化
onMounted(() => {
  updateStats()
  if (currentFile.value) {
    renderPreview()
  }
})
</script>

<style scoped>
.container {
  display: flex;
  height: calc(100vh - 52px);
}
.main {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

/* 可选：为桌宠组件添加基础样式隔离，避免定位冲突 */
:deep(.another-desk-pet-container) {
  z-index: 9998; /* 低于原有桌宠（如果需要），可根据需求调整 */
}
:deep(.desktop-pet-container) {
  z-index: 9999;
}
</style>