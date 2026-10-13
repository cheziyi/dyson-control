// What every machine on the broker shares, whatever its kind: its topics and
// the envelope of a command.

/** What follows the root topic level and the serial number in a topic: the
 * one a machine takes commands on, and the one it reports on. */
export const MACHINE_TOPICS = {
  command: "command",
  status: "status/current",
} as const;

/** `mode-reason` of a command sent through the cloud. */
export const MACHINE_MODE_REASON = "RAPP";
