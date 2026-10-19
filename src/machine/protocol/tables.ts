import type { HostType } from "../models/hostType.js";

// What every machine on the broker shares, whatever its kind: its topics, the
// envelope of a command and its own broker.

/** What follows the root topic level and the serial number in a topic: the
 * one a machine takes commands on, and the one it reports on. */
export const MACHINE_TOPICS = {
  command: "command",
  status: "status/current",
} as const;

/** `mode-reason` of a command, by where it goes: through the cloud's broker,
 * or the machine's own on the LAN. */
export const MACHINE_MODE_REASONS: Readonly<Record<HostType, string>> = {
  remote: "RAPP",
  local: "LAPP",
};

/** The port of the machine's own broker, which takes MQTT without TLS. */
export const MACHINE_BROKER_PORT = 1883;
