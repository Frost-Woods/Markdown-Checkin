import { ref, onMounted } from 'vue'

export function useAudio() {
  const soundEnabled = ref(localStorage.getItem('soundEnabled') !== '0')
  const audioUnlocked = ref(false)
  
  // 添加播放状态跟踪
  const editPlaying = ref(false)
  
  // 使用单个Audio实例（和原项目一致）
  let editAudio, exportAudio

  onMounted(() => {
    editAudio = new Audio('/audio/edit.mp3')
    exportAudio = new Audio('/audio/export.mp3')
    
    editAudio.volume = 0.4
    exportAudio.volume = 0.6
    
    // 监听编辑音效播放结束
    editAudio.addEventListener('ended', () => {
      editPlaying.value = false
    })

    // 解锁音频
    document.addEventListener('click', () => {
      if (!audioUnlocked.value) {
        editAudio.play().then(() => {
          editAudio.pause()
          editAudio.currentTime = 0
          audioUnlocked.value = true
        }).catch(() => {})
      }
    }, { once: true })
  })

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem('soundEnabled', soundEnabled.value ? '1' : '0')
  }

  const playEditSound = () => {
    // 和原项目一致：音频未解锁、音效关闭、正在播放时跳过
    if (!audioUnlocked.value || !soundEnabled.value || editPlaying.value) return
    
    editPlaying.value = true
    editAudio.currentTime = 0
    
    const playPromise = editAudio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        editPlaying.value = false
      })
    }
  }

  const playExportSound = () => {
    // 和原项目一致：音频未解锁、音效关闭时跳过，不检查播放状态
    if (!audioUnlocked.value || !soundEnabled.value) return
    
    exportAudio.currentTime = 0
    
    const playPromise = exportAudio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.log('导出音效播放失败')
      })
    }
  }

  return {
    soundEnabled,
    toggleSound,
    playEditSound,
    playExportSound
  }
}