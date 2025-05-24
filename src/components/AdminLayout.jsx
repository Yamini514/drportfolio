import React from 'react';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      {/* You can add admin-specific UI elements here */}
      <Outlet />
    </div>
  );
};

export default AdminLayout;
