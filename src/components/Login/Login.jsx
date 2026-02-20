import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

// ---- Standard email domains ----
const STANDARD_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.coom': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmali.com': 'gmail.com', 'gimail.com': 'gmail.com',
  'gmsil.com': 'gmail.com', 'gmeil.com': 'gmail.com', 'gmaul.com': 'gmail.com',
  'gemail.com': 'gmail.com', 'gamail.com': 'gmail.com', 'gmil.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'yahoo.comm': 'yahoo.com', 'yahho.com': 'yahoo.com', 'yhaoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'hotmail.comm': 'hotmail.com', 'hotamil.com': 'hotmail.com', 'hotmaill.com': 'hotmail.com',
  'hotmeil.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'htmail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'outlookk.com': 'outlook.com', 'outllook.com': 'outlook.com', 'outook.com': 'outlook.com',
  'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com', 'icloudd.com': 'icloud.com',
  'iclould.com': 'icloud.com', 'icoud.com': 'icloud.com'
};

// ---- Validation ----

function validateEmail(email) {
  const trimmed = email.trim().toLowerCase();
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  const parts = trimmed.split('@');
  if (parts.length !== 2) return { valid: false, error: 'Email must contain exactly one @ symbol.' };
  const [localPart, domain] = parts;
  if (localPart.length === 0) return { valid: false, error: 'Email name before @ cannot be empty.' };

  if (STANDARD_DOMAINS.includes(domain)) return { valid: true };

  if (DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      error: `Did you mean "${localPart}@${DOMAIN_TYPOS[domain]}"?`,
      suggestion: `${localPart}@${DOMAIN_TYPOS[domain]}`
    };
  }

  return {
    valid: false,
    error: 'Only supported: @gmail.com, @yahoo.com, @hotmail.com, @outlook.com, @icloud.com'
  };
}

function validateUsername(username) {
  const trimmed = username.trim();
  if (trimmed.length < 5) {
    return { valid: false, error: 'Username must be at least 5 characters.' };
  }
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Username must start with a letter.' };
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters.' };
  }
  return { valid: true };
}

function validatePassword(password, isSignUp) {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  if (isSignUp) {
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number.' };
    }
  }
  return { valid: true };
}

// ---- Sub-components ----

const FieldWarning = ({ message, suggestion, onSuggestionClick }) => {
  if (!message) return null;
  return (
    <div style={{
      fontSize: '12px',
      color: '#e74c3c',
      marginTop: '-8px',
      padding: '4px 8px',
      borderRadius: '4px',
      background: 'rgba(231, 76, 60, 0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      lineHeight: 1.4
    }}>
      <span style={{ fontSize: '14px' }}>⚠</span>
      <span style={{ flex: 1 }}>
        {message}
        {suggestion && (
          <button
            type="button"
            onClick={onSuggestionClick}
            style={{
              marginLeft: '6px',
              background: 'none',
              border: 'none',
              color: '#2980b9',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '12px',
              padding: 0
            }}
          >
            Use this
          </button>
        )}
      </span>
    </div>
  );
};

const PasswordStrength = ({ password }) => {
  if (!password || password.length === 0) return null;

  let strength = 0;
  let label = '';
  let color = '';

  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-zA-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) { label = 'Weak'; color = '#e74c3c'; }
  else if (strength <= 3) { label = 'Fair'; color = '#f39c12'; }
  else if (strength === 4) { label = 'Good'; color = '#27ae60'; }
  else { label = 'Strong'; color = '#2ecc71'; }

  const pct = (strength / 5) * 100;

  return (
    <div style={{ marginTop: '-8px' }}>
      <div style={{
        height: '3px',
        borderRadius: '2px',
        background: '#eee',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '2px',
          transition: 'all 0.3s ease'
        }} />
      </div>
      <div style={{
        fontSize: '11px',
        color: color,
        fontWeight: 600,
        marginTop: '3px',
        textAlign: 'right'
      }}>
        {label}
      </div>
    </div>
  );
};

// ============ Main Login Component ============

export default function Login({ isOpen, onClose }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live validation states
  const [usernameWarning, setUsernameWarning] = useState(null);
  const [emailWarning, setEmailWarning] = useState(null);
  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const [passwordWarning, setPasswordWarning] = useState(null);
  const [confirmWarning, setConfirmWarning] = useState(null);

  // Validate username on change
  useEffect(() => {
    if (!username || username.length < 2) {
      setUsernameWarning(null);
      return;
    }
    const result = validateUsername(username);
    if (!result.valid) {
      setUsernameWarning(result.error);
    } else {
      setUsernameWarning(null);
    }
  }, [username]);

  // Validate email on change (sign up only)
  useEffect(() => {
    if (!isSignUp || !email || email.length < 3) {
      setEmailWarning(null);
      setEmailSuggestion(null);
      return;
    }
    const result = validateEmail(email);
    if (!result.valid) {
      setEmailWarning(result.error);
      setEmailSuggestion(result.suggestion || null);
    } else {
      setEmailWarning(null);
      setEmailSuggestion(null);
    }
  }, [email, isSignUp]);

  // Validate password on change (only during sign up)
  useEffect(() => {
    if (!password || !isSignUp) {
      setPasswordWarning(null);
      return;
    }
    const result = validatePassword(password, isSignUp);
    if (!result.valid) {
      setPasswordWarning(result.error);
    } else {
      setPasswordWarning(null);
    }
  }, [password, isSignUp]);

  // Validate confirm password
  useEffect(() => {
    if (!isSignUp || !confirmPassword) {
      setConfirmWarning(null);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmWarning('Passwords do not match.');
    } else {
      setConfirmWarning(null);
    }
  }, [confirmPassword, password, isSignUp]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check network
    if (!navigator.onLine) {
      toast.error('🌐 Network error. Please check your internet connection.');
      return;
    }

    // Validate username
    const userCheck = validateUsername(username);
    if (!userCheck.valid) {
      toast.error(userCheck.error);
      return;
    }

    if (isSignUp) {
      // ---- SIGN UP ----
      
      // Validate email
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        toast.error(emailCheck.error);
        return;
      }

      // Validate password
      const passCheck = validatePassword(password, true);
      if (!passCheck.valid) {
        toast.error(passCheck.error);
        return;
      }

      // Confirm password
      if (password !== confirmPassword) {
        toast.error('Passwords do not match!');
        return;
      }

      setLoading(true);
      try {
        // Check if username is already taken
        const usernameDoc = await getDoc(doc(db, "usernames", username.trim().toLowerCase()));
        if (usernameDoc.exists()) {
          toast.error('❌ This username is already taken. Please choose another.');
          setLoading(false);
          return;
        }

        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Store user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          username: username.trim().toLowerCase(),
          createdAt: new Date(),
          queue: []
        });

        // Store username → uid mapping for login lookup
        await setDoc(doc(db, "usernames", username.trim().toLowerCase()), {
          uid: user.uid,
          email: user.email
        });

        console.log('[AUTH] New account created:', { uid: user.uid, username: username.trim(), email: user.email });
        toast.success("✅ Account created successfully!");
        onClose();
      } catch (error) {
        console.error("[AUTH] Sign up error:", error.code, error.message);
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') {
          msg = 'This email is already registered. Try logging in with your username.';
        } else if (error.code === 'auth/weak-password') {
          msg = 'Password must be at least 6 characters with letters and numbers.';
        } else if (error.code === 'auth/invalid-email') {
          msg = '❌ Please enter a valid email address.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = '🌐 Network error. Please check your internet connection.';
        }
        toast.error(msg);
      } finally {
        setLoading(false);
      }

    } else {
      // ---- LOGIN (username + password) ----
      
      if (!password) {
        toast.error('Please enter your password.');
        return;
      }

      setLoading(true);
      try {
        // Look up username in Firestore to get the email
        const usernameDoc = await getDoc(doc(db, "usernames", username.trim().toLowerCase()));
        
        if (!usernameDoc.exists()) {
          toast.error('❌ Incorrect username or password.');
          setLoading(false);
          return;
        }

        const { email: storedEmail } = usernameDoc.data();

        // Sign in with the email from the username lookup
        await signInWithEmailAndPassword(auth, storedEmail, password);
        console.log('[AUTH] Login successful:', username.trim());
        toast.success("✅ Logged in successfully!");
        onClose();
      } catch (error) {
        console.error("[AUTH] Login error:", error.code, error.message);
        let msg = '❌ Incorrect username or password.';
        if (error.code === 'auth/network-request-failed') {
          msg = '🌐 Network error. Please check your internet connection.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = '⏳ Too many failed attempts. Please wait a few minutes.';
        } else if (error.code === 'auth/user-disabled') {
          msg = 'This account has been disabled.';
        }
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const applySuggestion = () => {
    if (emailSuggestion) {
      setEmail(emailSuggestion);
      setEmailWarning(null);
      setEmailSuggestion(null);
    }
  };

  const inputStyle = {
    padding: "12px",
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#ddd",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s"
  };

  const inputErrorStyle = {
    ...inputStyle,
    borderColor: '#e74c3c',
    boxShadow: '0 0 0 2px rgba(231, 76, 60, 0.1)'
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(5px)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "30px",
          borderRadius: "14px",
          width: "380px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.25)",
          color: "#000",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toggle Buttons (Tabs) */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setIsSignUp(false)}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: !isSignUp ? "#ecc906" : "#f0f0f0",
              color: !isSignUp ? "#000" : "#666",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: "14px"
            }}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: isSignUp ? "#ecc906" : "#f0f0f0",
              color: isSignUp ? "#000" : "#666",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: "14px"
            }}
          >
            Sign Up
          </button>
        </div>

        <h3 style={{ margin: 0, textAlign: "center", fontSize: "17px", color: "#333", fontWeight: 600 }}>
            {isSignUp ? "Create a New Account" : "Access Your Account"}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Username (both login & sign up) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={usernameWarning ? inputErrorStyle : inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#ecc906'; e.target.style.boxShadow = '0 0 0 2px rgba(236, 201, 6, 0.2)'; }}
              onBlur={(e) => {
                if (!usernameWarning) { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; }
              }}
            />
            <FieldWarning message={usernameWarning} />
          </div>

          {/* Email (sign up only) */}
          {isSignUp && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={emailWarning ? inputErrorStyle : inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#ecc906'; e.target.style.boxShadow = '0 0 0 2px rgba(236, 201, 6, 0.2)'; }}
                onBlur={(e) => {
                  if (!emailWarning) { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; }
                }}
              />
              <FieldWarning message={emailWarning} suggestion={emailSuggestion} onSuggestionClick={applySuggestion} />
            </div>
          )}

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <input
              type="password"
              placeholder={isSignUp ? "Password (letters + numbers, 6+ chars)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              style={passwordWarning ? inputErrorStyle : inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#ecc906'; e.target.style.boxShadow = '0 0 0 2px rgba(236, 201, 6, 0.2)'; }}
              onBlur={(e) => {
                if (!passwordWarning) { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; }
              }}
            />
            <FieldWarning message={passwordWarning} />
            {isSignUp && <PasswordStrength password={password} />}
          </div>

          {/* Confirm Password (sign up only) */}
          {isSignUp && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={confirmWarning ? inputErrorStyle : inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#ecc906'; e.target.style.boxShadow = '0 0 0 2px rgba(236, 201, 6, 0.2)'; }}
                onBlur={(e) => {
                  if (!confirmWarning) { e.target.style.borderColor = '#ddd'; e.target.style.boxShadow = 'none'; }
                }}
              />
              <FieldWarning message={confirmWarning} />
            </div>
          )}

          {/* Password requirements hint (sign up only) */}
          {isSignUp && (
            <div style={{
              fontSize: '11px',
              color: '#999',
              lineHeight: 1.5,
              padding: '0 4px',
              marginTop: '-6px'
            }}>
              Username: 5+ characters, letters & numbers. Password: letters + numbers (6+ chars).
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#ecc906",
              color: "#000",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontSize: "15px",
              transition: "all 0.2s",
              letterSpacing: "0.3px"
            }}
          >
            {loading ? "Processing..." : (isSignUp ? "Create Account" : "Log In")}
          </button>
        </form>

        <div style={{ borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "#eee", paddingTop: "14px", textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#555", // Darker than #888
              cursor: "pointer",
              fontSize: "13px",
              textDecoration: "underline",
              padding: "5px",
              opacity: 0.8
            }}
          >
            Cancel / Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
