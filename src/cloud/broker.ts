import { randomUUID } from "node:crypto";
import { DysonError } from "../error.js";
import type { DysonBroker } from "./connection.js";
import type { DysonMachine } from "./models/machine.js";
import {
  buildCloudBroker,
  buildIotCredentialsRequest,
  parseIotCredentials,
} from "./protocol/iotCredentials.js";
import { CLOUD_ROUTES } from "./protocol/tables.js";
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
  // The cloud hands out an empty ClientId at times: the broker then takes
  // one of the client's own.
  return buildCloudBroker(
    credentials,
    credentials.clientId === "" ? randomUUID() : credentials.clientId,
  );
}
