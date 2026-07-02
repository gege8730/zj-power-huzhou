import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import vue from '@vitejs/plugin-vue'

function stripVueUseInvalidPureAnnotations(): Plugin {
  return {
    name: 'strip-vueuse-invalid-pure-annotations',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/')

      if (!normalizedId.includes('/node_modules/@vueuse/core/dist/index.js')) {
        return null
      }

      return {
        code: code.replace(/\/\*\s*#?__PURE__\s*\*\//g, ''),
        map: null,
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const elementPlusResolver = ElementPlusResolver({ importStyle: 'css' })
  const thunderProxyTarget = env.VITE_APP_THUNDER_PROXY_TARGET || env.VITE_APP_PROXY_TARGET

  return {
    base: env.VITE_APP_BASE_URL,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      stripVueUseInvalidPureAnnotations(),
      vue(),
      AutoImport({
        resolvers: [elementPlusResolver],
        dts: 'auto-imports.d.ts',
      }),
      Components({
        dirs: ['src/components'],
        extensions: ['vue'],
        deep: true,
        resolvers: [elementPlusResolver],
        dts: 'components.d.ts',
      }),
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vue-vendor',
                test: /[\\/]node_modules[\\/](?:vue|@vue)[\\/]/,
              },
              {
                name: 'element-plus',
                test: /[\\/]node_modules[\\/](?:element-plus|@element-plus|@vueuse)[\\/]/,
              },
              {
                name: 'echarts',
                test: /[\\/]node_modules[\\/]echarts[\\/]/,
              },
              {
                name: 'openlayers',
                test: /[\\/]node_modules[\\/]ol[\\/]/,
              },
              {
                name: 'gridfield',
                test: /[\\/]node_modules[\\/]@zjqx[\\/]gridfield[\\/]/,
              },
              {
                name: 'vendor',
                test: /[\\/]node_modules[\\/]/,
              },
            ],
          },
        },
      } as any,
    },
    server: {
      port: 5173,
      proxy: {
        '/hz/api/thunderList': {
          target: thunderProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/hz/api': {
          target: env.VITE_APP_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
