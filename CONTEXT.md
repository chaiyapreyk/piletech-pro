# PileTech Pro &mdash; Domain Model Glossary

## Field Capture & Records

### Guided Field Mode
A full-screen, mobile-first capture mode for a Driving Record. It focuses on the current penetration interval, supports saving a blow count or marking an interval as skipped, advances to the next interval automatically, and provides a review/quick-edit path without replacing the standard engineering form.

### Draft
A browser-local snapshot of the complete Driving Record form that has not yet been submitted to the server. A project/pile has one latest Draft; saving a new Draft replaces the previous Draft for that pile.

### Save Draft
An explicit user action that writes the current Driving Record form snapshot to browser storage. Save Draft is allowed offline and does not change the server-side Driving Record or pile status.

### Save Record
The online submission that writes a Driving Record to the server and updates the pile status. It is distinct from Save Draft and is disabled while the browser is offline.

### Online Submission
The only operation that changes server-side Driving Record data. It carries the record timestamp observed when the form/Draft was opened; a changed timestamp produces a conflict requiring an explicit user choice.

Core geotechnical and structural engineering terminology used across the codebase.

## Elevations & Pile Geometry (ระดับและเรขาคณิตเสาเข็ม)

### Ground Level (GL, ระดับดินเดิม)
The reference elevation datum of the ground surface at the pile location, measured in meters relative to Mean Sea Level (m MSL). Typically positive (e.g. `+3.00 m`).

### Cut-Off Level (COL, ระดับตัดหัวเข็ม)
The design elevation where the pile head must be trimmed to connect with the foundation footing / pile cap, measured in m MSL (e.g. `+2.50 m`).

### Total Pile Length ($L_{pile}$, ความยาวเสาเข็มรวม)
The nominal total fabricated length of the pile segment(s) driven into the ground, measured in meters (e.g. `21.00 m`).

### Stick-Up Length ($h_{stick}$, ระยะเสาเข็มโผล่เหนือดิน)
The vertical distance from ground level to the top of the pile head after driving:
- $h_{stick} > 0$: Pile head protrudes above ground surface.
- $h_{stick} < 0$: Follower-driven penetration below ground level (dolly / follower used).

### Driven Depth ($L_{driven}$, ความลึกการจมของเสาเข็ม)
The total net penetration of the pile tip into the soil below ground level:
$$L_{driven} = L_{pile} - h_{stick}$$

### Tip Level (ระดับปลายเสาเข็ม)
The elevation of the bottom tip of the driven pile relative to MSL datum:
$$\text{Tip Level} = GL - L_{driven} = GL - (L_{pile} - h_{stick})$$
May be derived automatically from geometry or verified via surveyor measurement.

### Actual Top Level (ระดับหัวเสาเข็มจริงหลังตอก)
The elevation of the top of the pile head immediately after driving completes, before cut-off:
$$\text{Actual Top Level} = GL + h_{stick}$$

### Cut-Off Waste Length ($L_{waste}$, ความยาวคอนกรีตตัดทิ้ง / เสียทิ้ง)
The excess length of pile extending above the design cut-off level that must be broken down and trimmed:
$$L_{waste} = \text{Actual Top Level} - COL$$

### Follower / Dolly (ท่อนส่งเข็ม)
A rigid temporary extension tool placed on the pile head to allow driving below ground level when the required cut-off level is situated deep beneath the working ground platform.
