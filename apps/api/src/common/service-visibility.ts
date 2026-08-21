export function isServiceEnabled(
  environmentKey: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment[environmentKey]?.trim().toLowerCase() === 'true';
}
