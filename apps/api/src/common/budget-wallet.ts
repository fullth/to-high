/** Integer milli-won; a negative balance records an overrun and blocks new reservations. */
export type BudgetWallet = {
  version: number;
  balance: number;
  reservations: Record<string, number>;
  evaluatedWeek: string;
  credits?: Record<string, { amount: number; actor: string; at: string }>;
  alertCycle?: number;
  accounting?: {
    startedAt: string;
    carryoverMilliWon: number;
    approvedMilliWon: number;
    settledMilliWon: number;
  };
};

function validAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0;
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
  if (!Number.isSafeInteger(wallet.balance + reserved - cost))
    throw new Error('Invalid settlement balance');
  if (wallet.accounting && !Number.isSafeInteger(wallet.accounting.settledMilliWon + cost))
    throw new Error('Invalid settled total');
  const reservations = { ...wallet.reservations };
  delete reservations[id];
  return {
    ...wallet,
    version: wallet.version + 1,
    balance: wallet.balance + reserved - cost,
    reservations,
    ...(wallet.accounting ? { accounting: {
      ...wallet.accounting,
      settledMilliWon: wallet.accounting.settledMilliWon + cost,
    } } : {}),
  };
}

export function chargeBudget(
  wallet: BudgetWallet,
  amount: number,
  audit?: { id: string; actor: string; at: string },
): BudgetWallet {
  if (!validAmount(amount) || !Number.isSafeInteger(wallet.balance + amount))
    throw new Error('Invalid charge');
  if (wallet.accounting && !Number.isSafeInteger(wallet.accounting.approvedMilliWon + amount))
    throw new Error('Invalid approved total');
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
    ...(wallet.accounting ? { accounting: {
      ...wallet.accounting,
      approvedMilliWon: wallet.accounting.approvedMilliWon + amount,
    } } : {}),
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
