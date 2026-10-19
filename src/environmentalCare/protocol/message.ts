import type { MachineMessage } from "../../machine/protocol/message.js";
import { ENVIRONMENTAL_CARE_MESSAGES } from "./tables.js";

const STATE_MESSAGE_NAMES = [
  ENVIRONMENTAL_CARE_MESSAGES.currentState,
  ENVIRONMENTAL_CARE_MESSAGES.stateChange,
  ENVIRONMENTAL_CARE_MESSAGES.environmentalCurrentSensorData,
] as const;

export type EnvironmentalCareMessageName = (typeof STATE_MESSAGE_NAMES)[number];

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
  const name = STATE_MESSAGE_NAMES.find((each) => each === message.msg);
  if (name === undefined) {
    return undefined;
  }
  const values = decodeEnvironmentalCareFields(
    name === ENVIRONMENTAL_CARE_MESSAGES.environmentalCurrentSensorData
      ? message.data
      : message["product-state"],
  );
  return values === undefined ? undefined : { name, values };
}

/** An object of fields flattened to field -> value, or `undefined` for no
 * object. A message that reports a change holds each field as its old value
 * and its new one, and is read as the new. */
export function decodeEnvironmentalCareFields(
  fields: unknown,
): Record<string, string> | undefined {
  if (typeof fields !== "object" || fields === null) {
    return undefined;
  }
  const values: Record<string, string> = {};
  for (const [field, value] of Object.entries(fields)) {
    const current: unknown = Array.isArray(value) ? value[1] : value;
    if (typeof current === "string") {
      values[field] = current;
    }
  }
  return values;
}
