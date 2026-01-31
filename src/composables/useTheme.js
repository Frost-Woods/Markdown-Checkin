import { ref, onMounted } from 'vue'

export function useTheme() {
  const theme = ref(localStorage.getItem('theme') || 'dark')

  const setTheme = (newTheme) => {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    
    // 更新代码高亮主题
    const hljsLight = document.getElementById('hljs-light')
    const hljsDark = document.getElementById('hljs-dark')
    if (hljsLight && hljsDark) {
      hljsLight.disabled = newTheme === 'dark'
      hljsDark.disabled = newTheme !== 'dark'
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  onMounted(() => {
    setTheme(theme.value)
  })

  return {
    theme,
    setTheme,
    toggleTheme
  }
}