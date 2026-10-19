import type { MachineMessage } from "../../machine/protocol/message.js";
import type { EnvironmentalCareFaults } from "../models/faults.js";
import { decodeEnvironmentalCareFields } from "./message.js";
import {
  ENVIRONMENTAL_CARE_FAULT_FAIL_CODE,
  ENVIRONMENTAL_CARE_FAULT_GROUPS,
  ENVIRONMENTAL_CARE_FAULTS,
  ENVIRONMENTAL_CARE_MESSAGES,
} from "./tables.js";

/** The faults of a `CURRENT-FAULTS` or a `FAULTS-CHANGE`, or `undefined` for
 * any other message, and for one that has none of the groups. */
export function parseEnvironmentalCareFaults(
  message: MachineMessage,
): EnvironmentalCareFaults | undefined {
  if (
    message.msg !== ENVIRONMENTAL_CARE_MESSAGES.currentFaults &&
    message.msg !== ENVIRONMENTAL_CARE_MESSAGES.faultsChange
  ) {
    return undefined;
  }
  const groups = Object.keys(
    ENVIRONMENTAL_CARE_FAULT_GROUPS,
  ) as (keyof EnvironmentalCareFaults)[];
  if (
    groups.every(
      (group) => message[ENVIRONMENTAL_CARE_FAULT_GROUPS[group]] === undefined,
    )
  ) {
    return undefined;
  }
  const faults: EnvironmentalCareFaults = {
    productErrors: [],
    productWarnings: [],
    moduleErrors: [],
    moduleWarnings: [],
  };
  for (const group of groups) {
    const values = decodeEnvironmentalCareFields(
      message[ENVIRONMENTAL_CARE_FAULT_GROUPS[group]],
    );
    for (const [code, value] of Object.entries(values ?? {})) {
      if (value === ENVIRONMENTAL_CARE_FAULT_FAIL_CODE) {
        faults[group].push(
          Object.hasOwn(ENVIRONMENTAL_CARE_FAULTS, code)
            ? (ENVIRONMENTAL_CARE_FAULTS[code] as string)
            : code,
        );
      }
    }
  }
  return faults;
}
