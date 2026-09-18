/**
 * REST API プロキシ
 * /api/proxy/* → auth-worker /alc-proxy/* → rust-alc-api の /api/*
 *
 * consumer は introspect / ACL / OIDC mint / identity 注入を一切行わず、
 * createAuthWorkerProxyHandler で auth-worker (service binding) へ
 * thin-forward するだけ (nuxt-trouble #434 step 3 方式 B と同型)。
 * consumer は X-Alc-Proxy-Secret (=INTERNAL_SHARED_SECRET、consumer proof) +
 * X-Alc-Proxy-Origin + browser JWT のみ載せる。auth-worker が
 * X-Alc-Proxy-Secret を constant-time 検証してから JWT 検証 + ACL + OIDC mint +
 * テナント識別ヘッダー/ユーザー識別ヘッダーの注入を行う
 * (フロントからテナント識別ヘッダーを付けることは無い)。
 * AUTH_WORKER binding は必須 (未設定は 503 で fail-closed)。
 */
import { createAuthWorkerProxyHandler } from '@ippoan/auth-client/server'
import { cfEnv, resolveSecret } from '../../utils/cfBindings'

export default defineEventHandler(async (event) => {
  const env = cfEnv(event)
  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
    })
  }
  const authWorker = env.AUTH_WORKER as { fetch: typeof fetch } | undefined
  if (!authWorker) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AUTH_WORKER service binding が未設定です',
    })
  }

  const proxy = createAuthWorkerProxyHandler({
    sharedSecret,
    authWorkerFetch: () => authWorker.fetch.bind(authWorker),
    // client の path が既に /api/maintenance/... を含むため pathPrefix='/' (二重 /api 防止)。
    pathPrefix: '/',
  })
  return proxy(event)
})
