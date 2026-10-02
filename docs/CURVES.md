# Meteora Dynamic Bonding Curves: Mathematical Specification & Mechanics 📐

This document specifies the exact mathematical models, fixed-point representations, virtual reserves, dynamic fee algorithms, and liquidity migration invariants implemented across **Curve Studio** and validated against **Meteora DBC**, **DAMM v2**, and **DLMM**.

---

## 1. Core Invariant & Virtual Reserve Math

Meteora's Dynamic Bonding Curve (DBC) operates as a **piecewise virtual constant-product curve** composed of up to 16 contiguous price segments.

### Sqrt-Price Representation
Prices on Solana are represented in $Q64.64$ fixed-point format or sqrt-price format:
$$\sqrt{P} = \sqrt{\frac{y}{x}} \times 2^{64}$$
where:
- $y$ is the quote asset amount (e.g. SOL or USDC, adjusted for decimals).
- $x$ is the base token amount (adjusted for decimals).
- $\text{Price} = P = (\sqrt{P} / 2^{64})^2 \times 10^{\text{baseDecimals} - \text{quoteDecimals}}$.

### Virtual Constant-Product Formula
For each segment $i$ bounded by $[\sqrt{P_i}, \sqrt{P_{i+1}}]$ with liquidity weight $L_i$:
$$(x + x_v)(y + y_v) = L_i^2$$

Where the virtual offsets are defined such that the curve intersects the segment boundaries exactly:
$$x_v = \frac{L_i}{\sqrt{P_{i+1}}}$$
$$y_v = L_i \sqrt{P_i}$$

### Segment Token Quantities
The amount of base tokens allocated to segment $i$ is:
$$\Delta x_i = L_i \left( \frac{1}{\sqrt{P_i}} - \frac{1}{\sqrt{P_{i+1}}} \right) = \frac{L_i (\sqrt{P_{i+1}} - \sqrt{P_i})}{\sqrt{P_i} \cdot \sqrt{P_{i+1}}}$$

The quote asset absorbed when trading through segment $i$ from $\sqrt{P_i}$ to $\sqrt{P_{i+1}}$ is:
$$\Delta y_i = L_i (\sqrt{P_{i+1}} - \sqrt{P_i})$$

From these relations, the segment liquidity weight $L_i$ satisfies:
$$L_i = \frac{\Delta x_i \cdot \sqrt{P_i} \cdot \sqrt{P_{i+1}}}{\sqrt{P_{i+1}} - \sqrt{P_i}} = \frac{\Delta y_i}{\sqrt{P_{i+1}} - \sqrt{P_i}}$$

---

## 2. Swap Computation (ExactIn & ExactOut)

### Buying Base Tokens with Quote In ($\Delta y_\text{in}$)
When a user provides $\Delta y_\text{in}$ of quote asset within segment $i$:
1. **Fee Deduction**:
   $$f = \text{currentFeeBps} / 10000$$
   $$\Delta y_\text{net} = \Delta y_\text{in} \cdot (1 - f)$$
2. **Next Sqrt-Price**:
   $$\sqrt{P_\text{next}} = \sqrt{P_\text{current}} + \frac{\Delta y_\text{net}}{L_i}$$
3. **Base Output**:
   $$\Delta x_\text{out} = L_i \left( \frac{1}{\sqrt{P_\text{current}}} - \frac{1}{\sqrt{P_\text{next}}} \right)$$

If $\sqrt{P_\text{next}} > \sqrt{P_{i+1}}$, the trade crosses segment boundary $i \to i+1$:
- The trade consumes segment $i$'s remaining base tokens.
- The remaining quote amount is rolled into segment $i+1$ with liquidity weight $L_{i+1}$.

### Selling Base Tokens with Base In ($\Delta x_\text{in}$)
When a user sells $\Delta x_\text{in}$ base tokens within segment $i$:
1. **Next Sqrt-Price**:
   $$\frac{1}{\sqrt{P_\text{next}}} = \frac{1}{\sqrt{P_\text{current}}} + \frac{\Delta x_\text{in}}{L_i}$$
   $$\sqrt{P_\text{next}} = \frac{\sqrt{P_\text{current}} \cdot L_i}{L_i + \Delta x_\text{in} \cdot \sqrt{P_\text{current}}}$$
2. **Gross Quote Output**:
   $$\Delta y_\text{gross} = L_i (\sqrt{P_\text{current}} - \sqrt{P_\text{next}})$$
3. **Fee Deduction**:
   $$\Delta y_\text{out} = \Delta y_\text{gross} \cdot (1 - f)$$

---

## 3. Dynamic Fee Schedulers

Meteora DBC supports time-based and volume-based dynamic fee schedules.

### Linear Time Decay (`FeeSchedulerLinear`)
$$f(t) = \begin{cases}
f_\text{start} - \frac{t - t_0}{T} (f_\text{start} - f_\text{end}), & t_0 \le t < t_0 + T \\
f_\text{end}, & t \ge t_0 + T
\end{cases}$$

Where:
- $f_\text{start}$: Initial trading fee (e.g. 500 bps = 5%).
- $f_\text{end}$: Floor trading fee (e.g. 100 bps = 1%).
- $T$: Total decay duration in seconds (e.g. 900s for 15 minutes).

### Exponential Time Decay (`FeeSchedulerExponential`)
$$f(t) = f_\text{end} + (f_\text{start} - f_\text{end}) \cdot \exp\left(-\lambda (t - t_0)\right)$$

### Fee Split Allocation
Every swap fee collected is partitioned atomically:
$$\text{Fee}_\text{total} = \text{Fee}_\text{protocol} + \text{Fee}_\text{creator} + \text{Fee}_\text{partner}$$
- $\text{Fee}_\text{creator} = \text{Fee}_\text{total} \cdot (\text{creatorFeePercentage} / 100)$
- $\text{Fee}_\text{partner} = \text{Fee}_\text{total} \cdot (1 - \text{creatorFeePercentage} / 100) \cdot (1 - \text{protocolTake})$

---

## 4. Graduation & DAMM v2 Migration Invariants

When cumulative quote asset absorbed reaches `migrationQuoteThreshold`:
1. **Trading Halts on DBC**: No further buys or sells can occur on the virtual bonding curve.
2. **Atomic DAMM v2 Migration**:
   - The real quote reserves ($Y_\text{real}$) and remaining unallocated base tokens ($X_\text{unallocated}$) are transferred to a newly initialized **DAMM v2 (`cp-amm`)** pool.
   - The initial AMM invariant is set to:
     $$k = X_\text{migrated} \cdot Y_\text{migrated}$$
   - The initial AMM spot price exactly matches the DBC graduation price:
     $$P_\text{AMM} = \frac{Y_\text{migrated}}{X_\text{migrated}} = P_\text{graduation}$$
3. **LP Token Distribution**:
   - $P_\text{partner\_lock}\%$ are permanently locked (burned or held in an unwithdrawable lock PDA).
   - $P_\text{creator\_lock}\%$ are permanently locked by the creator.
   - $P_\text{creator\_liquid}\%$ are minted to the creator wallet.
   - **Protocol Invariant**:
     $$P_\text{partner\_lock} + P_\text{creator\_lock} + P_\text{creator\_liquid} = 100\%$$

---

## 5. DLMM Conviction Pool Flow

For governance and community assets, Curve Studio provides an optional secondary migration step into **Meteora DLMM (`lb_clmm`)**:
1. A designated fraction of post-graduation liquidity (e.g. 20%) is allocated to initialize discrete price bins.
2. Bins are calculated according to:
   $$P_\text{bin}(i) = P_0 \cdot (1 + \text{binStep})^i$$
3. Token lockers commit their tokens for $N$ days to provide concentrated single-sided or dual-sided liquidity, capturing maximum fee yield from volatility without impermanent loss.
