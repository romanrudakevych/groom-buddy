/** UI visibility only; database policies independently scope accessible records. */
export function canSeeGroomerFinances(
  role: string | null,
  ownGroomerId: string | null,
  targetGroomerId: string,
  permissionGranted: boolean,
) {
  return permissionGranted && (role !== "groomer" || ownGroomerId === targetGroomerId);
}