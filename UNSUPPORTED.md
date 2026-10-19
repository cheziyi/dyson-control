# Unsupported

What is not known about the cloud and a machine: each entry is something the
package cannot do, or cannot name or read with certainty, until it is known.

## The cloud

| Not known | So |
| --- | --- |
| The password the RabbitMQ broker takes. The cloud answers the broker's host and port at `/v1/messageprocessor/devices/{serial}/connectionstatus`, and the broker takes the account's id as its username | No client connects through the cloud to a machine whose `remoteBrokerType` is `rabbitMq`: it rejects with status 501 |
| How long the cloud accepts an account's token, and whether it can be renewed without a new login code | A caller logs in again when calls reject with status 401 |
| How long the cloud takes an account's status as asked for, before it refuses a code with HTTP 401 again | `requestLoginCode` asks for the status before each code: [DESIGN.md](DESIGN.md#a-login-code-after-the-user-status) |
| How an account whose `accountStatus` is `NEEDS_ACTIVATION` is activated | `requestLoginCode` rejects with status 401 for it |
| How an account whose `authenticationMethod` is `EMAIL_PASSWORD` logs in without a login code | `requestLoginCode` rejects with status 401 for it |
| How long the broker accepts a set of credentials | A `MachineLink` asks for new ones for every connection: [DESIGN.md](DESIGN.md#credentials-for-one-connection) |

## The LAN

| Not known | So |
| --- | --- |
| Whether every machine names itself `<serialNumber>.local` over mDNS | A caller passes `host`, and the package resolves no name for it |

## Messages

| Not known | So |
| --- | --- |
| When a machine sends an `ENVIRONMENTAL-CURRENT-SENSOR-DATA` without being asked for one | `onSensors` is certain only of the answer to a `getSensors()`, and a caller that wants the readings as they change asks on its own schedule |
| When a machine sends a `FAULTS-CHANGE`, which holds each fault as its old value and its new one | `onFaults` is certain only of the answer to a `getFaults()`, and a caller that wants the faults as they change asks on its own schedule |

## Names

| Not known | So |
| --- | --- |
| Dyson's name for a fault code outside `ENVIRONMENTAL_CARE_FAULTS`, such as the `iuh0` and `iuu0` a `897` reports in `product-errors` | `EnvironmentalCareFaults` holds the code of such a fault |

## Values

| Not known | So |
| --- | --- |
| What a machine means by an `oson` of `SCAN`, which it is never written | `oscillationMode` reads it as `scan`, and `setState` rejects it |
| What a machine means by an `oscs` of `INIT`, `SCAN`, `ACS`, `ACM` or `NOD`, or a `sost` of `INIT`, and how an `ACS` differs from an `ACM` | `oscillationState` and `findAndFollowState` read each by Dyson's name for it |
| What a machine means by an `ancp` of `SMRT`, which it is never written | `oscillationPresetAngleInDegrees` reads it as `null` |
| Which machines have find and follow beside a `438` and a `527` of variant `N`, such as a `949` | `capabilities.findAndFollowModes` is empty for them, and `setProductState` writes `soon` |
| Whether a machine of the first generation that is off switches on when it is written a field without `fmod` | `setState` and `resetFilterLife` send no `fmod` but with a `fanPower`, an `autoMode` or a `fanSpeed` |
