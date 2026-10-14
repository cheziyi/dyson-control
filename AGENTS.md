# Working in this repository

Everything a reader acts on is in [README.md](README.md). A decision that took
an argument to reach goes in `DESIGN.md`; read it, once it exists, before
changing the code it covers.

## Instructions for agents

- **Put a standing instruction in this file, not in agent memory.** This file
  reaches every agent and every contributor; memory reaches one agent on one
  machine.
- **Write only rules that bind future work.** An instruction given for one task
  is carried out in that task and not recorded here, and so is the history of
  how a rule came about.

## Before you write code

- **Check the dependency's defaults first.** Read what a library or the
  platform already does before writing code to do it.
- **KISS and YAGNI.** Keep it thin. Push test machinery into the test file
  rather than adding an injection point to production code.
- **Delete anything you did not use.**
- **Add a dependency only when it earns more than it replaces.**
- **No configuration value without a reason.** Keep a tool's default unless a
  specific requirement forces the change, and write the reason in a comment
  beside the value. Where the format takes no comment, such as `package.json`,
  record it in `DESIGN.md`.
- **Build only confirmed protocol.** Implement an endpoint, parameter or value
  encoding only when its exact request and reply are known. List anything else
  in [UNSUPPORTED.md](UNSUPPORTED.md) with what is unknown; never ship a guess.
  List nothing there that is known: not what was tested, nor what the package
  has not built yet.
- **Do what the MyDyson app does.** Send a request, a read before a write or
  a fallback only where the app sends one. Retries are the package's own:
  [DESIGN.md](DESIGN.md#retries) says which. Polling is the caller's: the
  package asks a machine only when called.
- **Two independent open-source clients that agree confirm a behaviour**
  where the MyDyson app does not show it. One client alone does not, and
  neither does a second that copies the first.
- **The package never reads the environment.** Nothing under `src/` reads
  `process.env` or picks up configuration on the caller's behalf: the caller
  passes it in.

## Layers

`src/` has one folder for each thing the package talks to: `cloud/` for
Dyson's servers, `machine/` for what every machine on the broker shares, and
one for each kind of machine, such as `environmentalCare/`. A kind's folder
imports from `machine/` and `cloud/`, `machine/` from `cloud/`, and `cloud/`
from neither. Each folder has the same layers:

| Path | Holds | Never holds |
| --- | --- | --- |
| `models/` | The types a caller passes and receives, under Dyson's own names | A cloud or machine field name such as `fnsp`, code or value encoding |
| `protocol/` | Every cloud and machine field name, code and value encoding, as pure functions between those fields and models | I/O |
| Any other file, such as `client.ts` | Which route to call or command to send, in what order, through which `protocol/` function | A cloud or machine field name, code or value encoding |

- **Describe a capability in the vocabulary of the control it limits**:
  `fanSpeeds: FanSpeed[]`, not the machine's flags.
- **Pass a machine's code through a model only when what it stands for is not
  known**, and list it in [UNSUPPORTED.md](UNSUPPORTED.md).
- **Keep a table of names or codes in its folder's `protocol/tables.ts`**, and
  write each entry out again in `tables.test.ts`. Every function reads a
  table, so a wrong code is wrong everywhere and the tests still agree: the
  test is the second writing that catches it.
- **Move a name into `machine/` only once a second kind of machine uses it.**
- **Export from `src/index.ts` only what a caller calls, passes or
  receives**: a client, an account call, a model, an error, and the options
  of each. Name each export there, never `export *`, and add it to
  `src/__tests__/index.test.ts`. A `protocol/` function, a link, a
  connection or a transport stays inside the package:
  [DESIGN.md](DESIGN.md#exports) says why.

## Comments

- **No comments except gotchas.** A comment explains behaviour the reader
  cannot see. A comment that restates the line below it gets deleted.
- **Write a gotcha on an export or its public member as `/** */`, not `//`**:
  a caller's editor shows it. Write it as prose, without `@param` or
  `@returns` tags.
- **State an optional option's default in its `/** */`**, as a sentence:
  `Defaults to 10000.` An option that forwards to another type's field repeats
  the value and links to that field for the rest: a caller's editor shows only
  the comment on the option they hover.
- **Two markers, each with its own meaning.** Capitalise each one, and write
  the text after it as a full sentence.
  - `// TechDebt:` marks a shortcut taken because doing it properly is not worth
    it today. The marker carries its own reasoning, and that reasoning never
    moves to `DESIGN.md`: what was cut short, why that is acceptable now, and
    what pays it back.
  - `// TODO:` is work not yet done, due as a next step.

## Names

- **Abbreviate only where the abbreviation is well known.** `Info`, `Config`,
  `min`, `max`, and an initialism such as `UUID`, `MAC` or `URL` are. Write any
  other word in full: `parameters`, not `params`; `options`, not `opts`;
  `temperature`, not `temp`. A name the cloud or a machine defines keeps its
  spelling, such as `fnsp` or `mqttRootTopicLevel`.
- **Name a file for what it exports, and let its folder carry the rest**:
  `environmentalCare/client.ts`, not
  `environmentalCare/environmentalCareClient.ts`. Keep the name singular
  unless the export's own name is plural: `state.ts` for
  `EnvironmentalCareState`, `iotCredentials.ts` for `IotCredentials`.
- **Name a field and a value what Dyson names it**: `fanPower` for `fpwr`,
  `heatMode` for `hmod`, `forward` for a `fdir` of `ON`. Write Dyson's name
  out by the rules above: `nitrogenDioxide` for its `NO2`. Where Dyson's name
  is not known, follow its name for the nearest thing, and list the field in
  [UNSUPPORTED.md](UNSUPPORTED.md).
- **Model a field that holds a named mode as that mode**, a union of Dyson's
  names for its values: `heatMode: "off" | "heat"`, never `heating: boolean`.
  Only a field that is `ON` or `OFF` alone is a boolean.
  [DESIGN.md](DESIGN.md#names-and-modes) says why.
- **Prefix an export with `Dyson` when its bare name is a word the caller's
  own code would also use**: `DysonMachine`, `DysonAccount`, `DysonError`.
  Leave a name that is already specific bare: `FanSpeed`, `HeatMode`.
- **A function is its verb plus the bare noun**: `getMachines`,
  `parseMachines`. Its argument and return types already say `Dyson`.
- **An export for one kind of machine puts that kind in front**:
  `EnvironmentalCareClient`, `EnvironmentalCareState`. A second kind of
  machine then has a state of its own to name.
- **A `protocol/` export names what it speaks to**:
  `parseEnvironmentalCareState`, `ENVIRONMENTAL_CARE_FIELDS`,
  `MACHINE_TOPICS`, `CLOUD_ROUTES`. A caller imports an export by its name
  alone, so the name carries what the folder would.
- **A `protocol/` function that converts starts with the verb for its
  conversion**:

  | Verb | Turns |
  | --- | --- |
  | `parse` | A reply or a message into a model |
  | `apply` | A control into the fields to write |
  | `encode`, `decode` | One value to and from its cloud or machine encoding |
  | `build` | Arguments into a request body or a command's fields |

- **A constant holding several values is plural**, and a list of a type's
  values takes the type's name: `FAN_SPEEDS` for `FanSpeed`.
- **An options type is its function's or class's name plus `Options`**:
  `MachineLinkOptions`.
- **A name carrying a unit spells it after `In`**. Milliseconds abbreviates to
  `Ms`, degrees Celsius to `C`, parts per million to `Ppm` and micrograms per
  cubic metre to `UgPerM3`: `timeoutInMs`, `DEFAULT_TIMEOUT_IN_MS`,
  `targetTemperatureInC`, `carbonDioxideInPpm`, `pm25InUgPerM3`,
  `manualHumidificationTargetInPercent`.

## Version the package with semver

Leave `version` in `package.json` at `0.0.0`: publishing a GitHub release sets
the version from its tag, and CI publishes the package. Pick the release's
version by what the changes since the last release do to everyone who installs
the package:

| The change | Bump | Example |
| --- | --- | --- |
| A bug fix, or anything a caller's code survives untouched | Patch | `1.4.2` → `1.4.3` |
| A capability added: a new export, a new optional field | Minor | `1.4.2` → `1.5.0` |
| A caller has to be edited: an export removed or renamed, a signature changed, an optional field made required | Major | `1.4.2` → `2.0.0` |

Before `1.0.0`, a change that makes callers edit their code bumps the minor
(`0.13.0` → `0.14.0`), and everything else bumps the patch. Take the level of
the largest change in the release.

**Break the API for a better structure.** Never keep a worse shape to spare
callers an edit: the break costs a minor bump and a line in the release
notes.

## Pull requests, commits, and comments

- **Say who does what, in order.** "`fetch` times out, so the transport throws a
  `DysonError` with status 504", never "a timeout surfaces as a 504".
- **Call a thing what the code calls it.** A buzzword or metaphor makes the
  reader translate it before they can act on it. Name the function, the
  endpoint, or the check.
- **A person merges.** Never merge a pull request unless told to merge that
  one, even when it is green and approved. Stop at ready to merge, and say which
  pull request to merge and what it unblocks.
- **Resolve a review thread once its fix is pushed**, with the GraphQL
  `resolveReviewThread` mutation. Leave a thread open only while it is
  unaddressed or waits on a person's decision.

## Documents

- **Say what to do, not what the project is.** Write only what a reader acts
  on: how to install it, how to call it, what it answers, what breaks. Prefer a
  table or a code block to a paragraph, and cut any sentence the reader would
  not miss.
- **The instruction comes first, the reason second.** Open on the imperative
  and put the reason behind a colon or a dash. The reason stays; only its
  position changes.
- **A heading names what is under it.** "Caching", not "What it is careful
  about". A table column is `Holds`, `Meaning`, or `Why`, never `Is`.
- **Delete rather than rephrase** a comment restating the command beside it, an
  example repeating an earlier one, a consequence anyone already knows, an
  aphorism standing where an instruction belongs, and a generic caution in
  place of the specific trap.
- **Describe the machine, not a source.** Code, comments, tests, docs and
  commit messages state what the cloud or a machine accepts and returns, in
  its own terms. Cite no other client or tool as the source of a behaviour;
  name another product only to state compatibility, as the README does.
- **One fact has one home.** Explain it where it is decided, and link to that
  from everywhere else.
- **Record a decision where it will be read again.** A decision whose
  alternative was built and rejected goes in `DESIGN.md`: what was chosen, what
  was rejected, and the fact that decided it. The README links to it in one line
  and carries none of the argument.
