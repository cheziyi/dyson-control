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

## Controls

Controls a machine takes that the package writes no fields for: a caller
that wants one writes its fields itself through `setProductState`. Each row
carries what is known of the control's request and what is still not known
of it.

| Control | The fields it takes | Not known |
| --- | --- | --- |
| Focus and diffuse, type 455 alone | `ffoc`, `ON` for focus and `OFF` for diffuse | |
| Child lock, types 635, 739, 918, 965, 997 and 1018 | `ctll`, `ON` or `OFF` | |
| UV sterilisation, the 831 of model `BP10-BA`, the 917 and 918 of model `EAST`, the 994 of model `MP01-BA`, and every 997 | `uvse`, `ON` or `OFF` | |
| Downstream ionisation, the same machines but the 997 only of model `EAST` | `ioni`, `ON` or `OFF` | |
| Nozzle angle, type 831 | `noan`, `0000` for direct and `0045` for indirect | |
| Tilt oscillation, type 664 | One write of `oton`, `ON` or `OFF`, `otal` and `otau` of whole degrees, and `anct`, `CUST` for a tilt and `BRZE` for a breeze. A 50-degree tilt turns the air backward, so it also writes `fdir`. It reads `otcs`, `anct`, `otal` and `otau` | |
| Find and follow, type 949, and a 438 or 527 whose type and variant join to `438N` or `527N` | `soon`, `ON`, `OFF` or `SCAN`, with the power field beside it when the machine is off. It reads `sost` | What a machine means by an `oscs` or `sost` of `ACS`, `ACM` or `NOD` |
| Wick drying, type 965 | `wdmd`, `ON` or `OFF`, and `wdsp`, `SLOW`, `NORM` or `FAST`. It reads `wdst`, `IDLE` or `WDRY`, and `wdtr` in minutes | |
| Clean cycle, types 358, 358E, 358K and 965 | `wath` of whole hours, `2025` for soft water, `1350` for medium and `0675` for hard. It reads `clcr` of `CLSE`, `CLAC`, `CLPA`, `CLIC`, `CLCM` or `CLNO`, `cltr` in hours, and `cdrr`. The machine runs a cycle on its own schedule | The unit of `cdrr` |
| Filter life | The first generation reports `filf` in hours; later types report `cflr` and `hflr` as percentages, with the filter types `cflt`, `hflt` and `sflt`. A reset writes `rstf`, `rshf` or `rscf`, each of `RSTF` | |
| Air quality target, the first generation | `qtar`, `0004` for good, `0003` for sensitive and `0001` for very sensitive | |
| Temperature unit, later types but not the 739, 897, 917, 949, 960, 997 and 1018, nor a 438 whose type and variant join to `438M` | `corf`, `ON` for Celsius and `OFF` for Fahrenheit | |
| Oscillation state, an advanced-oscillation machine | It reports `oscs` of `ON`, `OFF`, `IDLE`, `INV`, `INIT`, `SCAN`, `ACS`, `ACM` or `NOD` beside `oson`, and answers a `LOCATE` with a `LOCATION` whose `apos` is the angle it faces | What a machine means by an `oscs` of `INV` or `INIT` |
