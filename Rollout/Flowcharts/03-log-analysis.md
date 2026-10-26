# Reading a robot log

> Asked as: "why did this run hang?" · "what went wrong in this .glf?"

The robot writes binary `.glf` log files that can hold hundreds of thousands of lines. The assistant never reads them as text. It asks questions through a dedicated log reader (the Loupe server), starting with a fixed overview and then narrowing one question at a time, so that only the lines that matter end up in front of it.

```mermaid
flowchart TD
    Q([Log file handed over]):::start --> MCP{Log reader<br/>available?}:::decision
    MCP -->|No| STOP[Stop and explain how to start it<br/>no workaround, no manual reading]:::rule
    MCP -->|Yes| OPEN["Opening batch, four questions at once<br/>run summary, crashes,<br/>error census, activity timeline"]:::ai
    OPEN --> KIND{What kind of problem?}:::decision
    KIND -->|"Something failed"| CENSUS[Group errors by type]:::ai
    KIND -->|"Did X happen, when?"| TEXT[Search for that event]:::ai
    KIND -->|"Hang or freeze"| HANG[Timeline gaps<br/>and threads]:::ai
    KIND -->|"What led up to it?"| AROUND[Read the lines<br/>around one moment]:::ai
    CENSUS & TEXT & HANG & AROUND --> NARROW[Narrow down<br/>each question smaller than the last,<br/>an empty answer is a finding]:::ai
    NARROW --> SAMPLE[Follow the affected sample<br/>by rack position]:::ai
    SAMPLE --> NOISE["Set aside known false alarms<br/>look up error codes in this<br/>order's own error table"]:::ai
    NOISE --> HOST{Problem in the PC<br/>application itself?}:::decision
    HOST -->|Yes| HL[Ask the engineer for<br/>the separate host log]:::human --> REPORT
    HOST -->|No| REPORT[Report<br/>summary, timeline, root cause,<br/>affected samples, recommendation]:::ai

    classDef start fill:#1b355d,stroke:#1b355d,color:#ffffff
    classDef ai fill:#e6ecf7,stroke:#1b355d,color:#16233a
    classDef decision fill:#ffffff,stroke:#1b355d,color:#16233a
    classDef human fill:#fff3db,stroke:#ffa400,color:#16233a
    classDef rule fill:#fdecec,stroke:#b03a3a,color:#16233a
```

## Key points

- Without the log reader there is no analysis. The assistant stops and says how to fix it rather than guessing from the raw file.
- The four opening questions always go out together, which turns several rounds into one.
- Searches are capped at 20 to 30 results and never paged through. A wide search fills the conversation with lines that are then re-sent on every later round.
- Error codes differ per robot, so a code is looked up in that order's own error table, never in a template or another order.
- A "COM port opened" line without a reply points to cabling or power, so the assistant stops looking at code there.

## For a web version

Fit: Good. Read only from start to finish; the user uploads a log and gets a report.
Needs: Workspace files; Log reader; File upload
Writes: nothing
