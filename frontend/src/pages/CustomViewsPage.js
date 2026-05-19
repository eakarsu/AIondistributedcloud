import React from 'react';
import WorkloadDistributionChart from '../components/WorkloadDistributionChart';
import RegionUtilizationHeatmap from '../components/RegionUtilizationHeatmap';
import DeploymentManifestPDF from '../components/DeploymentManifestPDF';
import SchedulingRulesEditor from '../components/SchedulingRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Cloud Views</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Custom views for AI on distributed cloud — visualize workloads, monitor utilization, generate manifests, manage scheduling rules.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <WorkloadDistributionChart />
        <RegionUtilizationHeatmap />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DeploymentManifestPDF />
        <SchedulingRulesEditor />
      </div>
    </div>
  );
}
