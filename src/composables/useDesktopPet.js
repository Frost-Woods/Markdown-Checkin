import { ref, onMounted, onUnmounted } from 'vue'

export function useDesktopPet() {
  // 桌宠的位置和尺寸
  const petPosition = ref({ x: window.innerWidth - 200, y: window.innerHeight - 200 })
  const petSize = ref({ width: 150, height: 150 })
  
  // 拖拽状态
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })
  
  // 拉伸状态
  const isResizing = ref(false)
  const resizeStart = ref({ x: 0, y: 0 })
  const originalSize = ref({ width: 0, height: 0 })
  
  // ========== 新增：抖动物理效果状态 ==========
  const physicsConfig = {
    sticky: 0.05,
    maxR: 60,
    maxY: 110,
    cut: 0.1,
    inertia: 0.04,
    decay: 0.98,
    defaultFrameUnix: 1000/60
  }
  
  const petState = ref({
    r: 12,        // 旋转角度
    y: 2,         // 垂直位移
    t: 0,         // 垂直速度
    w: 0,         // 角速度
    running: false, // 是否在抖动
    originRotate: 0 // 初始旋转
  })
  
  let animationFrameId = null
  let lastRunUnix = +new Date()

  // ========== 【新增】哭泣功能相关状态 ==========
  const isCrying = ref(false) // 是否处于哭泣状态（核心拦截标识）
  const interactCount = ref(0) // 3秒内的抖动交互次数
  let interactTimer = null // 3秒重置次数的定时器
  let cryingShakeId = null // 哭泣摇晃的动画帧id
  const cryDuration = 7000 // 哭泣摇晃持续时间（7秒）

  // ========== 新增：上下半区判断 ==========
  const isBottomHalf = (e, rect) => {
    const clickY = e.type.includes('mouse') ? e.clientY - rect.top : e.touches[0].clientY - rect.top
    return clickY > rect.height / 2
  }
  
  // 鼠标事件处理函数
  let mouseMoveHandler = null
  let mouseUpHandler = null
  
  // ========== 【修改】抖动物理引擎 - 哭泣时停止原有抖动 ==========
  const updatePetStyle = (element) => {
    if (element && !isCrying.value) { // 哭泣状态下不更新原有抖动样式
      element.style.transform = `rotate(${petState.value.r}deg) translateY(${petState.value.y}px)`
      element.style.transition = 'none'
    }
  }
  
  const runPhysics = (element) => {
    if (!petState.value.running || !element || isCrying.value) return // 哭泣时终止物理计算
    
    const runUnix = +new Date()
    const lastRunUnixDiff = runUnix - lastRunUnix
    let inertia = physicsConfig.inertia
    
    if (lastRunUnixDiff < 16) {
      inertia = physicsConfig.inertia / physicsConfig.defaultFrameUnix * lastRunUnixDiff
    }
    lastRunUnix = runUnix

    // 物理计算
    petState.value.w = petState.value.w - petState.value.r * 2 - petState.value.originRotate
    petState.value.r = petState.value.r + petState.value.w * inertia * 1.2
    petState.value.w = petState.value.w * physicsConfig.decay

    petState.value.t = petState.value.t - petState.value.y * 2
    petState.value.y = petState.value.y + petState.value.t * inertia * 2
    petState.value.t = petState.value.t * physicsConfig.decay

    // 判断是否需要停止抖动
    const maxAbsValue = Math.max(
      Math.abs(petState.value.w),
      Math.abs(petState.value.r),
      Math.abs(petState.value.t),
      Math.abs(petState.value.y)
    )
    
    if (maxAbsValue < physicsConfig.cut) {
      petState.value.running = false
      return
    }
    
    updatePetStyle(element)
    animationFrameId = requestAnimationFrame(() => runPhysics(element))
  }

  const movePet = (x, y, element) => {
    if (isCrying.value) return // 哭泣时禁止移动抖动参数
    let r = x * physicsConfig.sticky
    r = Math.max(-physicsConfig.maxR, Math.min(physicsConfig.maxR, r))
    let dy = y * physicsConfig.sticky * 2
    dy = Math.max(-physicsConfig.maxY, Math.min(physicsConfig.maxY, dy))
    
    petState.value.r = r
    petState.value.y = dy
    petState.value.w = 0
    petState.value.t = 0
    petState.value.running = false
    
    updatePetStyle(element)
  }

  const startRun = (element) => {
    if (petState.value.running || !element || isCrying.value) return // 哭泣时禁止开始抖动
    petState.value.running = true
    lastRunUnix = +new Date()
    animationFrameId = requestAnimationFrame(() => runPhysics(element))
  }

  const stopRun = () => {
    petState.value.running = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // ========== 【新增】重置3秒内交互次数 ==========
  const resetInteractCount = () => {
    interactCount.value = 0
    if (interactTimer) clearTimeout(interactTimer)
  }

  // ========== 【修改】哭泣摇晃动画 - 移除放大，仅保留旋转 ==========
  const cryingShake = (element) => {
    if (!isCrying.value || !element) return
    // 简单且自然的左右摇晃逻辑，仅保留旋转，删除scale(3)
    const now = Date.now()
    const shakeRatio = (now % 200) / 100 - 1 // -1 ~ 1 循环
    element.style.transform = `rotate(${shakeRatio * 15}deg)` // 仅保留旋转
    cryingShakeId = requestAnimationFrame(() => cryingShake(element))
  }

  // ========== 【修改】触发哭泣效果 - 移除transformOrigin设置 ==========
  const triggerCrying = (element) => {
    if (isCrying.value || !element) return
    // 1. 置为哭泣状态，禁止所有交互
    isCrying.value = true
    // 2. 停止原有所有动画
    stopRun()
    if (cryingShakeId) cancelAnimationFrame(cryingShakeId)
    // 3. 重置交互次数，避免重复触发
    resetInteractCount()
    // 4. 开始哭泣摇晃动画
    element.style.transition = 'none' // 关闭过渡，摇晃更流畅
    cryingShake(element)
  }

  // ========== 【修改】停止哭泣 - 移除transformOrigin重置 ==========
  const stopCrying = (element) => {
    if (!isCrying.value || !element) return
    // 1. 关闭哭泣状态
    isCrying.value = false
    // 2. 停止哭泣摇晃动画
    if (cryingShakeId) cancelAnimationFrame(cryingShakeId)
    // 3. 复原样式
    element.style.transform = 'none'
    element.style.transition = 'transform 0.1s ease'
    // 4. 恢复初始轻微抖动
    setTimeout(() => {
      petState.value.r = 5
      petState.value.y = 3
      petState.value.running = true
      startRun(element)
    }, 300)
  }

  // ========== 修改：开始拖拽（针对下半区）- 【新增】哭泣状态拦截 ==========
  const startDrag = (e, element) => {
    if (isCrying.value) return // 哭泣时禁止拖拽
    e.preventDefault()
    e.stopPropagation()
    
    // 如果是下半区，停止抖动
    const rect = element.getBoundingClientRect()
    if (isBottomHalf(e, rect)) {
      stopRun()
    }
    
    if (isResizing.value) return
    
    isDragging.value = true
    dragOffset.value = {
      x: e.clientX - petPosition.value.x,
      y: e.clientY - petPosition.value.y
    }
    
    // 添加全局鼠标事件监听
    mouseMoveHandler = (moveE) => handleMouseMove(moveE, element)
    mouseUpHandler = stopDrag
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
  }
  
  // ========== 修改：开始上半区交互（抖动）- 【新增】次数统计+哭泣触发 ==========
  const startTopHalfInteraction = (e, element, playAudio) => {
    if (isCrying.value) return // 哭泣时禁止抖动交互
    e.preventDefault()
    e.stopPropagation()

    // 【新增】1. 统计3秒内交互次数
    interactCount.value += 1
    // 重置3秒定时器，3秒后清空次数
    if (interactTimer) clearTimeout(interactTimer)
    interactTimer = setTimeout(resetInteractCount, 3000)
    // 【新增】2. 3秒内超3次，触发哭泣（返回不执行原有抖动）
    if (interactCount.value >= 3) {
      triggerCrying(element) // 触发哭泣动画
      return // 终止原有抖动逻辑
    }
    
    // 原有逻辑：播放音频
    if (playAudio) {
      playAudio()
    }
    
    const startX = e.pageX
    const startY = e.pageY
    
    // 上半区交互：移动时更新抖动参数
    const handleMouseMove = (moveE) => {
      if (isCrying.value) { // 哭泣时终止移动监听
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        return
      }
      const x = moveE.pageX - startX
      const y = moveE.pageY - startY
      movePet(x, y, element)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (!isCrying.value) startRun(element) // 哭泣时不启动原有抖动
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  // ========== 修改：处理触摸事件 - 【新增】哭泣状态拦截 ==========
  const handleTouchStart = (e, element, isBottom, playAudio) => {
    if (isCrying.value) return // 哭泣时禁止触摸交互
    e.preventDefault()
    
    if (!e.touches[0]) return
    
    if (isBottom) {
      // 下半区：拖拽移动
      stopRun()
      const rect = element.getBoundingClientRect()
      const startX = e.touches[0].clientX - rect.left
      const startY = e.touches[0].clientY - rect.top
      
      const handleTouchMove = (moveE) => {
        if (isCrying.value || !moveE.touches[0]) { // 哭泣时终止触摸移动
          document.removeEventListener('touchmove', handleTouchMove)
          document.removeEventListener('touchend', handleTouchEnd)
          return
        }
        const clientX = moveE.touches[0].clientX
        const clientY = moveE.touches[0].clientY
        const newLeft = clientX - startX
        const newTop = clientY - startY
        
        petPosition.value.x = Math.max(0, Math.min(newLeft, window.innerWidth - petSize.value.width))
        petPosition.value.y = Math.max(0, Math.min(newTop, window.innerHeight - petSize.value.height))
        element.style.transform = 'none'
      }
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
      
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    } else {
      // 【新增】触摸上半区：统计交互次数
      interactCount.value += 1
      if (interactTimer) clearTimeout(interactTimer)
      interactTimer = setTimeout(resetInteractCount, 3000)
      if (interactCount.value >= 3) {
        triggerCrying(element)
        return
      }

      // 上半区：抖动交互
      if (playAudio) {
        playAudio()
      }
      
      const startX = e.touches[0].pageX
      const startY = e.touches[0].pageY
      
      const handleTouchMove = (moveE) => {
        if (isCrying.value || !moveE.touches[0]) { // 哭泣时终止触摸移动
          document.removeEventListener('touchmove', handleTouchMove)
          document.removeEventListener('touchend', handleTouchEnd)
          return
        }
        const x = moveE.touches[0].pageX - startX
        const y = moveE.touches[0].pageY - startY
        movePet(x, y, element)
      }
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
        if (!isCrying.value) startRun(element)
      }
      
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }
  }

  // ========== 修改：处理拖拽移动 - 【新增】哭泣状态拦截 ==========
  const handleMouseMove = (e, element) => {
    if (!isDragging.value || isCrying.value) return // 哭泣时禁止拖拽移动
    petPosition.value = {
      x: e.clientX - dragOffset.value.x,
      y: e.clientY - dragOffset.value.y
    }
    
    // 限制在窗口范围内
    const maxX = window.innerWidth - petSize.value.width
    const maxY = window.innerHeight - petSize.value.height
    
    petPosition.value.x = Math.max(0, Math.min(petPosition.value.x, maxX))
    petPosition.value.y = Math.max(0, Math.min(petPosition.value.y, maxY))
    
    // 拖拽时重置变形
    if (element) {
      element.style.transform = 'none'
    }
  }

  // ========== 修改：处理拉伸移动 - 【新增】哭泣状态拦截 ==========
  const handleResizeMove = (e) => {
    if (!isResizing.value || isCrying.value) return // 哭泣时禁止拉伸
    const deltaX = e.clientX - resizeStart.value.x
    const deltaY = e.clientY - resizeStart.value.y
    
    // 保持宽高比例，或者可以自由拉伸（这里使用自由拉伸）
    const newWidth = Math.max(50, originalSize.value.width + deltaX)
    const newHeight = Math.max(50, originalSize.value.height + deltaY)
    
    petSize.value = {
      width: newWidth,
      height: newHeight
    }
    
    // 确保不超过窗口范围
    const maxX = window.innerWidth - petPosition.value.x
    const maxY = window.innerHeight - petPosition.value.y
    
    petSize.value.width = Math.min(petSize.value.width, maxX)
    petSize.value.height = Math.min(petSize.value.height, maxY)
  }

  // ========== 修改：开始拉伸 - 【新增】哭泣状态拦截 ==========
  const startResize = (e) => {
    if (isCrying.value) return // 哭泣时禁止拉伸
    e.preventDefault()
    e.stopPropagation()
    
    isResizing.value = true
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    originalSize.value = { ...petSize.value }
    
    // 添加全局鼠标事件监听
    mouseMoveHandler = handleResizeMove
    mouseUpHandler = stopResize
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
  }

  // 停止拖拽
  const stopDrag = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    removeEventListeners()
  }

  // 停止拉伸
  const stopResize = () => {
    if (!isResizing.value) return
    
    isResizing.value = false
    removeEventListeners()
  }

  // 移除事件监听
  const removeEventListeners = () => {
    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler)
    }
    if (mouseUpHandler) {
      document.removeEventListener('mouseup', mouseUpHandler)
    }
    mouseMoveHandler = null
    mouseUpHandler = null
  }

  // 窗口大小改变时调整位置
  const handleResize = () => {
    const maxX = window.innerWidth - petSize.value.width
    const maxY = window.innerHeight - petSize.value.height
    
    petPosition.value.x = Math.min(petPosition.value.x, maxX)
    petPosition.value.y = Math.min(petPosition.value.y, maxY)
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    // 初始抖动
    setTimeout(() => {
      const element = document.querySelector('.desktop-pet')
      if (element && !isCrying.value) {
        startRun(element)
      }
    }, 1000)
  })

  // 【修改】卸载时清理所有定时器和动画
  onUnmounted(() => {
    stopRun()
    removeEventListeners()
    window.removeEventListener('resize', handleResize)
    // 清理哭泣相关
    resetInteractCount()
    isCrying.value = false
    if (cryingShakeId) cancelAnimationFrame(cryingShakeId)
  })

  // 【修改】返回值 - 新增哭泣相关状态和方法
  return {
    petPosition,
    petSize,
    isDragging,
    isResizing,
    petState,
    isCrying, // 暴露哭泣状态
    startDrag,
    startResize,
    startTopHalfInteraction,
    handleTouchStart,
    stopDrag,
    stopResize,
    stopRun,
    isBottomHalf,
    triggerCrying, // 暴露触发哭泣方法
    stopCrying // 暴露停止哭泣方法
  }
}