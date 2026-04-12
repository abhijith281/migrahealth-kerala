import { useNavigate } from 'react-router-dom';

const PatientListItem = ({ patientData }) => {
  const navigate = useNavigate();
  const { user, profile, latestAppointment } = patientData;

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : '??';

  const handleClick = () => {
    navigate(`/doctor/patients/${user._id}`);
  };

  return (
    <div className="patient-list-item" onClick={handleClick}>
      <div className="pli-avatar">{initials}</div>
      <div className="pli-info">
        <h4>{user?.name}</h4>
        <p>
          {user?.phone} &bull; {user?.homeState || 'Unknown State'} &bull; {user?.language?.toUpperCase()} 
          {profile?.bloodGroup && ` • ${profile.bloodGroup}`}
        </p>
      </div>
      <div className="pli-status">
        {latestAppointment ? (
          <span className={`badge badge-${latestAppointment.status}`}>
            Last Appt: {latestAppointment.status}
          </span>
        ) : (
          <span className="badge badge-default">No Appointments</span>
        )}
      </div>
    </div>
  );
};

export default PatientListItem;
