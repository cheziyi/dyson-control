import type { DysonMachine } from "../../cloud/models/machine.js";
import type { HostType } from "../models/hostType.js";
import { MACHINE_MODE_REASONS } from "./tables.js";

/** A message from a machine: `msg` names it, and each kind of machine reads
 * the fields beside it. */
export interface MachineMessage {
  msg: string;
  [field: string]: unknown;
}

/** A topic of a machine, from what follows its root topic level and serial
 * number, such as `status/current`. It starts with the machine's type
 * unless the cloud names another root topic level for it. */
export function encodeMachineTopic(
  machine: Pick<DysonMachine, "type" | "mqttRootTopicLevel" | "serialNumber">,
  topic: string,
): string {
  const root = machine.mqttRootTopicLevel ?? machine.type;
  return `${root}/${machine.serialNumber}/${topic}`;
}

/** The payload of a command: `msg` names it, and `fields` go beside it,
 * such as the `data` of an environmental care machine's `STATE-SET`.
 * `hostType` says whether it goes through the cloud's broker or the
 * machine's own. */
export function buildMachineCommand(
  msg: string,
  time: Date,
  hostType: HostType,
  fields: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    msg,
    // In whole seconds, without the milliseconds.
    time: time.toISOString().replace(/\.\d{3}Z$/, "Z"),
    "mode-reason": MACHINE_MODE_REASONS[hostType],
    ...fields,
  });
}

/** `undefined` for a payload that is no JSON object with a `msg`. */
export function parseMachineMessage(
  payload: string,
): MachineMessage | undefined {
  let message: unknown;
  try {
    message = JSON.parse(payload);
  } catch {
    return undefined;
  }
  return typeof message === "object" &&
    message !== null &&
    typeof (message as MachineMessage).msg === "string"
    ? (message as MachineMessage)
    : undefined;
}
