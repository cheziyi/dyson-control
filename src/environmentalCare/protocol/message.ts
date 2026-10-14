import type { MachineMessage } from "../../machine/protocol/message.js";
import { ENVIRONMENTAL_CARE_MESSAGES } from "./tables.js";

export type EnvironmentalCareMessageName =
  (typeof ENVIRONMENTAL_CARE_MESSAGES)[keyof typeof ENVIRONMENTAL_CARE_MESSAGES];

/** A state or a sensors message of an environmental care machine, with its
 * fields flattened to field -> value. A `STATE-CHANGE` holds every field of
 * the state, as a `CURRENT-STATE` does. */
export interface EnvironmentalCareMessage {
  name: EnvironmentalCareMessageName;
  values: Record<string, string>;
}

/** The `data` of a `STATE-SET`, as its fields beside `msg`. */
export function buildEnvironmentalCareStateSet(
  data: Record<string, string>,
): Record<string, unknown> {
  return { data };
}

/** A state or a sensors message, or `undefined` for any other message. */
export function parseEnvironmentalCareMessage(
  message: MachineMessage,
): EnvironmentalCareMessage | undefined {
  const name = Object.values(ENVIRONMENTAL_CARE_MESSAGES).find(
    (each) => each === message.msg,
  );
  if (name === undefined) {
    return undefined;
  }
  const fields =
    name === ENVIRONMENTAL_CARE_MESSAGES.environmentalCurrentSensorData
      ? message.data
      : message["product-state"];
  if (typeof fields !== "object" || fields === null) {
    return undefined;
  }
  const values: Record<string, string> = {};
  for (const [field, value] of Object.entries(fields)) {
    // A `STATE-CHANGE` holds each field as its old value and its new one.
    const current: unknown = Array.isArray(value) ? value[1] : value;
    if (typeof current === "string") {
      values[field] = current;
    }
  }
  return { name, values };
}
