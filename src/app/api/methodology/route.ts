import { ok } from "@/server/http"
import { methodology } from "@/server/services/evaluation-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET() {
  return ok(methodology())
}
