import { useState } from 'react';

const ROLES = ['patient', 'doctor', 'admin'];

const AdminUserRow = ({ user, currentUserId, onRoleChange, onDelete }) => {
  const [isChangingRole, setIsChangingRole] = useState(false);

  const handleRoleSelect = async (e) => {
    const newRole = e.target.value;
    if (!newRole || newRole === user.role) return;

    setIsChangingRole(true);
    await onRoleChange(user._id, newRole);
    setIsChangingRole(false);
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) {
      onDelete(user._id);
    }
  };

  return (
    <div className="admin-list-row">
      <div className="al-info">
        <h4>{user.name}</h4>
        <p>{user.phone} • Joined {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="al-actions">
        <span className={`badge badge-${user.role === 'admin' ? 'warning' : user.role === 'doctor' ? 'success' : 'default'} role-badge-readonly`}>
          {user.role}
        </span>

        {currentUserId !== user._id && (
          <select 
            className="role-select-native"
            value={user.role}
            disabled={isChangingRole}
            onChange={handleRoleSelect}
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}

        {currentUserId !== user._id && (
          <button 
            className="btn-danger-icon" 
            onClick={handleDeleteClick}
            title="Delete User"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminUserRow;
