import { ref, onMounted } from 'vue'

export function useAudio() {
  // 保留原有：从localStorage读取音效开关，持久化存储
  const soundEnabled = ref(localStorage.getItem('soundEnabled') !== '0')
  // 保留原有：浏览器音频政策解锁标记
  const audioUnlocked = ref(false)
  
  // 保留原有：播放状态跟踪，防止重复播放
  const editPlaying = ref(false)
  const petPlaying = ref(false)
  // 新增：哭泣音频播放状态跟踪，和原有逻辑保持一致
  const cryPlaying = ref(false)

  // 新整合：音频实例缓存Map，复用实例避免重复创建，统一管理所有音频
  const audioInstances = new Map()
  // 保留原有：音频实例声明（和原项目一致）
  let editAudio, exportAudio, petAudio, cryAudio

  onMounted(() => {
    // 1. 保留原有：创建专属音频实例+设置专属音量（和原代码完全一致）
    editAudio = new Audio('/audio/edit.mp3')
    exportAudio = new Audio('/audio/export.mp3')
    petAudio = new Audio('/audio/pet.mp3')
    // 新增：哭泣音频实例，设置合适音量（和宠物音频一致）
    cryAudio = new Audio('/audio/recry.mp3')
    
    editAudio.volume = 0.4
    exportAudio.volume = 0.6
    petAudio.volume = 0.4
    cryAudio.volume = 0.4  // 哭泣音频和宠物音频音量保持一致
    
    // 2. 新整合：将所有实例加入缓存Map，统一管理
    audioInstances.set('/audio/edit.mp3', editAudio)
    audioInstances.set('/audio/export.mp3', exportAudio)
    audioInstances.set('/audio/pet.mp3', petAudio)
    audioInstances.set('/audio/recry.mp3', cryAudio)
    
    // 3. 保留原有：监听音频播放结束，重置播放状态（和原代码完全一致）
    editAudio.addEventListener('ended', () => {
      editPlaying.value = false
    })
    petAudio.addEventListener('ended', () => {
      petPlaying.value = false
    })
    // 新增：监听哭泣音频播放结束，重置哭泣播放状态
    cryAudio.addEventListener('ended', () => {
      cryPlaying.value = false
    })

    // 4. 保留原有：浏览器音频解锁逻辑（用户首次点击后解锁，仅执行一次）
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

  // 保留原有：切换音效开关+持久化到localStorage（和原代码完全一致）
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    localStorage.setItem('soundEnabled', soundEnabled.value ? '1' : '0')
    // 新整合：关闭音效时，暂停缓存中所有正在播放的音频
    if (!soundEnabled.value) {
      audioInstances.forEach(audio => audio.pause())
      // 重置所有播放状态
      editPlaying.value = false
      petPlaying.value = false
      cryPlaying.value = false
    }
  }

  // 保留原有：编辑音效播放逻辑（和原代码完全一致，无任何修改）
  const playEditSound = () => {
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

  // 保留原有：导出音效播放逻辑（和原代码完全一致，无任何修改）
  const playExportSound = () => {
    if (!audioUnlocked.value || !soundEnabled.value) return
    
    exportAudio.currentTime = 0
    const playPromise = exportAudio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.log('导出音效播放失败')
      })
    }
  }

  // 保留原有：宠物音效播放逻辑（和原代码完全一致，无任何修改）
  const playPetSound = () => {
    if (!audioUnlocked.value || !soundEnabled.value || petPlaying.value) return
    
    petPlaying.value = true
    petAudio.currentTime = 0
    
    const playPromise = petAudio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        petPlaying.value = false
      })
    }
  }

  // 新增：哭泣音效播放逻辑（和宠物/编辑音效逻辑一致，防止重复播放）
  const playCrySound = () => {
    if (!audioUnlocked.value || !soundEnabled.value || cryPlaying.value) return
    
    cryPlaying.value = true
    cryAudio.currentTime = 0
    
    const playPromise = cryAudio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        cryPlaying.value = false
      })
    }
    // 关键：返回音频实例，供桌宠组件监听ended/error事件
    return cryAudio
  }

  // 新整合：通用音频播放函数，返回实例支持监听ended/error，适配所有音频
  // 保留原有音频解锁+开关判断，同时复用缓存实例，兼容项目其他扩展
  const playSound = (src) => {
    // 基础校验：未解锁/音效关闭，直接返回null
    if (!audioUnlocked.value || !soundEnabled.value) return null
    
    try {
      // 复用缓存中的实例，无则创建并加入缓存
      let audio = audioInstances.get(src)
      if (!audio) {
        audio = new Audio(src)
        audio.volume = 0.5 // 通用音频默认音量
        audioInstances.set(src, audio)
      }
      // 重新播放时重置播放位置
      if (audio.ended) audio.currentTime = 0
      // 播放音频（兼容异步）
      audio.play().catch(e => console.warn('通用音频播放失败:', src, e))
      // 关键：返回音频实例，支持外部监听ended/error
      return audio
    } catch (error) {
      console.error('通用音频创建失败:', src, error)
      return null
    }
  }

  // 保留原有返回项 + 新增哭泣音频相关方法，向下兼容原项目所有调用
  return {
    soundEnabled,
    toggleSound,
    playEditSound,
    playExportSound,
    playPetSound,
    playSound,
    playCrySound // 新增：暴露哭泣音频播放方法（返回实例）
  }
}