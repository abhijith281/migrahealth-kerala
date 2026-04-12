import { useState } from 'react';

const AdminPatientRow = ({ profile, doctors, onAssignDoctor }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const user = profile.user || {}; // defensive access if orphaned
  const currentDoctor = profile.assignedDoctor;

  const handleAssignment = async (e) => {
    const doctorId = e.target.value;
    
    // Skip if unchanged
    if (!doctorId && !currentDoctor) return;
    if (currentDoctor && doctorId === currentDoctor._id?.toString()) return;

    setIsAssigning(true);
    await onAssignDoctor(profile._id, doctorId);
    setIsAssigning(false);
  };

  return (
    <div className="admin-list-row">
      <div className="al-info">
        <h4>{user.name || 'Unlinked Profile'}</h4>
        <p>
          {user.phone} • {user.language?.toUpperCase()} 
          {profile.bloodGroup && ` • Blood: ${profile.bloodGroup}`}
        </p>
      </div>

      <div className="al-assignment">
        <label className="assign-label">Assigned:</label>
        <select 
          className="doctor-select-native"
          value={currentDoctor ? currentDoctor._id : ''}
          disabled={isAssigning}
          onChange={handleAssignment}
        >
          <option value="">-- Unassigned --</option>
          {doctors.map(d => (
            <option key={d.user?._id} value={d.user?._id}>
              Dr. {d.user?.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AdminPatientRow;
