interface ApiErrorPayload {
  message?: unknown
  reason?: unknown
}

const extractMessageFromUnknown = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

export const readHttpErrorMessage = async (
  response: Response,
  fallbackMessage: string,
) => {
  try {
    const payload = (await response.clone().json()) as ApiErrorPayload
    const message = extractMessageFromUnknown(payload?.message)
    if (message) {
      return message
    }
    const reason = extractMessageFromUnknown(payload?.reason)
    if (reason) {
      return reason
    }
  } catch {
    // Not JSON or unreadable body.
  }

  try {
    const text = (await response.text()).trim()
    if (text.length > 0) {
      return text
    }
  } catch {
    // Ignore unreadable response body.
  }

  return fallbackMessage
}
