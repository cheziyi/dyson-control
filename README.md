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
| `requestLoginCode({ email, country, culture })` | Has the cloud email a code, and resolves with a `challengeId` |
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

Key a stored machine on `serialNumber`. Write the machine by hand when you
already know it, and skip `getMachines`:

```ts
import { EnvironmentalCareClient, type DysonMachine } from "dyson-control";

const machine: DysonMachine = {
  serialNumber: "<serial number>",
  type: "438",
};
const client = new EnvironmentalCareClient(machine, { account });
```

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
`mqttRootTopicLevel`, `category`, `name`, `variant`, `model`, `productName`
and `firmwareVersion` when the cloud reports them.

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
| `nightMode` | `true` or `false` |
| `continuousMonitoring` | Whether the machine measures the air while it is off |
| `sleepTimerInMinutes` | The minutes left, or `off` |
| `fanAirDirection` | `forward` or `backward` |
| `heatMode` | `off` or `heat` |
| `targetTemperatureInC` | The temperature `heatMode` holds the room at |
| `humidificationMode` | `off` or `humidify` |
| `autoHumidification` | `true` when the machine picks the target humidity itself |
| `manualHumidificationTargetInPercent` | A number |

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
await client.setState({ heatMode: "heat", targetTemperatureInC: 21 });
await client.setState({ sleepTimerInMinutes: 30 });
```

| It | So |
| --- | --- |
| Sends every field as given, whether or not the machine has the feature | Check the field is not `null` in `getState()` first |
| Resolves once the broker has the command, not once the machine has acted | Call `getState()` to read what the machine did |
| Switches the machine on with an `autoMode` or a `fanSpeed` | Pass `fanPower: false` with it to leave the machine off |
| Switches auto mode off with a `fanSpeed` | Pass `autoMode: true` with it to keep auto mode |
| Stops the sleep timer with a `fanPower` of `false` | Pass `sleepTimerInMinutes` with it to keep one running |
| Sends `oscillationAngles` without `oscillationMode` | Set `oscillationMode: "on"` as well to start it |

The types `455`, `455C`, `469` and `475` hold their power and their auto mode
as one value, so `setState({ fanPower: true })` takes one of them out of auto
mode: pass `autoMode: true` with it to switch on in auto mode.

### State as the machine reports it

Pass `onState` and `onSensors` to a client to receive what the machine
sends, without asking for it again:

```ts
const client = new EnvironmentalCareClient(machine, {
  account,
  onState: (state) => console.log(state.fanSpeed),
  onSensors: (sensors) => console.log(sensors.temperatureInC),
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
| 401 | The cloud rejected the login or the account's token, or the broker rejected the credentials the cloud issued or the subscription to the machine's topic |
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
