import React from 'react';

const ImmunizationCard = ({ immunization }) => {
  const adminDate = new Date(immunization.administeredAt);
  const adminStr = adminDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  let nextDueStr = null;
  let statusBadge = null;
  let cardClass = 'imm-card'; // We'll style this later

  if (immunization.nextDueDate) {
    const nextDate = new Date(immunization.nextDueDate);
    nextDueStr = nextDate.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      statusBadge = <span className="badge badge-error">OVERDUE</span>;
      cardClass += ' imm-overdue';
    } else if (diffDays <= 7) {
      statusBadge = <span className="badge badge-warning">DUE SOON</span>;
      cardClass += ' imm-duesoon';
    } else {
      statusBadge = <span className="badge badge-info">UPCOMING</span>;
    }
  } else {
      // Completed, no next dose
      statusBadge = <span className="badge badge-success">COMPLETED</span>;
      cardClass += ' imm-completed';
  }

  return (
    <div className={cardClass}>
      <div className="imm-card-header">
        <h3 className="imm-vaccine-name">{immunization.vaccineType?.name}</h3>
        {statusBadge}
      </div>
      
      <div className="imm-card-body">
        <p className="imm-meta">
          <strong>Disease:</strong> {immunization.vaccineType?.disease}
        </p>
        <p className="imm-meta">
          <strong>Administered:</strong> {adminStr} by Dr. {immunization.administeredBy?.name}
        </p>
        
        {immunization.patient?.name && (
          <p className="imm-meta">
            <strong>Patient:</strong> {immunization.patient.name}
          </p>
        )}

        {nextDueStr && (
          <p className="imm-due-date">
            <strong>Next Dose Due:</strong> {nextDueStr}
          </p>
        )}

        {(immunization.batchNumber || immunization.facility?.name) && (
          <div className="imm-details">
            {immunization.batchNumber && <span>Batch: {immunization.batchNumber}</span>}
            {immunization.facility?.name && <span>Facility: {immunization.facility.name}</span>}
          </div>
        )}

        {immunization.sideEffects && (
          <p className="imm-side-effects">
            <strong>Side Effects:</strong> {immunization.sideEffects}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImmunizationCard;
