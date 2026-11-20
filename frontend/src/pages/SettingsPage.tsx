import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Moon,
  Save,
  Shield,
  SlidersHorizontal,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useRole } from '../context/RoleContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { apiFetch } from '../lib/api';
import type { AdminConfig, AdminOverviewResponse, UserProfile, WorkspaceMode } from '../types/vexa';

type SettingsTab = 'profile' | 'appearance' | 'security' | 'guardrails';

export function SettingsPage() {
  const { user, refreshUser } = useRole();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [tagsRaw, setTagsRaw] = useState((user?.domain_tags || []).join(', '));
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [certFile, setCertFile] = useState<File | null>(null);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [defaultMode, setDefaultMode] = useState<WorkspaceMode>('SMB');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin Guardrails state
  const [fitThreshold, setFitThreshold] = useState(65);
  const [maxUploadMb, setMaxUploadMb] = useState(10);
  const [enabledModes, setEnabledModes] = useState<WorkspaceMode[]>(['SMB', 'CAMPUS', 'PERSONAL']);

  const { data: adminOverview } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverviewResponse>('/admin/overview'),
    enabled: user?.role === 'ADMIN',
  });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setTagsRaw((user.domain_tags || []).join(', '));
    const pm = user.profile_meta || {};
    setMeta({
      company_name: pm.company_name || '',
      cin_or_gstin: pm.cin_or_gstin || '',
      business_domain: pm.business_domain || 'Retail/D2C',
      scale_tier: pm.scale_tier || '6-20',
      website_url: pm.website_url || '',
      college_name: pm.college_name || '',
      student_id_number: pm.student_id_number || '',
      degree_branch: pm.degree_branch || '',
      graduation_year: pm.graduation_year || '',
      github_url: pm.github_url || '',
      organization: pm.organization || '',
      job_title: pm.job_title || '',
      years_experience: pm.years_experience || '',
      linkedin_url: pm.linkedin_url || '',
      department: pm.department || '',
    });
    const prefs = pm.preferences || {};
    setEmailNotifications(prefs.email_notifications ?? true);
    setReviewAlerts(prefs.review_alerts ?? true);
    setWeeklyDigest(prefs.weekly_digest ?? false);
    setDefaultMode(prefs.default_workspace_mode ?? 'SMB');
  }, [user]);

  useEffect(() => {
    if (!adminOverview?.config) return;
    setFitThreshold(adminOverview.config.min_ai_fit_alert_threshold);
    setMaxUploadMb(adminOverview.config.max_upload_mb);
    setEnabledModes(adminOverview.config.enabled_modes);
  }, [adminOverview?.config]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const profileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('full_name', fullName.trim());
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      formData.append('domain_tags', JSON.stringify(tags));
      formData.append(
        'profile_meta',
        JSON.stringify({
          ...meta,
          preferences: {
            email_notifications: emailNotifications,
            review_alerts: reviewAlerts,
            weekly_digest: weeklyDigest,
            default_workspace_mode: defaultMode,
          },
        })
      );
      if (certFile && user?.role === 'BUSINESS') {
        formData.append('incorporation_certificate', certFile);
      }
      return apiFetch<{ user: UserProfile }>('/auth/profile', {
        method: 'PATCH',
        body: formData,
      });
    },
    onSuccess: async () => {
      setCertFile(null);
      await refreshUser();
      showNotice('success', 'Settings saved to database.');
    },
    onError: (err: Error) => showNotice('error', err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword || null,
          new_password: newPassword,
        }),
      }),
    onSuccess: async () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
      showNotice('success', 'Password updated successfully.');
    },
    onError: (err: Error) => showNotice('error', err.message),
  });

  const adminConfigMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ config: AdminConfig }>('/admin/config', {
        method: 'PATCH',
        body: JSON.stringify({
          min_ai_fit_alert_threshold: fitThreshold,
          max_upload_mb: maxUploadMb,
          enabled_modes: enabledModes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      showNotice('success', 'Global platform guardrails updated.');
    },
    onError: (err: Error) => showNotice('error', err.message),
  });

  if (!user) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile and credentials', icon: User },
    { id: 'appearance', label: 'Appearance and notifications', icon: Sun },
    { id: 'security', label: 'Security and sign-in', icon: KeyRound },
    ...(user.role === 'ADMIN'
      ? [{ id: 'guardrails' as SettingsTab, label: 'Platform guardrails', icon: SlidersHorizontal }]
      : []),
  ];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showNotice('error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice('error', 'New password and confirmation do not match.');
      return;
    }
    passwordMutation.mutate();
  };

  const toggleMode = (m: WorkspaceMode) => {
    setEnabledModes((prev) =>
      prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
    );
  };

  return (
    <AppShell title="Settings">
      <div className="space-y-6">
        {notice && (
          <div
            className={`vb-card p-3.5 text-sm flex items-center gap-2.5 ${
              notice.type === 'success'
                ? 'border-vb-verified bg-vb-verified-tint text-vb-verified'
                : 'border-vb-terracotta bg-vb-terracotta-tint text-vb-terracotta'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Settings Nav */}
          <div className="lg:col-span-3 vb-card p-2 space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-left transition-colors ${
                    active
                      ? 'bg-vb-teal-tint text-vb-teal font-semibold'
                      : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Settings Panel */}
          <div className="lg:col-span-9">
            {tab === 'profile' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  profileMutation.mutate();
                }}
                className="vb-card p-6 space-y-5"
              >
                <div className="border-b border-vb-border pb-4">
                  <h2 className="font-display font-bold text-lg text-vb-ink">
                    Profile and role credentials
                  </h2>
                  <p className="text-sm text-vb-muted mt-0.5">
                    Update your display identity and verification metadata stored in the database.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="vb-label block mb-1.5">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      required
                    />
                  </div>
                  <div>
                    <label className="vb-label block mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-canvas text-vb-muted"
                    />
                  </div>
                </div>

                {user.role === 'BUSINESS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-vb-border">
                    <div>
                      <label className="vb-label block mb-1.5">Registered company name</label>
                      <input
                        type="text"
                        value={meta.company_name || ''}
                        onChange={(e) => setMeta({ ...meta, company_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">CIN / GSTIN / Udyam number</label>
                      <input
                        type="text"
                        value={meta.cin_or_gstin || ''}
                        onChange={(e) => setMeta({ ...meta, cin_or_gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 text-sm font-mono uppercase rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Industry domain</label>
                      <select
                        value={meta.business_domain || 'Retail/D2C'}
                        onChange={(e) => setMeta({ ...meta, business_domain: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      >
                        <option value="Retail/D2C">Retail / D2C</option>
                        <option value="Manufacturing/Wholesale">Manufacturing / Wholesale</option>
                        <option value="Services/Agency">Services / Agency</option>
                        <option value="Logistics">Logistics</option>
                        <option value="EdTech/Other">EdTech / Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Company website</label>
                      <input
                        type="url"
                        value={meta.website_url || ''}
                        onChange={(e) => setMeta({ ...meta, website_url: e.target.value })}
                        placeholder="https://company.in"
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">
                        Replace incorporation certificate (PDF, PNG, JPG)
                      </label>
                      <label className="flex items-center gap-3 px-4 py-2.5 rounded-md border border-dashed border-vb-border hover:border-vb-teal bg-vb-canvas/60 cursor-pointer text-sm">
                        <Upload className="w-4 h-4 text-vb-teal shrink-0" />
                        <span className="truncate">
                          {certFile
                            ? certFile.name
                            : user.profile_meta?.incorporation_cert_name
                            ? `Current: ${user.profile_meta.incorporation_cert_name} (click to replace)`
                            : 'Upload certificate'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {user.role === 'STUDENT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-vb-border">
                    <div className="sm:col-span-2">
                      <label className="vb-label block mb-1.5">College or university</label>
                      <input
                        type="text"
                        value={meta.college_name || ''}
                        onChange={(e) => setMeta({ ...meta, college_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Student ID / enrollment</label>
                      <input
                        type="text"
                        value={meta.student_id_number || ''}
                        onChange={(e) => setMeta({ ...meta, student_id_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Graduation year</label>
                      <input
                        type="text"
                        value={meta.graduation_year || ''}
                        onChange={(e) => setMeta({ ...meta, graduation_year: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Degree and branch</label>
                      <input
                        type="text"
                        value={meta.degree_branch || ''}
                        onChange={(e) => setMeta({ ...meta, degree_branch: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">GitHub or portfolio URL</label>
                      <input
                        type="url"
                        value={meta.github_url || ''}
                        onChange={(e) => setMeta({ ...meta, github_url: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                )}

                {user.role === 'MENTOR' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-vb-border">
                    <div>
                      <label className="vb-label block mb-1.5">Organization</label>
                      <input
                        type="text"
                        value={meta.organization || ''}
                        onChange={(e) => setMeta({ ...meta, organization: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Job title</label>
                      <input
                        type="text"
                        value={meta.job_title || ''}
                        onChange={(e) => setMeta({ ...meta, job_title: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">Years of experience</label>
                      <input
                        type="number"
                        value={meta.years_experience || ''}
                        onChange={(e) => setMeta({ ...meta, years_experience: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                    <div>
                      <label className="vb-label block mb-1.5">LinkedIn URL</label>
                      <input
                        type="url"
                        value={meta.linkedin_url || ''}
                        onChange={(e) => setMeta({ ...meta, linkedin_url: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      />
                    </div>
                  </div>
                )}

                {user.role === 'ADMIN' && (
                  <div className="pt-2 border-t border-vb-border">
                    <label className="vb-label block mb-1.5">Admin department</label>
                    <input
                      type="text"
                      value={meta.department || ''}
                      onChange={(e) => setMeta({ ...meta, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                    />
                  </div>
                )}

                <div>
                  <label className="vb-label block mb-1.5">Domain tags / skills (comma-separated)</label>
                  <input
                    type="text"
                    value={tagsRaw}
                    onChange={(e) => setTagsRaw(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-vb-border">
                  <button
                    type="submit"
                    disabled={profileMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{profileMutation.isPending ? 'Saving...' : 'Save changes'}</span>
                  </button>
                </div>
              </form>
            )}

            {tab === 'appearance' && (
              <div className="vb-card p-6 space-y-6">
                <div className="border-b border-vb-border pb-4">
                  <h2 className="font-display font-bold text-lg text-vb-ink">
                    Appearance and notification preferences
                  </h2>
                  <p className="text-sm text-vb-muted mt-0.5">
                    Choose your display theme and workspace notification rules.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="vb-label">Interface theme</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        { id: 'light', title: 'Light paper', desc: 'Warm Alabaster canvas with crisp white cards', icon: Sun },
                        { id: 'dark', title: 'Dark slate', desc: 'Charcoal surface with muted teal and high contrast', icon: Moon },
                      ] as { id: ThemeMode; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[]
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const selected = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTheme(opt.id)}
                          className={`p-4 rounded-lg border text-left transition-colors flex items-start gap-3 ${
                            selected
                              ? 'border-vb-teal bg-vb-teal-tint/40'
                              : 'border-vb-border bg-vb-canvas/50 hover:border-vb-teal/50'
                          }`}
                        >
                          <Icon className="w-5 h-5 text-vb-teal shrink-0 mt-0.5" />
                          <div>
                            <div className="font-display font-semibold text-sm text-vb-ink">{opt.title}</div>
                            <div className="text-xs text-vb-muted mt-0.5">{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {user.role === 'BUSINESS' && (
                  <div className="space-y-2 pt-3 border-t border-vb-border">
                    <label className="vb-label block">Default workspace mode for new audits</label>
                    <select
                      value={defaultMode}
                      onChange={(e) => setDefaultMode(e.target.value as WorkspaceMode)}
                      className="w-full sm:w-64 px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                    >
                      <option value="SMB">SMB / Agency</option>
                      <option value="CAMPUS">Campus / Hiring</option>
                      <option value="PERSONAL">Personal UPI Audit</option>
                    </select>
                  </div>
                )}

                <div className="space-y-3 pt-3 border-t border-vb-border">
                  <div className="vb-label">Workspace notifications</div>
                  {[
                    {
                      label: 'Email updates on audit and submission milestones',
                      checked: emailNotifications,
                      onChange: setEmailNotifications,
                    },
                    {
                      label: 'Instant review alerts (approvals, revision feedback, pilot requests)',
                      checked: reviewAlerts,
                      onChange: setReviewAlerts,
                    },
                    {
                      label: 'Weekly operations summary digest',
                      checked: weeklyDigest,
                      onChange: setWeeklyDigest,
                    },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-3 text-sm text-vb-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="w-4 h-4 accent-[#0F4C5C] rounded"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-vb-border">
                  <button
                    type="button"
                    disabled={profileMutation.isPending}
                    onClick={() => profileMutation.mutate()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save preferences</span>
                  </button>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div className="vb-card p-6 space-y-6">
                <div className="border-b border-vb-border pb-4">
                  <h2 className="font-display font-bold text-lg text-vb-ink">
                    Security and authentication
                  </h2>
                  <p className="text-sm text-vb-muted mt-0.5">
                    Manage your sign-in methods and password credentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md bg-vb-canvas border border-vb-border">
                    <div className="flex items-center gap-2 text-sm font-semibold text-vb-ink">
                      <Shield className="w-4 h-4 text-vb-teal" />
                      <span>Google Firebase Auth</span>
                    </div>
                    <div className="text-xs text-vb-muted mt-1">
                      {user.has_firebase_auth ? 'Linked to your Google account' : 'Not linked (using email sign-in)'}
                    </div>
                  </div>
                  <div className="p-4 rounded-md bg-vb-canvas border border-vb-border">
                    <div className="flex items-center gap-2 text-sm font-semibold text-vb-ink">
                      <KeyRound className="w-4 h-4 text-vb-teal" />
                      <span>Password login</span>
                    </div>
                    <div className="text-xs text-vb-muted mt-1">
                      {user.has_password ? 'Active (scrypt salted hash)' : 'Set a backup password below'}
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-3 border-t border-vb-border max-w-md">
                  <h3 className="font-display font-bold text-base text-vb-ink">
                    {user.has_password ? 'Change password' : 'Set backup password'}
                  </h3>
                  {user.has_password && (
                    <div>
                      <label className="vb-label block mb-1.5">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="vb-label block mb-1.5">New password (min 8 chars)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      required
                    />
                  </div>
                  <div>
                    <label className="vb-label block mb-1.5">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      className="w-full px-3.5 py-2.5 text-sm rounded-md border border-vb-border bg-vb-surface"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordMutation.isPending}
                    className="px-5 py-2.5 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
                  >
                    {passwordMutation.isPending ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'guardrails' && user.role === 'ADMIN' && (
              <div className="vb-card p-6 space-y-5">
                <div className="border-b border-vb-border pb-4">
                  <h2 className="font-display font-bold text-lg text-vb-ink">
                    Global platform guardrails
                  </h2>
                  <p className="text-sm text-vb-muted mt-0.5">
                    Configure AI pre-audit alert thresholds, upload caps, and enabled commercial modes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="vb-label block mb-1.5">Min AI fit score alert threshold</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={fitThreshold}
                      onChange={(e) => setFitThreshold(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm tabular-num rounded-md border border-vb-border bg-vb-surface"
                    />
                  </div>
                  <div>
                    <label className="vb-label block mb-1.5">Max CSV/XLSX upload limit (MB)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={maxUploadMb}
                      onChange={(e) => setMaxUploadMb(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm tabular-num rounded-md border border-vb-border bg-vb-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="vb-label block mb-2">Active workspace modes</label>
                  <div className="flex flex-wrap gap-3">
                    {(['SMB', 'CAMPUS', 'PERSONAL'] as WorkspaceMode[]).map((m) => {
                      const on = enabledModes.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMode(m)}
                          className={`px-4 py-2 rounded-md text-sm font-medium border ${
                            on
                              ? 'bg-vb-teal text-white border-vb-teal'
                              : 'bg-vb-canvas text-vb-muted border-vb-border'
                          }`}
                        >
                          {m} {on ? '(Enabled)' : '(Disabled)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-vb-border">
                  <button
                    type="button"
                    disabled={adminConfigMutation.isPending}
                    onClick={() => adminConfigMutation.mutate()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save guardrails</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
