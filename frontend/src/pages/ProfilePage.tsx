import { CheckCircle2, Clock, Download, ExternalLink } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useRole } from '../context/RoleContext';
import { apiDownload } from '../lib/api';
import { formatShortDate } from '../lib/formatters';

export function ProfilePage() {
  const { user } = useRole();
  if (!user) return null;

  const meta = user.profile_meta || {};

  return (
    <AppShell title="Profile & Verification Credentials">
      <div className="max-w-2xl space-y-6">
        <div className="vb-card p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-vb-border">
            <div>
              <span className="font-mono text-[11px] text-vb-muted uppercase">{user.role} Account</span>
              <h1 className="font-display font-bold text-xl text-vb-ink mt-0.5">{user.full_name}</h1>
              <div className="text-xs font-mono text-vb-muted mt-0.5">{user.email}</div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 rounded ${
                user.is_verified
                  ? 'bg-vb-verified-tint text-vb-verified'
                  : 'bg-vb-revision-tint text-vb-revision'
              }`}
            >
              {user.is_verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              <span>{user.is_verified ? 'Verified' : 'Pending Admin Verification'}</span>
            </span>
          </div>

          {user.role === 'BUSINESS' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="vb-label">Registered Company</dt>
                <dd className="text-sm font-semibold text-vb-ink mt-0.5">{meta.company_name || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">CIN / GSTIN</dt>
                <dd className="font-mono text-sm text-vb-ink mt-0.5">{meta.cin_or_gstin || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">Industry &amp; Scale</dt>
                <dd className="text-vb-ink mt-0.5">
                  {meta.business_domain || '—'} · {meta.scale_tier || '—'} staff
                </dd>
              </div>
              <div>
                <dt className="vb-label">Incorporation Certificate</dt>
                <dd className="mt-1">
                  {meta.has_incorporation_cert ? (
                    <button
                      type="button"
                      onClick={() =>
                        apiDownload(
                          `/auth/certificate/${user.id}`,
                          meta.incorporation_cert_name || 'certificate.pdf'
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-vb-teal font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{meta.incorporation_cert_name || 'Download Certificate'}</span>
                    </button>
                  ) : (
                    <span className="text-vb-muted">Not uploaded</span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          {user.role === 'STUDENT' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="vb-label">College / University</dt>
                <dd className="text-sm font-semibold text-vb-ink mt-0.5">{meta.college_name || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">Student ID / Enrollment</dt>
                <dd className="font-mono text-sm text-vb-ink mt-0.5">{meta.student_id_number || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">Degree &amp; Graduation</dt>
                <dd className="text-vb-ink mt-0.5">
                  {meta.degree_branch || '—'} · Class of {meta.graduation_year || '—'}
                </dd>
              </div>
              <div>
                <dt className="vb-label">GitHub / Portfolio</dt>
                <dd className="mt-0.5">
                  {meta.github_url ? (
                    <a
                      href={meta.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-vb-teal hover:underline"
                    >
                      <span>{meta.github_url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          )}

          {user.role === 'MENTOR' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="vb-label">Organization</dt>
                <dd className="text-sm font-semibold text-vb-ink mt-0.5">{meta.organization || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">Job Title</dt>
                <dd className="text-sm font-semibold text-vb-ink mt-0.5">{meta.job_title || '—'}</dd>
              </div>
              <div>
                <dt className="vb-label">Experience</dt>
                <dd className="tabular-num text-vb-ink mt-0.5">{meta.years_experience || '—'} years</dd>
              </div>
              <div>
                <dt className="vb-label">LinkedIn Verification</dt>
                <dd className="mt-0.5">
                  {meta.linkedin_url ? (
                    <a
                      href={meta.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-vb-teal hover:underline"
                    >
                      <span>View Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          )}

          {user.domain_tags.length > 0 && (
            <div className="pt-4 border-t border-vb-border">
              <div className="vb-label mb-2">Tags &amp; Specialties</div>
              <div className="flex flex-wrap gap-1.5">
                {user.domain_tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-vb-border text-[11px] font-mono text-vb-muted flex justify-between">
            <span>User ID: {user.id}</span>
            <span>Registered: {formatShortDate(user.created_at)}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
