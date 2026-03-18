import {
  readValidatedHttpEnv,
} from "@/lib/config/env"

const resolveServerApiBase = () => {
  const validatedPublicApiBase = readValidatedHttpEnv("NEXT_PUBLIC_API_BASE_URL")
  const validatedInternalApiBase = readValidatedHttpEnv("SOLERA_API_INTERNAL_URL")

  if (validatedPublicApiBase) return validatedPublicApiBase
  if (validatedInternalApiBase) return validatedInternalApiBase

  throw new Error(
    "Missing API configuration for server runtime. Define NEXT_PUBLIC_API_BASE_URL or SOLERA_API_INTERNAL_URL.",
  )
}

export const API_BASE_URL =
  typeof window === "undefined"
    ? resolveServerApiBase()
    : "/api/backend"
