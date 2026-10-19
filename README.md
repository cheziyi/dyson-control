# dyson-control

[![npm version](https://img.shields.io/npm/v/dyson-control)](https://www.npmjs.com/package/dyson-control)
[![npm downloads](https://img.shields.io/npm/dm/dyson-control)](https://www.npmjs.com/package/dyson-control)
[![CI](https://github.com/cheziyi/dyson-control/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/cheziyi/dyson-control/actions/workflows/ci.yml?query=branch%3Amain)
[![Node version](https://img.shields.io/node/v/dyson-control)](package.json)
[![Types](https://img.shields.io/npm/types/dyson-control)](package.json)
[![License](https://img.shields.io/npm/l/dyson-control)](LICENSE)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

A TypeScript and Node.js client for controlling Dyson environmental care
machines: purifiers, fans, heaters and humidifiers. It reaches a machine
through the Dyson cloud with your Dyson account, from any network.

## Installation

```bash
npm install dyson-control
```

It needs Node 22 or later, and its types are included.

Before `1.0.0`, only a minor release (`0.1.x` to `0.2.0`) can require changes
to your code, and the `^` range npm saves by default never crosses one.

## Usage

```ts
import {
  EnvironmentalCareClient,
  getMachines,
  login,
  requestLoginCode,
} from "dyson-control";

// 1. Log in once. Dyson emails a code to the account's address.
const challengeId = await requestLoginCode({ email });
const account = await login({
  email,
  password,
  challengeId,
  otpCode: "<the code from the email>",
});
saveToConfig(account); // it holds a token and no password

// 2. On every later run, load the account and list its machines.
const machines = await getMachines(account);
const machine = machines.find((each) => each.category === "environmentalCare");
if (machine === undefined) {
  throw new Error("The account has no environmental care machine");
}

// 3. Connect, then read and control.
const client = new EnvironmentalCareClient(machine, { account });
await client.connect();

const state = await client.getState();
await client.setState({ fanSpeed: 5, oscillationMode: "on" });

const { temperatureInC, pm25InUgPerM3 } =
  await client.getSensors();

// 4. Disconnect when you're done with the machine.
await client.disconnect();
```

### Account

| Call | Does |
| --- | --- |
| `getCountries()` | Resolves with the countries the cloud registers accounts in, such as `["GB", "US"]`, and takes no account |
| `requestLoginCode({ email, country, culture })` | Asks the cloud for the account's status, has it email a code, and resolves with a `challengeId`. Rejects with status 401 for an address the cloud emails no code for |
| `login({ email, password, challengeId, otpCode, country, culture })` | Resolves with a `DysonAccount`: `accountId`, `token`, `tokenType`, `country` and `culture` |
| `getMachines(account)` | Resolves with one `DysonMachine` for each machine of the account that the cloud broker reaches, of every category |

Pass `country: "CN"` to both login calls for an account in mainland China:
it goes to a cloud of its own. Every other account goes to the global cloud,
which logs it in under any country, so `country` defaults to `US`. It is two
capital letters, such as `GB`: one of those `getCountries()` resolves with.
`culture` is a language and a country, such as `en-GB`, and defaults to
`en-US`.

Store the account and reuse it: every login takes a new emailed code.
When the cloud stops accepting the token, calls reject with a `DysonError`
whose `httpStatusCode` is 401: log in again.

### Machines

Check a machine's `category` before building a client for it:
`EnvironmentalCareClient` takes an `environmentalCare` machine, and
throws an `Error` for one of another category. There is no client for the
other categories yet.

| `category` | Machine |
| --- | --- |
| `environmentalCare` | A purifier, fan, heater or humidifier |
| `robot`, `lighting`, `wearableEnvironmentalCare`, `hairCare`, `floorCare`, `formulation`, `oralCare` | Listed when the broker reaches it, and not controlled |

Key a stored machine on `serialNumber`, and store every field `getMachines`
gave it. Write the machine by hand when you already know it, and skip
`getMachines`:

```ts
import { EnvironmentalCareClient, type DysonMachine } from "dyson-control";

const machine: DysonMachine = {
  serialNumber: "<serial number>",
  type: "438",
};
const client = new EnvironmentalCareClient(machine, { account });
```

A machine of `serialNumber` and `type` alone connects, but its
[capabilities](#capabilities) read as those of a machine without a variant,
a model or firmware capabilities.

`type` is the cloud's code for the kind of machine, such as `438`, as
`getMachines` reports it. It tells the client how the machine holds its
state, so `EnvironmentalCareClient` throws an `Error` for a type outside
this table:

| Types | Hold |
| --- | --- |
| `455`, `455C`, `469`, `475`: the first generation | Power and auto mode as one value |
| `358`, `358E`, `358K`, `438`, `438E`, `438K`, `520`, `527`, `527E`, `527K`, `664`, `831`, `897`, `917`, `918`, `965`, `994`, `997`, `1018` | Power and auto mode apart |
| `635`, `739`, `949`, `960` | Power, and no auto mode |

A machine from `getMachines` also carries `remoteBrokerType`, and
`mqttRootTopicLevel`, `category`, `name`, `variant`, `model`, `productName`,
`firmwareVersion` and `firmwareCapabilities` when the cloud reports them.

### Capabilities

`client.capabilities` says which fields of `setState()` the machine takes.
It is read from the machine's `type`, `variant`, `model` and
`firmwareCapabilities`,
without asking the machine, so it answers before `connect()`. Show a control
only where it says the machine takes it: `setState()` rejects the rest.

| Field | Holds |
| --- | --- |
| `autoMode`, `continuousMonitoring`, `autoHumidification` | `true` when the machine takes the field of that name |
| `heatModes` | `off` and `heat` for a machine that also takes `targetTemperatureInC`, or an empty list |
| `fanAirDirections` | `forward` and `backward`, or an empty list |
| `humidificationModes` | `off` and `humidify` for a machine that also takes `manualHumidificationTargetInPercent`, or an empty list |
| `oscillation` | `basic`, on and off; `advanced`, between two angles as well; `barrel`, to a preset angle or a breeze; `tilt`, on the machine's axis; or `none` |
| `oscillationModes` | `off` and `on` for a `basic` oscillation, with `idleOff` and `idleOn` for an `advanced` or a `barrel` one; or an empty list |
| `oscillationAngles` | The widest `{ lowerInDegrees, upperInDegrees }` the machine takes, `5` to `355` or `145` to `215` on a `635` or `739`; or `null` when it takes no angles |
| `oscillationAngleWidthsInDegrees` | How far apart the two `oscillationAngles` may be: `0`, `45`, `90`, `180` and `350`, or `0` alone on a `635` or `739`. `0` points the machine one way without oscillating |
| `oscillationPresetAnglesInDegrees` | The preset angles an `advanced` machine without `oscillationAngles` takes, such as `45` and `90`, and a `barrel` machine's `45`, `90` and `breeze`; or an empty list |
| `tiltAnglesInDegrees` | `0`, `25`, `50` and `breeze` for a `tilt` oscillation, or an empty list |
| `findAndFollowModes` | `off`, `on` and `scan` for a `438` or a `527` of variant `N` and every `949`, or an empty list |
| `waterHardnesses` | `soft`, `medium` and `hard` for a humidifier that runs a clean cycle, or an empty list |
| `childLockMode` | `true` for a `635`, `739`, `918`, `965`, `997` or `1018` |
| `temperatureUnits` | `celsius` and `fahrenheit` for a later machine but a `739`, `897`, `917`, `949`, `960`, `997`, `1018` or a `438` of variant `M`; or an empty list |
| `nozzleAngles` | `direct` and `indirect` for an `831`, or an empty list |
| `focusDiffuses` | `focus` and `diffuse` for a `455`, or an empty list |
| `airQualityTargets` | `good`, `sensitive` and `verySensitive` for the first generation, or an empty list |
| `wickDryingMode`, `wickDryingSpeeds` | `true`, and `slow`, `normal` and `fast`, for a `965`; or `false` and an empty list |
| `uvMode` | `true` for an `831` of model `BP10-BA`, a `917` or `918` of model `EAST`, a `994` of model `MP01-BA`, and every `997` |
| `ionisationMode` | `true` for the machines `uvMode` is, but a `997` of a model other than `EAST` |
| `hasAirQualitySensor` | `true` when the machine reports pollutant readings |
| `filters` | `filter` for the first generation, `innerFilter` and `outerFilter` for a later machine that reports its filters' life, or an empty list: what [`resetFilterLife()`](#filters-and-faults) takes |

### State

`getState()` resolves with an `EnvironmentalCareState`. Each field has Dyson's
own name for it. Every field but `fanPower` is `null` where the machine
reports none, so a fan without a heater reads `heatMode: null`.

| Field | Holds |
| --- | --- |
| `fanPower` | `true` or `false` |
| `autoMode` | `true` when the machine picks the fan speed itself |
| `fanSpeed` | `1` to `10`, and `null` while the machine reports `AUTO`, as it does in auto mode |
| `oscillationMode` | `off`, `on`, `idleOff`, `idleOn` or `scan` |
| `oscillationAngles` | `{ lowerInDegrees, upperInDegrees }` |
| `oscillationPresetAngleInDegrees` | `15` to `350`, `breeze`, or `custom` while the machine oscillates between its `oscillationAngles` |
| `nightMode` | `true` or `false` |
| `continuousMonitoring` | Whether the machine measures the air while it is off |
| `sleepTimerInMinutes` | The minutes left, or `off`. A machine of the first generation reports it in `getSensors()` |
| `fanAirDirection` | `forward` or `backward` |
| `heatMode` | `off` or `heat` |
| `targetTemperatureInC` | The temperature `heatMode` holds the room at |
| `humidificationMode` | `off` or `humidify` |
| `autoHumidification` | `true` when the machine picks the target humidity itself |
| `manualHumidificationTargetInPercent` | A number |
| `tiltAngleInDegrees` | `0`, `25` or `50`, or `breeze`, which tilts the machine back and forth |
| `findAndFollowMode` | `off`, `on` to follow the people the machine finds, or `scan` to look for them |
| `waterHardness` | `soft`, `medium` or `hard`: how often a humidifier asks for a clean cycle |
| `childLockMode` | `true` while the machine's buttons are locked |
| `temperatureUnit` | `celsius` or `fahrenheit`: the unit the machine shows a temperature in |
| `nozzleAngle` | `direct`, at 0 degrees, or `indirect`, at 45 |
| `focusDiffuse` | `focus` or `diffuse` |
| `airQualityTarget` | `good`, `sensitive` or `verySensitive`: the index auto mode aims for, 4, 3 or 1 |
| `wickDryingMode` | Whether a humidifier dries its wick |
| `wickDryingSpeed` | `slow`, `normal` or `fast`: in 60, 45 or 30 minutes |
| `uvMode`, `ionisationMode` | Whether the machine's UV light and its ioniser are on |

The rest of the state are readings, which `setState()` does not take:

| Field | Holds |
| --- | --- |
| `oscillationState` | `on`, `off`, `idle` while the machine stands by with its oscillation paused, or `invalid`, `init`, `scan`, `acs`, `acm` or `nod` |
| `findAndFollowState` | `scan` while it looks for people, `acs` or `acm` while it follows one, `nod` while it is dormant, or another value of `oscillationState` |
| `cleanCycleState` | `setup`, `active`, `paused`, `incomplete`, `complete` or `notInCleanCycle` |
| `remainingTimeToNextCleanCycleInHours`, `remainingTimeOfActiveCleanCycleInMinutes` | A number |
| `filterLifeInHours` | The life left in the filter of a machine of the first generation, from `4300` when new |
| `innerFilterLifeInPercent`, `outerFilterLifeInPercent` | The life left in a later machine's inner and outer filter |
| `innerFilterType` | `carbon`, `sco`, `scog`, `scoh`, `car1` or `none` |
| `outerFilterType` | `hepa`, `hepaPtfe`, `gcom`, `pcom`, `gcok`, `pcok`, `ehep`, `hsco`, `estf`, `esco`, `ecar`, `escc` or `none` |
| `heatState`, `humidificationState` | What the heater or the humidifier is doing now, in the values of `heatMode` and `humidificationMode` |
| `wickDryingState` | `idle` or `wickDrying` |
| `wickDryingTimeRemainingInMinutes` | A number |

A field that holds a named mode, such as `heatMode`, is that mode and not
`true` or `false`: a machine with a third mode then needs no new field.

`getSensors()` resolves with an `EnvironmentalCareSensors`, each reading
`null` when the machine does not report it:

| Field | Holds |
| --- | --- |
| `temperatureInC`, `humidityInPercent` | The room's temperature and humidity |
| `pm25InUgPerM3`, `pm10InUgPerM3` | Particulates, in μg/m³ |
| `formaldehydeInUgPerM3` | Formaldehyde, in μg/m³ |
| `carbonDioxideInPpm` | Carbon dioxide, in parts per million |
| `pm25Index`, `pm10Index`, `volatileOrganicCompoundsIndex`, `nitrogenDioxideIndex`, `formaldehydeIndex`, `carbonDioxideIndex` | The machine's own index for each pollutant, which has no unit |
| `sleepTimerInMinutes` | The sleep timer of a machine of the first generation, as `EnvironmentalCareState` holds a later one's |

An index says how clean the air is, on one scale for every pollutant:

| Index | Air quality |
| --- | --- |
| Under 4 | Good |
| 4 to 7 | Fair |
| 7 to 9 | Poor |
| 9 to 11 | Very poor |
| 11 to 13 | Extremely poor |
| 13 to 15 | Severe |

A machine reports a concentration and an index apart: a `pm25Index` of 2.7
beside 25 μg/m³.

### Changing state

Pass `setState()` only the fields to change. It sends them in one command,
and reads nothing from the machine first:

```ts
await client.setState({ autoMode: true, nightMode: true });
await client.setState({ targetTemperatureInC: 21 }); // and heatMode "heat"
await client.setState({ sleepTimerInMinutes: 30 });
```

| It | So |
| --- | --- |
| Rejects with an `Error`, and sends nothing, for a field or a value [`client.capabilities`](#capabilities) says the machine does not take | Write the machine's own fields to send it anyway |
| Resolves once the broker has the command, not once the machine has acted | Call `getState()` to read what the machine did |
| Switches a later machine on with every field but `continuousMonitoring`, `waterHardness`, `temperatureUnit`, `wickDryingMode` and `wickDryingSpeed`, an `oscillationMode` of `off` or `idleOff` to an `advanced` or a `barrel` oscillation, and a `findAndFollowMode` of `off` | Pass `fanPower: false` with it to leave the machine off |
| Switches a machine of the first generation on with an `autoMode` or a `fanSpeed` alone | Pass `fanPower: true` with another field to switch it on |
| Switches auto mode off with a `fanSpeed` | Pass `autoMode: true` with it to keep auto mode |
| Sets `heatMode` to `heat` with a `targetTemperatureInC` | Pass `heatMode` with it to send another |
| Sets `humidificationMode` to `humidify` with an `autoHumidification` or a `manualHumidificationTargetInPercent`, and `autoHumidification` to `false` with the latter | Pass either with it to send another |
| Stops the sleep timer with a `fanPower` of `false` | Pass `sleepTimerInMinutes` with it to keep one running |
| Switches the oscillation on with an `oscillationAngles` or an `oscillationPresetAngleInDegrees` | Pass `oscillationMode` with it to send another, such as `idleOn` while `oscillationState` is `idle` |
| Sets `fanAirDirection` with a `tiltAngleInDegrees`: `backward` for `50`, and `forward` for every other | Read the direction back from `getState()` |

The types `455`, `455C`, `469` and `475` hold their power and their auto mode
as one value, so `setState({ fanPower: true })` takes one of them out of auto
mode: pass `autoMode: true` with it to switch on in auto mode.

### Filters and faults

```ts
const { innerFilterLifeInPercent } = await client.getState();
await client.resetFilterLife("innerFilter"); // after fitting a new one

const { productWarnings } = await client.getFaults();
if (productWarnings.includes("filterReplacement")) {
  // the machine asks for a new filter
}
```

`resetFilterLife()` takes a filter of `client.capabilities.filters`, and
rejects with an `Error`, sending nothing, for any other.

`getFaults()` resolves with an `EnvironmentalCareFaults`: the faults the
machine has, in `productErrors`, `productWarnings`, `moduleErrors` and
`moduleWarnings`, each by Dyson's name for it, such as `filterReplacement`,
`tankEmpty` or `cleanCycleOverdue`. A fault whose name is
[not known](UNSUPPORTED.md#names) keeps the machine's code, such as `iuh0`.
The `module` groups are the machine's Wi-Fi module.

### State as the machine reports it

Pass `onState`, `onSensors` and `onFaults` to a client to receive what the
machine sends, without asking for it again:

```ts
const client = new EnvironmentalCareClient(machine, {
  account,
  onState: (state) => console.log(state.fanSpeed),
  onSensors: (sensors) => console.log(sensors.temperatureInC),
  onFaults: (faults) => console.log(faults.productWarnings),
  onReconnect: () => client.getState().catch(console.error),
  onDisconnect: () => console.log("closed"),
});

await client.connect();
const state = await client.getState(); // what the machine holds now
```

| It | So |
| --- | --- |
| Receives from `connect()`, which asks the machine nothing | Call `getState()` after it for the state the machine holds now |
| Connects again by itself when the connection closes, and calls `onReconnect` | Call `getState()` there: what the machine sent in between is lost |
| Gives up when connecting again fails, as it does at once with no route to the internet, and calls `onDisconnect` | Call `connect()` again on your own schedule: every other call rejects with status 503 until it resolves |
| Calls `onState` with the answer to a `getState()` too, whichever client asked, and with a state the machine sends again unchanged | Compare a state with the last one before acting on it |
| Calls `onSensors` with the answer to a `getSensors()`, whichever client asked. When a machine sends its readings unasked is [not known](UNSUPPORTED.md#messages) | Call `getSensors()` on your own schedule for readings as they change |
| Calls `onFaults` with the answer to a `getFaults()`, whichever client asked, and with each `FAULTS-CHANGE` the machine sends. When it sends one is [not known](UNSUPPORTED.md#messages) | Call `getFaults()` on your own schedule for the faults the machine has now |
| Calls `onDisconnect` for a `disconnect()` as well | Call again only where you did not disconnect |
| Asks the machine nothing on a timer | Call `getState()` on your own schedule to tell a machine that is unplugged: it sends nothing, and the call rejects with status 504 |

### The machine's own fields

Read or write a field `EnvironmentalCareState` does not model with the
machine's own codes:

```ts
const fields = await client.getProductState(); // { fpwr: "ON", fnsp: "0005", ... }
await client.setProductState({ ffoc: "ON" });
```

### Errors and retries

A call that fails rejects with a `DysonError`; branch on `httpStatusCode`:

| `httpStatusCode` | Meaning |
| --- | --- |
| 401 | The cloud emails no login code for the address, rejected the login or the account's token, or the broker rejected the credentials the cloud issued or the subscription to the machine's topic |
| 501 | The machine is on the RabbitMQ broker, which no client connects to: see [UNSUPPORTED.md](UNSUPPORTED.md#the-cloud) |
| 502 | The cloud answered with a reply that does not parse, or the machine with a message that lacks its fields |
| 503 | The cloud or the broker refused or dropped the connection (a `DysonConnectionError`), or the client is not connected: `connect()` has not resolved, or `disconnect()` or `onDisconnect` came since |
| 504 | The cloud, the broker or the machine did not answer in time. A machine that is unplugged or off its Wi-Fi answers nothing |
| 429 | The cloud was asked for a login code again within seconds of the last one: wait before asking again |
| Any other | The cloud's own HTTP status |

Only a `DysonConnectionError` is retried, up to five times by default, and
never for `requestLoginCode()` or `login()`. A client connects again by the
same retries, with new credentials, when its connection closes other than by
`disconnect()`.
[DESIGN.md](DESIGN.md#retries) says why.

| To | Pass |
| --- | --- |
| Change how often and how long a call retries | `retry: { delaysInMs: [0, 500] }` to a client, `getMachines()` or `getCountries()`: one wait, in milliseconds, before each retry |
| Stop a call retrying | `retry: { delaysInMs: [] }` the same way |

Pass `timeoutInMs` to a client, or to an account call, to wait
other than the default 10000 for each of the cloud, the broker and the
machine.

Pass `userAgent` the same way to send your own `User-Agent` to the cloud in
place of `dyson-control`. The cloud refuses an empty one with HTTP 403.

## Coverage & limitations

- **Environmental care machines only**: `EnvironmentalCareClient`
  controls a machine of the `environmentalCare` category whose type is in
  the table under [Machines](#machines). `getMachines()` lists a robot
  vacuum or a light as well, and nothing controls one yet.
- **The cloud only**: the package needs a Dyson account and a route to the
  internet, and does not talk to a machine over the LAN.
  [DESIGN.md](DESIGN.md#connectivity) says why.
- **Email login only**: an account that logs in with a mobile number is not
  covered.
- **Machines on the RabbitMQ broker** are listed by `getMachines()` with
  `remoteBrokerType: "rabbitMq"`, and their client rejects with status 501.

This package is still young, so expect some rough edges. If something doesn't
work with your machine, please
[open an issue](https://github.com/cheziyi/dyson-control/issues).
[UNSUPPORTED.md](UNSUPPORTED.md) lists what is not known about the cloud and
a machine, and so what the package cannot do or read with certainty.

## Development

Uses [pnpm](https://pnpm.io) and Node 22 or later (see `.nvmrc`; `fnm use` /
`nvm use` picks it up).

```bash
pnpm build            # tsc -> dist
pnpm test             # typecheck + vitest
pnpm check            # biome lint + format + import sorting
pnpm fix              # check, applying safe fixes
```

`pnpm install` sets up a [lefthook](https://lefthook.dev) pre-commit hook that
runs `pnpm fix` on staged files.

To release, push a tag `vX.Y.Z`, or publish a GitHub release that creates it:
CI sets the version from the tag and publishes to npm.
[AGENTS.md](AGENTS.md#version-the-package-with-semver) says which number to
pick.

## Legal disclaimer

An independent, community project for interoperability and home automation.
It is not affiliated with, authorized, or endorsed by Dyson. All product
names and trademarks are the property of their respective owners; their use
here is for identification and compatibility only.

**Your own account.** The package talks to the Dyson cloud with the account
you pass in, and acts as an ordinary client of the cloud's own endpoints. Its
use may be subject to Dyson's terms of service.

**No proprietary material.** It ships no manufacturer keys, tokens,
certificates, or binaries. The protocol was documented independently, for
interoperability.

Provided "as is", without warranty of any kind (see [LICENSE](LICENSE)); use
it at your own risk.

## License

[MIT](LICENSE). Copyright © 2026 the contributors.
