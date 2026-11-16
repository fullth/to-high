/** Display missing observations explicitly rather than inventing zero usage. */
export const formatCount = (value: number | undefined) =>
  value === undefined ? "—" : value.toLocaleString("ko-KR");

export const formatMilliWon = (value: number | undefined) =>
  value === undefined
    ? "—"
    : `${(value / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 3 })}원`;
