import { DysonError } from "../../error.js";
import { parseCloudReply } from "./account.js";
import { CLOUD_AUTHORIZER_PARAMETERS } from "./tables.js";

/** What the cloud hands out to reach one machine through its broker. */
export interface IotCredentials {
  /** The broker's host name. */
  endpoint: string;
  clientId: string;
  /** What `encodeIotUsername` names the broker's authorizer with. */
  customAuthorizerName: string;
  tokenKey: string;
  tokenValue: string;
  tokenSignature: string;
}

export function buildIotCredentialsRequest(serialNumber: string): unknown {
  return { Serial: serialNumber };
}

export function parseIotCredentials(text: string): IotCredentials {
  const reply = parseCloudReply(text);
  const credentials =
    typeof reply.IoTCredentials === "object" && reply.IoTCredentials !== null
      ? (reply.IoTCredentials as Record<string, unknown>)
      : {};
  const fields = {
    endpoint: reply.Endpoint,
    clientId: credentials.ClientId,
    customAuthorizerName: credentials.CustomAuthorizerName,
    tokenKey: credentials.TokenKey,
    tokenValue: credentials.TokenValue,
    tokenSignature: credentials.TokenSignature,
  };
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== "string") {
      throw new DysonError(`The Dyson cloud sent no ${name}`, 502);
    }
  }
  return fields as IotCredentials;
}

/** The MQTT username the broker takes the credentials as. The broker takes
 * no password. */
export function encodeIotUsername(credentials: IotCredentials): string {
  // A signature the cloud already percent-encoded goes as given.
  const signature = credentials.tokenSignature.includes("%")
    ? credentials.tokenSignature
    : encodeURIComponent(credentials.tokenSignature);
  return [
    `?${CLOUD_AUTHORIZER_PARAMETERS.name}=${credentials.customAuthorizerName}`,
    `${CLOUD_AUTHORIZER_PARAMETERS.signature}=${signature}`,
    `${credentials.tokenKey}=${credentials.tokenValue}`,
  ].join("&");
}
