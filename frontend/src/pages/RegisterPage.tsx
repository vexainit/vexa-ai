import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Building2, CheckCircle2, ClipboardCheck, GraduationCap, Loader2, Upload } from 'lucide-react';
import { ROLE_DEFAULT_ROUTE, useRole } from '../context/RoleContext';
import { apiFetch } from '../lib/api';
import { isFirebaseConfigured, PENDING_FIREBASE_TOKEN_KEY, signInWithGoogleFirebase } from '../lib/firebase';
import type { UserProfile } from '../types/vexa';

type RegisterRole = 'BUSINESS' | 'STUDENT' | 'MENTOR';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const qpRole = (searchParams.get('role')?.toUpperCase() as RegisterRole) || 'BUSINESS';

  const [role, setRole] = useState<RegisterRole>(
    ['BUSINESS', 'STUDENT', 'MENTOR'].includes(qpRole) ? qpRole : 'BUSINESS'
  );
  const [fullName, setFullName] = useState(searchParams.get('name') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const [pendingFbToken, setPendingFbToken] = useState<string | null>(() => {
    if (searchParams.get('google') === '1') {
      try {
        return sessionStorage.getItem(PENDING_FIREBASE_TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [companyName, setCompanyName] = useState('');
  const [cinOrGstin, setCinOrGstin] = useState('');
  const [businessDomain, setBusinessDomain] = useState('Retail/D2C');
  const [scaleTier, setScaleTier] = useState('6-20');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  const [collegeName, setCollegeName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [degreeBranch, setDegreeBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [githubUrl, setGithubUrl] = useState('');

  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [yearsExperience, setYearsExperience] = useState('5');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { setAuthSession } = useRole();
  const navigate = useNavigate();

  const handleGooglePrefill = async () => {
    setError('');
    setSubmitting(true);
    try {
      const idToken = await signInWithGoogleFirebase();
      const res = await apiFetch<{
        needs_registration: boolean;
        access_token?: string;
        user?: UserProfile;
        email?: string;
        full_name?: string;
      }>('/auth/firebase', {
        method: 'POST',
        token: null,
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!res.needs_registration && res.access_token && res.user) {
        setAuthSession(res.access_token, res.user);
        navigate(ROLE_DEFAULT_ROUTE[res.user.role]);
        return;
      }
      sessionStorage.setItem(PENDING_FIREBASE_TOKEN_KEY, idToken);
      setPendingFbToken(idToken);
      if (res.email) setEmail(res.email);
      if (res.full_name) setFullName(res.full_name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pendingFbToken && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const tags = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let profileMeta: Record<string, string> = {};
    if (role === 'BUSINESS') {
      profileMeta = {
        company_name: companyName.trim(),
        cin_or_gstin: cinOrGstin.trim().toUpperCase(),
        business_domain: businessDomain,
        scale_tier: scaleTier,
        website_url: websiteUrl.trim(),
      };
    } else if (role === 'STUDENT') {
      profileMeta = {
        college_name: collegeName.trim(),
        student_id_number: studentIdNumber.trim(),
        degree_branch: degreeBranch.trim(),
        graduation_year: graduationYear.trim(),
        github_url: githubUrl.trim(),
      };
    } else {
      profileMeta = {
        organization: organization.trim(),
        job_title: jobTitle.trim(),
        years_experience: yearsExperience.trim(),
        linkedin_url: linkedinUrl.trim(),
      };
    }

    const formData = new FormData();
    formData.append('full_name', fullName.trim());
    formData.append('role', role);
    formData.append('domain_tags', JSON.stringify(tags));
    formData.append('profile_meta', JSON.stringify(profileMeta));
    if (role === 'BUSINESS' && certFile) {
      formData.append('incorporation_certificate', certFile);
    }

    setSubmitting(true);
    try {
      let res: { access_token: string; user: UserProfile };
      if (pendingFbToken) {
        formData.append('id_token', pendingFbToken);
        res = await apiFetch<{ access_token: string; user: UserProfile }>('/auth/firebase-complete', {
          method: 'POST',
          token: null,
          body: formData,
        });
        sessionStorage.removeItem(PENDING_FIREBASE_TOKEN_KEY);
      } else {
        formData.append('email', email.trim());
        formData.append('password', password);
        res = await apiFetch<{ access_token: string; user: UserProfile }>('/auth/register', {
          method: 'POST',
          token: null,
          body: formData,
        });
      }
      setAuthSession(res.access_token, res.user);
      navigate(ROLE_DEFAULT_ROUTE[res.user.role]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-vb-canvas flex flex-col">
      <div className="h-[3px] bg-vb-teal w-full" />

      <header className="h-16 px-6 flex items-center justify-between border-b border-vb-border bg-vb-surface">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-base text-vb-ink">
          <span className="w-7 h-7 rounded bg-vb-teal text-white flex items-center justify-center text-xs font-bold">
            VB
          </span>
          <span>Vexa Bridge</span>
        </Link>
        <Link to="/login" className="text-sm font-medium text-vb-teal hover:underline">
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[600px] space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display font-bold text-3xl text-vb-ink">Create account</h1>
            <p className="text-[15px] text-vb-muted">
              Provide your role credentials for workspace access and admin verification.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 rounded-lg border border-vb-border bg-vb-surface">
            {[
              { id: 'BUSINESS' as RegisterRole, label: 'Business', icon: Building2 },
              { id: 'STUDENT' as RegisterRole, label: 'Student', icon: GraduationCap },
              { id: 'MENTOR' as RegisterRole, label: 'Mentor', icon: ClipboardCheck },
            ].map((item) => {
              const Icon = item.icon;
              const active = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRole(item.id);
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                    active ? 'bg-vb-teal text-white' : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="vb-card p-7 space-y-6">
            {error && (
              <div className="p-3.5 rounded-md bg-vb-terracotta-tint border border-vb-terracotta/35 text-sm text-vb-terracotta flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {pendingFbToken ? (
              <div className="p-3.5 rounded-md bg-vb-verified-tint border border-vb-verified/30 text-sm text-vb-verified flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Google verified ({email})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(PENDING_FIREBASE_TOKEN_KEY);
                    setPendingFbToken(null);
                  }}
                  className="underline text-xs shrink-0"
                >
                  Use email instead
                </button>
              </div>
            ) : (
              isFirebaseConfigured && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGooglePrefill}
                    className="w-full py-2.5 px-4 rounded-md border border-vb-border bg-vb-surface hover:bg-vb-canvas text-sm font-medium text-vb-ink flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    <span className="font-display font-bold text-vb-teal">G</span>
                    <span>Sign up with Google</span>
                  </button>
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-vb-border w-full" />
                    <span className="bg-vb-surface px-3 text-xs text-vb-muted">or email</span>
                  </div>
                </>
              )
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vb-label block mb-1.5">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rohan Patel"
                  className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                  required
                />
              </div>
              <div>
                <label className="vb-label block mb-1.5">Work or campus email</label>
                <input
                  type="email"
                  value={email}
                  disabled={Boolean(pendingFbToken)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.in"
                  className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface disabled:bg-vb-canvas disabled:text-vb-muted"
                  required
                />
              </div>
              {!pendingFbToken && (
                <div className="sm:col-span-2">
                  <label className="vb-label block mb-1.5">Password (at least 8 characters)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    placeholder="Create a password"
                    className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                    required
                  />
                </div>
              )}
            </div>

            <div className="border-t border-vb-border pt-5 space-y-4">
              {role === 'BUSINESS' && (
                <>
                  <h2 className="text-base font-display font-bold text-vb-ink">Business details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="vb-label block mb-1.5">Registered company name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Kaya Looms Pvt Ltd"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">CIN, GSTIN, or Udyam number</label>
                      <input
                        type="text"
                        value={cinOrGstin}
                        onChange={(e) => setCinOrGstin(e.target.value)}
                        placeholder="24AABCK1234F1Z5"
                        className="w-full px-3.5 py-2.5 text-[15px] font-mono uppercase rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Industry domain</label>
                      <select
                        value={businessDomain}
                        onChange={(e) => setBusinessDomain(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      >
                        <option value="Retail/D2C">Retail / D2C</option>
                        <option value="Manufacturing/Wholesale">Manufacturing / Wholesale</option>
                        <option value="Services/Agency">Services / Agency</option>
                        <option value="Logistics">Logistics</option>
                        <option value="EdTech/Other">EdTech / Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Team size</label>
                      <select
                        value={scaleTier}
                        onChange={(e) => setScaleTier(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      >
                        <option value="1-5">1–5 staff</option>
                        <option value="6-20">6–20 staff</option>
                        <option value="21-50">21–50 staff</option>
                        <option value="50+">50+ staff</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">
                        Certificate of incorporation or GST certificate (PDF, PNG, JPG)
                      </label>
                      <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-vb-border hover:border-vb-teal bg-vb-canvas/60 cursor-pointer text-sm">
                        <Upload className="w-4 h-4 text-vb-teal shrink-0" />
                        <span className="text-vb-ink truncate">
                          {certFile
                            ? `${certFile.name} (${(certFile.size / 1024).toFixed(0)} KB)`
                            : 'Choose file to upload'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">Company website (optional)</label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://company.in"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'STUDENT' && (
                <>
                  <h2 className="text-base font-display font-bold text-vb-ink">Student details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">College or university name</label>
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="IIT Gandhinagar"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Student ID or roll number</label>
                      <input
                        type="text"
                        value={studentIdNumber}
                        onChange={(e) => setStudentIdNumber(e.target.value)}
                        placeholder="22BCE104"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Graduation year</label>
                      <input
                        type="text"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        placeholder="2026"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Degree and branch</label>
                      <input
                        type="text"
                        value={degreeBranch}
                        onChange={(e) => setDegreeBranch(e.target.value)}
                        placeholder="B.Tech Computer Science"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">GitHub or portfolio URL</label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">Technical skills (comma-separated)</label>
                      <input
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="Python, FastAPI, Gemini API, React, Pandas"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'MENTOR' && (
                <>
                  <h2 className="text-base font-display font-bold text-vb-ink">Mentor details</h2>
                  <p className="text-sm text-vb-revision bg-vb-revision-tint/60 border border-vb-revision/30 rounded-md p-3.5">
                    New mentor accounts start in read-only review mode until approved by a platform admin.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="vb-label block mb-1.5">Current organization</label>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Razorpay"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Job title</label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Staff Engineer"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Years of experience</label>
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-[15px] tabular-num rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">LinkedIn profile URL</label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">Specialties (comma-separated)</label>
                      <input
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="AI Agents, SMB Operations, Cloud Run, Data Pipelines"
                        className="w-full px-3.5 py-2.5 text-[15px] rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {pendingFbToken ? 'Complete registration' : 'Create account'}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
