const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

export const readOptionalEnv = (name: string): string | null => {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : null
}

export const readBooleanEnv = (
  name: string,
  defaultValue: boolean,
): boolean => {
  const value = readOptionalEnv(name)
  if (value === null) return defaultValue
  return value === "true"
}

export const readIntegerEnv = (
  name: string,
  defaultValue: number,
): number => {
  const value = readOptionalEnv(name)
  if (value === null) return defaultValue

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

export const validateHttpUrl = (value: string, envName: string): string => {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`${envName} must start with http:// or https://`)
    }
    return trimTrailingSlash(value)
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ""
    throw new Error(`Invalid ${envName}.${detail}`)
  }
}

export const readValidatedHttpEnv = (name: string): string | null => {
  const value = readOptionalEnv(name)
  return value ? validateHttpUrl(value, name) : null
}

export const isProductionRuntime = () => process.env.NODE_ENV === "production"
