import type { MachineCategory, RemoteBrokerType } from "../models/machine.js";

// The hosts, routes, headers and codes of the Dyson cloud.

/** The cloud for mainland China is `china`, picked by the account's country
 * `CN`. */
export const CLOUD_ORIGINS = {
  global: "https://appapi.cp.dyson.com",
  china: "https://appapi.cp.dyson.cn",
} as const;

export const CLOUD_CHINA_COUNTRY = "CN";

export const CLOUD_ROUTES = {
  loginCode: "/v3/userregistration/email/auth",
  logIn: "/v3/userregistration/email/verify",
  manifest: "/v3/manifest",
  iotCredentials: "/v2/authorize/iot-credentials",
} as const;

/** Sent on every request. Whether the cloud refuses another `X-App-Version`
 * or `User-Agent` is not known: see UNSUPPORTED.md. */
export const CLOUD_HEADERS = {
  "X-Platform": "android",
  "X-App-Version": "6.4.26381",
  "User-Agent": "okhttp/4.12.0",
} as const;

/** `category` in the manifest. */
export const CLOUD_CATEGORY_CODES: Readonly<Record<MachineCategory, string>> = {
  environmentalCare: "ec",
  robot: "robot",
  lighting: "light",
  wearableEnvironmentalCare: "wearable",
  hairCare: "hc",
  floorCare: "flrc",
  formulation: "formulation",
  oralCare: "oc",
};

/** `remoteBrokerType` in the manifest. */
export const CLOUD_REMOTE_BROKER_TYPE_CODES: Readonly<
  Record<RemoteBrokerType, string>
> = {
  awsIot: "wss",
  rabbitMq: "mqtts",
};

/** The port and the ALPN protocol the broker takes MQTT over TLS on. */
export const CLOUD_BROKER_PORT = 443;
export const CLOUD_BROKER_ALPN_PROTOCOL = "mqtt";

/** The parameters of the MQTT username that name the broker's authorizer
 * and carry the signature of the token. */
export const CLOUD_AUTHORIZER_PARAMETERS = {
  name: "x-amz-customauthorizer-name",
  signature: "x-amz-customauthorizer-signature",
} as const;
