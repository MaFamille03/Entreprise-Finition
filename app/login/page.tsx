'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type AuthMode = 'login' | 'register';

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Votre adresse e-mail doit être confirmée avant de vous connecter.';
  }
  if (normalized.includes('user already registered')) {
    return 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt.';
  }
  if (normalized.includes('password')) {
    return 'Le mot de passe doit respecter les exigences de sécurité.';
  }
  if (normalized.includes('rate limit')) {
    return 'Trop de tentatives. Veuillez patienter quelques instants puis réessayer.';
  }

  return message;
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setForgotMode(false);
        setResetMode(true);
        setMode('login');
        setError('');
        setSuccess('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setForgotMode(false);
    setResetMode(false);
    setError('');
    setSuccess('');
    setPassword('');
    setPasswordConfirmation('');
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createClient();

    try {
      if (resetMode) {
        if (password.length < 6) {
          setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
          return;
        }

        if (password !== passwordConfirmation) {
          setError('Les deux mots de passe ne correspondent pas.');
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setError(getAuthErrorMessage(updateError.message));
          return;
        }

        setResetMode(false);
        setMode('login');
        setPassword('');
        setPasswordConfirmation('');
        setSuccess('Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.');
        return;
      }

      if (forgotMode) {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
          setError('Veuillez saisir votre adresse e-mail.');
          return;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo: `${window.location.origin}/login`,
          },
        );

        if (resetError) {
          setError(getAuthErrorMessage(resetError.message));
          return;
        }

        setSuccess(
          'Si cette adresse est associée à un compte, un lien de réinitialisation vient d’être envoyé.',
        );
        return;
      }

      if (mode === 'register') {
        if (!fullName.trim()) {
          setError('Veuillez saisir votre nom complet.');
          return;
        }

        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }

        if (password !== passwordConfirmation) {
          setError('Les deux mots de passe ne correspondent pas.');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (signUpError) {
          setError(getAuthErrorMessage(signUpError.message));
          return;
        }

        if (data.session) {
          window.location.href = '/onboarding';
          return;
        }

        setSuccess(
          'Votre compte a été créé. Consultez votre e-mail pour confirmer votre adresse, puis connectez-vous.',
        );
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(getAuthErrorMessage(signInError.message));
        return;
      }

      if (data.session) {
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  }

  const title = resetMode
    ? 'Nouveau mot de passe'
    : forgotMode
      ? 'Mot de passe oublié'
      : mode === 'register'
        ? 'Créer votre compte'
        : 'Bienvenue';

  const subtitle = resetMode
    ? 'Choisissez un nouveau mot de passe sécurisé.'
    : forgotMode
      ? 'Saisissez votre e-mail pour recevoir un lien de réinitialisation.'
      : mode === 'register'
        ? 'Créez votre compte administrateur pour commencer.'
        : 'Connectez-vous à votre espace de gestion.';

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-logo">
            <Building2 size={24} />
          </div>

          <span className="auth-eyebrow">FINITION ERP</span>
          <h1>Gérez votre activité avec précision.</h1>
          <p>
            Prestations, chantiers, coûts, trésorerie et administration réunis
            dans un seul espace de gestion.
          </p>

          <div className="auth-benefits">
            <div>
              <CheckCircle2 size={18} />
              <span>Devis et facturation des prestations</span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>Suivi des coûts et des chantiers</span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>Données sécurisées par votre espace d’entreprise</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-mobile-logo">
              <Building2 size={20} />
            </div>

            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {!forgotMode && !resetMode && (
            <div className="auth-tabs" role="tablist" aria-label="Authentification">
              <button
                type="button"
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => changeMode('login')}
                role="tab"
                aria-selected={mode === 'login'}
              >
                Se connecter
              </button>

              <button
                type="button"
                className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => changeMode('register')}
                role="tab"
                aria-selected={mode === 'register'}
              >
                Créer un compte
              </button>
            </div>
          )}

          {success && (
            <div className="auth-message auth-message-success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="auth-message auth-message-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && !forgotMode && !resetMode && (
              <div className="auth-field">
                <label htmlFor="fullName">Nom complet</label>
                <div className="auth-input-wrap">
                  <User size={18} />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Votre nom complet"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Adresse e-mail</label>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="exemple@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!forgotMode && (
              <>
                <div className="auth-field">
                  <div className="auth-label-row">
                    <label htmlFor="password">
                      {resetMode ? 'Nouveau mot de passe' : 'Mot de passe'}
                    </label>

                    {mode === 'login' && !resetMode && (
                      <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => {
                          setForgotMode(true);
                          setResetMode(false);
                          setError('');
                          setSuccess('');
                        }}
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>

                  <div className="auth-input-wrap">
                    <LockKeyhole size={18} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={resetMode ? 'new-password' : mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {(mode === 'register' || resetMode) && (
                  <div className="auth-field">
                    <label htmlFor="passwordConfirmation">Confirmer le mot de passe</label>

                    <div className="auth-input-wrap">
                      <LockKeyhole size={18} />
                      <input
                        id="passwordConfirmation"
                        type={showPasswordConfirmation ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Confirmez votre mot de passe"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-eye"
                        aria-label={
                          showPasswordConfirmation
                            ? 'Masquer la confirmation'
                            : 'Afficher la confirmation'
                        }
                        onClick={() =>
                          setShowPasswordConfirmation((value) => !value)
                        }
                      >
                        {showPasswordConfirmation ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? (
                'Veuillez patienter...'
              ) : (
                <>
                  {resetMode
                    ? 'Modifier le mot de passe'
                    : forgotMode
                      ? 'Envoyer le lien'
                      : mode === 'register'
                        ? 'Créer mon compte'
                        : 'Se connecter'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {(forgotMode || resetMode) && (
            <button
              type="button"
              className="auth-back-button"
              onClick={() => {
                setForgotMode(false);
                setResetMode(false);
                setMode('login');
                setError('');
                setSuccess('');
                setPassword('');
                setPasswordConfirmation('');
              }}
            >
              ← Retour à la connexion
            </button>
          )}

          {!forgotMode && !resetMode && (
            <p className="auth-footer">
              {mode === 'login' ? (
                <>
                  Vous n’avez pas encore de compte ?{' '}
                  <button type="button" onClick={() => changeMode('register')}>
                    Créer un compte
                  </button>
                </>
              ) : (
                <>
                  Vous avez déjà un compte ?{' '}
                  <button type="button" onClick={() => changeMode('login')}>
                    Se connecter
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
