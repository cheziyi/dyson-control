import { DysonError } from "../error.js";
import type { DysonBroker } from "./connection.js";
import type { DysonMachine } from "./models/machine.js";
import {
  buildIotCredentialsRequest,
  encodeIotUsername,
  parseIotCredentials,
} from "./protocol/iotCredentials.js";
import {
  CLOUD_BROKER_ALPN_PROTOCOL,
  CLOUD_BROKER_PORT,
  CLOUD_ROUTES,
} from "./protocol/tables.js";
import type { DysonCloudTransport } from "./transport.js";

/** Asks the cloud through `transport` for the machine's broker, with
 * credentials for one connection. It rejects with whatever `transport`
 * throws, and with a `DysonError` with status 501 for a machine on the
 * RabbitMQ broker. */
export async function getCloudBroker(
  machine: DysonMachine,
  transport: DysonCloudTransport,
): Promise<DysonBroker> {
  if (machine.remoteBrokerType === "rabbitMq") {
    throw new DysonError(
      "A machine on the RabbitMQ broker is not supported",
      501,
    );
  }
  const credentials = parseIotCredentials(
    await transport.send({
      method: "POST",
      path: CLOUD_ROUTES.iotCredentials,
      jsonBody: buildIotCredentialsRequest(machine.serialNumber),
    }),
  );
  return {
    url: `mqtts://${credentials.endpoint}:${CLOUD_BROKER_PORT}`,
    clientId: credentials.clientId,
    username: encodeIotUsername(credentials),
    // On port 443 the broker tells MQTT from HTTPS by this.
    ALPNProtocols: [CLOUD_BROKER_ALPN_PROTOCOL],
  };
}
