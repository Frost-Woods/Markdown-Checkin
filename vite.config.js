// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// 新增：引入 node 的 path 模块，用于解析绝对路径
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  },
  // 新增：配置路径解析规则，添加 @ 别名
  resolve: {
    alias: {
      // 将 @ 映射到项目根目录下的 src 文件夹
      '@': resolve(__dirname, 'src')
    }
  }
})