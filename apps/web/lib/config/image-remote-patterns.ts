import { DEXSCREENER_IMAGE_HOSTNAME } from "../external/external-links"

export const REMOTE_IMAGE_PATTERNS = [
  {
    protocol: "https",
    hostname: "e.radikal.host",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "cryptologos.cc",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "cdn.sanity.io",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "ondo.finance",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: DEXSCREENER_IMAGE_HOSTNAME,
    port: "",
    pathname: "/**",
  },
] as const
