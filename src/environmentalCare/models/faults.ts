// What a machine reports is wrong with it. `../protocol/faults.ts` reads it
// from the machine's faults message.

/** The faults a machine reports it has, in the group it reports each in.
 * Each is Dyson's name for the fault, such as `filterReplacement`, or the
 * machine's own code for one whose name is not known: see UNSUPPORTED.md. A
 * fault the machine does not have is in no group. */
export interface EnvironmentalCareFaults {
  productErrors: string[];
  productWarnings: string[];
  /** What part of the machine the `module` groups report on is not known:
   * see UNSUPPORTED.md. */
  moduleErrors: string[];
  moduleWarnings: string[];
}
