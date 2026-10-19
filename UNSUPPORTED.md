# Unsupported

What is not known about the cloud and a machine: each entry is something the
package cannot do, or cannot name or read with certainty, until it is known.

## The cloud

| Not known | So |
| --- | --- |
| The password the RabbitMQ broker takes. The cloud answers the broker's host and port at `/v1/messageprocessor/devices/{serial}/connectionstatus`, and the broker takes the account's id as its username | No client connects to a machine whose `remoteBrokerType` is `rabbitMq`: it rejects with status 501 |
| How long the cloud accepts an account's token, and whether it can be renewed without a new login code | A caller logs in again when calls reject with status 401 |
| How long the cloud takes an account's status as asked for, before it refuses a code with HTTP 401 again | `requestLoginCode` asks for the status before each code: [DESIGN.md](DESIGN.md#a-login-code-after-the-user-status) |
| How an account whose `accountStatus` is `NEEDS_ACTIVATION` is activated | `requestLoginCode` rejects with status 401 for it |
| How an account whose `authenticationMethod` is `EMAIL_PASSWORD` logs in without a login code | `requestLoginCode` rejects with status 401 for it |
| How long the broker accepts a set of credentials | A `MachineLink` asks for new ones for every connection: [DESIGN.md](DESIGN.md#credentials-for-one-connection) |

## Messages

| Not known | So |
| --- | --- |
| When a machine sends an `ENVIRONMENTAL-CURRENT-SENSOR-DATA` without being asked for one | `onSensors` is certain only of the answer to a `getSensors()`, and a caller that wants the readings as they change asks on its own schedule |

## Names

| Not known | So |
| --- | --- |
| Dyson's names for `osal`, `osau` and `ancp` | `ENVIRONMENTAL_CARE_FIELDS` and `EnvironmentalCareState.oscillationAngles` follow its names for the tilt, `tiltLowerAngle` and `tiltUpperAngle` |

## Values

| Not known | So |
| --- | --- |
| What a machine means by an `oson` of `OION`, `OIOF` or `SCAN`, which Dyson names `IDLE_ON`, `IDLE_OFF` and `SCAN`. Only `ON` and `OFF` are known to be written | `oscillationMode` reads them as `idleOn`, `idleOff` and `scan`, and `setState` sends one as given |
| What a machine means by an `oscs` of `INV`, `INIT`, `ACS`, `ACM` or `NOD`, the state of its oscillation beside `oson` | `EnvironmentalCareState` holds no oscillation state |
| What a machine means by a `sost` of `ACS`, `ACM` or `NOD`, the state of find and follow | `setState` takes no find and follow |
| The unit of `cdrr`, which a machine reports while it runs a clean cycle | `EnvironmentalCareState` holds no clean cycle |
| What a machine means by an `ancp` of `SMRT` | `oscillationPresetAngleInDegrees` reads it as `null` |
