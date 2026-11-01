import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const ProfilePage = () => {
  const { user, setUser, showToast } = useInventory();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [role] = useState(user?.role || 'Admin');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setUser({ ...user, name, email, phone });
    showToast('Profile Updated', 'Your profile details have been saved.');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Error', 'New password and confirmation do not match.', 'danger');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Error', 'Password must be at least 8 characters.', 'danger');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Security Alert', 'Your account password has been updated.');
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="mb-4">
        <h2 className="page-title text-white fw-bold mb-1">User Profile</h2>
        <p className="page-subtitle text-secondary mb-0">Manage your credentials, security settings and user role</p>
      </div>

      <div className="row g-4">
        {/* User Card */}
        <div className="col-12 col-md-4">
          <div className="card-custom p-4 text-center">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold fs-2 border border-warning mx-auto mb-3 shadow"
              style={{ width: 88, height: 88, background: '#F5B942' }}
            >
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'IQ'}
            </div>
            <h4 className="text-white fw-bold mb-1">{user?.name || 'Administrator'}</h4>
            <span className="badge badge-gold mb-2">{role}</span>
            <p className="text-secondary small mb-3">{user?.email || ''}</p>

            <div className="p-3 bg-secondary-dark rounded text-start small">
              <div className="d-flex justify-content-between py-1 border-bottom border-secondary">
                <span className="text-secondary">Role:</span>
                <span className="text-white fw-medium">Super Administrator</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom border-secondary">
                <span className="text-secondary">Permissions:</span>
                <span className="text-success fw-medium">Full Access</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">Member Since:</span>
                <span className="text-white">Oct 2024</span>
              </div>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="col-12 col-md-8">
          {/* Profile details */}
          <div className="card-custom p-4 mb-4">
            <h5 className="text-white fw-bold mb-3 pb-2 border-bottom border-secondary">Personal Information</h5>
            <form onSubmit={handleUpdateProfile}>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control bg-input border-secondary text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-control bg-input border-secondary text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control bg-input border-secondary text-white"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">Assigned Role</label>
                  <input
                    type="text"
                    disabled
                    className="form-control bg-secondary-dark border-secondary text-muted"
                    value={role}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end mt-4">
                <button type="submit" className="btn btn-gold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card-custom p-4">
            <h5 className="text-white fw-bold mb-3 pb-2 border-bottom border-secondary">Change Password</h5>
            <form onSubmit={handleChangePassword}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label text-secondary small">Current Password</label>
                  <input
                    type="password"
                    required
                    className="form-control bg-input border-secondary text-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control bg-input border-secondary text-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label text-secondary small">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control bg-input border-secondary text-white"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {newPassword && (
                  <div className="col-12">
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span>Password Strength</span>
                      <span className={strength >= 75 ? 'text-success' : strength >= 50 ? 'text-warning' : 'text-danger'}>
                        {strength >= 75 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak'}
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div
                        className={`progress-bar ${strength >= 75 ? 'bg-success' : strength >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${strength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="d-flex justify-content-end mt-4">
                <button type="submit" className="btn btn-secondary-custom">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

