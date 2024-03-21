import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5114,
  },
  build: {
    target: 'esnext'
  },
  plugins: [
    vue(),
    basicSsl()
  ],
  resolve: {
    alias: [
      {
        find: '@knowlearning/agents/vue.js',
        replacement: __dirname + '/../../agents/vue.js'
      },
      {
        find: '@knowlearning/agents/browser.js',
        replacement: __dirname + '/../../agents/browser.js'
      },
      {
        find: '@knowlearning/patch-proxy',
        replacement: 'node_modules/@knowlearning/patch-proxy/index.js'
      },
      {
        find: 'fast-json-patch',
        replacement: 'node_modules/fast-json-patch/index.mjs'
      },
      {
        find: 'uuid',
        replacement: 'node_modules/uuid/dist/esm-browser/index.js'
      }
    ]
  }
})
