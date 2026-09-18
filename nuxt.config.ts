// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // auth-client の SSR 認証状態 (opt-in、Refs ippoan/auth-worker#560)。
  // server が cookie から認証の判定 (expiresAt / orgId / username) を決めて useState に載せる。
  // payload に生 JWT は載らない。戻すときはこの 1 行を消す。
  ippoanAuthClient: { authState: true },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
      authWorkerUrl: process.env.NUXT_PUBLIC_AUTH_WORKER_URL || '',
      stagingTenantId: process.env.NUXT_PUBLIC_STAGING_TENANT_ID || '',
    },
  },

  nitro: {
    preset: 'cloudflare_module',
  },

  // @ippoan/auth-client を SSR/Nitro 経路で transpile (root import は .ts + .vue)。
  build: {
    transpile: ['@ippoan/auth-client'],
  },

  vite: {
    server: {
      allowedHosts: ['nuxt-vehicle-maintenance.dev.ippoan.org', '.trycloudflare.com'],
    },
    optimizeDeps: {
      // @ippoan/auth-client は .ts ソースで公開されており Vite の dep pre-bundle で
      // `#imports` の解決がバグって invalid JS になる。exclude で SSR/ESM 経路に委ねる。
      exclude: ['@ippoan/auth-client'],
    },
  },

  modules: [
    '@nuxt/ui',
    // chunk load 失敗 (immutable キャッシュされた `/_nuxt/*.js` の 404) からの自動復旧。
    // `experimental.emitRouteChunkError = 'manual'` と transpile 登録も module 側が行う
    // ので consumer は 1 行で済む (Refs #236 / ippoan/auth-worker#452)。
    '@ippoan/auth-client/module',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    tsConfig: {
      compilerOptions: {
        skipLibCheck: true,
      },
    },
  },
})
