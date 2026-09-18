/**
 * Cloudflare Workers binding 取り出しの共通 helper。
 * server/api/proxy/[...path].ts が使う (nuxt-trouble の同名 helper を踏襲)。
 */
import type { H3Event } from 'h3'

/** nitro cloudflare_module の event から Workers env (bindings) を取り出す。 */
export function cfEnv(event: H3Event): Record<string, unknown> {
  return (event.context.cloudflare as { env?: Record<string, unknown> } | undefined)?.env ?? {}
}

/** Secrets Store binding (`.get()`) / 文字列 のいずれでも値を取り出す。 */
export async function resolveSecret(binding: unknown): Promise<string | null> {
  if (typeof binding === 'string') return binding
  if (binding && typeof (binding as { get?: unknown }).get === 'function') {
    return (await (binding as { get(): Promise<string> }).get()) ?? null
  }
  return null
}
