# VPS Observation Dashboard Specification

## Purpose

Define the testable behavior of an authenticated, observation-only dashboard skeleton that presents representative mock activity on a phone without defining the future laptop-to-VPS observation contract.

The key words **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## Data-field definition

For this specification, a displayed data field is a logical piece of dashboard record content. The project name MAY appear once as a group heading rather than repeat for every agent. A textual or symbolic state indicator is another representation of the `state` field, not an additional field. Authentication prompts, page headings, and loading, failure, or empty-state guidance are interface copy rather than dashboard record data.

## Requirements

### Requirement: Authenticated browser access

The service MUST require successful username-and-password authentication before disclosing protected dashboard data. Before successful authentication, neither the dashboard document nor any supporting response SHALL disclose record values or protected mock content. Invalid or revoked credentials MUST produce an authentication-failure state without protected data.

The service MUST allow credentials to be revoked and rotated without changing the dashboard URL. This requirement does not define logout behavior, session expiry, multiple users, or credential-storage mechanics.

#### Scenario: Protected data is withheld before authentication

- **Given** a visitor has not successfully authenticated
- **When** the visitor requests the dashboard or any supporting dashboard response
- **Then** the service presents an authentication entry or failure state
- **And** the response contains no protected record values from the mock source
- **And** none of the five dashboard fields is populated from protected data

#### Scenario: Valid username and password permit observation

- **Given** an active username-and-password credential pair
- **When** the visitor submits that pair successfully
- **Then** the visitor can reach the dashboard presentation states
- **And** any populated data remains subject to the exact field boundary and observation-only requirements

#### Scenario: Invalid credentials disclose nothing

- **Given** a visitor supplies an invalid username or password
- **When** authentication is evaluated
- **Then** the service presents the authentication-failure state
- **And** no protected dashboard record, project group, or mock value is disclosed

#### Scenario: Credentials are revoked without a URL change

- **Given** credentials that previously allowed access at a dashboard URL
- **When** those credentials are revoked
- **Then** they no longer permit protected dashboard data to be viewed
- **And** the dashboard URL remains unchanged

#### Scenario: Credentials are rotated without a URL change

- **Given** an active credential pair and an existing dashboard URL
- **When** the credentials are rotated
- **Then** the previous pair no longer permits access
- **And** the replacement pair permits access
- **And** the dashboard URL remains unchanged

### Requirement: Observation-only authority boundary

The authenticated dashboard MUST be observation-only. It SHALL expose no dashboard action, mutation, approval, command, or operational write path. Authentication submission SHALL NOT grant or imply authority over Control Tower or any observed project, agent, task, or branch.

#### Scenario: Authenticated use offers no operational action

- **Given** a visitor has successfully authenticated
- **When** the visitor inspects and navigates every populated, loading, and empty dashboard state
- **Then** no control for an action, mutation, approval, command, or write operation is available
- **And** the visitor can only observe the permitted presentation

#### Scenario: The service exposes no operational write path

- **Given** the dashboard's externally accessible operations are enumerated
- **When** each operation is classified by its effect
- **Then** none can change Control Tower state or observed project, agent, task, or branch state
- **And** none can approve work or issue a command
- **And** the authentication exchange is not represented as operational authority

### Requirement: Exact five-field disclosure boundary

Populated dashboard record content MUST consist of exactly these five logical fields:

1. project name
2. agent name
3. state
4. task title
5. branch name

The dashboard MUST NOT display file paths, line counts, test results, source code, diffs, secrets, or any other operational metadata. Data supplied by a source outside the five-field view shape SHALL NOT expand the displayed field set.

#### Scenario: Populated records display exactly the permitted fields

- **Given** authenticated access and representative populated mock records
- **When** the dashboard renders the records
- **Then** records are grouped under their project name
- **And** the displayed record data contains agent name, state, task title, and branch name
- **And** project name, agent name, state, task title, and branch name are the only logical dashboard data fields displayed

#### Scenario: Extra source properties do not drift into the view

- **Given** a mock source record also contains unexpected properties outside the five-field view shape
- **When** that record passes through the source/view-model boundary and is rendered
- **Then** none of the unexpected properties or their values is displayed
- **And** the displayed data-field set remains exactly the five permitted fields

#### Scenario: Prohibited operational metadata is absent

- **Given** any authenticated dashboard presentation state
- **When** its visible record content and disclosed supporting data are inspected
- **Then** no file path, line count, test result, source code, diff, secret, or other operational metadata is present

### Requirement: Mobile-first project hierarchy

The populated dashboard MUST use a list grouped by project as its primary information structure. At a phone viewport 320 CSS pixels wide or wider, the list SHALL remain readable without horizontal scrolling. The phone presentation MUST preserve the exact five-field boundary and MUST NOT add desktop-oriented panels or operational modules.

#### Scenario: Phone viewport preserves readable project groups

- **Given** authenticated access, populated records for multiple projects, and a viewport 320 CSS pixels wide
- **When** the dashboard is presented
- **Then** each agent record appears within its project group
- **And** all five permitted fields can be read without horizontal scrolling
- **And** no desktop-oriented panel or additional operational module is required to understand the list

#### Scenario: Grouping remains the primary structure

- **Given** a project with multiple agent records and another project with at least one agent record
- **When** the populated dashboard is presented
- **Then** project boundaries are explicit
- **And** agents can be associated with the correct project without relying on record order alone

### Requirement: State is understandable without color alone

Every displayed state MUST include a non-color cue that communicates its meaning. Color, glow, and other visual emphasis MAY supplement that cue but SHALL NOT be the only means of distinguishing state.

#### Scenario: State remains understandable without color or glow

- **Given** a populated dashboard with more than one state value
- **When** color and glow differences are unavailable or ignored
- **Then** each record's state remains identifiable through readable text or another explicit non-color cue

### Requirement: Explicit presentation states

The service MUST provide distinct populated, loading, authentication-failure, and empty presentation states. Loading and empty states SHALL disclose no protected record values beyond data already available after successful authentication, and the authentication-failure state SHALL disclose no protected record values at all. These states MUST describe presentation conditions only and SHALL NOT claim transport, persistence, freshness, runtime lifecycle, or P4-P6 semantics.

#### Scenario: Populated state presents available records

- **Given** successful authentication and a source that supplies one or more valid mock records
- **When** source resolution completes
- **Then** the populated state presents the records in project groups
- **And** it follows the exact five-field disclosure boundary

#### Scenario: Loading state is explicit

- **Given** successful authentication and a selected source that has not completed resolution
- **When** the dashboard is presented
- **Then** an explicit loading state is shown
- **And** no unavailable record value is fabricated or disclosed
- **And** the state makes no claim about network transport, freshness, or runtime lifecycle

#### Scenario: Authentication-failure state is explicit

- **Given** authentication does not succeed
- **When** the dashboard responds
- **Then** an explicit authentication-failure state is shown
- **And** no protected dashboard data is disclosed

#### Scenario: Empty state is explicit

- **Given** successful authentication and a source that supplies no project or agent records
- **When** source resolution completes
- **Then** an explicit empty state is shown
- **And** no record or operational metadata is fabricated
- **And** the state makes no claim about transport, persistence, freshness, runtime lifecycle, or P4-P6 behavior

### Requirement: Replaceable mock source and view-model seam

Representative mock records MUST enter the presentation through a replaceable source/view-model seam. Rendering code SHALL consume the five-field view shape and MUST NOT import mock fixtures directly. Replacing the mock source with another source that provides the same view shape SHALL NOT require changes to record rendering behavior.

The mock source and view shape MUST be presentation-only. They SHALL NOT define or imply the future laptop-to-VPS projection payload, transport, persistence, freshness, or P4-P6 semantics.

#### Scenario: Rendering is isolated from fixtures

- **Given** representative mock fixtures and the dashboard rendering boundary
- **When** rendering dependencies are inspected
- **Then** rendering consumes records through the source/view-model seam
- **And** rendering does not import mock fixtures directly

#### Scenario: A compatible source can replace the mock source

- **Given** the mock source and a replacement source that both provide the same five-field view shape
- **When** the replacement source is selected
- **Then** populated records render without changing record rendering behavior
- **And** the exact five-field disclosure boundary remains enforced

#### Scenario: Mock shape does not become a projection contract

- **Given** the mock source, view-model seam, fixtures, and view shape
- **When** their exposed fields and documented semantics are inspected
- **Then** they define only project name, agent name, state, task title, and branch name for presentation
- **And** they define no laptop-to-VPS payload or transport
- **And** they define no persistence or freshness rules
- **And** they define no P4-P6 field, lifecycle, or continuation semantics

### Requirement: VPS-deployable dashboard outcome

The deliverable MUST be deployable as an independently running browser-accessible service in a VPS environment. This specification SHALL NOT select a library, VPS provider, process supervisor, proxy, certificate mechanism, or other concrete hosting mechanic.

#### Scenario: The outcome runs in a VPS environment

- **Given** a representative VPS environment and deployment mechanics selected outside this specification
- **When** the dashboard deliverable is deployed and started
- **Then** a phone browser can reach its stable dashboard URL
- **And** protected data remains subject to successful username-and-password authentication
- **And** the service remains observation-only

#### Scenario: Specification leaves implementation and hosting choices open

- **Given** this capability specification
- **When** its normative requirements are inspected
- **Then** no implementation library or VPS provider is mandated
- **And** no process supervisor, proxy, certificate mechanism, or equivalent hosting mechanic is mandated
