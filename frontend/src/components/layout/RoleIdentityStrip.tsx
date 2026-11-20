import type { UserRole } from '../../types/vexa';

const STRIP_COLORS: Record<UserRole, string> = {
  BUSINESS: 'bg-[#0F4C5C]',
  STUDENT: 'bg-[#334155]',
  MENTOR: 'bg-[#B45309]',
  ADMIN: 'bg-[#18181B]',
};

export function RoleIdentityStrip({ role }: { role: UserRole }) {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-[3px] ${STRIP_COLORS[role]} transition-colors duration-200`}
      aria-label={`Active workspace role: ${role}`}
    />
  );
}
