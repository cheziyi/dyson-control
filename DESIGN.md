# Design

## Connectivity

A client reaches a machine through the Dyson cloud alone. On its first call
it posts the machine's serial number to `/v2/authorize/iot-credentials`,
opens an MQTT connection over TLS to the broker the reply names, on port 443
with the ALPN protocol `mqtt`, and subscribes to the machine's
`status/current` topic. Every command goes to the machine's `command` topic
on that connection.

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
`reconnectPeriod` is 0. When the connection closes, the link drops it,
rejects the calls that wait for an answer with a `DysonConnectionError`, and
connects again on the next call.

Not built: the MQTT library reconnecting with the credentials it has.

- How long the broker accepts a set of credentials is not known, so a
  reconnect with old ones could fail for as long as the link lives.

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

An `autoMode` or a `fanSpeed` also switches the machine on: a type of the
first generation has no way to take one without it, since `fmod` is `FAN` or
`AUTO` for a machine that is on, and the later types then behave alike. A
`fanPower` of `false` also sends the sleep timer off, in the same command.

The client does not poll. A caller that wants the state as it changes calls
`getState()` on its own schedule.

Not built: skipping a write of a value the machine already reports.

- The client holds no state to compare with, so it sends every field it is
  given.

Not built: `hmod` `OFF` with a power on, for a heater whose serial number is
a US one.

- The client has no region to go by: a caller passes `heatMode: "off"` with
  `fanPower: true`.

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
