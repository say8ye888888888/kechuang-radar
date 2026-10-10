import { NextResponse } from "next/server"

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init)
}

export function problem(
  status: number,
  code: string,
  message: string,
  fields?: { path: string; message: string }[],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fields?.length ? { fields } : {}),
      },
    },
    { status },
  )
}
