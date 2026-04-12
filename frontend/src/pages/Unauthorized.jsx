import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized-screen">
      <div className="code">403</div>
      <h2>Access Denied</h2>
      <p>
        You do not have permission to view this page. Please contact your
        administrator if you believe this is an error.
      </p>
      <Link to="/dashboard" className="btn-ghost">
        ← Back to Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
