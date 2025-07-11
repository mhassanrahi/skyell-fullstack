import React from "react";
import URLForm from "../components/URLForm";
import URLTable from "../components/URLTable";

const URLManagement: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* URL Form */}
      <URLForm />

      {/* URL Table */}
      <URLTable />
    </div>
  );
};

export default URLManagement;
