- Localize visible CRM interface text through `src/lib/i18n.tsx` so Russian and Czech can switch while stored CRM values stay stable.
- Keep calendar visit quick view in a focused read-only dialog; use the existing appointment dialog for edits and creation to preserve a single save flow.
- Each dog has exactly one main owner (`dogs.owner_id`); extra family contacts live on the client (`clients.additional_contacts`), and `client_dogs` is deprecated — dog is the primary object.
- Access control lives in database policies (user_roles + has_role/is_staff/my_groomer_id helpers); the UI role gate in __root only hides menus, because RLS is the real protection.
- Use the shared groomer-finances visibility helper for groomer list and detail indicators so both views honor the same permission and own-record scope.
- Keep fixed administrator section restrictions in the shared access module; navigation, direct-page checks and permission controls must use it so stale permission sets cannot reopen restricted sections.

- Permissions are per user: user_permissions overrides role_permissions defaults (has_permission checks both), so the owner can tune each employee without changing the role.
