import { createDecipheriv } from "node:crypto";
import { DysonError } from "../../error.js";
import type { DysonRegion } from "../models/account.js";
import { type DysonMachine, MACHINE_CATEGORIES } from "../models/machine.js";
import {
  CLOUD_LOCAL_BROKER_CREDENTIALS_CIPHER,
  CLOUD_MACHINE_CATEGORY_CODES,
  CLOUD_QUERY_PARAMETERS,
  CLOUD_REMOTE_BROKER_TYPE_CODES,
} from "./tables.js";

/** The query of the manifest route: the account's country as its market and
 * its culture as its locale. */
export function buildManifestQuery(
  region: Required<DysonRegion>,
): Record<string, string> {
  return {
    [CLOUD_QUERY_PARAMETERS.market]: region.country,
    [CLOUD_QUERY_PARAMETERS.locale]: region.culture,
  };
}

/** The machines of a manifest that the broker reaches: an entry the cloud
 * gives no MQTT configuration, serial number or type for is left out. It
 * throws a `DysonError` with status 502 for a reply that is no list. */
export function parseMachines(text: string): DysonMachine[] {
  let reply: unknown;
  try {
    reply = JSON.parse(text);
  } catch {
    reply = undefined;
  }
  if (!Array.isArray(reply)) {
    throw new DysonError(
      "The Dyson cloud sent a manifest that is no list",
      502,
    );
  }
  return reply.flatMap((entry) => {
    const machine = parseMachine(entry);
    return machine === undefined ? [] : [machine];
  });
}

function parseMachine(entry: unknown): DysonMachine | undefined {
  const fields = object(entry);
  const configuration = object(fields.connectedConfiguration);
  const serialNumber = text(fields.serialNumber);
  const type = text(fields.type);
  if (
    typeof configuration.mqtt !== "object" ||
    configuration.mqtt === null ||
    serialNumber === undefined ||
    type === undefined
  ) {
    return undefined;
  }
  const mqtt = object(configuration.mqtt);
  const firmware = object(configuration.firmware);
  const machine: DysonMachine = { serialNumber, type };
  const optional = {
    mqttRootTopicLevel: text(mqtt.mqttRootTopicLevel),
    category: MACHINE_CATEGORIES.find(
      (each) => CLOUD_MACHINE_CATEGORY_CODES[each] === fields.category,
    ),
    name: text(fields.name),
    variant: text(fields.variant),
    model: text(fields.model),
    productName: text(fields.productName),
    firmwareVersion: text(firmware.version),
    firmwareCapabilities: strings(firmware.capabilities),
    apPasswordHash: decodeLocalBrokerCredentials(mqtt.localBrokerCredentials),
  };
  // Without the keys of the fields the cloud left out.
  Object.assign(machine, JSON.parse(JSON.stringify(optional)));
  // Any other type, or none, is a machine on the AWS IoT broker.
  machine.remoteBrokerType =
    mqtt.remoteBrokerType === CLOUD_REMOTE_BROKER_TYPE_CODES.rabbitMq
      ? "rabbitMq"
      : "awsIot";
  return machine;
}

/** The `apPasswordHash` that `localBrokerCredentials` encrypts, or
 * `undefined` for a value that does not decrypt to one. */
function decodeLocalBrokerCredentials(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  const { algorithm, key, iv } = CLOUD_LOCAL_BROKER_CREDENTIALS_CIPHER;
  try {
    const decipher = createDecipheriv(algorithm, key, iv);
    const plain = Buffer.concat([
      decipher.update(Buffer.from(value, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return text(object(JSON.parse(plain)).apPasswordHash);
  } catch {
    return undefined;
  }
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function strings(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((each): each is string => typeof each === "string")
    : undefined;
}
