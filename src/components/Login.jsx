import { useEffect, useState } from 'react';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

const AUTO_SIGN_IN_PARAM = 'googleSignIn';

const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

const getFriendlyAuthMessage = (error) => {
  switch (error?.code) {
    case 'auth/unauthorized-domain':
      return 'Google sign-in is blocked on this address. Open the app with localhost instead of 127.0.0.1, or add this domain in Firebase Authentication settings.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase yet. Turn on the Google provider in Firebase Authentication.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google popup. We will retry with a full-page redirect.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in popup was closed before finishing.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Google or Firebase. Check your internet connection and try again.';
    default:
      return error?.message || 'Failed to sign in.';
  }
};

export default function Login() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let isActive = true;
    const url = new URL(window.location.href);

    if (window.location.hostname === 'localhost' && url.searchParams.get(AUTO_SIGN_IN_PARAM) === '1') {
      url.searchParams.delete(AUTO_SIGN_IN_PARAM);
      const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, '', cleanUrl || '/');

      const provider = createGoogleProvider();
      setIsSigningIn(true);
      signInWithRedirect(auth, provider).catch((error) => {
        if (!isActive) return;
        setIsSigningIn(false);
        toast.error(getFriendlyAuthMessage(error));
      });

      return () => {
        isActive = false;
      };
    }

    getRedirectResult(auth)
      .then((result) => {
        if (!isActive || !result) return;
        toast.success('Signed in successfully!');
      })
      .catch((error) => {
        if (!isActive) return;
        toast.error(getFriendlyAuthMessage(error));
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;

    const provider = createGoogleProvider();

    try {
      setIsSigningIn(true);

      if (window.location.hostname === '127.0.0.1') {
        const localhostUrl = new URL(window.location.href);
        localhostUrl.hostname = 'localhost';
        localhostUrl.searchParams.set(AUTO_SIGN_IN_PARAM, '1');
        toast('Opening Google sign-in from localhost...', { duration: 2500 });
        window.setTimeout(() => {
          window.location.assign(localhostUrl.toString());
        }, 500);
        return;
      }

      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully!');
    } catch (error) {
      if (error?.code === 'auth/popup-blocked') {
        toast((t) => (
          <span onClick={() => toast.dismiss(t.id)}>
            {getFriendlyAuthMessage(error)}
          </span>
        ), { duration: 4500 });
        await signInWithRedirect(auth, provider);
        return;
      }

      toast.error(getFriendlyAuthMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="auth-layout">
        <section className="auth-hero">
          <span className="auth-hero__badge">Loan Manager</span>
          <h1>Keep every lending promise organised</h1>
          <p>
            Securely track amounts, deadlines, and partial payments. Your data stays private and synced across devices via Firebase.
          </p>
          <ul className="auth-hero__features">
            <li>Instant Google sign-in</li>
            <li>Multi-currency support</li>
            <li>Mobile-first dashboard</li>
          </ul>
        </section>

        <article className="auth-card">
          <header className="auth-card__header">
            <h2>Sign in</h2>
            <p>Connect with Google to continue.</p>
          </header>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="button button--primary button--stretch"
            disabled={isSigningIn}
          >
            <span className="auth-card__google-icon" aria-hidden>
              <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.3 0 24 0 14.6 0 6.6 5.3 2.6 13l7.9 6.1C12.4 13 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24c0-1.6-.2-3.1-.5-4.5H24v9h12.7c-.5 2.6-2 4.8-4.2 6.3l6.7 5.2c3.9-3.6 6.3-8.9 6.3-16z" />
                <path fill="#FBBC04" d="M10.5 28.9c-.5-1.6-.8-3.3-.8-4.9s.3-3.3.8-4.9l-7.9-6.1C1 16.7 0 20.2 0 24s1 7.3 2.6 10.2l7.9-5.3z" />
                <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-6.7-5.2c-2 1.3-4.6 2.1-8.8 2.1-6.3 0-11.7-4.2-13.6-9.8l-7.9 6.1C6.6 42.7 14.6 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </span>
            <span>{isSigningIn ? 'Opening Google...' : 'Sign in with Google'}</span>
          </button>
          <p className="auth-card__note">
            By continuing you agree to our privacy policy and understand your loans sync securely to your Google account.
          </p>
        </article>
      </div>
    </div>
  );
}
