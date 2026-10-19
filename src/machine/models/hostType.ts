export const HOST_TYPES = ["local", "remote"] as const;

/** The broker a connection goes through: `local`, the machine's own on the
 * LAN, or `remote`, the cloud's. */
export type HostType = (typeof HOST_TYPES)[number];
