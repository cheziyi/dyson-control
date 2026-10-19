import type { MachineCategory, RemoteBrokerType } from "../models/machine.js";

// The hosts, routes, headers and codes of the Dyson cloud.

/** The cloud for mainland China is `china`, picked by the account's country
 * `CN`. */
export const CLOUD_ORIGINS = {
  global: "https://appapi.cp.dyson.com",
  china: "https://appapi.cp.dyson.cn",
} as const;

export const CLOUD_CHINA_COUNTRY = "CN";

export const CLOUD_LOGIN_CODE_USER_STATUS = {
  accountStatus: "ACTIVE",
  authenticationMethod: "EMAIL_PASSWORD_2FA",
} as const;

export const CLOUD_ROUTES = {
  userStatus: "/v3/userregistration/email/userstatus",
  loginCode: "/v3/userregistration/email/auth",
  login: "/v3/userregistration/email/verify",
  manifest: "/v3/manifest",
  iotCredentials: "/v2/authorize/iot-credentials",
  supportedMarket: "/v1/supportedmarket",
} as const;

/** `category` in the manifest. */
export const CLOUD_MACHINE_CATEGORY_CODES: Readonly<
  Record<MachineCategory, string>
> = {
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

/** How the manifest encrypts `localBrokerCredentials`: AES-256 in CBC mode,
 * the same key and IV for every machine. */
export const CLOUD_LOCAL_BROKER_CREDENTIALS_CIPHER = {
  algorithm: "aes-256-cbc",
  key: Buffer.from([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
  ]),
  iv: Buffer.alloc(16),
} as const;
