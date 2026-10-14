# Unsupported

What is not known about the cloud and a machine: each entry is something the
package cannot do, or cannot name or read with certainty, until it is known.

## The cloud

| Not known | So |
| --- | --- |
| The password the RabbitMQ broker takes. The cloud answers the broker's host and port at `/v1/messageprocessor/devices/{serial}/connectionstatus`, and the broker takes the account's id as its username | No client connects to a machine whose `remoteBrokerType` is `rabbitMq`: it rejects with status 501 |
| How long the cloud accepts an account's token, and whether it can be renewed without a new login code | A caller logs in again when calls reject with status 401 |
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
