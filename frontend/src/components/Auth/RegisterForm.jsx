import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon, BotIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Validation ───────────────────────────────────────────── */
function validate({ name, email, password, confirm }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required';
  else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

  if (!email.trim()) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';

  if (!password) errors.password = 'Password is required';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters';

  if (!confirm) errors.confirm = 'Please confirm your password';
  else if (confirm !== password) errors.confirm = 'Passwords do not match';

  return errors;
}

export function RegisterForm() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [fields, setFields]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register({ name: fields.name, email: fields.email, password: fields.password });
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/chat');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
        : (typeof detail === 'string' ? detail : err.message || 'Registration failed. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, name, type, placeholder, icon) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="input-icon-wrapper">
        <span className="input-icon" aria-hidden="true">{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={name === 'password' ? 'new-password' : name}
          className={`form-input ${errors[name] ? 'error' : ''}`}
          placeholder={placeholder}
          value={fields[name]}
          onChange={handleChange}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `${id}-err` : undefined}
        />
        {name === 'password' && (
          <button
            type="button"
            className="input-icon-right"
            onClick={() => setShowPass((s) => !s)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
          </button>
        )}
      </div>
      {errors[name] && (
        <p id={`${id}-err`} className="form-error" role="alert">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" aria-hidden="true" />
      <div className="auth-bg-orb auth-bg-orb-2" aria-hidden="true" />

      <main className="auth-card" role="main">
        <div className="auth-logo-wrap">
          <div className="auth-logo" aria-hidden="true"><BotIcon size={22} color="#fff" /></div>
          <span className="auth-logo-text">AI Chat</span>
        </div>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">Join thousands of users chatting with AI</p>

        <form onSubmit={handleSubmit} noValidate aria-label="Registration form">
          {field('reg-name',     'Full Name',        'name',     'text',     'John Doe',        <UserIcon size={16} />)}
          {field('reg-email',    'Email',            'email',    'email',    'you@example.com', <MailIcon size={16} />)}
          {field('reg-password', 'Password',         'password', showPass ? 'text' : 'password', '••••••••', <LockIcon size={16} />)}
          {field('reg-confirm',  'Confirm Password', 'confirm',  showPass ? 'text' : 'password', '••••••••', <LockIcon size={16} />)}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: 4 }}
            disabled={loading}
            id="register-submit-btn"
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden />
            ) : null}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </main>
    </div>
  );
}
