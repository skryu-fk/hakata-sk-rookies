/**
 * VAPID 公開鍵。
 * 公開鍵は秘密ではないのでコードに直書きしてよい（クライアントの購読登録に必要）。
 * 秘密鍵はサーバーの環境変数 VAPID_PRIVATE_KEY に置く（push-server.ts 参照）。
 *
 * 環境変数 NEXT_PUBLIC_VAPID_PUBLIC_KEY があればそちらを優先（鍵を入れ替えたい時用）。
 */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BHp58tShe54G9OtU_X85Dx2ug6j4_u3ITSN3YFKhDCiOLbkXsnGrMrOvapX_1-vJmckjxDEQvi4S5lpISV6aEGI";
