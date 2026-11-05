import { DEFAULT_REFILL_MILLI_WON } from './weekly-budget-calculation';

/** Values are nonnegative integer milli-won; persistence must compare-and-swap version. */
export type BudgetWallet = {
  version: number;
  balance: number;
  reservations: Record<string, number>;
  evaluatedWeek: string;
  credits?: Record<string, { amount: number; actor: string; at: string }>;
  alertCycle?: number;
};

function validAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0;
}

/** Charge a conservative estimate before dispatch, including failed calls. */
export function spendBudget(wallet: BudgetWallet, amount: number): BudgetWallet | null {
  if (!validAmount(amount)) throw new Error('Invalid spend');
  if (wallet.balance < amount) return null;
  return { ...wallet, version: wallet.version + 1, balance: wallet.balance - amount };
}

export function reserveBudget(
  wallet: BudgetWallet,
  id: string,
  amount: number,
): BudgetWallet | null {
  if (!id || !validAmount(amount) || Object.hasOwn(wallet.reservations, id))
    throw new Error('Invalid reservation');
  if (wallet.balance < amount) return null;
  return {
    ...wallet,
    version: wallet.version + 1,
    balance: wallet.balance - amount,
    reservations: { ...wallet.reservations, [id]: amount },
  };
}

/** Missing usage keeps the reservation; settling twice is rejected. */
export function settleBudget(
  wallet: BudgetWallet,
  id: string,
  cost: number | null,
): BudgetWallet {
  if (!Object.hasOwn(wallet.reservations, id))
    throw new Error('Unknown reservation');
  if (cost === null) return wallet;
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error('Invalid cost');
  const reserved = wallet.reservations[id];
  if (cost > reserved)
    throw new Error('Cost exceeds reservation and needs reconciliation');
  const reservations = { ...wallet.reservations };
  delete reservations[id];
  return {
    ...wallet,
    version: wallet.version + 1,
    balance: wallet.balance + reserved - cost,
    reservations,
  };
}

export function chargeBudget(
  wallet: BudgetWallet,
  amount: number,
  audit?: { id: string; actor: string; at: string },
): BudgetWallet {
  if (!validAmount(amount) || !Number.isSafeInteger(wallet.balance + amount))
    throw new Error('Invalid charge');
  if (audit) {
    if (
      !/^[a-f0-9]{32}$/.test(audit.id) ||
      !audit.actor ||
      !Number.isFinite(Date.parse(audit.at))
    )
      throw new Error('Invalid charge audit');
    const existing = wallet.credits?.[audit.id];
    if (existing) {
      if (existing.amount !== amount || existing.actor !== audit.actor)
        throw new Error('Charge id conflict');
      return wallet;
    }
    if (Object.keys(wallet.credits || {}).length >= 10000)
      throw new Error('Charge history capacity exceeded');
  }
  return {
    ...wallet,
    version: wallet.version + 1,
    balance: wallet.balance + amount,
    alertCycle: (wallet.alertCycle ?? 0) + 1,
    ...(audit
      ? {
          credits: {
            ...wallet.credits,
            [audit.id]: { amount, actor: audit.actor, at: audit.at },
          },
        }
      : {}),
  };
}

/** A week can be evaluated once, and outstanding reservations prevent automatic refill. */
export function evaluateWeeklyRefill(
  wallet: BudgetWallet,
  week: string,
  observedAt: string = week,
): BudgetWallet {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(week))
    throw new Error('Invalid week');
  if (wallet.evaluatedWeek >= week) return wallet;
  if (!Number.isFinite(Date.parse(observedAt)))
    throw new Error('Invalid observation time');
  const refill =
    wallet.balance === 0 && Object.keys(wallet.reservations).length === 0
      ? DEFAULT_REFILL_MILLI_WON
      : 0;
  return {
    ...wallet,
    version: wallet.version + 1,
    evaluatedWeek: week,
    balance: wallet.balance + refill,
    alertCycle: (wallet.alertCycle ?? 0) + (refill ? 1 : 0),
    ...(refill
      ? {
          credits: {
            ...wallet.credits,
            [`auto${week.replace(/\D/g, '')}`]: {
              amount: refill,
              actor: 'system',
              at: observedAt,
            },
          },
        }
      : {}),
  };
}
