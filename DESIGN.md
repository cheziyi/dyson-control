# Design

## Connectivity

A client reaches a machine through the Dyson cloud alone. On `connect` it
posts the machine's serial number to `/v2/authorize/iot-credentials`,
opens an MQTT connection over TLS to the broker the reply names, on port 443
with the ALPN protocol `mqtt`, and subscribes to the topics its client
names: an environmental care machine's `status/current` and
`status/faults`. Every command goes to the machine's `command` topic on that
connection.

Not built: the machine's own broker on the LAN first, with the cloud as the
fallback.

- The cloud's broker reaches a machine from any network, and the machine's
  own only from the network the machine is on.
- The password of the LAN broker comes from the cloud's manifest, so a
  caller would log in to the cloud for it either way.

A caller passes the account in, and nothing is searched for on the network:
`getMachines` reads the account's machines from the cloud's manifest.

## One link, one client for each kind of machine

`MachineLink` holds what every machine on the broker shares: the connection,
the `command` and `status/current` topics, the envelope of a command (`msg`,
`time` and `mode-reason`), and waiting for the message that answers one. A
client for one kind of machine, such as `EnvironmentalCareClient`, sends
its commands over a link and reads the fields of its own messages.

Not built: one client class for every machine.

- Kinds of machine share the topics and the envelope, and not what a message
  holds: an environmental care machine reports a `product-state` of
  four-letter fields, and a robot vacuum does not. A `getState` over both has
  no one type to resolve with.

A caller builds the client for its machine with `new`, from the machine's
`category`.

Rejected: a `createDysonClient` that picks the class from the machine.

- With one kind of machine it picked nothing. With two it would return a
  union, and a caller would check which class it got before every call.

`getMachines` resolves with the machines of every category, each with its
`category`.

Rejected: the environmental care machines alone.

- A caller that took the first machine would get a robot vacuum in a later
  release, the day a second kind of machine gets a client.

## Credentials for one connection

A `MachineLink` asks the cloud for new credentials each time it connects,
and a `DysonConnection` never reconnects by itself: the MQTT library's
`reconnectPeriod` is 0. When the connection closes, the link opens another
with new credentials, as [Retries](#retries) says.

Not built: the MQTT library reconnecting with the credentials it has.

- How long the broker accepts a set of credentials is not known, so a
  reconnect with old ones could fail for as long as the link lives.

## Retries

`withRetry` repeats only a `DysonConnectionError`: a connection the cloud or
the broker refused, reset or closed. By default it tries up to five more
times: at once, then after 50, 100, 200 and 400 ms, so it gives up about
750 ms after the first failure. The first retry waits for nothing because the
likeliest causes fail at once and are fixed by a new connection: a reused
connection the cloud has already closed, and a broker connection that closed
while nothing was sent.

| What | Retried |
| --- | --- |
| `getMachines`, `getCountries` | The request |
| `connect` | Connecting, with new credentials each time |
| A call on a client | The command. A call that waited for an answer when the connection closed sends its command again on the next one |
| A connection that closes by itself | Connecting, by the same waits. A connection counts as open once it stays open as long as it took to open, and one that closes sooner as a failed attempt. `onReconnect` follows the connection that stays open, and `onDisconnect` the last failure |

Not built: retrying by status, 502, 503 and 504, with a timeout reported as
504.

- A timeout costs a full `timeoutInMs` for each attempt, so a machine that is
  unplugged would keep a call from failing for a minute.
- An HTTP status the cloud sent is the cloud's reply, and asking again gets
  the same one.

A `STATE-SET` is retried as well: it sets each field to a value, so one that
landed twice changes nothing.

Not built: retrying `requestLoginCode` and `login`.

- A connection can drop after the cloud took the request. The cloud answers
  HTTP 429 to a second request for a code within seconds of the first, and
  whether it takes a login code twice is not known.

Not built: connecting again without end after a connection closes, with a
backoff that grows to a cap.

- With no route to the internet a request fails in another way than a
  refused or dropped connection, so the link gives up at once and calls
  `onDisconnect`: the caller picks how long to wait before it calls `connect`.
- A broker that closed each connection it accepted would have the link ask
  the cloud for credentials without end, about 2,500 times an hour. Taking a
  connection that closes sooner than it took to open as a failed attempt
  bounds that at six, and needs no constant: opening takes over a second,
  and a broker that refuses a connection closes it within milliseconds.

`disconnect` ends the retries: a call that waits then rejects with status 503,
and nothing connects again until `connect`.

## A write from the machine's type

`setState` sends one `STATE-SET` with the fields the control sets, and reads
nothing from the machine first. Which fields those are depends on the machine:
the types `455`, `455C`, `469` and `475` hold their power and their auto mode
in one field, `fmod`, and the types `635`, `739`, `949` and `960` have no
`auto` field to switch off with a fan speed. The client takes both from
`DysonMachine.type`, by the tables in
`src/environmentalCare/protocol/tables.ts`.

Rejected: reading the machine's `product-state` before the first write of a
connection, keeping it up to date from each `STATE-CHANGE`, and telling a
machine of the first generation by the fields it reports.

- It was one more request, and a write then failed when the machine did not
  answer the read.
- The client held state that went stale without a connection, so it dropped
  it there and read again.

A type in neither table makes the constructor throw an `Error`.

Rejected: treating a type that is not known as a later one.

- A wrong guess writes `fpwr` to a machine that takes `fmod`, and nothing
  reports that the write did nothing.

Every field of a control sends `fpwr` `ON` with it to a later machine, but
those the MyDyson app writes to a machine that is off without switching it
on: `continuousMonitoring`, `waterHardness`, `temperatureUnit`,
`wickDryingMode`, `wickDryingSpeed`, an `oscillationMode` of `off` or
`idleOff` to an `advanced` or a `barrel` oscillation, and a
`findAndFollowMode` of `off`. The app switches a machine that is off on
before it writes any other field, in a command of its own but for a
`findAndFollowMode`; the client sends `fpwr` `ON` in the same `STATE-SET`
every time, since it changes nothing on a machine that is on. A `fanPower`
the control sets is sent as it sets it.

A machine of the first generation is switched on with an `autoMode` or a
`fanSpeed` alone: `fmod` is `FAN` or `AUTO` for a machine that is on, so it
has no way to take one without it.

Not built: `fmod` `FAN` with every other field to a machine of the first
generation, as the app sends it to one that is off.

- `fmod` `FAN` takes a machine that is on out of auto mode, and the client
  holds no state to tell one that is off by.

A `fanPower` of `false` also sends the sleep timer off, in the same command.
A `targetTemperatureInC` also sends `hmod` `HEAT`, an `autoHumidification`
`hume` `HUMD`, and a `manualHumidificationTargetInPercent` `hume` `HUMD` and,
to a machine that takes an `autoHumidification`, `haut` `OFF`: the app
writes each of them before the field.

An `oscillationAngles` or an `oscillationPresetAngleInDegrees` also sends
`oson` `ON`, in the same command.

Rejected: sending `osal`, `osau` and `ancp` without `oson`.

- A machine is written its angles or its preset with `oson` beside them:
  `ON`, or `OION` while it reports an `oson` of `OIOF` or an `oscs` of
  `IDLE`. The client reads nothing before a write, so it sends `ON`, and a
  caller passes `oscillationMode: "idleOn"` for the other.

`setState` takes `oscillationAngles` only within
`capabilities.oscillationAngles`, apart by one of
`capabilities.oscillationAngleWidthsInDegrees`: a machine is written angles
from 5 to 355 degrees, as one direction or a preset angle's width placed
anywhere in that range, and on a `635` or `739` one direction from 145 to
215.

Rejected: any two angles within the range.

- No two angles but those are known to be written, and nothing reports what
  a machine does with the rest.

`setState` rejects with an `Error`, and sends nothing, for a field or a value
[`capabilities`](#capabilities) says the machine does not take.
`setProductState` sends any field.

Rejected: sending every field as given.

- A machine ignores a field it does not take, and nothing reports that the
  write did nothing.
- A machine whose firmware takes no two angles takes a preset in `ancp`
  and no angles, so an `oscillationAngles` sent to it changed nothing.

Not built: skipping a write of a value the machine already reports.

- The client holds no state to compare with, so it sends every field it is
  given that the machine takes.

A `tiltAngleInDegrees` sends `fpwr`, `fdir`, `oton`, `anct`, `otal` and
`otau` in one `STATE-SET`: `fdir` is `OFF` for a tilt of 50 degrees and `ON`
for every other, and a breeze is `oton` `ON` with both angles `0359`.

Not built: three commands for a tilt, the power, then `fdir`, then the tilt,
as the MyDyson app sends them.

- `setState` sends one command for a control, and a machine takes a
  `findAndFollowMode` with its power in one, as the app sends it.

`setState` takes `idleOn` and `idleOff` for an `advanced` or a `barrel`
oscillation alone, and `on` and `off` for a `basic` one. A machine is written
`OION` when its oscillation goes on while it reports an `oson` of `OIOF` or
an `oscs` of `IDLE`, and `OIOF` when it goes off while `OION`.

Rejected: sending an `oscillationMode` of `scan` as given.

- A machine is never written `SCAN` in `oson`: find and follow takes it, in
  `soon`.

`resetFilterLife` sends one field, `RSTF` in `rstf`, `rscf` or `rshf`.

Not built: `fmod` `OFF` with a reset or an `airQualityTarget`, for a
machine of the first generation that is off, as the MyDyson app sends it.

- The client reads nothing before a write, so it has no state to tell a
  machine that is off by.

Not built: `hmod` `OFF` with a power on, for a heater whose serial number is
a US one.

- The client has no region to go by: a caller passes `heatMode: "off"` with
  `fanPower: true`.

## Capabilities

`EnvironmentalCareClient.capabilities` decodes what a machine carries from
its `type`, `variant`, `model` and `firmwareCapabilities`. Each field is
named for the `EnvironmentalCareState` field it governs, and holds a boolean
or the values that field takes: a list leaves room for a machine that grows a
mode, as a named mode does in [Names and modes](#names-and-modes).

Rejected: taking the capabilities from the machine's state.

- One state says what the machine is doing, not what it carries: a field is
  absent when the control is off, when it does not apply to the mode, and
  when the machine has none, and one sample cannot tell the three apart.
- The capabilities answer before the connection exists, and a state arrives
  only from one.

Rejected: one table keyed by type, each row a machine's whole set of
capabilities.

- The set is no function of the type alone: the oscillation follows the
  firmware capabilities, and the air direction the variant.
- A row for a type the package learns later would have to be written whole,
  where the tables take each new fact as one list.

`findAndFollowModes` holds find and follow's modes for a `438` and a `527`
of variant `N` alone: the MyDyson app carries find and follow's pictures for
those two, and its own test of which machines have find and follow does not
read as written.

Rejected: `parseEnvironmentalCareCapabilities`, a function exported beside
the client.

- It was a `protocol/` function, which [Exports](#exports) keeps inside the
  package.
- It returned `undefined` for a type the client's constructor throws for, so
  a caller checked the type twice.

## State as the machine reports it

A client passes each state and each set of readings the machine sends on to
the `onState` and `onSensors` a caller gives it, and holds none of it. A
machine sends a `STATE-CHANGE` by itself, and answers a request on the one
topic every client receives from, so a state comes whether this client asked
for it, another did, or none. A machine of the first generation reports its
sleep timer in a sensors message, so `EnvironmentalCareSensors` carries it.

Rejected: merging the sleep timer of a first-generation sensors message into
the last state message, and calling `onState` with the result.

- The client held the last state across connections, and merged a state
  from before a reconnect with readings from after it.
- `onState` was called for a message that was no state, with a sleep timer
  `getState()` did not read.

A caller calls `connect` before any other method, and the client holds the
connection from then until `disconnect`, opening another when it closes, as
[Retries](#retries) says. A call made without a connection rejects with
status 503, and connects nothing.

Rejected: connecting on the first call, and holding the connection from
then.

- `connect` and `disconnect` are a pair: what `disconnect` ends, `connect` began. With
  a call that connected, `disconnect` ended a connection the caller never
  opened, and the next call opened it again behind the caller's back.
- A caller that only listened called `getState()` to start, sending the
  machine a request it did not want.

Rejected: `close` and `onClose` for the end of the pair.

- `close` did not pair with `connect`, and says the caller is done with the
  client, though `connect` opens it again.

Not built: a `REQUEST-CURRENT-STATE` on a timer, with a machine that answers
none taken as gone.

- Polling is the caller's: `getState()` on the caller's own schedule tells
  the same, and rejects with status 504 for a machine that answers nothing.

Not built: a `REQUEST-CURRENT-STATE` once the client has connected again,
for the state that changed while it received nothing.

- The client asks a machine only when called, and `onReconnect` tells the
  caller when to call `getState()`.


## Faults

A client receives the machine's `status/faults` topic from `connect`, beside
`status/current`: the machine answers a `REQUEST-CURRENT-FAULTS` there, with
a `CURRENT-FAULTS`. `MachineLink` subscribes to the topics its client names,
so the faults topic stays the environmental care machine's.

`ENVIRONMENTAL_CARE_FAULTS` names each code by its name in the MyDyson app's
environmental care faults, and a code missing there by the name of its field
in the app's faults message, the one that names the `module` groups' codes.

Not built: a `REQUEST-CURRENT-FAULTS` with each state the machine sends, as
the MyDyson app asks.

- Polling is the caller's: `getFaults()` asks when called.

## Names and modes

`EnvironmentalCareState` and every table name each field what Dyson names it,
written out in full: `fanPower`, `heatMode`, `fanAirDirection`. A field that
holds a named mode is a union of Dyson's names for its values: `heatMode` is
`off` or `heat`.

Rejected: the package's own names, with a boolean for each mode: `power`,
`heating: true`, and one `fanSpeed` that was `auto` or a number.

- A name of the package's own is one reading of a four-letter code. Dyson's
  name is the meaning its maker gave it.
- A boolean has no room for another mode: `oscillationMode` already has
  `idleOn`, `idleOff` and `scan` beside `on` and `off`.
- A machine holds its auto mode and its fan speed as two fields, and the one
  field hid a machine's set speed while it was in auto mode.

A field that is `ON` or `OFF` alone stays a boolean: `fanPower`, `autoMode`,
`nightMode`, `continuousMonitoring` and `autoHumidification`.

## Exports

`src/index.ts` names each export: the clients, the account calls, the models
with their value lists, the errors, and the options of each. A caller reads
and writes a field the models leave out through `getProductState` and
`setProductState`.

Rejected: `export *` from every module, which exported each `protocol/`
function and table, `MachineLink`, `DysonConnection`, `DysonCloudTransport`
and `withRetry`.

- Every rename inside the package was then a breaking change, though the
  README documented none of them.
- A caller that built commands from the tables depended on the codes the
  package exists to hide.

## A login code after the user status

`requestLoginCode` posts the address to `/v3/userregistration/email/userstatus`
before it posts it to `/v3/userregistration/email/auth`, and asks for no code
unless the cloud answers an `accountStatus` of `ACTIVE` and an
`authenticationMethod` of `EMAIL_PASSWORD_2FA`.

Rejected: posting the address to `/v3/userregistration/email/auth` alone.

- The cloud answers HTTP 401, with no body, to a request for a code for an
  active account whose status it was not asked for first. An account refused
  eleven times in five minutes was sent a code by the first request that
  followed a user status.

Rejected: asking for the user status and ignoring what it answers.

- The cloud answers HTTP 400, with no body, to a request for a code for an
  address it has no account for, and the user status says so: its
  `accountStatus` is `UNREGISTERED`. The package rejects with status 401 and
  that status in the message, and sends nothing more.

Rejected: asking for a code for every `ACTIVE` account.

- The MyDyson app asks for a code only for an `authenticationMethod` of
  `EMAIL_PASSWORD_2FA`. An account whose `authenticationMethod` is
  `EMAIL_PASSWORD` logs in without one, and the app asks for none for it.

## Headers

The package sends one header of its own on every request to the cloud, a
`User-Agent`: `dyson-control`, or the `userAgent` a caller passes. The cloud
answers HTTP 403, with an HTML page in place of JSON, to a request that has
no `User-Agent` or an empty one, and takes any other value.

Rejected: `X-Platform: android`, `X-App-Version` with the version of an app
release, and that release's `User-Agent`.

- The cloud answers all four requests the same without the first two, and
  with any `User-Agent`.
- A version written into the package says nothing true of the package, and
  goes stale with every release of the app.

## No simulator

The package ships no simulated cloud or machine. A caller tests against its
own account and machine, or puts a stub in place of
`EnvironmentalCareClient`.

Not built: a simulator of the cloud and a machine, for a caller's tests.

- A client has nowhere to point at one: the cloud's address is fixed and the
  broker is always TLS on port 443, so the package would grow options that
  exist for the simulator alone, and a broker to depend on.
- What is not known is how the real cloud behaves, such as how long a token
  lasts, and a simulator answers none of it.

## Node version

`engines` in `package.json` accepts Node 22 and later: the oldest release
line Node still maintains, and the oldest the tests run on.

Not built: Node 18 or 20.

- The package itself would run there: it needs `fetch` and
  `AbortSignal.timeout`, and its one dependency, the MQTT library, takes
  Node 18. But both lines are past their end of life, and the test runner
  needs Node 22.12, so nothing would check that a release still works on
  them.
