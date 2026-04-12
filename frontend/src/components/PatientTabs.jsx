import { useState } from 'react';
import ImmunizationCard from './ImmunizationCard';
import AppointmentCard from './AppointmentCard';

// Generic simple card for Health Record just for the tabs display
const RecordCard = ({ record }) => {
  return (
    <div className="simple-card">
      <div className="sc-header">
        <h4>{record.title}</h4>
        <span className={`badge ${record.isVerified ? 'badge-success' : 'badge-warning'}`}>
          {record.isVerified ? 'Verified' : 'Pending Verification'}
        </span>
      </div>
      <p><strong>Type:</strong> {record.recordType}</p>
      <p><strong>Date:</strong> {new Date(record.visitDate).toLocaleDateString()}</p>
      {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
    </div>
  );
};

const PatientTabs = ({ healthRecords, immunizations, appointments, onUpdateNeeded }) => {
  const [activeTab, setActiveTab] = useState('records');

  return (
    <div className="patient-tabs-container">
      <div className="imm-tabs">
        <button 
          className={`imm-tab ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Health Records ({healthRecords?.length || 0})
        </button>
        <button 
          className={`imm-tab ${activeTab === 'immunizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('immunizations')}
        >
          Immunizations ({immunizations?.length || 0})
        </button>
        <button 
          className={`imm-tab ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments ({appointments?.length || 0})
        </button>
      </div>

      <div className="tab-content list-flex">
        {activeTab === 'records' && (
          healthRecords?.length > 0 ? (
            healthRecords.map(r => <RecordCard key={r._id} record={r} />)
          ) : <p className="empty-msg">No health records found.</p>
        )}

        {activeTab === 'immunizations' && (
          immunizations?.length > 0 ? (
            immunizations.map(imm => <ImmunizationCard key={imm._id} immunization={imm} />)
          ) : <p className="empty-msg">No immunizations found.</p>
        )}

        {activeTab === 'appointments' && (
          appointments?.length > 0 ? (
            appointments.map(appt => (
              <AppointmentCard 
                key={appt._id} 
                appointment={appt} 
                onStatusUpdated={onUpdateNeeded} 
              />
            ))
          ) : <p className="empty-msg">No appointments found.</p>
        )}
      </div>
    </div>
  );
};

export default PatientTabs;
