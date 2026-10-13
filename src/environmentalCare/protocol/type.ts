import {
  ENVIRONMENTAL_CARE_GENERATION_1_TYPES,
  ENVIRONMENTAL_CARE_LATER_TYPES,
  ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE,
} from "./tables.js";

/** What a machine's type says of how it holds its state. */
export interface EnvironmentalCareType {
  /** It holds its power and its auto mode in one field, `fmod`, and counts
   * a temperature from 273 K. */
  generation1: boolean;
  hasAutoMode: boolean;
}

/** `undefined` for a type that is no environmental care machine's, or none
 * that is known. */
export function decodeEnvironmentalCareType(
  type: string,
): EnvironmentalCareType | undefined {
  if (ENVIRONMENTAL_CARE_GENERATION_1_TYPES.includes(type)) {
    return { generation1: true, hasAutoMode: true };
  }
  if (ENVIRONMENTAL_CARE_LATER_TYPES.includes(type)) {
    return {
      generation1: false,
      hasAutoMode: !ENVIRONMENTAL_CARE_TYPES_WITHOUT_AUTO_MODE.includes(type),
    };
  }
  return undefined;
}
