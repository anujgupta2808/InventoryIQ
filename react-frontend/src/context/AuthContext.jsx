import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, onAuditLog = () => {}, onToast = () => {} }) => {
  const [users, setUsers] = useState(() => authService.getStoredUsers());
  const initialSession = authService.getStoredSession();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession));
  const [user, setUser] = useState(initialSession ? initialSession.user : null);
  const [prefillEmail, setPrefillEmail] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [demoResetSession, setDemoResetSession] = useState(null);
  const [sessions, setSessions] = useState(() => authService.getSessions());

  // Keep sessions synced
  useEffect(() => {
    authService.setSessions(sessions);
  }, [sessions]);

  const login = async ({ email, password, rememberMe = true }) => {
    const result = await authService.login({ email, password, rememberMe });
    if (!result.success) {
      onToast('Authentication Failed', result.message, 'danger');
      return result;
    }

    setUser(result.user);
    setIsAuthenticated(true);
    setPrefillEmail('');

    const newDeviceSession = {
      id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
      device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Chrome / Desktop',
      ip: '103.21.244.18',
      location: 'India',
      lastActive: 'Just now',
      current: true
    };
    setSessions(prev => [newDeviceSession, ...prev.map(s => ({ ...s, current: false }))]);

    onAuditLog('User Login', `User ${result.user.name} signed in successfully (Demo Auth)`, 'Success', result.user.name, result.user.role);
    onToast('Welcome Back!', `Logged in as ${result.user.name} (${result.user.role}).`);
    return result;
  };

  const register = async (userData) => {
    const result = await authService.register(userData);
    if (!result.success) {
      onToast('Registration Error', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    setPrefillEmail(result.user.email);
    onAuditLog('User Registered', `New tenant registered: ${result.user.name} (${result.user.email}) - PBKDF2 hashed`, 'Success', result.user.name, result.user.role);
    onToast('Registration Successful!', 'Your account has been registered. Please sign in with your credentials.', 'success');
    return result;
  };

  const requestPasswordReset = (email) => {
    const result = authService.requestPasswordReset(email);
    if (!result.success) {
      onToast('Recovery Error', result.message, 'danger');
      return result;
    }

    setDemoResetSession(result.session);
    setResetTargetEmail(email.trim().toLowerCase());
    onAuditLog('Password Reset Requested', `Simulated recovery link initiated for ${email}`);
    onToast('Recovery Link Generated', 'Demo mode: Password recovery is simulated. No email has been sent.', 'info');
    return result;
  };

  const resetPassword = async ({ newPassword, confirmPassword }) => {
    const result = await authService.resetPassword({
      newPassword,
      confirmPassword,
      demoResetSession
    });

    if (!result.success) {
      onToast('Reset Failed', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    if (user && user.email.toLowerCase() === result.targetEmail) {
      setIsAuthenticated(false);
      setUser(null);
    }

    setDemoResetSession(null);
    setResetTargetEmail('');
    setPrefillEmail(result.targetEmail);
    onAuditLog('Password Reset Completed', `Password updated for ${result.targetEmail} (PBKDF2 re-hashed)`);
    onToast('Password Updated', 'Your password has been successfully reset! Please sign in with your new password.', 'success');
    return result;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const result = await authService.changePassword({ user, currentPassword, newPassword });
    if (!result.success) {
      onToast('Verification Failed', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    onAuditLog('Password Changed', `User ${user.name} changed their account master password`);
    onToast('Password Changed', 'Your master account password has been updated.', 'success');
    return result;
  };

  const updateUserProfile = (profileData) => {
    const updated = authService.updateUserProfile(user, profileData);
    setUser(updated);
    setUsers(authService.getStoredUsers());
    onAuditLog('Profile Updated', `Updated profile settings for ${updated.name}`);
    onToast('Profile Saved', 'Profile settings updated successfully.', 'success');
    return updated;
  };

  const logout = () => {
    authService.logout();
    if (user) {
      onAuditLog('User Logout', `User ${user.name} logged out`);
    }
    setIsAuthenticated(false);
    setUser(null);
    setDemoResetSession(null);
    onToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const revokeSession = (id) => {
    const filtered = authService.revokeSession(id);
    setSessions(filtered);
    onAuditLog('Session Revoked', `Terminated session ID ${id}`);
    onToast('Session Revoked', 'The device session has been signed out.', 'warning');
  };

  const revokeAllOtherSessions = () => {
    const filtered = authService.revokeAllOtherSessions();
    setSessions(filtered);
    onAuditLog('All Sessions Revoked', 'Terminated all remote device sessions');
    onToast('Sessions Terminated', 'All other active device sessions have been revoked.', 'warning');
  };

  const value = {
    user,
    setUser,
    users,
    isAuthenticated,
    setIsAuthenticated,
    prefillEmail,
    setPrefillEmail,
    demoResetSession,
    setDemoResetSession,
    resetTargetEmail,
    setResetTargetEmail,
    login,
    register,
    logout,
    requestPasswordReset,
    resetPassword,
    changePassword,
    updateUserProfile,
    sessions,
    setSessions,
    revokeSession,
    revokeAllOtherSessions,
    getStoredUsers: () => authService.getStoredUsers(),
    getStoredSession: () => authService.getStoredSession()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
