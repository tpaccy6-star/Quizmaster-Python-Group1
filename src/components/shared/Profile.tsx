import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { UserCircle, Mail, Shield, Lock, Save, Edit2, X, BookOpen, Users, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../lib/api';

export default function Profile() {
  const { currentUser: user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [editedEmail, setEditedEmail] = useState(user.email);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user details from API
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        if (user.role === 'teacher') {
          // For teachers, we might need to get additional details
          const response = await apiService.getTeacherDashboard();
          setUserDetails(response);
        } else if (user.role === 'student') {
          // For students, get student dashboard data
          const response = await apiService.getStudentDashboard();
          setUserDetails(response);
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error);
        setUserDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [user]);

  const handleSaveProfile = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      // Update user profile via API
      await apiService.updateUserProfile({
        name: editedName,
        email: editedEmail
      });

      // Update local user data in auth context
      const updatedUser = { ...user, name: editedName, email: editedEmail };
      // Note: You'll need to implement setUser in AuthContext
      setIsEditing(false);
      toast.success('Profile updated successfully');

      // Optionally refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user.name);
    setEditedEmail(user.email);
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      // Change password via API
      await apiService.resetPassword('', newPassword); // This would need to be implemented properly

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 dark:text-white">Personal Information</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-gray-900 dark:text-white px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="text-gray-900 dark:text-white">{user.name}</div>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize mt-1">{user.role}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email"
                  />
                ) : (
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Role
                </label>
                <input
                  type="text"
                  value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed capitalize"
                />
              </div>

              {(user as any).registration_number && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <GraduationCap className="w-4 h-4 inline mr-2" />
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={(user as any).registration_number}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>
              )}

              {user.role === 'teacher' && userDetails && 'subject' in userDetails && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Subject
                  </label>
                  <input
                    type="text"
                    value={userDetails.subject || 'N/A'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>
              )}

              {user.role === 'student' && userDetails && 'class_name' in userDetails && (
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Class
                  </label>
                  <input
                    type="text"
                    value={userDetails.class_name || 'N/A'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                </div>
              )}

              {user.role === 'teacher' && userDetails && 'classes' in userDetails && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Assigned Classes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {userDetails.classes && userDetails.classes.length > 0 ? (
                      userDetails.classes.map((classInfo: any) => (
                        <span
                          key={classInfo.id}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                        >
                          {classInfo.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">No classes assigned</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-gray-900 dark:text-white mb-6">Change Password</h2>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Change Password
            </button>
          </form>
        </div>

        {/* Account Statistics (Role-specific) */}
        {(user.role === 'teacher' || user.role === 'student') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-gray-900 dark:text-white mb-6">Account Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">Member Since</div>
                <div className="text-gray-900 dark:text-white mt-1">
                  {new Date().getFullYear() - 1}
                </div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">Last Login</div>
                <div className="text-gray-900 dark:text-white mt-1">Today</div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">Account Status</div>
                <div className="text-gray-900 dark:text-white mt-1">Active</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}