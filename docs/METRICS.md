# Curve Studio Metrics & Analytics Specification

Curve Studio provides an extensive suite of pure analytical metrics calculated over trade simulation sequences and curve parameterizations.

---

## 1. Effective Average Entry Price
For a given wallet or buyer cohort across trades $t_1, \dots, t_k$:
$$\bar{P}_\text{entry} = \frac{\sum_{i=1}^k \Delta y_i}{\sum_{i=1}^k \Delta x_i}$$
where $\Delta y_i$ is net quote spent (including or excluding fees) and $\Delta x_i$ is base tokens received.

---

## 2. Max Drawdown for Early Buyers
Given a price path $P(t)$ from trade $0$ to $N$:
$$\text{MaxDrawdown}_i = \max_{\tau \ge i} \left( \frac{\max_{s \in [i, \tau]} P(s) - P(\tau)}{\max_{s \in [i, \tau]} P(s)} \right)$$
Evaluates the downside risk experienced by buyers who entered at step $i$ under stress-test scenarios (e.g. whale exit or bot dump).

---

## 3. Creator & Protocol Revenue
- **Creator Revenue**: Sum of creator trading fees ($\text{LP Fee} \times \text{creatorTradingFeePercentage}$) + creator pool creation fee share + creator migration fee + creator surplus share.
- **Protocol Fee Take**: Fixed 20% cut of trading fees + 10% pool creation fee + 0.2% protocol migration liquidity cut + 20% surplus cut.
- **Partner Revenue**: Remaining LP trading fees + 90% pool creation fee + partner migration fee + partner surplus share.

---

## 4. Slippage Curve
Price impact as a function of trade size $Q$ at any given state of the virtual curve:
$$\text{Slippage}(Q) = \frac{P_\text{marginal}(Q) - P_\text{spot}}{P_\text{spot}}$$

---

## 5. Fairness Score ($S_\text{fairness}$)
Measures how evenly the token supply is distributed among participants rather than concentrated in early blocks:
$$S_\text{fairness} = 1 - \text{GiniCoefficient}(\{x_\text{wallet}\})$$
A score close to 1.0 indicates a broad, egalitarian holder base; a score close to 0.0 indicates extreme early-buyer or sniper concentration.

---

## 6. Sniper Resistance Score ($S_\text{anti-snipe}$)
Evaluates curve resilience against block-0/early bundle extractors:
$$S_\text{anti-snipe} = f(\text{feeSchedulerDecay}, \text{earlySlippageMultiplier}, \text{maxSingleBuyImpact})$$
Takes into account:
1. Anti-snipe fee penalty during the early activation window.
2. Initial price slope steepness vs flat liquidity.
3. Cost in quote token for acquiring the first 5%, 10%, and 20% of circulating supply.
