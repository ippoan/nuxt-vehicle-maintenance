import { initApi } from '~/utils/api'

export function useAppInit() {
  const config = useRuntimeConfig()
  const { loadFromStorage, recoverFromCookie, isAuthenticated, token, isLoading, clearAuth } =
    useAuth()
  const apiBase = config.public.apiBase as string
  const stagingTenantId = (config.public.stagingTenantId as string) || ''

  async function setup() {
    // ブラウザは rust-alc-api を直叩きせず、同一 Worker の /api/proxy/*
    // server route 経由で叩く。proxy が Bearer JWT を introspect 検証して
    // テナント識別ヘッダー / ユーザー識別ヘッダーを注入するので、client 側で
    // tenant を手動付与しない (マルチテナントのため tenant 詐称の穴になる)。
    initApi(
      '/api/proxy',
      () => token.value,
      undefined,
      () => {
        clearAuth()
        navigateTo('/login')
      },
    )
    // localStorage から復元 → 未認証なら共有 cookie (Domain=.ippoan.org の
    // logi_auth_token) から復旧する。トップページや他アプリで既にログイン済みの
    // 場合に、このアプリへ遷移しただけで /login にバウンスするのを防ぐ。
    loadFromStorage()
    if (!isAuthenticated.value) {
      recoverFromCookie()
    }
  }

  return { apiBase, stagingTenantId, isLoading, setup }
}
