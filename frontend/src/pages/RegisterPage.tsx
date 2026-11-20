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

  // Pending Firebase Google token (when signing up with Google Auth)
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

  // Business-specific credentials
  const [companyName, setCompanyName] = useState('');
  const [cinOrGstin, setCinOrGstin] = useState('');
  const [businessDomain, setBusinessDomain] = useState('Retail/D2C');
  const [scaleTier, setScaleTier] = useState('6-20');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  // Student-specific credentials
  const [collegeName, setCollegeName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [degreeBranch, setDegreeBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [githubUrl, setGithubUrl] = useState('');

  // Mentor-specific credentials
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

      <header className="h-14 px-6 flex items-center justify-between border-b border-vb-border bg-vb-surface">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-sm text-vb-ink">
          <span className="w-6 h-6 rounded bg-vb-teal text-white flex items-center justify-center text-[11px] font-extrabold">
            VB
          </span>
          <span>Vexa Bridge</span>
        </Link>
        <Link to="/login" className="text-xs font-semibold text-vb-teal hover:underline">
          Already registered? Sign In →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[560px] space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display font-extrabold text-2xl text-vb-ink">
              Create Your Verified Account
            </h1>
            <p className="text-xs text-vb-muted">
              Role-specific credentials are stored securely in the database for Platform Admin verification.
            </p>
          </div>

          {/* 3-Role Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded border border-vb-border bg-vb-surface">
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
                  className={`flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold transition-colors ${
                    active ? 'bg-vb-teal text-white' : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="vb-card p-6 space-y-5">
            {error && (
              <div className="p-3 rounded bg-vb-terracotta-tint border border-vb-terracotta/35 text-xs text-vb-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Auth Status / Button */}
            {pendingFbToken ? (
              <div className="p-3 rounded bg-vb-verified-tint border border-vb-verified/30 text-xs text-vb-verified flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Google verified (<strong>{email}</strong>) — finish your role details below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(PENDING_FIREBASE_TOKEN_KEY);
                    setPendingFbToken(null);
                  }}
                  className="underline text-[11px] shrink-0"
                >
                  Use email/password
                </button>
              </div>
            ) : (
              isFirebaseConfigured && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGooglePrefill}
                    className="w-full py-2.5 px-4 rounded border border-vb-border bg-vb-surface hover:bg-vb-canvas text-xs font-semibold text-vb-ink flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="font-mono font-bold text-vb-teal">G</span>
                    <span>Sign Up with Google (Firebase Auth)</span>
                  </button>
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-vb-border w-full" />
                    <span className="bg-vb-surface px-2.5 text-[10px] font-mono uppercase text-vb-muted">
                      or email
                    </span>
                  </div>
                </>
              )
            )}

            {/* Common Account Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vb-label block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rohan Patel"
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>
              <div>
                <label className="vb-label block mb-1.5">Work / Campus Email</label>
                <input
                  type="email"
                  value={email}
                  disabled={Boolean(pendingFbToken)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.in"
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface disabled:bg-vb-canvas disabled:text-vb-muted"
                  required
                />
              </div>
              {!pendingFbToken && (
                <div className="sm:col-span-2">
                  <label className="vb-label block mb-1.5">Password (min 8 characters)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    placeholder="Create a strong password"
                    className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                    required
                  />
                </div>
              )}
            </div>

            <div className="border-t border-vb-border pt-4 space-y-4">
              {role === 'BUSINESS' && (
                <>
                  <div className="text-xs font-display font-bold text-vb-ink">
                    Business Verification Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="vb-label block mb-1.5">Registered Company Name *</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Kaya Looms Pvt Ltd"
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">CIN / GSTIN / Udyam No *</label>
                      <input
                        type="text"
                        value={cinOrGstin}
                        onChange={(e) => setCinOrGstin(e.target.value)}
                        placeholder="24AABCK1234F1Z5"
                        className="w-full px-3 py-2 text-sm font-mono uppercase rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Industry Domain</label>
                      <select
                        value={businessDomain}
                        onChange={(e) => setBusinessDomain(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                      >
                        <option value="Retail/D2C">Retail / D2C</option>
                        <option value="Manufacturing/Wholesale">Manufacturing / Wholesale</option>
                        <option value="Services/Agency">Services / Agency</option>
                        <option value="Logistics">Logistics</option>
                        <option value="EdTech/Other">EdTech / Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Team Scale</label>
                      <select
                        value={scaleTier}
                        onChange={(e) => setScaleTier(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                      >
                        <option value="1-5">1–5 staff</option>
                        <option value="6-20">6–20 staff</option>
                        <option value="21-50">21–50 staff</option>
                        <option value="50+">50+ staff</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">
                        Certificate of Incorporation / GST Certificate (PDF, PNG, JPG — max 5MB)
                      </label>
                      <label className="flex items-center gap-3 px-3.5 py-2.5 rounded border border-dashed border-vb-border hover:border-vb-teal bg-vb-canvas/60 cursor-pointer text-xs">
                        <Upload className="w-4 h-4 text-vb-teal shrink-0" />
                        <span className="text-vb-ink truncate">
                          {certFile
                            ? `${certFile.name} (${(certFile.size / 1024).toFixed(0)} KB)`
                            : 'Upload incorporation certificate (stored in private bucket)'}
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
                      <label className="vb-label block mb-1.5">Company Website (Optional)</label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://company.in"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'STUDENT' && (
                <>
                  <div className="text-xs font-display font-bold text-vb-ink">
                    Academic &amp; Builder Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">College / University Name *</label>
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g., IIT Gandhinagar / Nirma University"
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Student ID / Enrollment No</label>
                      <input
                        type="text"
                        value={studentIdNumber}
                        onChange={(e) => setStudentIdNumber(e.target.value)}
                        placeholder="22BCE104"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Graduation Year *</label>
                      <input
                        type="text"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        placeholder="2026"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Degree &amp; Branch</label>
                      <input
                        type="text"
                        value={degreeBranch}
                        onChange={(e) => setDegreeBranch(e.target.value)}
                        placeholder="B.Tech Computer Science"
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">GitHub / Portfolio URL</label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">Technical Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="Python, FastAPI, Gemini API, React, Pandas"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}

              {role === 'MENTOR' && (
                <>
                  <div className="text-xs font-display font-bold text-vb-ink">
                    Mentor Industry Credentials
                  </div>
                  <div className="p-3 rounded bg-vb-revision-tint/60 border border-vb-revision/30 text-xs text-vb-revision">
                    New mentor accounts enter read-only triage mode until approved by Platform Admin.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="vb-label block mb-1.5">Current Organization *</label>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g., Razorpay / CloudScale"
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Job Title *</label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Staff Engineer / AI Lead"
                        className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Years of Experience</label>
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        className="w-full px-3 py-2 text-sm tabular-num rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">LinkedIn Profile URL</label>
                      <input
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">Review Specialties (comma-separated)</label>
                      <input
                        type="text"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="AI Agents, SMB Operations, Cloud Run, Data Pipelines"
                        className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {pendingFbToken
                  ? `Complete ${role.charAt(0) + role.slice(1).toLowerCase()} Registration`
                  : `Create ${role.charAt(0) + role.slice(1).toLowerCase()} Account`}
              </span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
